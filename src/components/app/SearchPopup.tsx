"use client";

import { useState } from "react";

export type SearchMatch = {
  id: string;
  title: string;
  detail: string | null;
  amount: string | null;
  status: string;
  statusClass: string;
};

// Search input with a small dropdown right under it: what the search matched,
// so results are visible without scrolling to the page's case list.
export default function SearchPopup({
  query,
  matches,
  total,
  onQuery,
  onPick,
}: {
  query: string;
  matches: SearchMatch[]; // top matches to render
  total: number; // full match count, for the header line
  onQuery: (value: string) => void;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const term = query.trim();
  const show = open && term.length > 0;

  return (
    <label className="relative block">
      <span className="sr-only">Search cases</span>
      <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        placeholder="Search cases..."
        value={query}
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onQuery("");
            setOpen(false);
            event.currentTarget.blur();
          } else if (event.key === "Enter" && show && matches[0]) {
            onPick(matches[0].id);
            onQuery("");
            setOpen(false);
          }
        }}
        className="w-full rounded-xl bg-surface py-2.5 pl-10 pr-4 text-sm shadow-soft outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-brand/30"
      />
      {show && (
        <div
          // Buttons should receive the click before the input's blur hides this panel.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-surface text-foreground shadow-lift ring-1 ring-border/60"
        >
          <p className="truncate border-b border-border/60 px-4 py-2 text-xs text-muted">
            {total ? `${total} ${total === 1 ? "case" : "cases"} matching “${term}”` : `No cases match “${term}”`}
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {matches.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(match.id);
                    onQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-heading font-semibold">
                      {match.title}
                      {match.amount ? ` · ${match.amount}` : ""}
                    </span>
                    {match.detail && <span className="block truncate text-xs text-muted">{match.detail}</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${match.statusClass}`}>{match.status}</span>
                </button>
              </li>
            ))}
            {total > matches.length && (
              <li>
                <p className="px-4 py-2 text-xs text-muted">Showing the first {matches.length} — the full list is below.</p>
              </li>
            )}
          </ul>
        </div>
      )}
    </label>
  );
}
