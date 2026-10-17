// Simulated demo reply (spec: automatic simulated company response).
// The live reply is generated from the complaint by /api/fixora/simulate and
// explained like any other reply; this fixture is only the fallback so the
// simulation still lands if the LLM call fails. Clearly labelled as a demo
// where it is ever shown and contains at least one addressed point and one
// left unresolved.

import type { Case } from "./types";

export const SIMULATED_REPLY = {
  from: "Billing Department",
  body: `Dear customer,

Thank you for contacting us about your billing concern. We have reviewed your account and can confirm that the duplicate charge from your most recent statement has been reversed. Please allow 3–5 business days for the credit to appear on your original payment method.

Regarding the late fee applied to the same statement: our records show the payment was received after the due date, and per the account terms the fee was assessed correctly.

If there is anything else we can help with, please reply to this message.

Sincerely,
Billing Department`,
};

// How long a confirmed-sent complaint waits before Fixora shows the
// simulated reply. ~1 min: short enough to demo live, still reads as a wait.
export const REPLY_DELAY_MS = 60_000;

// How long a failed reply generation backs off before the scheduler retries.
export const SIMULATE_RETRY_MS = 30_000;

// The final outcome fixture, used only if the LLM call fails. It always reads
// as resolved, so the demo never dead-ends; labelled as a simulation where
// it is shown.
export const SIMULATED_OUTCOME = {
  body: `Dear customer,

Thank you for your patience and for escalating your concern. Following a final review of your case, we have confirmed that the matter should have been dealt with correctly the first time. We have now completed the correction you asked for and sent written confirmation of the final position on your account.

We consider this matter closed, and we are sorry for the extra steps it took to get here.

Sincerely,
Customer Care Office`,
  meaning: `The company says it re-checked the escalated complaint, corrected the problem, and sent written confirmation of the final position. For you this means the request you raised is met, though you should confirm the correction actually appears before closing the matter.`,
};

// How long a confirmed-sent escalation waits before Fixora shows the
// simulated final outcome. Short enough to demo live, still reads as a wait.
export const OUTCOME_DELAY_MS = 60_000;

// The wait is armed exactly once, when the send is confirmed, and is stored
// on the case — so a refresh can never restart the timer.
export function toReplyDueAt(sentAtMs: number): number {
  return sentAtMs + REPLY_DELAY_MS;
}

// Due means: armed and the wait has elapsed, with no reply saved yet — except
// for a clarification round: there the FIRST reply is deliberately still on
// the record, and the pending-clarification flag says its simulated answer
// may replace the evaluation. That saved reply builds the one-reply-per-
// round guarantee a refresh relies on.
export function isReplyDue(record: Case, nowMs: number): boolean {
  const pendingClarification = record.clarification?.sentConfirmed && !record.clarification.answered;
  return Boolean(record.replyDueAt && nowMs >= record.replyDueAt && (!record.companyReply || pendingClarification));
}

// The final outcome works the same way as the first reply: the wait for the
// demo outcome is armed exactly once when the escalation send is confirmed,
// and is stored on the case so a refresh never restarts it; the saved
// `finalOutcome` guarantees one outcome per escalated complaint.
export function isOutcomeDue(record: Case, nowMs_: number): boolean {
  return Boolean(record.outcomeDueAt && !record.finalOutcome && record.status === "escalated" && nowMs_ >= record.outcomeDueAt);
}
