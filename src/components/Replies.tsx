"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";
import { nowMs } from "@/lib/case";
import { SIMULATED_REPLY } from "@/lib/demo-reply";
import type { Case as StoredCase, CompanyReplyAnalysis } from "@/lib/types";

type Explanation = Pick<CompanyReplyAnalysis, "meaning" | "unresolved" | "options">;
type View = { name: "list" } | { name: "paste"; id: string } | { name: "read"; id: string };

type RepliesProps = {
  cases: StoredCase[];
  onStartCase: () => void;
  onOpenCase: (caseId: string) => void;
  onSaveReply: (caseId: string, reply: CompanyReplyAnalysis) => void;
  onMarkHandled: (caseId: string, handled: boolean) => void;
};

const BTN3D = "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_5px_0_#9A3F12,0_16px_24px_-8px_rgba(232,106,42,0.65)] active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45";const SOFT3D = "rounded-xl border border-border-strong bg-surface-sunken px-4 py-2.5 text-sm font-medium shadow-[0_3px_0_#D2CFC7,0_8px_14px_-8px_rgba(32,32,30,0.25)] transition-all hover:-translate-y-px hover:bg-border active:translate-y-[2px]";
const GMAIL_INBOX = "https://mail.google.com/mail/u/0/#inbox";

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
  };
}

