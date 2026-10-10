---
doc: spec
status: approved
---

# Fixora — Technical Spec

## How This Works, In Plain Language

Fixora stays as one Next.js app. The screens and case progress run in the browser. The browser saves demo profiles, cases, and evidence filenames in `localStorage`, which is a small note the browser keeps for this site. This means someone can return to their cases in the same browser, but the data does not sync to another device. A stored session marker means a page refresh continues on the same screen.

When the app needs help understanding a story, suggesting a missing detail, drafting a complaint, or explaining a reply, it sends only the needed text to a small Next.js server endpoint. That endpoint calls Groq using the key stored on the server. The key and passwords are never sent to or saved by the browser. The conversation endpoint streams Fixora's reply token-by-token, so answers appear as they are written; the draft and reply-explanation endpoints return JSON whose fields are validated before saving. The simulated company reply is a fixed demo message; Groq writes its explanation.

This shape keeps the product's central AI interaction real while avoiding a separate database, authentication service, file storage service, Gmail connection, or deployed server. It is a local demo, not a secure account system.

## The Core Journey Through the System

1. The visitor sees the intro in `src/app/page.tsx` and chooses **Get started**.
2. Registration/sign-in screens collect the PRD fields. A demo profile is saved in browser storage; a returning demo user can sign in using an existing email and any non-empty password. Passwords are never stored or checked. This is intentionally mock authentication.
3. The shell resolves the screen from the stored session (dashboard, cases, conversation, case, replies, or learn), so a refresh lands where the user left off.
4. The dashboard loads the current demo profile and its cases from `localStorage`: stats, the case-journey board, a next-step card, the case table, and recent activity.
5. **Start a case** opens a conversation. The story and optional company clue stay in component state while the user types. Submitting the first reflection does not save a case. The browser posts the message history to `/api/fixora`, which streams a natural reply plus one clarification question, followed by a `###CASE###` marker and a JSON payload of structured case facts (issue, company, amount, date, goal, ready, quick replies).
6. The user's first answer deliberately creates and saves the case. Each turn sends the full question/answer history so the acknowledgement responds to the conversation. Quick replies (0–4 short tap suggestions) come from the model; every question can be skipped without blocking progress.
7. At readiness, the optional evidence step lets the user select files or skip. The browser saves filename, size, and type on continue. File contents are not uploaded, saved, analyzed, or attached to Gmail. The user may need to attach the original file manually in Gmail.
8. The browser sends only the extracted case facts to `/api/fixora/draft`. Groq returns a professional, factual, editable subject and message. The browser adds the account holder's name as a signature locally. The user edits the recipient, reviews the draft, and chooses **Approve & open in Gmail** to open a prefilled compose window. After returning, only an explicit “Yes, I sent it” updates the saved status to **Waiting for response**.
9. On a waiting case, the user can paste a real company reply, or trigger the simulated demo reply. Either way the browser sends the reply text and minimal case context to `/api/fixora/reply`; Groq returns its meaning, unaddressed points, and possible next steps, saved on the case and shown in the Replies page.

PRD ref: `prd.md > The Core Journey`, `Features and Behavior`, `States and Boundaries`.

## Stack

- **Next.js 16.3.6 App Router, React 19.2.8, and TypeScript 5** — already installed. Keep the current app instead of introducing another framework. The main page becomes a client component because the interactive flow reads and writes browser storage. A Route Handler keeps the Groq key on the server.
- **Tailwind CSS 4** — already installed and used by the starter. Use it for the screens; add no component library or styling dependency.
- **Browser `localStorage`** — demo-only profiles, current demo user, cases, and evidence file metadata. No database or password persistence.
- **Groq REST API with native server `fetch`** — no additional AI SDK dependency. The model ID is `GROQ_MODEL` env var, defaulting to `openai/gpt-oss-120b` (a previous default, `llama-3.3-70b-versatile`, was retired in Aug 2026, which motivated the env-var override).

