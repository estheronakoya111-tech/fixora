"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import SearchPopup, { type SearchMatch } from "@/components/SearchPopup";
import { FixoraLogo } from "@/components/logo/FixoraLogo";
import type { Case as StoredCase } from "@/lib/types";

type Status = "reply" | "progress" | "draft" | "waiting" | "done";
type Filter = "all" | "needs" | "waiting" | "done";
type Sort = "needs" | "newest" | "oldest";

type CaseItem = {
  id: string;
  company: string;
  issue: string;
  amount: string | null;
  status: Status;
  progress: number;
  next: string;
  meta: string;
  order: number;
};

const STATUS: Record<Status, { label: string; edge: string; badge: string; dot: string; priority: number }> = {
  reply: { label: "Reply received", edge: "bg-positive", badge: "bg-positive-soft text-positive-strong", dot: "bg-positive", priority: 0 },
  progress: { label: "In progress", edge: "bg-subtle", badge: "bg-surface-sunken text-muted", dot: "bg-subtle", priority: 1 },
  draft: { label: "Ready to send", edge: "bg-brand", badge: "bg-brand-soft text-brand-700", dot: "bg-brand", priority: 1 },
  waiting: { label: "Waiting for reply", edge: "bg-warning", badge: "bg-warning-soft text-[#8a5a12]", dot: "bg-warning", priority: 2 },
  done: { label: "Done", edge: "bg-border-strong", badge: "bg-surface-sunken text-muted", dot: "bg-subtle", priority: 3 },
};

const TRACK = ["Understand", "Draft", "Sent", "Reply"];

const FILTERS: { id: Filter; label: string; match: (s: Status) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "needs", label: "Needs you", match: (s) => s === "reply" || s === "draft" || s === "progress" },
  { id: "waiting", label: "Waiting", match: (s) => s === "waiting" },
  { id: "done", label: "Done", match: (s) => s === "done" },
];

