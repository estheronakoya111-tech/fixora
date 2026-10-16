"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CaseDetails } from "@/lib/case";
import type { CaseStatus, CaseTimelineEvent, ComplaintDraft, EvidenceFileMeta } from "@/lib/types";

type CaseProps = {
  details: CaseDetails;
  initialDraft?: ComplaintDraft;
  initialEvidence?: EvidenceFileMeta[];
  initialStatus?: CaseStatus;
  initialSentAt?: number;
  userName?: string;
  events?: CaseTimelineEvent[];
  onBack?: () => void;
  onSaveDraft?: (draft: ComplaintDraft) => void;
  onEvidenceChange?: (files: EvidenceFileMeta[]) => void;
  onStatusChange?: (status: CaseStatus) => void;
  onGoToReplies?: () => void;
};

type EvidenceFile = EvidenceFileMeta;
type Stage = "draft" | "ready" | "sent";

const STAGES: { id: Stage; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready" },
  { id: "sent", label: "Sent" },
];

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand to-brand-strong px-6 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-full before:border before:border-dashed before:border-white/35 hover:-translate-y-px active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand aria-disabled:pointer-events-none aria-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45 max-sm:gap-1.5 max-sm:rounded-xl max-sm:px-3 max-sm:py-2 max-sm:text-xs";

const SOFT3D =
  "rounded-full border border-border-strong bg-surface-sunken px-4 py-2.5 text-sm font-medium shadow-[0_3px_0_#D2CFC7,0_8px_14px_-8px_rgba(32,32,30,0.25)] transition-all hover:-translate-y-px hover:bg-border active:translate-y-[2px] active:shadow-[0_1px_0_#D2CFC7] disabled:opacity-50";

// Cuts the model's own sign-off (and any name it invented after it) so the
// real name is appended exactly once — no "Yours sincerely, A\n\nA" doubles.
// Done line-by-line so the letter body is never swallowed, only the closing
// sign-off block at the very end is removed.
const SIGNOFF_LINE = /^(yours\s+(sincerely|faithfully|truly)|kind\s+regards|best\s+regards|regards|sincerely|faithfully|truly|thank\s+you|thanks)[,.:!\s]*$/i;

// A short, capitalised, unpunctuated trailing line reads as an invented
// signature (e.g. "John Doe", "Billing Team") rather than letter content.
function isNameLine(s: string): boolean {
  if (!s || s.length > 40 || /[.!?,;:]/.test(s)) return false;
  if (s.split(/\s+/).length > 4) return false;
  return /^[A-Z][A-Za-z'.-]*(\s+[A-Z][A-Za-z'.-]*)*$/.test(s);
}

function signLetter(body: string, userName?: string): string {
  const trimmed = body.replace(/\s+$/g, "");
  if (!userName) return trimmed;
  const lines = trimmed.split("\n");
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) end--; // drop trailing blank lines
  const last = end - 1;
  if (last >= 0 && SIGNOFF_LINE.test(lines[last].trim())) {
    end = last; // sign-off is the final line — cut it
  } else if (last >= 1 && SIGNOFF_LINE.test(lines[last - 1].trim()) && isNameLine(lines[last].trim())) {
    end = last - 1; // sign-off + invented name — cut both
  }
  const base = lines.slice(0, end).join("\n").replace(/\s+$/g, "");
  return `${base}\n\nYours sincerely,\n\n${userName}`;
}

function template(d: CaseDetails) {
  const company = d.company ?? "your company";
  const issue = (d.issue ?? "a problem with my account").toLowerCase();
  const subject = d.issue ? `${d.issue}${d.amount ? ` (${d.amount})` : ""}` : `Complaint about ${company}`;
  const message = [
    `To the customer support team at ${company},`,
    `I am writing about ${issue}${d.amount ? ` involving ${d.amount}` : ""}${d.date ? `, which began on ${d.date}` : ""}.`,
    d.goal ? `What I would like is: ${d.goal.toLowerCase()}.` : "Please look into this and let me know how you plan to resolve it.",
    "Please reply in writing with what you will do and by when.",
    "Thank you.",
  ].join("\n\n");
  return { subject, message };
}

