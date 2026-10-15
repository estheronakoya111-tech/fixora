"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { nowMs } from "@/lib/case";
import type { Case as StoredCase, CompanyReplyAnalysis, ComplaintDraft, NextActionChoice } from "@/lib/types";

type Explanation = Pick<CompanyReplyAnalysis, "meaning" | "unresolved" | "options" | "verdict" | "recommendation">;
type View = { name: "list" } | { name: "paste"; id: string } | { name: "read"; id: string };

type RepliesProps = {
  cases: StoredCase[];
  onStartCase: () => void;
  onOpenCase: (caseId: string) => void;
  onSaveReply: (caseId: string, reply: CompanyReplyAnalysis) => void;
  onDecision: (caseId: string, action: NextActionChoice) => void;
  onSaveEscalationDraft: (caseId: string, draft: ComplaintDraft) => void;
  onEscalationSent: (caseId: string) => void;
};

const BTN3D = "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_5px_0_#9A3F12,0_16px_24px_-8px_rgba(232,106,42,0.65)] active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45";const SOFT3D = "rounded-xl border border-border-strong bg-surface-sunken px-4 py-2.5 text-sm font-medium shadow-[0_3px_0_#D2CFC7,0_8px_14px_-8px_rgba(32,32,30,0.25)] transition-all hover:-translate-y-px hover:bg-border active:translate-y-[2px]";
const GMAIL_INBOX = "https://mail.google.com/mail/u/0/#inbox";

const ACTION_LABELS: Record<NextActionChoice, string> = {
  wait: "Wait for the investigation",
  clarify: "Request clarification",
  escalate: "Escalate the complaint",
};

function formatDate(value?: number) {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(value);
}

