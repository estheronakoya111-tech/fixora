"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import SearchPopup, { type SearchMatch } from "@/components/app/SearchPopup";
import { FixoraLogo } from "@/components/logo/FixoraLogo";
import ComplaintChart from "@/components/ui/DashboardChart";
import type { Case as SavedCase, CaseStatus } from "@/lib/types";

const STATUS: Record<CaseStatus, { label: string; badge: string; bar: string }> = {
  "in-progress": { label: "In progress", badge: "bg-surface-sunken text-muted", bar: "#A19E97" },
  "ready-to-send": { label: "Ready to send", badge: "bg-brand-soft text-brand-700", bar: "#E86A2A" },
  "waiting-for-response": { label: "Waiting for reply", badge: "bg-positive-soft text-positive-strong", bar: "#4F6F8A" },
  "response-needs-attention": { label: "Reply needs attention", badge: "bg-brand-soft text-brand-700", bar: "#C98A2B" },
  "response-reviewed": { label: "Reply reviewed", badge: "bg-positive-soft text-positive-strong", bar: "#5F8A6C" },
  "escalated": { label: "Escalated", badge: "bg-warning-soft text-[#8a5a12]", bar: "#B06A1F" },
  "outcome-needs-attention": { label: "Outcome needs review", badge: "bg-brand-soft text-brand-700", bar: "#C98A2B" },
  "resolved": { label: "Resolved (simulated)", badge: "bg-positive-soft text-positive-strong", bar: "#7AA287" },
  "final-guidance": { label: "Closed with guidance", badge: "bg-surface-sunken text-muted", bar: "#A19E97" },
};

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_5px_0_#9A3F12,0_16px_24px_-8px_rgba(232,106,42,0.65)] active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

const DAY = 86400000;
const MAX_HOME_CASES = 6;
const NEEDS: CaseStatus[] = ["in-progress", "ready-to-send", "response-needs-attention", "outcome-needs-attention"];

const stamp = (c: SavedCase) => c.updatedAt ?? c.createdAt;

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M5 13l4 4L19 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

