// Shared shapes for Fix This (spec: Data Model).
// Browser records are demo data; storage keys are scoped in storage.ts.

export type Task = "summarize" | "ask-next" | "draft-complaint" | "explain-reply";

export interface DemoProfile {
  firstName: string;
  lastName: string;
  email: string;
  createdAt?: number; // normalized lowercase; identifies this browser's demo profile
}

export type CaseStatus =
  | "in-progress"
  | "ready-to-send"
  | "waiting-for-response"
  | "response-needs-attention"
  | "response-reviewed"
  | "escalated"
  | "outcome-needs-attention"
  | "resolved"
  | "final-guidance";

export interface EscalationRecord {
  draft: ComplaintDraft; // recipient, subject, body — user-editable before sending
  draftedAt: number;
  // Set exactly once when the user confirms they sent the escalation email.
  // Once sentConfirmed, this escalation is finished: no new escalation can start.
  sentAt?: number;
  sentConfirmed?: boolean;
}

// One clarification round per reply: the record exists once the user picks
// "Request clarification" and drafts the email. Once sentConfirmed, the wait
// for the (simulated) answer is armed on replyDueAt; `answered` marks that
// the answer round was delivered, which reopens the normal decision flow.
export interface ClarificationRecord {
  draft: ComplaintDraft; // recipient, subject, body — user-editable before sending
  draftedAt: number;
  sentAt?: number;
  sentConfirmed?: boolean;
  answered?: boolean;
}

export type OutcomeVerdict = "resolved" | "unresolved";

// The one simulated final outcome per escalated complaint. Clearly labelled
// as a demo where it is shown; guidance is only filled when unresolved.
export interface FinalOutcomeRecord {
  replyText: string;
  meaning: string;
  verdict: OutcomeVerdict;
  guidance: string[];
  addedAt: number;
  isSimulated?: boolean;
}

export type CaseEventKind = "complaint" | "reply" | "decision" | "escalation" | "outcome";

export interface CaseTimelineEvent {
  id: string;
  label: string;
  at: number;
  kind: CaseEventKind;
}

export interface CaseSummary {
  problem: string;
  whatHappened: string;
  desiredOutcome: string;
}

export interface CaseDetails {
  issue: string | null;
  company: string | null;
  amount: string | null;
  date: string | null;
  goal: string | null;
  ready: boolean;
  quick: string[];
}

export interface CaseConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface EvidenceFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ComplaintDraft {
  recipient: string; // user-supplied and edited; never invented
  subject: string;
  body: string;
}

export type ReplyVerdict = "resolved" | "partially-resolved" | "unresolved" | "unclear";
// "resolved" is an app-side choice only (the user closes the case) — the
// model never emits it; its recommendation guard allows wait/clarify/escalate.
export type NextActionChoice = "wait" | "clarify" | "escalate" | "resolved";

export interface Recommendation {
  action: NextActionChoice;
  reason: string; // why this action, and why not the others when relevant
}

export interface CompanyReplyAnalysis {
  replyText: string;
  meaning: string;
  unresolved: string[];
  options: string[];
  verdict?: ReplyVerdict;
  recommendation?: Recommendation;
  decision?: { action: NextActionChoice; at: number };
  addedAt: number;
  handled: boolean;
  isSimulated?: boolean;
}

export interface Case {
  id: string;
  ownerEmail: string;
  company?: string;
  rawStory: string;
  summary?: CaseSummary;
  details?: CaseDetails;
  conversation?: CaseConversationTurn[];
  answers: string[];
  evidenceFiles: EvidenceFileMeta[];
  complaintDraft?: ComplaintDraft;
  status: CaseStatus;
  companyReply?: CompanyReplyAnalysis;
  // One escalation per complaint: the record exists only after escalation
  // drafting started, and once sentConfirmed the action is unavailable.
  escalation?: EscalationRecord;
  // One clarification round per reply (see ClarificationRecord).
  clarification?: ClarificationRecord;
  // One simulated final outcome per escalated complaint. The wait is armed
  // exactly once when escalation send is confirmed, cleared once saved.
  finalOutcome?: FinalOutcomeRecord;
  outcomeDueAt?: number;
  events?: CaseTimelineEvent[];
  createdAt: number;
  updatedAt?: number;
  sentAt?: number;
  // When the simulated demo reply may be shown. Set once when the complaint
  // is confirmed sent, cleared once the reply is saved; never re-armed.
  replyDueAt?: number;
}
