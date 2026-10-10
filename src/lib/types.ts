// Shared shapes for Fix This (spec: Data Model).
// Browser records are demo data; storage keys are scoped in storage.ts.

export type Task = "summarize" | "ask-next" | "draft-complaint" | "explain-reply";

export interface DemoProfile {
  firstName: string;
  lastName: string;
  email: string; // normalized lowercase; identifies this browser's demo profile
}

export type CaseStatus =
  | "in-progress"
  | "ready-to-send"
  | "waiting-for-response"
  | "response-needs-attention"
  | "response-reviewed";

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

export interface CompanyReplyAnalysis {
  replyText: string;
  meaning: string;
  unresolved: string[];
  options: string[];
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
  createdAt: number;
  updatedAt?: number;
  sentAt?: number;
}
