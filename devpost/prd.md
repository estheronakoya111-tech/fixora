---
doc: prd
status: approved
---

# Fixora — Product Requirements

Fixora helps people with confusing billing, payment, delivery, service, or account problems explain what happened, build a clear case, and understand what to do next.
Source: `scope.md > Who It's For`, `The Unique Kernel`, `The POC Boundary`.

## The Core Journey

1. A first-time visitor sees a short animated introduction where Fixora reads a demo story, extracts its key facts, and drafts a preview Dispute Brief, ending with a **Get started** button.
2. They create an account with first name, last name, email, and password, or sign in with email and password. Google sign-in is outside this POC.
3. They arrive at a personalized dashboard. A new user sees a greeting, “What needs fixing?”, a **Start a case** button, and a brief note that cases will appear there. A returning user sees their case stats, journey board, and next-step prompt alongside their cases, statuses, and responses needing attention.
4. Selecting **Start a case** opens a conversation that begins **Tell me what happened**. The user may name the company in the story or use an optional company field; there is no issue-category selection.
5. Fixora reflects the story in a natural conversational reply and asks one clarifying question. There is no separate summary-confirmation form or “Summary confirmed” endpoint.
6. The user answers or corrects the AI. Fixora acknowledges the specific answer or correction before asking one next question based on the full conversation. It stops when the relevant facts are clear enough.
7. The user can add or upload relevant evidence, or skip this step. Fixora explains why suggested evidence could help; lack of evidence never blocks progress.
8. Fixora prepares a complaint based on the confirmed case. The user reviews and edits the recipient, subject, and message, then opens it in Gmail and sends it themselves.
9. After returning, the user confirms in Fixora whether they sent the complaint. Only a confirmed send moves the case to **Waiting for response**.
10. For the demo, a simulated company reply can be generated on a waiting case, or a real company reply can be pasted in. Opening either shows the reply and an explanation of what it means, what it did not address, and possible next steps.

Source: `scope.md > The Core Loop`, `What “Working” Looks Like`, `The POC Boundary`.

## Screens and Layout

- **Intro:** A short animated walkthrough: Fixora auto-types a realistic demo story, highlights the facts it extracts (company, amount, date), shows a preview “Dispute Brief” letter, then reveals a **Get started** action. It explains the purpose without listing every feature.
- **Authentication:** Registration fields for first name, last name, email, and password; returning users sign in with email and password.
- **Dashboard:** A personalized greeting, purposeful start action, and helpful real case list. The empty state has no fake cases; it explains that status and replies will live there.
- **Case flow:** A conversational transcript begins with **Tell me what happened**. Company/service is optional at entry if the story already names it. Fixora reflects and accepts corrections in the conversation, asks adaptive follow-ups one at a time, offers short tap-to-send quick replies, lets any question be skipped, and lets the user add or skip evidence, then drafts a complaint for user review and Gmail handoff. Keep it feeling like working something out with a partner, not completing a form.
- **Cases page:** The full case list with filters (all, needs you, waiting, done), sorting, search, per-case progress tracks, and case deletion.
- **Learn page:** Short guided lessons walking through each part of the journey, each with a “Tap here” preview of where to act, plus a plain-language FAQ. It links the lesson back to the matching part of the app.
- **Response:** A Replies page tracks waiting cases, pasted real replies, and simulated demo replies; an explanation shows what the reply means, what it didn't address, and what to do next. Replies needing attention are visible from the dashboard and mirrored as a badge in the app's navigation.

Source: `scope.md > The Core Loop`, `Inspiration & Identity`, `The POC Boundary`.

## Look and Feel

Calm, trustworthy, clear, and supportive. Use soft gray/off-white, deep gray text, muted green for primary/positive actions, and orange for the Fixora mark and meaningful attention points. Use intentional, comfortably spaced buttons with modest corners. The intro keeps its current direction: an animated story demo with a three-dimensional case-phase board and a preview Dispute Brief. The case flow should feel like a thoughtful conversation rather than a form or generic chatbot. Avoid flashy effects and the feel of a traditional customer-service portal.

Source: `scope.md > Inspiration & Identity`; visual direction refined by the learner in this PRD interview.

## Features and Behavior

### Accounts and dashboard

- Visitors can register with first name, last name, email, and password, or sign in with email and password.
- After authentication, users land on their personalized dashboard.
- A first-time dashboard greets the user by first name, offers **Start a case**, and explains that cases will appear after creation. It contains no fake data or extra sections.
- A returning dashboard shows case stats, a live case-journey board with the case's current phase, a "Next step" card pointing at the most useful action, a case table, and recent activity, alongside a search that can jump to any case.
- A page refresh resumes on the same screen the user left.
- Users can return later to see their saved cases and their status.

Acceptance criteria:

- [ ] A visitor can reach registration or sign-in from the intro.
- [ ] Successful registration or sign-in leads to the dashboard.
- [ ] A new account sees the personalized empty state and no sample cases.
- [ ] A returning account can see its cases, statuses, and responses needing attention from the dashboard.
- [ ] Refreshing mid-journey returns the user to the screen they left.

Source: `scope.md > The POC Boundary`; account and dashboard details added by the learner during PRD.

### Understand the problem and build the case

- **Start a case** opens a conversation that starts with **Tell me what happened**, with no intervening category picker.
- The user tells the story naturally. Naming the company or service is optional if it is already in the story.
- Fixora reflects what the story supports and asks a single clarification. If a brand name may be ambiguous, it asks the user to confirm; it does not claim to have searched online.
- The user responds naturally, including corrections. Fixora acknowledges the latest answer or correction, and explains its relevance where helpful, before asking another question.
- Each reply offers 0–4 short quick-reply suggestions when one fits the question; the user can always type freely instead.
- Any question is optional: if the user taps skip or says they are not sure, the conversation moves on without pushing for the detail.
- Follow-up questions depend on the conversation and collect only important missing information one at a time: what happened, who was involved, when, relevant charges/details if supplied, available support, and the desired resolution.
- The case does not appear on the dashboard just because the user typed a story or requested its first reflection. It is saved when the user answers the first clarification and continues.
- The case is ready to continue when it clearly covers what happened, who is involved, available evidence or supporting information, and what outcome the user wants. Avoid unnecessary additional questions.

Acceptance criteria:

- [ ] The case starts with a freeform story; the company field is optional.
- [ ] Fixora reflects the story in a natural reply and asks one useful clarification.
- [ ] Replies respond to the user's latest answer or correction before asking one next question.
- [ ] A possibly ambiguous company name is confirmed with the user; the POC does not claim online verification.
- [ ] The case is not saved to the dashboard until the user answers and continues.
- [ ] Follow-up questions adapt to the full conversation and stop when it is clear enough to prepare the case.
- [ ] Quick-reply suggestions appear when relevant and typing always remains available.
- [ ] Tapping skip or saying "not sure" moves the conversation forward without that detail.
- [ ] Fixora's replies stream in as they are generated instead of appearing all at once.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `The POC Boundary`; interaction details added by the learner during PRD.

### Add supporting evidence

- Fixora can suggest evidence relevant to the case and explain why it could help.
- Users can upload or add relevant supporting evidence when available, or skip the step.
- Missing evidence never prevents the user from continuing.

Acceptance criteria:

- [ ] The user can continue without adding evidence.
- [ ] Evidence suggestions include a plain-language reason they may help.

Source: `scope.md > The Unique Kernel`, `The POC Boundary`.

### Review and send the complaint

- Fixora drafts a complaint only after the user has confirmed the case.
- The draft uses only supplied details, includes the account holder's name in a local signature, states relevant history, support, requested resolution, and a clear action request. It does not invent dates, amounts, attachments, or a recipient.
- The user can review and edit the recipient, subject, and entire message, then explicitly approve it to open Gmail.
- The user sends it themselves; Fixora does not send it.
- On return, Fixora asks whether the user sent it. Only the user's confirmation changes the case to **Waiting for response**.

Acceptance criteria:

- [ ] A complaint draft is unavailable before enough facts have been gathered.
- [ ] The recipient, subject, and entire message are editable before Gmail opens.
- [ ] The complaint includes supplied dates/details, past actions, available support, requested outcome, and a locally added customer name; it does not invent facts.
- [ ] Gmail opens with the reviewed recipient, subject, and complaint; the case moves to **Waiting for response** only after the user returns and confirms sending.
- [ ] The case remains outside **Waiting for response** until the user confirms sending.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `The POC Boundary`, `Explicitly Cut`.### Manage cases

- The Cases page lists every case with filters for all, needs-you, waiting, and done, plus sorting by needs-you, newest, or oldest.
- Each case shows its progress through Understand, Draft, Sent, and Reply, its next useful action, and its last updated date.
- Cases can be searched from the header, opened from anywhere, and deleted when no longer wanted.

Acceptance criteria:

- [ ] The user can filter the list to needs-you, waiting, or done cases and see live counts.
- [ ] The user can sort cases and search by company or issue.
- [ ] A case can be deleted and stops appearing everywhere, including the dashboard.

Source: PRD revision after the Cases page was added during build.

### Learn how to use the app

- The Learn page offers short guided lessons for each stage: starting a case, talking with Fixora, adding evidence, checking the letter, sending from Gmail, and reading a reply.
- Each step includes a small preview of where to act with a highlighted "Tap here" marker, plus a plain-language FAQ.
- Lessons link back to the matching part of the app.

Acceptance criteria:

- [ ] Every lesson shows where to act with a highlighted preview and explains the step in plain words.
- [ ] The page answers common questions about sending, files, editing, and voice input.
- [ ] A lesson can take the user directly to the matching screen.

Source: PRD revision after the Learn page was added during build.
### Understand a company response

- A real reply can be added by pasting the company's email onto a waiting case; a simulated company reply can be generated for the demo.
- Opening the reply shows the reply text, what it means, what it did not address, and possible next steps.
- Replies needing attention are visible from the Replies page, the dashboard, and a badge in the app's navigation.
- A reply can be marked handled or moved back to needs-attention; handled replies stay readable in their own section.

Acceptance criteria:

- [ ] The simulated reply is visibly identified as simulated.
- [ ] A waiting case can receive a pasted real reply or a triggered simulated reply, each producing the same explanation experience.
- [ ] The explanation covers meaning, unaddressed points, and possible next steps.
- [ ] Replies needing attention are countable and visible from both the Replies page and app navigation.
- [ ] A reply can be toggled between handled and needs attention, and handled replies stay accessible.

Source: `scope.md > The Core Loop`, `What “Working” Looks Like`, `The POC Boundary`; paste-real-reply, handled toggling, and navigation badge added by the learner during PRD.

## States and Boundaries

- **First visit:** Animated intro with a demo story walkthrough, auto-extracted facts, and a **Get started** action.
- **Story carried into sign-up:** When the visitor continues, the story they just watched explained becomes the first case's opening message after registration.
- **Refresh mid-journey:** Return to the same screen they left (dashboard, cases, conversation, case, replies, or learn).
- **App navigation:** Persistent sidebar on desktop and bottom bar on mobile with Home, Cases, Replies, and Learn; the Replies entry shows a badge when replies need attention.
- **Signed out:** Registration or email/password sign-in is required before starting a case.
- **No cases:** Personalized dashboard with a greeting, prompt, primary action, and short empty-state message; no fake data.
- **Unsubmitted story:** Text remains in the current session; typing alone does not create a saved dashboard case.
- **Case in progress:** Fixora reflects the user's understanding in conversation, accepts corrections naturally, and asks only one relevant follow-up question at a time.
- **No evidence:** The user can skip evidence and continue.
- **Complaint not confirmed sent:** The case does not show **Waiting for response** until the user says they sent it.
- **Simulated response:** Demo response is labeled as simulated and tied to the relevant case.
- **Persistence:** Accounts provide access to the user's saved cases, statuses, and responses on return.

Source: `scope.md > The Core Loop`, `The POC Boundary`; authentication and dashboard states added by the learner during PRD.

## Product Decisions

- Use the name **Fixora** and cover confusing billing, payment, delivery, service, and account problems.
- Begin a case with an open description and company/service field instead of issue categories.
- Make the conversation the core interaction, with an acknowledgement of each answer or correction before the next question.
- Let a user omit the company field if it appears in the story, and ask for confirmation when the company name is ambiguous. No web lookup is claimed in the POC.
- Ask only for information missing from the user's story; move forward when the case is clear enough.
- Keep evidence optional and explain why a suggestion may help.
- Require user review and user-controlled sending through Gmail; rely on explicit user confirmation to mark a case as waiting.
- Use email/password registration and sign-in, with first and last name collected at registration. Exclude Google sign-in to keep the POC focused.
- After authentication, show a personalized dashboard with an honest empty state or the user's real cases and statuses.
- Add the account holder's name to the complaint signature in the browser without sending profile identity to Groq.

## What We're Building

A focused consumer-dispute case experience with an animated story demo intro, email/password accounts, personalized dashboard, a full Cases manager, a Learn guide, freeform case intake with streaming, quick replies, and skippable questions, user-confirmed understanding, adaptive follow-up questions, optional evidence, editable Gmail complaint draft, explicit sent confirmation, and a Replies page covering both pasted real replies and a clearly simulated company reply with an explanation and next steps.

## Deferred From the POC

- Real Gmail reply monitoring, matching replies to cases, and notifications, because the demo can simulate a reply and real replies can be pasted in.
- Google sign-in, to keep authentication limited to email and password.
- Direct complaint sending from Fixora, because the user must keep control of the final send action.
- Persisting data to a server; cases and profiles stay in this browser's localStorage.

## Possible Later Enhancements

Real company response monitoring and matching may be explored later. Direct Gmail sending may be considered only if the user still explicitly approves and controls the recipient, message, and send action.

## Non-Goals

- Sending complaints without user review and explicit approval.
- Claiming Fixora knows a complaint was sent without the user's confirmation.
- Requiring evidence or a fixed issue category to start or complete a case.
- Showing fabricated cases as if they belonged to the user.

## Open Questions

- None that block product review. Technical choices for account handling, saved-case persistence, evidence uploads, and the simulated response belong in `4-spec`.