async function fetchDraft(d: CaseDetails) {
  try {
    const res = await fetch("/api/fixora/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    if (!res.ok) return null;
    return (await res.json()) as { subject: string; message: string };
  } catch {
    return null;
  }
}

function fileSize(bytes: number) {
  return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

function Clip() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 11l-8 8a5 5 0 01-7-7l8-8a3.5 3.5 0 015 5l-8 8a2 2 0 01-3-3l7-7" />
    </svg>
  );
}

// Small line icons for the card headers, matching the app's stroke style.
function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  steps: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
};

// The evidence chips + attach button, reused in the letter and the preview
// so files can be added or removed at every stage.
function EvidenceRow({ files, onRemove, onAdd }: { files: EvidenceFile[]; onRemove: (id: string) => void; onAdd: () => void }) {
  return (
    <div className="mt-4 border-t border-dashed border-border-strong pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f) => (
          <span key={f.id} className="flex items-center gap-2 rounded-full bg-surface-muted py-1.5 pl-3 pr-2 text-xs shadow-[0_2px_0_#E5E3DE]">
            <Clip />
            <span className="max-w-[10rem] truncate font-medium">{f.name}</span>
            <span className="text-muted">{f.type} · {fileSize(f.size)} · Added</span>
            <button type="button" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`} className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-border hover:text-foreground">✕</button>
          </span>
        ))}
        <button type="button" onClick={onAdd} className="rounded-full border border-dashed border-border-strong px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/50 hover:text-brand-700">
          + Evidence (optional)
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Fixora saves file names only. You attach the originals yourself when you send.</p>
    </div>
  );
}

export default function Case({ details, initialDraft, initialEvidence = [], initialStatus, initialSentAt, userName, events, onBack, onSaveDraft, onEvidenceChange, onStatusChange, onGoToReplies }: CaseProps) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 140, damping: 20 } as const);

  const seed = template(details);
  const initialBody = initialDraft?.body ?? signLetter(seed.message, userName);
  const [to, setTo] = useState(initialDraft?.recipient ?? "");
  const [subject, setSubject] = useState(initialDraft?.subject ?? seed.subject);
  const [message, setMessage] = useState(initialBody);
  const [polishing, setPolishing] = useState(!initialDraft);
  const edited = useRef(false);

  const [files, setFiles] = useState<EvidenceFile[]>(initialEvidence);
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>(
    initialStatus === "waiting-for-response" || initialStatus === "response-needs-attention" || initialStatus === "response-reviewed" || initialStatus === "escalated"
      ? "sent"
      : initialStatus === "ready-to-send"
        ? "ready"
        : "draft",
  );
  const [copied, setCopied] = useState(false);
  // An escalated case is only viewable here, never re-editable: the revert
  // button is hidden so storage cannot be downgraded past that milestone.
  const escalated = initialStatus === "escalated";
  const [sentOn, setSentOn] = useState(initialSentAt ? new Date(initialSentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

  const detailsKey = JSON.stringify(details);

  useEffect(() => {
    if (initialDraft) {
      return;
    }
    let live = true;
    (async () => {
      const draft = await fetchDraft(JSON.parse(detailsKey));
      if (live && draft && !edited.current) {
        setSubject(draft.subject);
        setMessage(signLetter(draft.message, userName));
      }
      if (live) setPolishing(false);
    })();
    return () => {
      live = false;
    };
  }, [detailsKey, initialDraft, userName]);

  useEffect(() => {
    if (!polishing) onSaveDraft?.({ recipient: to.trim(), subject, body: message });
  }, [polishing, to, subject, message, onSaveDraft]);

  useEffect(() => {
    onEvidenceChange?.(files);
  }, [files, onEvidenceChange]);

  async function redraft() {
    setPolishing(true);
    const draft = await fetchDraft(details);
    if (draft) {
      edited.current = false;
      setSubject(draft.subject);
      setMessage(signLetter(draft.message, userName));
    }
    setPolishing(false);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : "FILE",
      size: f.size,
    }));
    setFiles((cur) => [...cur, ...added]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeFile(id: string) {
    setFiles((cur) => cur.filter((x) => x.id !== id));
  }

  const validTo = /\S+@\S+\.\S+/.test(to.trim());
  const canContinue = validTo && !!message.trim() && !!subject.trim();
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${message}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  function markSent() {
    setSentOn(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    setStage("sent");
    onStatusChange?.("waiting-for-response");
  }

  function markReady() {
    setStage("ready");
    onStatusChange?.("ready-to-send");
  }

  const idx = STAGES.findIndex((s) => s.id === stage);
  const editable = stage === "draft";
  const line = "w-full bg-transparent font-body outline-none placeholder:text-subtle read-only:cursor-default";

  // One card explains the letter at every stage — what it is and what to do.
  const cardTitle = stage === "draft" ? "Your complaint letter" : stage === "ready" ? "Ready to send" : "The letter you sent";
  const cardBlurb =
    stage === "draft"
      ? "Fixora drafted this from your story. Edit anything — nothing leaves your account until you send it yourself."
      : stage === "ready"
        ? "This is exactly what Gmail will open. Read it over, then send it from your own email."
        : `This is the letter you sent on ${sentOn}. Your case now waits for the company's reply.`;

  const statusChip =
    stage === "draft"
      ? { label: "Draft", cls: "bg-surface-sunken text-muted" }
      : stage === "ready"
        ? { label: "Ready to send", cls: "bg-brand-soft text-brand-700" }
        : escalated
          ? { label: "Escalated", cls: "bg-warning-soft text-[#8a5a12]" }
          : { label: "Waiting for reply", cls: "bg-positive-soft text-positive-strong" };

  return (
    <div className="relative min-h-dvh overflow-hidden pb-36 text-foreground">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-positive-soft blur-3xl" />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-28 pt-4 md:px-8 md:pb-12">
        {/* Kept mounted at every stage so "Add evidence" always works. */}
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />

        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
            ← Cases
          </button>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusChip.cls}`}>{statusChip.label}</span>
        </div>

        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          {details.company ?? "Your case"}
          {details.amount ? ` · ${details.amount}` : ""}
        </h1>
        <p className="text-sm text-muted">{details.issue ?? "Complaint"}</p>

        {/* Progress stepper — always visible so you know where you are. */}
        <ol className="relative mt-7 flex" aria-label="Progress">
          <span aria-hidden className="absolute left-[16.7%] right-[16.7%] top-3 h-1 rounded-full bg-border" />
          <motion.span aria-hidden className="absolute left-[16.7%] right-[16.7%] top-3 h-1 origin-left rounded-full bg-positive/60" animate={{ scaleX: idx / 2 }} transition={spring} />
          {STAGES.map((s, i) => (
            <li key={s.id} aria-current={i === idx ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-2">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-[0_3px_0_#D2CFC7]">
                {i === idx && <motion.span layoutId="bead" transition={spring} className="absolute inset-0 rounded-full bg-brand shadow-[0_3px_0_#9A3F12,0_8px_14px_-6px_rgba(232,106,42,0.6)]" />}
                {i < idx && <span className="absolute inset-0 rounded-full bg-positive shadow-[0_3px_0_#46705A]" />}
              </span>
              <span className={`text-xs ${i === idx ? "font-medium" : "text-muted"}`}>{s.label}</span>
            </li>
          ))}
        </ol>

        {events && events.length > 0 && (
          <section aria-labelledby="case-timeline" className="mt-8 overflow-hidden rounded-3xl bg-surface shadow-card">
            <div className="flex items-center gap-3 border-b border-border/60 bg-surface-muted px-6 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon d={ICON.clock} className="h-4 w-4" /></span>
              <h2 id="case-timeline" className="font-heading text-sm font-semibold">Case timeline</h2>
            </div>
            <ol className="space-y-0 divide-y divide-border/50">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline gap-3 px-6 py-3 text-sm">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span className="font-medium">{event.label}</span>
                  <span className="ml-auto text-xs text-muted">{new Date(event.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The letter — one clear card, editable in draft and read-only after. */}
        <motion.section
          key="letter"
          aria-labelledby="letter"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mt-8 overflow-hidden rounded-3xl bg-surface shadow-card"
        >
          <div className="flex items-start gap-4 border-b border-border/60 bg-surface-muted px-6 py-5 sm:px-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
              <Icon d={stage === "sent" ? ICON.send : ICON.pen} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="letter" className="font-heading text-base font-semibold">{cardTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{cardBlurb}</p>
            </div>
          </div>

          <div className="px-6 pt-5 sm:px-8">
            <div className="space-y-2.5 rounded-2xl bg-surface-muted p-4 text-sm">
              <label className="flex items-baseline gap-3">
                <span className="w-8 shrink-0 text-xs font-medium text-muted">To</span>
                <input type="email" value={to} readOnly={!editable} onChange={(e) => setTo(e.target.value)} placeholder="support@company.com" aria-label="Recipient email" className={`${line} text-[15px] font-medium`} />
              </label>
              <label className="flex items-baseline gap-3">
                <span className="w-8 shrink-0 text-xs font-medium text-muted">Re</span>
                <input value={subject} readOnly={!editable} onChange={(e) => { edited.current = true; setSubject(e.target.value); }} aria-label="Subject" className={`${line} text-[15px]`} />
              </label>
            </div>
            {editable && <p className="mt-2 text-xs text-muted">Find the address on the company&apos;s contact page.</p>}
          </div>

          <div className="px-6 pb-6 pt-4 sm:px-8">
            {editable ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-semibold text-muted">Your letter</h3>
                  <span className="text-xs text-muted">{polishing ? "Fixora is polishing your draft..." : "Edit anything"}</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => { edited.current = true; setMessage(e.target.value); }}
                  aria-label="Message"
                  rows={12}
                  className="mt-3 w-full resize-y rounded-2xl bg-surface-muted p-4 text-[15px] leading-7 outline-none"
                />
              </>
            ) : (
              <p className="whitespace-pre-wrap rounded-2xl bg-surface-muted p-4 text-[15px] leading-7">{message}</p>
            )}
            <EvidenceRow files={files} onRemove={removeFile} onAdd={() => fileInput.current?.click()} />
          </div>
        </motion.section>

        {/* Ready stage: the three concrete steps to actually send it. */}
        {stage === "ready" && (
          <motion.ol initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-8 overflow-hidden rounded-3xl bg-surface shadow-card">
            <div className="flex items-center gap-3 border-b border-border/60 bg-surface-muted px-6 py-4 sm:px-8">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon d={ICON.steps} className="h-4 w-4" /></span>
              <h2 className="font-heading text-sm font-semibold">How to send it</h2>
            </div>
            <li className="flex gap-4 px-6 py-5 sm:px-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-[0_3px_0_#9A3F12]">1</span>
              <div className="min-w-0">
                <p className="font-medium">Open Gmail, already filled in</p>
                <p className="mt-1 text-sm text-muted">Use the button below. Prefer something else?</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <button type="button" onClick={copy} className="font-medium text-brand-strong hover:underline">{copied ? "Copied" : "Copy letter"}</button>
                  <a href={mailto} className="font-medium text-muted hover:text-foreground hover:underline">Open in another mail app</a>
                </div>
                {gmail.length > 1900 && <p className="mt-2 text-xs text-warning">This letter is long. If Gmail cuts it off, use Copy letter.</p>}
              </div>
            </li>
            <li className="flex gap-4 border-t border-border/50 px-6 py-5 sm:px-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted shadow-[0_3px_0_#D2CFC7]">2</span>
              <div className="min-w-0">
                <p className="font-medium">Attach your files in Gmail</p>
                {files.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs shadow-[0_2px_0_#E5E3DE]">
                        <Clip />
                        {f.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted">No evidence added. You can send without it.</p>
                )}
              </div>
            </li>
            <li className="flex gap-4 border-t border-border/50 px-6 py-5 sm:px-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted shadow-[0_3px_0_#D2CFC7]">3</span>
              <div>
                <p className="font-medium">Send it yourself, then tell us</p>
                <p className="mt-1 text-sm text-muted">You have the final say. Fixora never sends anything.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={markSent} className={SOFT3D}>I&apos;ve sent it</button>
                </div>
              </div>
            </li>
          </motion.ol>
        )}

        {/* Sent stage: what happens next, in plain terms. */}
        {stage === "sent" && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-8 overflow-hidden rounded-3xl bg-surface shadow-card">
            <div className="flex items-center gap-3 border-b border-border/60 bg-surface-muted px-6 py-4 sm:px-8">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-positive-soft text-positive-strong"><Icon d={ICON.clock} className="h-4 w-4" /></span>
              <h2 className="font-heading text-sm font-semibold">{escalated ? "Escalated — awaiting the final outcome" : "Waiting for reply"}</h2>
            </div>
            <div className="px-6 py-5 sm:px-8">
              {escalated ? (
                <>
                  <p className="text-sm leading-relaxed">Your escalation was sent and confirmed on {sentOn}. This complaint has used its one escalation, so this is the last automated step.</p>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed">
                    <li>• The labelled <strong>simulated final outcome</strong> — a demo, not a real company action — arrives on the Replies screen about a minute later, on its own.</li>
                    <li>• If it reads <strong>resolved</strong>, Fixora explains it and you can mark the complaint resolved there.</li>
                    <li>• If it reads <strong>unresolved</strong>, Fixora gives final guidance (who to contact, what to gather) and the workflow ends there — no endless loop.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed">Marked as sent on {sentOn}. Here is exactly what happens next:</p>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed">
                    <li>• Your case moves to <strong>Waiting for response</strong> and lives on the Replies screen.</li>
                    <li>• About a minute after sending, Fixora delivers a <strong>simulated demo reply</strong> — clearly labelled, not a real company message. It arrives on its own and only once; waiting or refreshing does not restart it or create a second one.</li>
                    <li>• Open the reply there: Fixora explains <strong>what the company said, what it means for you, and what you can do next</strong>.</li>
                    <li>• You then choose the next step: <strong>wait</strong>, <strong>request clarification</strong>, or <strong>escalate</strong> — escalating drafts a formal letter for you to review and send from Gmail (one escalation per complaint).</li>
                    <li>• Real companies can take much longer, so keep an eye on your real inbox too.</li>
                  </ol>
                </>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {onGoToReplies && (
                  <button type="button" onClick={onGoToReplies} className={BTN3D}>
                    Check replies &amp; notifications
                    <span aria-hidden>→</span>
                  </button>
                )}
                {!escalated && (
                  <button type="button" onClick={() => { setStage("ready"); onStatusChange?.("ready-to-send"); }} className="text-sm font-medium text-muted hover:text-foreground hover:underline">
                    I haven&apos;t sent it yet
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </main>

      <AnimatePresence mode="wait">
        {stage !== "sent" && (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={spring}
            className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
          >
            <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-surface/90 p-2 pl-3 shadow-lift backdrop-blur-md">
              {stage === "draft" ? (
                <>
                  <button type="button" onClick={redraft} disabled={polishing} className={SOFT3D}>Redraft</button>
                  <div className="flex items-center gap-3">
                    {!validTo && <span className="hidden text-xs text-muted sm:inline">Add who it&apos;s going to</span>}
                    <button type="button" onClick={markReady} disabled={!canContinue} className={BTN3D}>
                      Looks good
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setStage("draft")} className={SOFT3D}>Edit</button>
                  <a href={gmail} target="_blank" rel="noopener noreferrer" className={BTN3D}>
                    Open in Gmail
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