export default function Replies({ cases, onStartCase, onOpenCase, onSaveReply, onMarkHandled }: RepliesProps) {
  const [view, setView] = useState<View>({ name: "list" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waiting = cases.filter((item) => item.status === "waiting-for-response" && !item.companyReply);
  const replies = cases.filter((item) => Boolean(item.companyReply));
  const attention = replies.filter((item) => !item.companyReply?.handled);
  const handled = replies.filter((item) => item.companyReply?.handled);
  const current = view.name === "read" ? replies.find((item) => item.id === view.id) : undefined;
  const target = view.name === "paste" ? waiting.find((item) => item.id === view.id) : undefined;

  function openPaste(id: string) {
    setText("");
    setError(null);
    setView({ name: "paste", id });
  }

  async function simulateReply(targetCase: StoredCase) {
    const savedAt = nowMs();
    setBusy(true);
    setError(null);
    try {
      const explanation = await explain(targetCase, SIMULATED_REPLY.body);
      onSaveReply(targetCase.id, {
        ...explanation,
        replyText: SIMULATED_REPLY.body,
        addedAt: savedAt,
        handled: false,
        isSimulated: true,
      });
      setView({ name: "read", id: targetCase.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fixora could not generate the simulated reply explanation.");
    } finally {
      setBusy(false);
    }
  }

  async function readIt(isSimulated = false) {
    if (!target) return;
    const savedAt = nowMs();
    setBusy(true);
    setError(null);
    try {
      const explanation = await explain(target, text.trim());
      onSaveReply(target.id, { ...explanation, replyText: text.trim(), addedAt: savedAt, handled: false, isSimulated });
      setView({ name: "read", id: target.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fixora could not read that just now. Your text is still here, so try again.");
    } finally {
      setBusy(false);
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
          <ul className="mt-3 space-y-4">{attention.map((item) => <li key={item.id}>
            <button type="button" onClick={() => setView({ name: "read", id: item.id })} className="group relative block w-full overflow-hidden rounded-2xl bg-surface p-5 pl-7 text-left shadow-lift transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-brand">
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
          <div className="mb-4"><h2 id="waiting" className="font-heading text-lg font-semibold">Waiting for a reply</h2><p className="mt-1 text-sm text-muted">Check Gmail first, then paste the company&apos;s reply here or use the fictional demo reply.</p></div>
          <ul className="mt-3 space-y-3">{waiting.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-5 shadow-card">
            <div><p className="font-heading font-semibold">{item.company ?? item.details?.company ?? "Company"}{item.details?.amount ? ` · ${item.details.amount}` : ""}</p><p className="text-sm text-muted">{item.details?.issue ?? item.summary?.problem ?? "Complaint"} · Sent {formatDate(item.sentAt)}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={GMAIL_INBOX} target="_blank" rel="noopener noreferrer" className={SOFT3D}>Check Gmail</a>
              <button type="button" onClick={() => simulateReply(item)} disabled={busy} className="rounded-xl border border-dashed border-brand/60 bg-brand-soft/50 px-3.5 py-2 text-xs font-semibold text-brand-strong transition-colors hover:bg-brand-soft">
                {busy ? "Simulating..." : "⚡ Simulate company reply"}
              </button>
              <button type="button" onClick={() => openPaste(item.id)} className={SOFT3D}>Paste reply</button>
            </div>
          </li>)}</ul>
        </section>
        </Reveal>}

        {handled.length > 0 && <Reveal x={-24} y={0}>
        <section aria-labelledby="handled" className="mt-10">
          <div className="mb-4"><h2 id="handled" className="font-heading text-lg font-semibold">Reviewed replies</h2><p className="mt-1 text-sm text-muted">You can reopen any of these whenever you need them.</p></div>
          <ul className="mt-3 divide-y divide-border/60 rounded-2xl bg-surface shadow-card">{handled.map((item) => <li key={item.id}>
            <button type="button" onClick={() => setView({ name: "read", id: item.id })} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm transition-colors hover:bg-surface-muted">
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
            <p className="mt-1 text-muted">Copy their email and paste it here, or load the fictional demo reply.</p>
          </div>
          <button
            type="button"
            onClick={() => setText(SIMULATED_REPLY.body)}
            className="rounded-xl border border-dashed border-brand/60 bg-brand-soft/60 px-3.5 py-2 text-xs font-semibold text-brand-strong hover:bg-brand-soft"
          >
            Insert simulated reply
          </button>
        </div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} maxLength={4000} aria-label="Company reply" placeholder="Paste their reply..." className="mt-6 w-full resize-y rounded-2xl bg-surface p-5 text-[15px] leading-7 shadow-card outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-brand/30" />
        <div className="mt-2 text-xs text-muted">Your reply text and case details are sent to Groq to generate an explanation, then saved in this browser.</div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => readIt(text.includes("Dear customer") && text.includes("Billing Department"))} disabled={busy || text.trim().length < 10} className={BTN3D}>
            {busy ? "Reading..." : "Read it with Fixora"}<span aria-hidden>{busy ? "" : "→"}</span>
          </button>
          <p className="text-xs text-muted">Fixora&apos;s explanation can be wrong. Check it against the company&apos;s message.</p>
        </div>
      </>}

      {view.name === "read" && current?.companyReply && <>
        <button type="button" onClick={() => setView({ name: "list" })} className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-foreground">← Replies</button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{current.company ?? current.details?.company ?? "Company"}{current.details?.amount ? ` · ${current.details.amount}` : ""}</h1>
          {current.companyReply.isSimulated && (
            <span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 font-heading text-xs font-semibold text-[#8a5a12]">
              Simulated company reply (Demo)
            </span>
          )}
        </div>
        <p className="mt-1 text-muted">{current.details?.issue ?? current.summary?.problem ?? "Saved case"}</p>
        <section className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-muted">What the company said</h2>
            {current.companyReply.isSimulated && <span className="text-xs text-muted">Simulated message</span>}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{current.companyReply.replyText}</p>
        </section>
        <section className="mt-4 rounded-3xl bg-surface p-6 shadow-lift"><h2 className="font-heading text-base font-semibold">What this means</h2><p className="mt-3 text-[15px] leading-7">{current.companyReply.meaning}</p>
          {current.companyReply.unresolved.length > 0 && <><h3 className="mt-6 font-heading text-sm font-semibold text-muted">What they didn&apos;t address</h3><ul className="mt-2 space-y-1.5 text-[15px]">{current.companyReply.unresolved.map((entry) => <li key={entry}>• {entry}</li>)}</ul></>}
          {current.companyReply.options.length > 0 && <><h3 className="mt-6 font-heading text-sm font-semibold text-muted">What you can do</h3><ul className="mt-2 space-y-2">{current.companyReply.options.map((entry) => <li key={entry} className="rounded-xl bg-surface-muted px-4 py-3 text-[15px]">{entry}</li>)}</ul></>}
        </section>
        <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" onClick={() => onOpenCase(current.id)} className={SOFT3D}>Open case</button><button type="button" onClick={() => onMarkHandled(current.id, !current.companyReply?.handled)} className="px-2 text-sm font-medium text-muted hover:text-foreground">{current.companyReply.handled ? "Mark as needs attention" : "Mark as handled"}</button></div>
        <p className="mt-4 text-xs text-muted">This explanation may be wrong and isn&apos;t legal advice. Check it against what the company wrote.</p>
      </>}
    </main>

  );
}
