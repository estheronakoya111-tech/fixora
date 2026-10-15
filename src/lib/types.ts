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
  | "escalated";

export interface EscalationRecord {
  draft: ComplaintDraft; // recipient, subject, body — user-editable before sending
  draftedAt: number;
  // Set exactly once when the user confirms they sent the escalation email.
  // Once sentConfirmed, this escalation is finished: no new escalation can start.
  sentAt?: number;
  sentConfirmed?: boolean;
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
export type NextActionChoice = "wait" | "clarify" | "escalate";

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
  events?: CaseTimelineEvent[];
  createdAt: number;
  updatedAt?: number;
  sentAt?: number;
  // When the simulated demo reply may be shown. Set once when the complaint
  // is confirmed sent, cleared once the reply is saved; never re-armed.
  replyDueAt?: number;
}
