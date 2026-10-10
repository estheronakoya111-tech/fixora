"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Reveal from "@/components/Reveal";
import SearchPopup, { type SearchMatch } from "@/components/SearchPopup";
import { FixoraLogo } from "@/components/logo/FixoraLogo";
import type { Case as SavedCase, CaseStatus } from "@/lib/types";

const STATUS: Record<CaseStatus, { label: string; badge: string }> = {
  "in-progress": { label: "In progress", badge: "bg-surface-sunken text-muted" },
  "ready-to-send": { label: "Ready to send", badge: "bg-brand-soft text-brand-700" },
  "waiting-for-response": { label: "Waiting for reply", badge: "bg-positive-soft text-positive-strong" },
  "response-needs-attention": { label: "Reply needs attention", badge: "bg-brand-soft text-brand-700" },
  "response-reviewed": { label: "Reply reviewed", badge: "bg-positive-soft text-positive-strong" },
};

const PHASES = [
  { title: "Discover", hint: "Details confirmed" },
  { title: "Prove", hint: "Evidence added" },
  { title: "Review", hint: "Check your letter" },
  { title: "Solve", hint: "Send and follow up" },
];

// Navigation is shared by the app shell in AppSidebar.

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_5px_0_#9A3F12,0_16px_24px_-8px_rgba(232,106,42,0.65)] active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

function Badge({ status }: { status: CaseStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      {s.label}
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function phaseStyles(i: number, active: number) {
  const state = i < active ? "done" : i === active ? "active" : "locked";
  return {
    state,
    shell: {
      active: "border-brand-400 bg-gradient-to-br from-brand to-brand-strong text-white shadow-brand",
      done: "border-positive/30 bg-surface shadow-card",
      locked: "border-dashed border-border-strong bg-surface-muted text-muted",
    }[state],
    badge: {
      active: "bg-white/20 text-white",
      done: "bg-positive text-white",
      locked: "bg-surface-sunken text-muted",
    }[state],
  };
}

function PhaseBody({ i, active }: { i: number; active: number }) {
  const { state, badge } = phaseStyles(i, active);
  return (
    <>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${badge}`}>
        {state === "done" ? <Check /> : i + 1}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm font-semibold">{PHASES[i].title}</span>
        <span className={`block truncate text-xs ${state === "active" ? "text-white/85" : "text-muted"}`}>{PHASES[i].hint}</span>
      </span>
    </>
  );
}

const CW = 200;
const CH = 52;
const LEFT = [0, 80, 160, 240];
const TOP = [0, 70, 140, 210];

function Hub({ active }: { active: number }) {
  return (
    <>
      <div className="hidden justify-center py-10 sm:flex" style={{ perspective: 1100 }}>
        <div
          className="relative"
          style={{ width: 440, height: 262, transform: "rotateX(16deg) rotateY(-12deg)", transformStyle: "preserve-3d" }}
        >
          <div
            aria-hidden
            className="absolute -inset-6 rounded-3xl bg-surface-muted"
            style={{
              transform: "translateZ(-50px)",
              backgroundImage: "radial-gradient(rgba(32,32,30,0.12) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              boxShadow: "0 40px 60px -30px rgba(32,32,30,0.22)",
            }}
          />
          <svg aria-hidden viewBox="0 0 440 262" className="absolute inset-0 h-full w-full" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {[0, 1, 2].map((i) => {
              const sx = LEFT[i] + 130;
              const sy = TOP[i] + CH;
              const ex = LEFT[i + 1] + 60;
              const ey = TOP[i + 1];
              const color = i < active ? "#E86A2A" : "#D2CFC7";
              return (
                <g key={i} stroke={color}>
                  <path d={`M${sx} ${sy} C${sx} ${sy + 10} ${ex} ${ey - 10} ${ex} ${ey - 3}`} />
                  <path d={`M${ex - 4} ${ey - 8} L${ex} ${ey - 2} L${ex + 4} ${ey - 8}`} />
                </g>
              );
            })}
          </svg>
          {PHASES.map((p, i) => (
            <div
              key={p.title}
              className={`absolute flex items-center gap-3 rounded-2xl border px-4 ${phaseStyles(i, active).shell}`}
              style={{
                left: LEFT[i],
                top: TOP[i],
                width: CW,
                height: CH,
                transform: `translateZ(${i * 10 + (i === active ? 50 : i < active ? 20 : 0)}px)`,
              }}
            >
              <PhaseBody i={i} active={active} />
            </div>
          ))}
        </div>
      </div>

      <ol className="space-y-3 py-6 sm:hidden">
        {PHASES.map((p, i) => (
          <li
            key={p.title}
            style={{ marginLeft: i * 14 }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${phaseStyles(i, active).shell}`}
          >
            <PhaseBody i={i} active={active} />
          </li>
        ))}
      </ol>
    </>
  );
}