async function explain(target: StoredCase, text: string): Promise<Explanation> {
  const response = await fetch("/api/fixora/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: target.company ?? target.details?.company,
      issue: target.details?.issue ?? target.summary?.problem,
      amount: target.details?.amount,
      reply: text,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Fixora could not explain that reply.");
  if (typeof data.meaning !== "string" || !Array.isArray(data.unresolved) || !Array.isArray(data.options)) {
    throw new Error("Fixora returned an incomplete explanation. Please try again.");
  }
  return {
    meaning: data.meaning,
    unresolved: data.unresolved.filter((item: unknown): item is string => typeof item === "string"),
    options: data.options.filter((item: unknown): item is string => typeof item === "string"),
    ...(typeof data.verdict === "string" ? { verdict: data.verdict as Explanation["verdict"] } : {}),
    ...(data.recommendation && typeof data.recommendation.action === "string" && typeof data.recommendation.reason === "string"
      ? { recommendation: data.recommendation as NonNullable<Explanation["recommendation"]> }
      : {}),
  };
}

export default function Replies({ cases, onStartCase, onOpenCase, onSaveReply, onDecision, onSaveEscalationDraft, onEscalationSent }: RepliesProps) {
  const [view, setView] = useState<View>({ name: "list" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Escalation drafting: local until first saved, then persisted on every
  // edit — so a refresh keeps the draft (feature 1) without restarting it.
  const [escDraft, setEscDraft] = useState<ComplaintDraft | null>(null);
  const [escBusy, setEscBusy] = useState(false);
  const [escError, setEscError] = useState<string | null>(null);
  const [escConfirm, setEscConfirm] = useState(false);
  // Ticks while you wait, so the demo-reply countdown reads live.
  const [now, setNow] = useState(nowMs());

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const waiting = cases.filter((item) => item.status === "waiting-for-response" && !item.companyReply);
  const replies = cases.filter((item) => Boolean(item.companyReply));
  const attention = replies.filter((item) => !item.companyReply?.handled);
  const handled = replies.filter((item) => item.companyReply?.handled);
  const current = view.name === "read" ? replies.find((item) => item.id === view.id) : undefined;
  const target = view.name === "paste" ? waiting.find((item) => item.id === view.id) : undefined;
  // Draft-handoff links, recomputed from the live draft so edits show in Gmail.
  const escMailto = escDraft && current
    ? `mailto:${encodeURIComponent(escDraft.recipient.trim())}?subject=${encodeURIComponent(escDraft.subject)}&body=${encodeURIComponent(escDraft.body)}`
    : "";
  const escGmail = escDraft
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(escDraft.recipient.trim())}&su=${encodeURIComponent(escDraft.subject)}&body=${encodeURIComponent(escDraft.body)}`
    : "";

  function enterRead(id: string) {
    setEscDraft(null);
    setEscError(null);
    setEscConfirm(false);
    setView({ name: "read", id });
  }

  function updateEscDraft(next: ComplaintDraft) {
    setEscDraft(next);
    if (current) onSaveEscalationDraft(current.id, next);
  }

  function openPaste(id: string) {
    setText("");
    setError(null);
    setView({ name: "paste", id });
  }

  async function readIt() {
    if (!target) return;
    const savedAt = nowMs();
    setBusy(true);
    setError(null);
    try {
      const explanation = await explain(target, text.trim());
      onSaveReply(target.id, { ...explanation, replyText: text.trim(), addedAt: savedAt, handled: false });
      setView({ name: "read", id: target.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fixora could not read that just now. Your text is still here, so try again.");
    } finally {
      setBusy(false);
    }
  }

  // Asks the Groq escalation task for a formal draft built from the saved
  // complaint, the company reply, and what the reply left unanswered.
  async function draftEscalation() {
    if (!current?.companyReply) return;
    setEscBusy(true);
    setEscError(null);
    try {
      const response = await fetch("/api/fixora/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: current.company ?? current.details?.company,
          issue: current.details?.issue ?? current.summary?.problem,
          amount: current.details?.amount,
          date: current.details?.date,
          goal: current.details?.goal ?? current.summary?.desiredOutcome,
          rawStory: current.rawStory,
          complaint: current.complaintDraft?.body ?? "",
          reply: current.companyReply.replyText,
          unresolved: current.companyReply.unresolved,
          reason: current.companyReply.recommendation?.reason ?? "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Fixora could not draft the escalation. Please try again.");
      if (typeof data.subject !== "string" || typeof data.message !== "string") {
        throw new Error("Fixora returned an incomplete draft. Please try again.");
      }
      const drafted: ComplaintDraft = {
        recipient: current.complaintDraft?.recipient ?? "",
        subject: data.subject as string,
        body: data.message as string,
      };
      setEscDraft(drafted);
      setEscConfirm(false);
      onSaveEscalationDraft(current.id, drafted);
    } catch (cause) {
      setEscError(cause instanceof Error ? cause.message : "Fixora could not draft the escalation. Please try again.");
    } finally {
      setEscBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-5 pb-28 pt-4 text-foreground md:px-8 md:pb-12">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">Case updates</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">Replies</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Track company responses in one place. When a reply arrives, paste it here and Fixora will explain it.</p>
        </div>
        <button type="button" onClick={onStartCase} className={`${BTN3D} max-sm:rounded-lg max-sm:px-3 max-sm:py-2 max-sm:text-xs max-sm:gap-1.5`}>
          <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none max-sm:h-4 max-sm:w-4 max-sm:text-[11px]">+</span> Start a case
        </button>
      </header>

      {view.name === "list" && <>
        <Reveal>
        <section aria-label="Reply overview" className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface p-5 shadow-card"><p className="text-sm font-medium text-muted">Needs review</p><p className="mt-2 font-heading text-3xl font-semibold">{attention.length}</p><p className="mt-1 text-xs text-muted">Company replies to check</p></div>
          <div className="rounded-2xl bg-surface p-5 shadow-card"><p className="text-sm font-medium text-muted">Waiting</p><p className="mt-2 font-heading text-3xl font-semibold">{waiting.length}</p><p className="mt-1 text-xs text-muted">Sent cases with no reply yet</p></div>
          <div className="rounded-2xl bg-surface p-5 shadow-card"><p className="text-sm font-medium text-muted">Reviewed</p><p className="mt-2 font-heading text-3xl font-semibold">{handled.length}</p><p className="mt-1 text-xs text-muted">Replies you marked handled</p></div>
        </section>
        </Reveal>

        {attention.length > 0 && <Reveal x={-24} y={0}>
        <section aria-labelledby="needs" className="mt-10">
          <div className="mb-4"><h2 id="needs" className="font-heading text-lg font-semibold">Needs your attention</h2><p className="mt-1 text-sm text-muted">Open a reply to read Fixora&apos;s summary and possible next steps.</p></div>
          <ul className="mt-3 space-y-4">{attention.map((item) =>          <li key={item.id}>
            <button type="button" onClick={() => enterRead(item.id)} className="group relative block w-full overflow-hidden rounded-2xl bg-surface p-5 pl-7 text-left shadow-lift transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-brand">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
              <div className="flex items-start justify-between gap-4"><p className="font-heading text-lg font-semibold">{item.company ?? item.details?.company ?? "Company"}</p>{item.details?.amount && <p className="font-heading text-lg font-semibold">{item.details.amount}</p>}</div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">&ldquo;{item.companyReply?.replyText}&rdquo;</p>
              <p className="mt-3 text-sm"><span className="text-muted">Fixora:</span> <span className="font-medium">{item.companyReply?.meaning}</span></p>
              <p className="mt-4 text-sm text-muted">Added {formatDate(item.companyReply?.addedAt)}</p>
            </button>
          </li>)}</ul>
        </section>
        </Reveal>}

        {waiting.length > 0 && <Reveal x={24} y={0}>
        <section aria-labelledby="waiting" className="mt-10">
          <div className="mb-4"><h2 id="waiting" className="font-heading text-lg font-semibold">Waiting for a reply</h2><p className="mt-1 text-sm text-muted">Check Gmail first, then paste the company&apos;s reply here. A clearly labelled simulated demo reply also arrives on its own about a minute after sending.</p></div>
          <ul className="mt-3 space-y-3">{waiting.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-5 shadow-card">
            <div>
              <p className="font-heading font-semibold">{item.company ?? item.details?.company ?? "Company"}{item.details?.amount ? ` · ${item.details.amount}` : ""}</p><p className="text-sm text-muted">{item.details?.issue ?? item.summary?.problem ?? "Complaint"} · Sent {formatDate(item.sentAt)}</p>
              {item.replyDueAt && (item.replyDueAt > now ? (
                <p className="mt-2 text-xs font-medium text-brand-strong">Simulated demo reply due around {new Date(item.replyDueAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · in {Math.max(1, Math.round((item.replyDueAt - now) / 1000))}s</p>
              ) : (
                <p className="mt-2 text-xs font-medium text-brand-strong">Simulated demo reply arriving…</p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={GMAIL_INBOX} target="_blank" rel="noopener noreferrer" className={SOFT3D}>Check Gmail</a>
              <button type="button" onClick={() => openPaste(item.id)} className={SOFT3D}>Paste reply</button>
            </div>
          </li>)}</ul>
        </section>
        </Reveal>}

        {handled.length > 0 && <Reveal x={-24} y={0}>
        <section aria-labelledby="handled" className="mt-10">
          <div className="mb-4"><h2 id="handled" className="font-heading text-lg font-semibold">Reviewed replies</h2><p className="mt-1 text-sm text-muted">You can reopen any of these whenever you need them.</p></div>
          <ul className="mt-3 divide-y divide-border/60 rounded-2xl bg-surface shadow-card">{handled.map((item) => <li key={item.id}>
            <button type="button" onClick={() => enterRead(item.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm transition-colors hover:bg-surface-muted">
              <span className="font-medium">
                {item.company ?? item.details?.company ?? "Company"}
                {item.companyReply?.isSimulated && <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">Simulated</span>}
                <span className="font-normal text-muted"> · {item.companyReply?.meaning}</span>
              </span>
              <span aria-hidden>→</span>
            </button>
          </li>)}</ul>
        </section>
        </Reveal>}

        {replies.length === 0 && waiting.length === 0 && <Reveal><div className="mt-6 rounded-3xl bg-surface p-8 text-center shadow-card md:p-12"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-xl text-brand-strong" aria-hidden>↗</span><h2 className="mt-4 font-heading text-xl font-semibold">No sent cases yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">After you send a complaint, mark its case as waiting for a reply. It will show up here so you can add the company&apos;s response.</p><button type="button" onClick={onStartCase} className={`${BTN3D} mt-6`}>Start your first case</button></div></Reveal>}
      </>}

      {view.name === "paste" && target && <>
        <button type="button" onClick={() => setView({ name: "list" })} className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-foreground">← Replies</button>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{target.company ?? target.details?.company ?? "Company"} replied?</h1>
            <p className="mt-1 text-muted">Copy their email and paste it here.</p>
          </div>
        </div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} maxLength={4000} aria-label="Company reply" placeholder="Paste their reply..." className="mt-6 w-full resize-y rounded-2xl bg-surface p-5 text-[15px] leading-7 shadow-card outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-brand/30" />
        <div className="mt-2 text-xs text-muted">Your reply text and case details are sent to Groq to generate an explanation, then saved in this browser.</div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => readIt()} disabled={busy || text.trim().length < 10} className={BTN3D}>
            {busy ? "Reading..." : "Read it with Fixora"}<span aria-hidden>{busy ? "" : "→"}</span>
          </button>
          <p className="text-xs text-muted">Fixora&apos;s explanation can be wrong. Check it against the company&apos;s message.</p>
        </div>
      </>}

      {view.name === "read" && current?.companyReply && <>
        <button type="button" onClick={() => setView({ name: "list" })} className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-foreground">← Replies</button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{current.company ?? current.details?.company ?? "Company"}{current.details?.amount ? ` · ${current.details.amount}` : ""}</h1>
          {current.companyReply.verdict === "resolved" && <span className="rounded-full bg-positive-soft px-3 py-1 font-heading text-xs font-semibold text-positive-strong">Looks resolved</span>}
          {current.companyReply.verdict === "partially-resolved" && <span className="rounded-full bg-warning-soft px-3 py-1 font-heading text-xs font-semibold text-[#8a5a12]">Partially resolved</span>}
          {current.companyReply.verdict === "unresolved" && <span className="rounded-full bg-danger-soft px-3 py-1 font-heading text-xs font-semibold text-danger">Still unresolved</span>}
          {current.companyReply.verdict === "unclear" && <span className="rounded-full bg-surface-sunken px-3 py-1 font-heading text-xs font-semibold text-muted">Not clear yet</span>}
          {current.companyReply.isSimulated && (
            <span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 font-heading text-xs font-semibold text-[#8a5a12]">
              Simulated company reply (Demo)
            </span>
          )}
        </div>
        <p className="mt-1 text-muted">{current.details?.issue ?? current.summary?.problem ?? "Saved case"}</p>
        <section className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-muted">What the company is saying</h2>
            {current.companyReply.isSimulated && <span className="text-xs text-muted">Simulated message</span>}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{current.companyReply.replyText}</p>
        </section>
        <section className="mt-4 rounded-3xl bg-surface p-6 shadow-lift"><h2 className="font-heading text-base font-semibold">What this means for you</h2><p className="mt-3 text-[15px] leading-7">{current.companyReply.meaning}</p>
          {current.companyReply.unresolved.length > 0 && <><h3 className="mt-6 font-heading text-sm font-semibold text-muted">What they didn&apos;t address</h3><ul className="mt-2 space-y-1.5 text-[15px]">{current.companyReply.unresolved.map((entry) => <li key={entry}>• {entry}</li>)}</ul></>}
        </section>

        <section aria-label="Choose your next action" className="mt-4 rounded-3xl border border-border-strong bg-surface p-6 shadow-lift">
          <h2 className="font-heading text-base font-semibold">Choose your next step</h2>
          {current.companyReply.recommendation && !current.companyReply.decision && (
            <p className="mt-2 text-sm leading-6 text-muted">
              Fixora suggests <span className="font-semibold text-foreground">{ACTION_LABELS[current.companyReply.recommendation.action]}</span> — {current.companyReply.recommendation.reason}
            </p>
          )}
          {current.companyReply.decision && (
            <p className="mt-2 text-sm leading-6 text-muted">
              You chose <span className="font-semibold text-foreground">{ACTION_LABELS[current.companyReply.decision.action]}</span>
              {current.companyReply.decision.action === "escalate" ? " — the escalation steps are below." : "."} You can change it below while the complaint is open.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(ACTION_LABELS) as NextActionChoice[]).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onDecision(current.id, action)}
                disabled={current.companyReply?.decision?.action === action || current.escalation?.sentConfirmed}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  current.companyReply?.recommendation?.action === action
                    ? "bg-brand-soft font-semibold text-brand-strong ring-2 ring-brand/40 hover:bg-brand-soft/80"
                    : action === "escalate"
                      ? "border border-dashed border-brand/60 bg-transparent text-brand-strong hover:bg-brand-soft/40"
                      : SOFT3D
                } ${current.companyReply?.decision?.action === action ? "font-semibold" : ""}`}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
          {current.companyReply.options.length > 0 && (
            <><h3 className="mt-6 font-heading text-sm font-semibold text-muted">Fixora&apos;s other suggestions</h3><ul className="mt-2 space-y-2">{current.companyReply.options.map((entry) => <li key={entry} className="rounded-xl bg-surface-muted px-4 py-3 text-[15px]">{entry}</li>)}</ul></>
          )}
        </section>
        {current.escalation?.sentConfirmed && (
          <section className="mt-4 rounded-3xl border-l-4 border-l-brand bg-surface p-6 shadow-card">
            <h2 className="font-heading text-lg font-semibold">Escalated — awaiting the final outcome</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Your escalation was sent on {formatDate(current.escalation.sentAt)}. A complaint carries only one escalation, so the escalation action is now closed for this case.
              The simulated final outcome — clearly labelled as a demo, not a real company action — arrives here on its own.
            </p>
          </section>
        )}

        {current.companyReply.decision?.action === "escalate" && !current.escalation?.sentConfirmed && (
          <section aria-labelledby="escalate" className="mt-4 rounded-3xl border border-brand/50 bg-surface p-6 shadow-lift">
            <h2 id="escalate" className="font-heading text-base font-semibold">Escalating this complaint</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {current.companyReply.recommendation?.action === "escalate"
                ? current.companyReply.recommendation.reason
                : "Escalation makes sense when the reply refused without a good reason or ignored what you asked for. Fixora drafts the letter — you decide whether it goes out."}
            </p>
            {escError && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{escError}</p>}
            {!escDraft && (
              <button type="button" onClick={draftEscalation} disabled={escBusy} className={`${BTN3D} mt-4`}>
                {escBusy ? "Drafting the escalation..." : "Draft the escalation"}
              </button>
            )}
            {escDraft && (
              <>
                <p className="mt-4 text-sm text-muted">Edit anything below. When it reads right, send it from Gmail yourself.</p>
                <div className="mt-3 space-y-2.5 rounded-2xl bg-surface-muted p-4">
                  <label className="flex items-baseline gap-3 text-sm">
                    <span className="w-8 shrink-0 text-xs font-medium text-muted">To</span>
                    <input
                      type="email"
                      value={escDraft.recipient}
                      onChange={(event) => updateEscDraft({ ...escDraft, recipient: event.target.value })}
                      placeholder="support@company.com"
                      aria-label="Escalation recipient"
                      className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-subtle"
                    />
                  </label>
                  <label className="flex items-baseline gap-3 text-sm">
                    <span className="w-8 shrink-0 text-xs font-medium text-muted">Re</span>
                    <input
                      value={escDraft.subject}
                      onChange={(event) => updateEscDraft({ ...escDraft, subject: event.target.value })}
                      aria-label="Escalation subject"
                      className="w-full bg-transparent text-[15px] outline-none"
                    />
                  </label>
                  <textarea
                    value={escDraft.body}
                    onChange={(event) => updateEscDraft({ ...escDraft, body: event.target.value })}
                    rows={10}
                    aria-label="Escalation letter"
                    className="w-full resize-y bg-transparent text-[15px] leading-7 outline-none"
                  />
                </div>
                <ol className="mt-5 space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-[0_2px_0_#9A3F12]">1</span>
                    <div>
                      <p className="font-medium">Open Gmail, already filled in</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <a href={escGmail} target="_blank" rel="noopener noreferrer" className={SOFT3D}>Open in Gmail</a>
                        <a href={escMailto} className="text-sm font-medium text-muted hover:text-foreground hover:underline">Another mail app</a>
                        <button type="button" onClick={draftEscalation} disabled={escBusy} className="text-sm font-medium text-brand-strong hover:underline">
                          {escBusy ? "Redrafting..." : "Redraft"}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-[0_2px_0_#9A3F12]">2</span>
                    <div>
                      <p className="font-medium">Send it yourself, then tell Fixora</p>
                      <p className="mt-1 text-muted">Nothing is sent from Fixora. You have the final say.</p>
                      {!escConfirm ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button type="button" onClick={() => setEscConfirm(true)} className={SOFT3D}>I&apos;ve sent it</button>
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-sunken p-3">
                          <span className="text-sm font-medium">Did the escalation email actually leave your outbox?</span>
                          <button type="button" onClick={() => onEscalationSent(current.id)} className={BTN3D}>Yes — it&apos;s sent</button>
                          <button type="button" onClick={() => setEscConfirm(false)} className="text-sm font-medium text-muted hover:text-foreground">Not yet</button>
                        </div>
                      )}
                    </div>
                  </li>
                </ol>
              </>
            )}
          </section>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" onClick={() => onOpenCase(current.id)} className={SOFT3D}>Open case</button></div>
        <p className="mt-4 text-xs text-muted">This explanation may be wrong and isn&apos;t legal advice. Check it against what the company wrote.</p>
      </>}
    </main>

  );
}