Docs: [Next.js Client and Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Tailwind CSS](https://tailwindcss.com/docs), [Groq Quickstart](https://console.groq.com/docs/quickstart), [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs), [Groq Supported Models](https://console.groq.com/docs/models).

## Where It Runs and How Someone Tries It

- Runs locally in a browser; no deployed app is planned for this POC.
- Add `GROQ_API_KEY` (and optionally `GROQ_MODEL`) to the ignored local `.env.local` file. Never prefix them with `NEXT_PUBLIC_` or commit them. Restart the dev server after changes.
- Start with `npm run dev`, then open `http://localhost:3000`.
- The submission still needs a short demo video and public GitHub repository. Local use is enough to record the video; deployment is optional.
- Use fictional billing details in the recording. Case stories and reply text used for AI assistance are sent to Groq; profile details, passwords, and selected file contents are not.

## Look and Feel

Carry forward `prd.md > Look and Feel`: calm, trustworthy, clear, and supportive. Use soft gray/off-white, deep gray text, muted green for primary/positive actions, and orange for the mark and important attention actions. Buttons have comfortable spacing, clear hierarchy, modest corners, and subtle feedback. Give the dashboard purposeful layered depth with a small case-file visual tied to resolving a problem; use no decorative object without a role. Keep the conversation transcript readable with clear speaker identity, not a generic chatbot template. Avoid fake statistics, fake case data, flashy effects, and dense navigation.

## Components

### App shell and screens — `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/*`

A single client-side app switches between intro, registration/sign-in, dashboard, cases, conversation, complaint review, replies, and learn, guided by the stored session. The screens live in `src/components/` (`Dashboard.tsx`, `Cases.tsx`, `Conversation.tsx`, `Case.tsx`, `Replies.tsx`, `Learn.tsx`) with `AppSidebar` providing the shared navigation and reply-attention badge, and `SearchPopup` powering case search. `layout.tsx` sets Fixora metadata, the Geist/Inter fonts, and the custom cursor.

PRD ref: `prd.md > Screens and Layout`, `Features and Behavior`.

### Groq assistance — `src/lib/fixora.ts` with three Route Handlers

- **`POST /api/fixora`** (`streamFixora`): chat conversation. Validates the turn history (roles, user-last, ≤24 turns, ≤1200 chars each) and streams the reply through as `text/plain`.
- **`POST /api/fixora/draft`** (`draftComplaint`): receives only issue/company/amount/date/goal strings; returns a validated `{ subject, message }`.
- **`POST /api/fixora/reply`** (`explainReply`): receives the reply text (≤4000 chars) plus optional company/issue/amount context; returns validated `{ meaning, unresolved[], options[] }`.
- All three keep the API key server-side, surface Groq errors as plain retry messages, and treat received text as data, never instructions. None receives profile identity/credentials or evidence contents.

PRD ref: `prd.md > Understand the problem and build the case`, `Review and send the complaint`, `Understand a company response`.

### Browser data helpers and types — `src/lib/storage.ts`, `src/lib/types.ts`, `src/lib/case.ts`

Define the shared profile/case shapes and read/write JSON in `localStorage`: profiles, current email, session (screen + case id), cases (upsert/cleanup/delete), intro-seen flag, and the carried intro story. Empty in-progress cases are cleaned so they never hijack "Continue conversation". No state-management library.

PRD ref: `prd.md > Accounts and dashboard`, `States and Boundaries`.

### Simulated reply — `src/lib/demo-reply.ts`

A fixed, fictional Billing Department response with one addressed point (reversed charge) and one unresolved point (late fee upheld), so the explanation has something concrete to analyze. Clearly labeled as simulated wherever it appears; the user can also paste a real reply instead.

PRD ref: `prd.md > Understand a company response`.

### Logo and cursor — `src/components/logo/FixoraLogo.tsx`, `src/components/FixoraCursor.tsx`

The extruded 3D orange Fixora mark with hover physics and optional wordmark; a lightweight custom cursor effect disabled for reduced motion.

PRD ref: `prd.md > Look and Feel`.

## Data Model

All browser records are demo data. Keys are scoped by the app: `fix-this:profiles`, `fix-this:current-email`, `fix-this:cases`, `fix-this:session`, `fix-this:intro-seen`, `fix-this:intro-story`.

- **Demo profile:** `{ firstName, lastName, email }`. Email is normalized to lowercase and identifies that browser's local demo profile. Do not save the password. A known email plus a non-empty password is enough to demonstrate sign-in; this is not real verification.
- **Session:** `{ screen, caseId }` so a refresh resumes the same screen (dashboard, cases, conversation, case, replies, or learn).
- **Case:** `{ id, ownerEmail, company?, rawStory, summary?, details?, conversation?, answers[], evidenceFiles[], complaintDraft?, status, companyReply?, createdAt, updatedAt?, sentAt? }`. Status is one of `in-progress`, `ready-to-send`, `waiting-for-response`, `response-needs-attention`, or `response-reviewed`.
- **Case details (parsed from the streamed `###CASE###` payload):** `{ issue, company, amount, date, goal }` nullable strings, `ready: boolean`, and `quick: string[]` (0–4 tap-reply suggestions). `ready` means company + what-went-wrong are known and the goal was asked or skipped.
- **Conversation turn:** `{ id, role: "user"|"assistant", content }`.
- **Evidence file metadata:** `{ id, name, size, type }`. Do not store the `File` bytes. The filename can be shown after a reload, but the selected local file itself must be selected again if the user needs to open it.
- **Complaint draft:** `{ recipient, subject, body }`. Groq generates the subject/body; the user supplies and edits the recipient. Never invent a company email address.
- **Company reply analysis:** `{ replyText, meaning, unresolved[], options[], addedAt, handled, isSimulated? }`. Reply text is pasted by the user or the fixed demo fixture; Groq supplies the explanation. `handled` toggles between Reply needs attention and Reply reviewed.

On each meaningful change, update the case in browser state and `localStorage`. Reloading in the same browser restores profiles, session screen, case progress, status, and filenames. Clearing site data or switching browsers removes access to those local demo records.

## File Structure

```text
src/
├── app/
│   ├── api/
│   │   └── fixora/
│   │       ├── route.ts            # streaming chat (story understanding)
│   │       ├── draft/route.ts      # complaint draft
│   │       └── reply/route.ts      # reply explanation
│   ├── globals.css                 # design tokens and base styles
│   ├── intro/page.tsx              # reachable standalone intro
│   ├── layout.tsx                  # metadata, fonts, cursor
│   └── page.tsx                    # screen switchboard
├── components/
│   ├── intro/                      # Intro internal pieces
│   ├── logo/                       # Fixora mark
│   ├── AppSidebar.tsx
│   ├── Auth.tsx
│   ├── Case.tsx
│   ├── Cases.tsx
│   ├── Conversation.tsx
│   ├── Dashboard.tsx
│   ├── Footer.tsx
│   ├── Intro.tsx
│   ├── Learn.tsx
│   ├── Replies.tsx
│   ├── Reveal.tsx
│   └── SearchPopup.tsx
└── lib/
    ├── case.ts                     # re-exports CaseDetails
    ├── demo-reply.ts               # fictional company reply fixture
    ├── fixora.ts                   # Groq calls (stream, draft, explain)
    ├── storage.ts                  # localStorage helpers
    └── types.ts                    # profile, case, and AI result shapes
.env.local                          # local GROQ_API_KEY (+ optional GROQ_MODEL); ignored
```

## External Services and Dependencies

### Groq API

- **Endpoint:** `POST https://api.groq.com/openai/v1/chat/completions`.
- **Authentication:** `Authorization: Bearer ${GROQ_API_KEY}` from server environment; JSON content type.
- **Request:** `{ model: GROQ_MODEL (default "openai/gpt-oss-120b"), messages: [{ role: "system", content: "...task/model instructions..." }, ...history], stream / response_format }`. The conversation call uses `stream: true` and no response_format; draft and reply calls use `response_format: { type: "json_object" }`.
- **Result shapes:** the conversation streams free text; Fixora splits the visible message from the trailing `###CASE###` JSON payload (`issue`, `company`, `amount`, `date`, `goal`, `ready`, `quick[]`). The draft returns `{ subject, message }`; the reply explanation returns `{ meaning, unresolved[], options[] }`. The routes parse and validate before returning JSON to the browser.
- **Data sent:** only the story/case facts or reply text needed for that task, length-capped. Never send account password, profile email/name, or evidence file contents.
- **Cost/limits:** pricing and limits change by model and plan; verify on the [model page](https://console.groq.com/docs/models) before recording.
- **Docs:** [Chat Completions API](https://console.groq.com/docs/api-reference), [Structured Outputs](https://console.groq.com/docs/structured-outputs), [API key quickstart](https://console.groq.com/docs/quickstart).

### Gmail compose

No Gmail API, OAuth, or sending permission. The browser opens a prefilled Gmail compose URL using the user-entered recipient, generated subject, and generated body. This URL behavior is not covered by a supported Gmail API contract, so verify it early in the build. Gmail's documented fallback is to open Compose and enter the recipient, subject, and message manually. If the prefilled window does not work, the draft remains visible and editable in Fixora for copying. [Gmail compose and send help](https://support.google.com/mail/answer/2819488?hl=en)

### Company identification

For this POC, Groq can recognize a company name mentioned in the story and ask the user to confirm an ambiguous name; the intro also extracts names locally with regex. There is no web browsing in this flow, so Fixora must not describe that as a verified lookup. Real verification would require a separate server-side web search or business-directory API; that integration is out of scope for this build.

## Important Failure Modes

- **Missing `GROQ_API_KEY`, API rate limit, or network failure** → keep the user's case in local storage, show a plain retry message (server returns a specific, friendly error string), and do not advance past the step that needs Groq.
- **Unexpected model output** → validate the task result before saving it (type checks, capped list lengths, `###CASE###` JSON fallback to a local template); show a retry action and preserve the story/answers.
- **No local profile/cases or cleared browser storage** → show the honest empty dashboard and allow a new demo account; no sample user cases.
- **Browser storage unavailable or unreadable** → storage helpers return `null`/`false` instead of throwing; preserve the current in-memory step where possible.
- **Gmail compose does not open** → keep the editable draft on screen and offer copyable recipient, subject, and body.
- **Retired Groq model** → the model ID is env-overridable (`GROQ_MODEL`) without code changes; a 4xx from Groq surfaces its message.

## What Was Simplified and Why

- **Mock email/password auth in the browser** instead of real authentication → meets the visible sign-up/sign-in journey without credentials, auth service, or backend. Passwords are not stored; any non-empty password works for an existing local demo email.
- **`localStorage`** instead of a database → same-browser return visits can demonstrate saved cases without setup or cloud sync.
- **Filename-only evidence attachment** instead of file storage/processing → users can select, see, and remove files while no file contents are saved or uploaded.
- **Streaming chat + one JSON marker in the reply** instead of a separate summarization round-trip → one request per turn yields both the conversational text and the structured case payload, keeping the conversation fast.
- **Fixed simulated company reply** instead of Gmail monitoring → makes the end-to-end response journey demonstrable without email access or background jobs; pasting a real reply covers the honest version.
- **One app surface with a client-side screen switch** instead of separate routes for each step → keeps the proof focused on the guided journey while `/intro` stays reachable.

## Decisions and Open Issues

- **Learner choice:** use Groq with an env-overridable default model (`openai/gpt-oss-120b`) for conversation, complaint drafting, and explaining replies.
- **Learner choice:** demo-only email/password flow; profiles/cases in the same browser's `localStorage`; no password saved, backend, or database.
- **Learner choice:** file picker shows/removes evidence filenames, with UI copy explaining that only filename and basic metadata are saved; file contents are not saved or analyzed.
- **Learner choice:** replies can be pasted (real) or simulated (clearly labeled demo); both get the same Groq explanation, and handled/needs-attention is user-controlled.
- **Learner choice:** the intro is itself the product demo — auto-typed story, live extraction, preview brief — and the story carries into the first case.
- **Learner choice:** company identity can be inferred from story text only for a tentative conversational prompt; online company search/verification is not claimed.
- **Implementation recommendation:** run locally and record the demo; deployment is not part of this spec.
- **Clarified concept:** `localStorage` keeps this browser's data when the page is reopened, but does not provide a real account, secure multi-device access, or backup. The learner accepted that boundary for the POC.
- **Open issue:** none blocks implementation. Confirm the active Groq model ID and account limits if Groq changes its model catalog before the build.