const MAX_HOME_CASES = 4;

export default function Dashboard({
  firstName = "there",
  onStartCase,
  cases,
  onOpenCase,
  onViewCase,
  onCases,
}: {
  firstName?: string;
  onStartCase?: () => void;
  cases: SavedCase[];
  onOpenCase: (id: string) => void;
  onViewCase?: (id: string) => void;
  onCases?: () => void;
}) {
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();
  const visibleCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const PRIORITY: Record<CaseStatus, number> = {
      "response-needs-attention": 0,
      "ready-to-send": 1,
      "in-progress": 2,
      "waiting-for-response": 3,
      "response-reviewed": 4,
    };
    return [...cases]
      .filter((item) => !normalized || [item.company, item.details?.issue, item.rawStory].some((value) => value?.toLowerCase().includes(normalized)))
      .sort((a, b) => (PRIORITY[a.status] - PRIORITY[b.status]) || ((b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)));
  }, [cases, query]);
  const selectedCase = visibleCases[0] ?? null;
  const activePhase = selectedCase?.status === "in-progress" ? 0 : selectedCase?.status === "ready-to-send" ? 2 : selectedCase ? 3 : 0;
  const stats = [
    { label: "Your cases", value: cases.length },
    { label: "Needs you", value: cases.filter((item) => ["in-progress", "ready-to-send", "response-needs-attention"].includes(item.status)).length },
    { label: "Waiting for reply", value: cases.filter((item) => item.status === "waiting-for-response").length },
    { label: "Replies reviewed", value: cases.filter((item) => item.status === "response-reviewed").length },
  ];
  const activity = visibleCases.slice(0, 3).map((item) => ({
    id: item.id,
    text: item.status === "ready-to-send" ? "Complaint ready to send" : item.status === "waiting-for-response" ? "Waiting for company reply" : item.status === "response-reviewed" ? "Reply reviewed" : "Case in progress",
    company: item.company ?? "Company to confirm",
    when: new Date(item.updatedAt ?? item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
  const nextStep = selectedCase?.status === "response-needs-attention"
    ? "Company replied! Review Fixora's explanation and possible next steps."
    : selectedCase?.status === "waiting-for-response"
      ? "Check the latest status for this case while waiting for a reply."
      : selectedCase?.status === "ready-to-send"
        ? "Review your complaint before sending it."
        : selectedCase?.status === "response-reviewed"
          ? "Your latest company reply has been reviewed."
          : "Continue the conversation and fill in any missing details.";
  const nextAction = selectedCase?.status === "response-needs-attention"
    ? "Review company reply"
    : selectedCase?.status === "in-progress"
      ? "Continue conversation"
      : selectedCase?.status === "waiting-for-response"
        ? "View case"
        : "Open case";
  const openCase = (id: string) => (onViewCase ?? onOpenCase)(id);
  const searchMatches = useMemo<SearchMatch[]>(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return cases
      .filter((item) => [item.company, item.details?.issue, item.rawStory].some((value) => value?.toLowerCase().includes(normalized)))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        title: item.company ?? "Company to confirm",
        detail: (item.details?.issue ?? item.rawStory ?? "").slice(0, 90) || null,
        amount: item.details?.amount ?? null,
        status: STATUS[item.status].label,
        statusClass: STATUS[item.status].badge,
      }));
  }, [cases, query]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 px-5 py-4 md:px-8 md:py-5">
          <div className="md:hidden">
            <FixoraLogo size="sm" />
          </div>
          <div className="ml-auto hidden max-w-md flex-1 sm:block md:ml-0">
            <SearchPopup query={query} matches={searchMatches} total={visibleCases.length} onQuery={setQuery} onPick={openCase} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={onStartCase} className={`${BTN3D} max-sm:rounded-lg max-sm:px-3 max-sm:py-2 max-sm:text-xs max-sm:gap-1.5`}>
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none max-sm:h-4 max-sm:w-4 max-sm:text-[11px]">
                +
              </span>
              Start a case
            </button>
          </div>
        </header>

        {/* Search has its own row on small screens so the header does not feel cramped. */}
        <div className="bg-background px-5 pb-3 pt-1 sm:hidden">
          <SearchPopup query={query} matches={searchMatches} total={visibleCases.length} onQuery={setQuery} onPick={openCase} />
        </div>

        <main className="px-5 pb-28 pt-4 md:px-8 md:pb-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Hey {firstName}.</h1>
          <p className="mt-1 text-base text-muted">{cases.length ? "Here’s where your cases stand." : "Start a case to get a clear next step."}</p>

          <Reveal className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                className="rounded-2xl bg-surface p-4 shadow-card"
              >
                <p className="text-xs text-muted">
                  {s.label}
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold">{s.value}</p>
              </motion.div>
            ))}
          </Reveal>

          <Reveal className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
            <section aria-labelledby="hub" className="overflow-hidden rounded-3xl bg-surface p-5 shadow-lift sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="hub" className="truncate font-heading text-lg font-semibold">{selectedCase?.company ?? (selectedCase ? "Company to confirm" : "Your case journey" )}{selectedCase?.details?.amount ? " · " + selectedCase.details.amount : ""}</h2>
                  <p className="line-clamp-2 text-sm text-muted">{selectedCase?.details?.issue ?? selectedCase?.rawStory ?? "Your case progress will appear here."}</p>
                </div>
                {selectedCase && <Badge status={selectedCase.status} />}
              </div>
              <Hub active={activePhase} />
            </section>

            <div className="flex flex-col gap-4">
              <section aria-labelledby="next" className="rounded-3xl bg-surface p-5 shadow-card">
                <h2 id="next" className="font-heading text-sm font-semibold text-muted">
                  Next step
                </h2>
                <p className="mt-2 font-heading text-lg font-semibold leading-snug">{selectedCase ? nextStep : "Start your first complaint."}</p>
                <p className="mt-1 text-sm text-muted">{selectedCase ? "Your progress is saved in this browser." : "Your cases will be saved in this browser."}</p>
                <button type="button" onClick={() => selectedCase ? onOpenCase(selectedCase.id) : onStartCase?.()} className={`${BTN3D} mt-5 w-full`}>
                  {selectedCase ? nextAction : "Start a case"}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
              </section>
              <section aria-labelledby="deadlines" className="rounded-3xl bg-surface p-5 shadow-card">
                <h2 id="deadlines" className="font-heading text-sm font-semibold text-muted">
                  What to expect
                </h2>
                <p className="mt-2 text-sm leading-relaxed">Your complaint and progress stay available here on this device. You decide when to send anything.</p>
              </section>
            </div>
          </Reveal>

          <Reveal>
          <section aria-labelledby="cases" className="mt-8">
            <h2 id="cases" className="font-heading text-lg font-semibold">
              Your cases
            </h2>
            <div className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">Issue</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCases.slice(0, MAX_HOME_CASES).map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-surface-muted">
                      <td className="px-5 py-4 font-heading font-semibold">
                        <button type="button" onClick={() => openCase(c.id)} className="text-left hover:text-brand-strong">{c.company ?? "Company to confirm"}</button>
                      </td>
                      <td className="hidden px-5 py-4 text-muted sm:table-cell">{c.details?.issue ?? (c.rawStory || "Details in progress")}</td>
                      <td className="px-5 py-4">
                        <Badge status={c.status} />
                      </td>
                      <td className="px-5 py-4 text-right">{c.details?.amount ?? "—"}</td>
                    </tr>
                  ))}
                  {!visibleCases.length && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted">{cases.length ? "No cases match your search." : "Your cases will appear here after you start one."}</td></tr>
                  )}
                  {visibleCases.length > MAX_HOME_CASES && (
                    <tr>
                      <td colSpan={4} className="px-5 py-3 text-center">
                        <button type="button" onClick={onCases} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                          See more cases
                          <span aria-hidden>→</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </section></Reveal>

          <Reveal>
          <section aria-labelledby="activity" className="mt-8">
            <h2 id="activity" className="font-heading text-lg font-semibold">
              Recent activity
            </h2>
            <ul className="mt-3 divide-y divide-border/60 rounded-2xl bg-surface shadow-card">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-4 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {a.text} <span className="text-muted">· {a.company}</span>
                  </span>
                  <span className="shrink-0 text-muted">{a.when}</span>
                </li>
              ))}
              {!activity.length && <li className="px-5 py-8 text-sm text-muted">Your recent case activity will appear here.</li>}
            </ul>
          </section></Reveal>
        </main>
      </div>

    </div>
  );
}
