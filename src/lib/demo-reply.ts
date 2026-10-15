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

// The wait is armed exactly once, when the send is confirmed, and is stored
// on the case — so a refresh can never restart the timer.
export function toReplyDueAt(sentAtMs: number): number {
  return sentAtMs + REPLY_DELAY_MS;
}

// Due means: armed, no reply saved yet, and the wait has elapsed. The saved
// `companyReply` is the one-reply-per-complaint guarantee a refresh relies on.
export function isReplyDue(record: Case, nowMs: number): boolean {
  return Boolean(record.replyDueAt && !record.companyReply && nowMs >= record.replyDueAt);
}