function toCaseItem(record: StoredCase): CaseItem {
  const status: Status = record.status === "in-progress"
    ? "progress"
    : record.status === "ready-to-send"
      ? "draft"
      : record.status === "waiting-for-response"
        ? "waiting"
        : record.status === "response-needs-attention"
          ? "reply"
          : "done";
  const progress = status === "progress" ? 0 : status === "draft" ? 1 : status === "waiting" ? 2 : 3;
  const next = status === "progress"
    ? "Continue the conversation"
    : status === "draft"
      ? "Review and send your letter"
      : status === "waiting"
        ? "Wait for their reply"
        : status === "reply"
          ? "Review the company reply"
          : "Open this completed case";
  const timestamp = record.updatedAt ?? record.createdAt;
  return {
    id: record.id,
    company: record.company ?? "Company to confirm",
    issue: record.details?.issue ?? record.rawStory ?? "Details in progress",
    amount: record.details?.amount ?? null,
    status,
    progress: status === "done" ? 4 : progress,
    next,
    meta: `Updated ${new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    order: timestamp,
  };
}

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniTrack({ progress, status }: { progress: number; status: Status }) {
  return (
    <ol className="mt-4 flex items-center gap-1.5 text-xs" aria-label="Progress">
      {TRACK.map((t, i) => {
        const done = i < progress;
        const active = i === progress;
        return (
          <li key={t} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${done ? (status === "done" || status === "reply" ? "bg-positive" : "bg-brand") : active ? "bg-brand ring-4 ring-brand/20" : "bg-border-strong"}`}
            />
            <span className={`hidden sm:inline ${active ? "font-medium text-foreground" : "text-muted"}`}>{t}</span>
            {i < TRACK.length - 1 && <span aria-hidden className={`h-px w-4 sm:w-6 ${done ? "bg-brand/50" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Cases({
  cases,
  onOpenCase,
  onStartCase,
  onGoToReplies,
  onDeleteCase,
  focusCaseId,
  onClearFocus,
}: {
  cases: StoredCase[];
  onOpenCase: (id: string) => void;
  onStartCase: () => void;
  onGoToReplies?: () => void;
  onDeleteCase?: (id: string) => void;
  focusCaseId?: string | null;
  onClearFocus?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("needs");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!focusCaseId) return;
    document.getElementById(`case-card-${focusCaseId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => onClearFocus?.(), 4000);
    return () => clearTimeout(timer);
  }, [focusCaseId, onClearFocus]);

  const items = useMemo(() => cases.map(toCaseItem), [cases]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, items.filter((c) => f.match(c.status)).length])) as Record<Filter, number>,
    [items]
  );
  const active = items.filter((c) => c.status !== "done").length;

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const q = query.trim().toLowerCase();
    return items.filter((c) => f.match(c.status) && (!q || `${c.company} ${c.issue}`.toLowerCase().includes(q))).sort((a, b) => {
      if (sort === "newest") return b.order - a.order;
      if (sort === "oldest") return a.order - b.order;
      return STATUS[a.status].priority - STATUS[b.status].priority || b.order - a.order;
    });
  }, [filter, sort, query, items]);

  const searchMatches = useMemo<SearchMatch[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((c) => `${c.company} ${c.issue}`.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        title: c.company,
        detail: c.issue.slice(0, 90) || null,
        amount: c.amount,
        status: STATUS[c.status].label,
        statusClass: STATUS[c.status].badge,
      }));
  }, [query, items]);

  return (
    <div className="min-h-dvh text-foreground">
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 px-5 py-4 md:px-8 md:py-5">
          <div className="md:hidden">
            <FixoraLogo size="sm" />
          </div>
          <div className="ml-auto hidden max-w-md flex-1 sm:block">
            <SearchPopup query={query} matches={searchMatches.slice(0, 6)} total={searchMatches.length} onQuery={setQuery} onPick={onOpenCase} />
          </div>
          <div className="ml-auto">
            <button type="button" onClick={onStartCase} className={`${BTN3D} max-sm:rounded-lg max-sm:px-3 max-sm:py-2 max-sm:text-xs max-sm:gap-1.5`}>
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none max-sm:h-4 max-sm:w-4 max-sm:text-[11px]">+</span>
              Start a case
            </button>
          </div>
        </header>

        {/* Search gets its own row on small screens instead of squeezing the header. */}
        <div className="bg-background px-5 pb-3 pt-1 sm:hidden">
          <SearchPopup query={query} matches={searchMatches.slice(0, 6)} total={searchMatches.length} onQuery={setQuery} onPick={onOpenCase} />
        </div>

        <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-4 md:px-8 md:pb-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Cases</h1>
          <p className="mt-1 text-base text-muted">
            {active} active · {counts.needs} {counts.needs === 1 ? "needs" : "need"} you
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter cases">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    filter === f.id ? "bg-foreground text-white shadow-[0_3px_0_#000]" : "bg-surface text-muted shadow-soft hover:text-foreground"
                  }`}
                >
                  {f.label} <span className={filter === f.id ? "text-white/70" : "text-subtle"}>{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <label className="group flex min-w-0 items-center gap-2 text-sm text-muted">
              <span className="shrink-0 font-medium">Sort by</span>
              <span className="relative min-w-0">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label="Sort cases"
                  className="w-full min-w-[9.5rem] appearance-none rounded-xl border border-border-strong bg-surface py-2.5 pl-3.5 pr-9 text-sm font-semibold text-foreground shadow-soft outline-none transition-colors hover:border-brand/50 focus:border-brand focus:ring-4 focus:ring-brand/10 sm:min-w-[10.5rem]"
                >
                  <option value="needs">Needs you first</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-hover:text-brand-strong"
                >
                  <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
          </div>

          <ul className="mt-5 space-y-4">
            {visible.map((c, cardIndex) => {
              const s = STATUS[c.status];
              const raised = c.status === "reply" || c.status === "draft";
              const focused = focusCaseId === c.id;
              return (
                <li key={c.id} id={`case-card-${c.id}`} className="scroll-mt-24">
                  <Reveal delay={Math.min(cardIndex * 0.04, 0.24)}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${c.company} case`}
                    onClick={() => onOpenCase(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenCase(c.id);
                      }
                    }}
                    className={`group relative block w-full cursor-pointer overflow-hidden rounded-2xl bg-surface p-5 pl-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${raised ? "shadow-lift" : "shadow-card"} ${c.status === "done" ? "opacity-80" : ""} ${focused ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${s.edge}`} />
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-heading text-lg font-semibold">{c.company}</p>
                      <span className="flex shrink-0 items-center gap-3">
                        {c.amount && <p className="font-heading text-lg font-semibold">{c.amount}</p>}
                        {onDeleteCase && (
                          <button
                            type="button"
                            aria-label={`Delete ${c.company} case`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCase(c.id);
                            }}
                            className="shrink-0 rounded-full bg-danger-soft px-3.5 py-1.5 text-xs font-semibold text-danger transition-colors hover:brightness-95"
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{c.issue}</p>
                    <MiniTrack progress={c.progress} status={c.status} />
                    <p className="mt-4 text-sm">
                      <span className="text-muted">Next:</span> <span className="font-medium">{c.next}</span>
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
                        {s.label}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        {c.meta}
                        <span className="transition-transform group-hover:translate-x-0.5">
                          <Arrow />
                        </span>
                      </span>
                    </div>
                  </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>

          {visible.length === 0 && (
            <Reveal>
            <div className="mt-5 rounded-2xl border border-dashed border-border-strong p-10 text-center">
              <p className="font-heading text-lg font-semibold">{items.length ? "No cases match" : "No cases yet"}</p>
              <p className="mt-1 text-sm text-muted">{items.length ? "Try a different filter or search." : "Start a case and it will be saved here."}</p>
              {items.length ? (
                <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-4 text-sm font-medium text-brand-strong hover:underline">Clear filters</button>
              ) : (
                <button type="button" onClick={onStartCase} className="mt-4 text-sm font-medium text-brand-strong hover:underline">Start a case</button>
              )}
            </div>
            </Reveal>
          )}

          <Reveal>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border-strong p-5">
            <p className="text-sm text-muted">Something else gone wrong?</p>
            <button type="button" onClick={onStartCase} className={BTN3D}>
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none">+</span>
              Start a case
            </button>
          </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}
