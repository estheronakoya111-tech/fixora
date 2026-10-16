---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Build the conversational complaint journey**
  Becomes usable: A visitor can register or sign in, talk through a billing problem with Fixora, correct its understanding, answer only relevant follow-ups, edit a complaint, open it in Gmail, and confirm sending.
  Why now: The AI partnership is the core product behavior. This slice proves the whole user's side of that journey, including evidence and the send handoff, before adding a simulated reply.
  PRD ref: `prd.md > The Core Journey`, `Screens and Layout`, `Accounts and dashboard`, `Understand the problem and build the case`, `Review and send the complaint`
  Spec ref: `spec.md > How This Works, In Plain Language`, `The Core Journey Through the System`, `App shell and screens`, `Groq assistance`, `Data Model`, `Gmail compose`
  Build: Keep the intro direction; redesign the dashboard with a purposeful next action, layered visual depth, and case overview. Use an in-app conversation for story reflection, one-question follow-ups, natural acknowledgement/correction, and company clarification. Save only after the user answers the first clarification. Include the optional filename-only evidence step. Draft a professional complaint with supplied details and a locally added customer signature; let the user edit/approve it, open Gmail, then confirm sending before setting Waiting for response. Use the orange/green/off-white system and a distinctive orange resolution mark.
  Verify (mechanical): Run `npm run lint` and `npm run build`; confirm both complete successfully. Start `npm run dev` and observe the app load at `http://localhost:3000`.
  Learner check: Create a demo account, tell Fixora a fictional billing story, correct its understanding, answer follow-ups, add or skip evidence, edit the complaint, open Gmail, and confirm sending. Check that typing alone creates no dashboard case and that the status changes only after confirmation.
  Commit: `Build conversational case and Gmail journey`

- [x] **2. Add the simulated company response**
  Becomes usable: A waiting case can receive a clearly labeled fictional reply attached to that case.
  Why now: The revised Slice 1 completes the user's side of the journey; this starts the response loop with the agreed fixed demo reply.
  PRD ref: `prd.md > The Core Journey`, `Understand a company response`, `States and Boundaries`
  Spec ref: `spec.md > The Core Journey Through the System`, `Simulated reply`, `Data Model`
  Build: Add the prewritten reply to a waiting case, label it as a simulation, and persist the in-app response state.
  Verify (mechanical): Run `npm run lint` and `npm run build`; confirm both complete successfully. Trigger the fixed response on a waiting case and confirm it attaches to that case.
  Learner check: Confirm the fictional response is clearly labeled and appears only on the case you selected.
  Commit: `Add simulated company response`

- [x] **3. Explain what the response means**
  Becomes usable: Fixora uses Groq to explain what the simulated company reply means, what it left unresolved, and what the user can do next.
  Why now: Understanding the reply makes the fixed response useful instead of just displaying more text.
  PRD ref: `prd.md > The Core Journey`, `Understand a company response`
  Spec ref: `spec.md > Simulated reply`, `Groq assistance endpoint`, `Important Failure Modes`
  Build: Add the `explain-reply` Groq task, validate its structured sections, and save the explanation with the selected case.
  Verify (mechanical): Run `npm run lint` and `npm run build`; confirm both complete successfully. Confirm a simulated reply renders all three explanation sections.
  Learner check: Read the explanation and check whether it clearly separates the company's answer, unanswered points, and next steps.
  Commit: `Explain simulated reply with Groq`

- [x] **4. Surface case attention on the dashboard**
  Becomes usable: The dashboard makes waiting cases, replies needing attention, and the next useful action easy to spot.
  Why now: Once reply handling exists, the dashboard can connect the case status and response to a clear next step.
  PRD ref: `prd.md > Accounts and dashboard`, `Understand a company response`, `States and Boundaries`
  Spec ref: `spec.md > App shell and screens`, `Data Model`, `Simulated reply`
  Build: Add the dashboard response attention state and clear case actions. Keep the no-case dashboard focused on one next action and an honest empty message.
  Verify (mechanical): Run `npm run lint` and `npm run build`; confirm a waiting case and an attention-needed response render their correct states.
  Learner check: Return to the dashboard with a waiting case and then a simulated reply; check that the status and next action are clear.
  Commit: `Show case status and response attention`

## Hands-on Checkpoints

- [x] Revised Slice 1 explored — after slice 1, so feedback on the conversation, company clarification, evidence, complaint, Gmail handoff, and dashboard can shape remaining work.
- [x] Final kick-the-tires exploration and feedback completed — after slice 4.

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Learner ran `npm run dev`, completed the final hands-on pass through the core journey and response flow, and confirmed everything tested correctly. Mechanical verification passed with `npx tsc --noEmit`, `npm run lint` (four existing warnings, zero errors), `npm run build`, and `git diff --check`. The finished-code map is `devpost/app-map.html`.
Route and stops: Reference route in `devpost/app-map.html`: `src/app/page.tsx` → `src/components/Conversation.tsx` → `src/lib/storage.ts` → `src/components/Case.tsx` → `src/components/Replies.tsx`.
Edit outcome: Intro copy, response routing, button contrast, loading state, and confirmation dialogs were kept after verification.
Reflection: Reuse going through what the AI agent said properly and thoroughly before accepting it (learner's own words).
Activity mode: Live app and editor, plus a concise code-tour recap.

## Revisions

- Slice 1 was expanded and redesigned after learner feedback: conversational answers replace the separate summary-confirmation form; optional evidence and the complete complaint/Gmail handoff move into the first hands-on journey. The simulated reply now follows as Slice 2, Groq explanation is Slice 3, and dashboard response attention is Slice 4.
- Post-review additions (2026-10-16), all verified with `npx tsc --noEmit` and `npm run lint` (0 errors): **real-data dashboard area chart** (cumulative started/sent per day from `createdAt`/`sentAt`, 7/14/30-day pills, window auto-extends to the first case, phone-safe date labels that always keep today); **Cases manager redesign** (card list with status edge colors, Understand → Draft → Sent → Reply progress track ending in “Done”, filter chips with live counts, needs/newest/oldest sort menu, next-step hints, confirmed delete, Fixora-tokened colors); **reply decisions Wait · Clarify · Escalate** (Wait shows a next-steps panel, Clarify drafts an itemised question email via the new `/api/fixora/clarify` + `draftClarification` Groq task with Gmail handoff, Escalate keeps the formal letter), recorded by `decideNextAction`; **detailed chat replies** (system prompt now requires 4–8 sentence explanations, 800-token cap); **Learn page expanded to nine guides** plus FAQ covering the chart, case tracker, and post-reply decisions; **mobile responsiveness pass** (page CTAs trim to `px-3 / py-2` on phones, full Fixora wordmark below `sm`, filter chips wrap instead of horizontal scroll, thinned chart dates). Also removed the duplicated statuses in “Cases by status”, the placeholder demo values across Cases, and the “2 active · needs you” header line in favour of plain copy. `devpost/app-map.html` regenerated to match.
- Planning docs revised to match the as-built app (2026-10-10): renamed to **Fixora**; issue scope broadened to bills, payments, deliveries, services, and accounts; added Cases manager, Learn guide, sidebar/bottom nav with reply-attention badge, animated intro with live fact extraction and carried-over story, streaming replies with quick answers and skippable questions, and a Replies page that accepts pasted real replies plus the simulated demo (with handled/needs-attention toggling). PRD, spec, and learner profile updated; slices 1–4 already cover these behaviors, so slice text is unchanged.