function Badge({ status }: { status: CaseStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>{s.label}</span>;
}

/* -------------------------------- Dashboard -------------------------------- */

export default function Dashboard({
  firstName = "there",
  startDate,
  onStartCase,
  cases,
  onOpenCase,
  onViewCase,
  onCases,
}: {
  firstName?: string;
  /** Sign-up time in ms (profile.createdAt). The chart begins on this day. */
  startDate?: number;
  onStartCase?: () => void;
  cases: SavedCase[];
  onOpenCase: (id: string) => void;
  onViewCase?: (id: string) => void;
  onCases?: () => void;
}) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [now] = useState(() => Date.now());

  const visibleCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    const PRIORITY: Record<CaseStatus, number> = { "response-needs-attention": 0, "outcome-needs-attention": 1, "ready-to-send": 2, "in-progress": 3, "escalated": 4, "waiting-for-response": 5, "response-reviewed": 6, "resolved": 7, "final-guidance": 8 };
    return [...cases]
      .filter((c) => !q || [c.company, c.details?.issue, c.rawStory].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || stamp(b) - stamp(a));
  }, [cases, query]);

  const selected = visibleCases[0] ?? null;
  const openCase = (id: string) => (onViewCase ?? onOpenCase)(id);

  const nextStep =
    selected?.status === "response-needs-attention" ? "A company replied. Review Fixora's explanation and your next steps."
    : selected?.status === "waiting-for-response" ? "Waiting for a reply — a simulated demo reply arrives on its own about a minute after sending."
    : selected?.status === "ready-to-send" ? "Your complaint is ready. Review it before sending."
    : selected?.status === "response-reviewed" ? "Your latest company reply has been reviewed."
    : selected?.status === "escalated" ? "Your escalation is away — the simulated final outcome arrives on the Replies screen."
    : selected?.status === "outcome-needs-attention" ? "The simulated final outcome is in. Review it and close the case out."
    : selected?.status === "resolved" ? "The simulated outcome resolved this complaint — nothing more to do."
    : selected?.status === "final-guidance" ? "The case ended with final guidance — the workflow reached its end point."
    : "Continue the conversation and fill in any missing details.";
  const nextAction =
    selected?.status === "response-needs-attention" ? "Review reply"
    : selected?.status === "outcome-needs-attention" ? "Review outcome"
    : selected?.status === "in-progress" ? "Continue"
    : "Open case";

  const week = now - 7 * DAY;
  const groups = [
    { label: "Needs you", icon: ICON.edit, color: "#E86A2A", tint: "bg-brand-soft text-brand-700", list: cases.filter((c) => NEEDS.includes(c.status)) },
    { label: "Waiting for reply", icon: ICON.clock, color: "#4F6F8A", tint: "bg-[#E8EEF3] text-[#4F6F8A]", list: cases.filter((c) => c.status === "waiting-for-response") },
    { label: "Reply reviewed", icon: ICON.check, color: "#5F8A6C", tint: "bg-positive-soft text-positive-strong", list: cases.filter((c) => c.status === "response-reviewed") },
  ];
  const reviewed = groups[2].list.length;
  const pct = cases.length ? reviewed / cases.length : 0;
  const evidenceCount = cases.reduce((t, c) => t + c.evidenceFiles.length, 0);


  // Escalated cases are managed from the Replies screen, so that row is kept
  // out of this overview panel on purpose.
  // Statuses already shown in the summary cards above (Needs you, Waiting for
  // reply, Reply reviewed) are also kept out of the by-status list.
  const overviewStatuses: CaseStatus[] = [...NEEDS, "waiting-for-response", "response-reviewed"];
  const statusCounts = (Object.keys(STATUS) as CaseStatus[])
    .filter((s) => s !== "escalated" && !overviewStatuses.includes(s))
    .map((s) => ({ s, n: cases.filter((c) => c.status === s).length }))
    .filter(({ n }) => n > 0);

  const searchMatches = useMemo<SearchMatch[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return cases
      .filter((c) => [c.company, c.details?.issue, c.rawStory].some((v) => v?.toLowerCase().includes(q)))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        title: c.company ?? "Company to confirm",
        detail: (c.details?.issue ?? c.rawStory ?? "").slice(0, 90) || null,
        amount: c.details?.amount ?? null,
        status: STATUS[c.status].label,
        statusClass: STATUS[c.status].badge,
      }));
  }, [cases, query]);

  const rise = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: i * 0.07, ease: "easeOut" as const },
  });

  return (
    <div className="min-h-dvh text-foreground">
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 px-5 py-4 md:px-8 md:py-5">
          <div className="md:hidden"><FixoraLogo size="sm" showWordmark /></div>
          <div className="ml-auto hidden max-w-md flex-1 sm:block md:ml-0">
            <SearchPopup query={query} matches={searchMatches} total={visibleCases.length} onQuery={setQuery} onPick={openCase} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={onStartCase} className={`${BTN3D} max-sm:gap-1.5 max-sm:rounded-lg max-sm:px-3 max-sm:py-2 max-sm:text-xs`}>
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none max-sm:h-4 max-sm:w-4 max-sm:text-[11px]">+</span>
              Start a case
            </button>
          </div>
        </header>

        <div className="bg-background px-5 pb-3 pt-1 sm:hidden">
          <SearchPopup query={query} matches={searchMatches} total={visibleCases.length} onQuery={setQuery} onPick={openCase} />
        </div>

        <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-4 md:px-8 md:pb-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Hey {firstName}.</h1>
          <p className="mt-1 text-base text-muted">
            {!cases.length ? (
              "Start a case to get a clear next step."
            ) : selected ? (
              <>
                {nextStep}{" "}
                <button type="button" onClick={() => openCase(selected.id)} className="font-medium text-brand-strong hover:underline">
                  {nextAction} →
                </button>
              </>
            ) : (
              "No cases match your search."
            )}
          </p>

          <motion.section {...rise(0)} aria-label="Case summary" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {groups.map((g) => {
              const recent = g.list.filter((c) => stamp(c) >= week).length;
              return (
                <div key={g.label} className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface p-4 pb-5 shadow-card sm:p-5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${g.tint}`}><Icon d={g.icon} /></span>
                  <p className="mt-3 text-xs font-medium text-muted sm:text-sm">{g.label}</p>
                  <p className="mt-1 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{g.list.length}</p>
                  {recent > 0 && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.tint}`}>+{recent} this week</span>}
                  <motion.span aria-hidden className="absolute inset-x-4 bottom-0 h-1 origin-left rounded-full sm:inset-x-5" style={{ background: g.color }} initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
                </div>
              );
            })}

            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-surface p-4 text-center shadow-card sm:p-5">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#EFEDE7" strokeWidth="10" />
                  <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#5F8A6C" strokeWidth="10" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 0.9, ease: "easeOut" }} />
                </svg>
                <p className="absolute inset-0 flex items-center justify-center font-heading text-lg font-semibold sm:text-xl">{cases.length ? `${Math.round(pct * 100)}%` : "—"}</p>
              </div>
              <p className="mt-2 text-xs text-muted">{reviewed} of {cases.length} {cases.length === 1 ? "case" : "cases"} resolved</p>
              <p className="mt-0.5 text-[11px] text-muted">{evidenceCount} evidence {evidenceCount === 1 ? "file" : "files"} saved</p>
            </div>
          </motion.section>

          <motion.section {...rise(1)} aria-labelledby="chart" className="mt-4">
            <h2 id="chart" className="sr-only">Your complaints over time</h2>
            <ComplaintChart cases={cases} onStartCase={onStartCase} />
          </motion.section>

          <Reveal className="mt-4 grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
            <motion.section {...rise(4)} aria-labelledby="recent" className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card">
              <h2 id="recent" className="px-5 pb-2 pt-5 font-heading text-lg font-semibold">Recent cases</h2>
              <ul className="flex-1">
                {visibleCases.slice(0, MAX_HOME_CASES).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => openCase(c.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                      <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ background: STATUS[c.status].bar }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-sm font-semibold">{c.company ?? "Company to confirm"}</span>
                        <span className="block truncate text-xs text-muted">{c.details?.issue ?? (c.rawStory || "Details in progress")}</span>
                      </span>
                      {c.details?.amount && <span className="hidden text-sm font-medium sm:block">{c.details.amount}</span>}
                      <span className="hidden sm:block"><Badge status={c.status} /></span>
                      <span className="text-muted transition-transform group-hover:translate-x-0.5"><Icon d={ICON.arrow} className="h-4 w-4" /></span>
                    </button>
                  </li>
                ))}
                {!visibleCases.length && <li className="px-5 py-10 text-center text-sm text-muted">{cases.length ? "No cases match your search." : "Your cases will appear here after you start one."}</li>}
              </ul>
              {visibleCases.length > MAX_HOME_CASES && (
                <button type="button" onClick={onCases} className="flex w-full items-center justify-center gap-1.5 bg-surface-muted/70 py-3.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft">
                  See more cases <span aria-hidden>→</span>
                </button>
              )}
            </motion.section>

            <motion.section {...rise(5)} aria-labelledby="bystatus" className="flex flex-col rounded-2xl border border-border/70 bg-surface p-5 shadow-card">
              <h2 id="bystatus" className="font-heading text-lg font-semibold">Cases by status</h2>
              {/* Only statuses that actually exist, at natural tile height —
                  the card must never stretch into a tall wall of zeros next
                  to the recent-cases list. */}
              {statusCounts.length ? (
              <ul className="mt-4 grid grid-cols-2 gap-2.5">
                {statusCounts.map(({ s, n }) => (
                  <li key={s} className="rounded-xl bg-surface-muted p-3">
                    <span className="flex items-start gap-1.5 text-xs leading-tight text-muted">
                      <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[s].bar }} />
                      {STATUS[s].label}
                    </span>
                    <span className="mt-2 font-heading text-2xl font-semibold leading-none">{n}</span>
                  </li>
                ))}
              </ul>
              ) : (
              <p className="mt-4 text-sm text-muted">Nothing in progress — a case shows up here once it moves along.</p>
              )}
            </motion.section>
          </Reveal>
        </main>
      </div>
    </div>
  );
}