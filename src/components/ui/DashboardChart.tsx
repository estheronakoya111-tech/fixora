"use client";

import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Case as SavedCase, CaseStatus } from "@/lib/types";

type ComplaintChartProps = {
  /** Real cases. When omitted, a demo series is shown (handy for design previews). */
  cases?: SavedCase[];
  /** Sign-up time in ms. The chart begins on this day. Defaults to the first case, then today. */
  startDate?: number;
  onStartCase?: () => void;
};

const DAY = 86400000;
const RANGES = [7, 14, 30] as const;
const ORANGE = "#E86A2A";
const GREEN = "#5F8A6C";
// There is no "sent at" field yet, so a sent case is dated by its last update.
const SENT: CaseStatus[] = [ "waiting-for-response", "response-needs-attention", "response-reviewed", "escalated", "outcome-needs-attention", "resolved", "final-guidance" ];

type Point = { label: string; started: number | null; sent: number | null };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  const rows = payload?.filter((p) => p.value != null) ?? [];
  if (!active || !rows.length) return null;
  return (
    <div className="w-36 rounded-xl border border-border/70 bg-surface p-3 text-xs shadow-lift">
      <p className="font-medium text-muted">{label}</p>
      {rows.map((p) => (
        <p key={p.name} className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-heading font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ComplaintChart({ cases, startDate, onStartCase }: ComplaintChartProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [now] = useState(() => Date.now());

  const empty = cases !== undefined && cases.length === 0;

  const data = useMemo<Point[]>(() => {
    const label = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const eod = (t: number) => {
      const d = new Date(t);
      d.setHours(23, 59, 59, 999);
      return d;
    };
    const today = eod(now);

    if (cases === undefined && startDate === undefined) {
      return Array.from({ length: range }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (range - 1 - i));
        const p = range > 1 ? i / (range - 1) : 1;
        return { label: label(d), started: Math.round(4 * p ** 1.2), sent: Math.round(3 * p ** 1.3) };
      });
    }

    const list = cases ?? [];
    const earliest = list.length ? Math.min(...list.map((c) => c.createdAt)) : undefined;
    const origin = eod(startDate ?? earliest ?? now);
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - (range - 1));
    const first = origin.getTime() > windowStart.getTime() ? origin : windowStart;

    return Array.from({ length: range }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      if (d.getTime() > today.getTime()) return { label: label(d), started: null, sent: null };
      const t = d.getTime();
      return {
        label: label(d),
        started: list.filter((c) => c.createdAt <= t).length,
        sent: list.filter((c) => SENT.includes(c.status) && (c.updatedAt ?? c.createdAt) <= t).length,
      };
    });
  }, [cases, startDate, range, now]);

  const top = Math.max(4, ...data.map((d) => Math.max(d.started ?? 0, d.sent ?? 0)));
  const step = top <= 6 ? 1 : top <= 12 ? 2 : Math.ceil(top / 5);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const last = [...data].reverse().find((d) => d.started !== null) ?? data[0];

  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold">Your complaints over time</h3>
          <p className="mt-1.5 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />Started</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />Sent</span>
          </p>
        </div>
        <div role="group" aria-label="Date range" className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${range === r ? "bg-foreground text-white" : "border border-border bg-surface text-muted hover:text-foreground"}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 h-64 sm:h-72" role="img" aria-label={`Line chart of complaints started and sent over the last ${range} days`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`${uid}-o`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.25} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.2} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E5E3DE" strokeDasharray="3 5" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#A19E97" }} interval={range === 7 ? 0 : "preserveStartEnd"} minTickGap={24} tickMargin={8} />
            <YAxis domain={[0, max]} ticks={ticks} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#A19E97" }} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#D2CFC7", strokeDasharray: "3 4" }} />
            <Area type="monotone" dataKey="started" name="Started" stroke={ORANGE} strokeWidth={2.5} fill={`url(#${uid}-o)`} activeDot={{ r: 5, fill: "#fff", stroke: ORANGE, strokeWidth: 3 }} isAnimationActive={!reduce} />
            <Area type="monotone" dataKey="sent" name="Sent" stroke={GREEN} strokeWidth={2.5} fill={`url(#${uid}-g)`} activeDot={{ r: 5, fill: "#fff", stroke: GREEN, strokeWidth: 3 }} isAnimationActive={!reduce} />
          </AreaChart>
        </ResponsiveContainer>

        {empty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <p className="font-heading font-semibold">Your first complaint will appear here.</p>
            {onStartCase && (
              <button type="button" onClick={onStartCase} className="text-sm font-medium text-brand-strong hover:underline">
                Start a case →
              </button>
            )}
          </div>
        )}
      </div>

      <p className="sr-only">Across this {range}-day view, {last.started ?? 0} complaints were started and {last.sent ?? 0} were sent.</p>
    </div>
  );
}