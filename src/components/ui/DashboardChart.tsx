"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Case as SavedCase } from "@/lib/types";

type ComplaintChartProps = {
  /** Real cases. When omitted, a demo set is shown (handy for design previews). */
  cases?: SavedCase[];
  onStartCase?: () => void;
};

const DAY = 86400000;
const RANGES = ["7 days", "14 days", "30 days"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7 days": 7, "14 days": 14, "30 days": 30 };

type Point = { name: string; started: number; sent: number };

// One point per day ending today: cumulative cases started (created) and sent.
function buildSeries(cases: SavedCase[], days: number, now: number): Point[] {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const startMs = midnight.getTime();
  const points: Point[] = [];

  // The window normally covers the last `days` days. If the first real case is
  // older than that, extend the start back to its day so the curve still rises
  // from 0 — otherwise the line would sit flat at a plateau and look static.
  let windowStart = startMs - (days - 1) * DAY;
  if (cases.length) {
    const earliest = new Date(Math.min(...cases.map((c) => c.createdAt)));
    earliest.setHours(0, 0, 0, 0);
    if (earliest.getTime() < windowStart) windowStart = earliest.getTime();
  }
  const count = Math.round((startMs + DAY - windowStart) / DAY);

  // Points run chronologically: each point counts cases created or sent up to
  // the end of that day, so the last point is today.
  for (let j = 0; j < count; j++) {
    const dayEnd = windowStart + (j + 1) * DAY;
    points.push({
      name: new Date(windowStart + j * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      started: cases.filter((c) => c.createdAt < dayEnd).length,
      sent: cases.filter((c) => c.sentAt !== undefined && c.sentAt < dayEnd).length,
    });
  }
  return points;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-stone-100 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-stone-700">{label}</p>
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 font-medium text-[#F26539]">
          <span className="h-2 w-2 rounded-full bg-[#F26539]" />
          Started: <span className="font-bold">{payload[0]?.value}</span>
        </p>
        <p className="flex items-center gap-1.5 font-medium text-[#2E7D5B]">
          <span className="h-2 w-2 rounded-full bg-[#2E7D5B]" />
          Sent: <span className="font-bold">{payload[1]?.value}</span>
        </p>
      </div>
    </div>
  );
}

export default function ComplaintChart({ cases, onStartCase }: ComplaintChartProps) {
  const reduce = useReducedMotion();
  const [range, setRange] = useState<Range>("7 days");
  // Phones show far fewer date labels so the axis never clumps together.
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [now] = useState(() => Date.now());
  const empty = cases !== undefined && cases.length === 0;

  const data = useMemo<Point[]>(() => buildSeries(cases ?? [], RANGE_DAYS[range], now), [cases, range, now]);
  // Thin the X labels when the window was extended beyond the chosen range so
  // the axis never crowds (same look as the fixed 7/14/30-day label stepping).


  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-6 shadow-sm sm:p-7">
      {/* Header Section */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-bold tracking-tight text-stone-900">Your complaints over time</h3>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="h-2 w-2 rounded-full bg-[#F26539]" />
              Started
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="h-2 w-2 rounded-full bg-[#2E7D5B]" />
              Sent
            </div>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center self-start rounded-full border border-stone-200/50 bg-stone-100/70 p-1 sm:self-auto">
          {RANGES.map((tab) => {
            const isActive = range === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setRange(tab)}
                className={`relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  isActive ? "text-white" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="pillHighlight"
                    className="absolute inset-0 rounded-full bg-stone-900"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Viewport */}
      <div className="relative h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {/* Coral Gradient for "Started" */}
              <linearGradient id="gradientStarted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F26539" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F26539" stopOpacity={0} />
              </linearGradient>

              {/* Sage Green Gradient for "Sent" */}
              <linearGradient id="gradientSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E7D5B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2E7D5B" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Horizontal Dotted Lines */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#A8A29E", fontSize: 11, fontWeight: 400 }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={isSmall ? 52 : 26}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#A8A29E", fontSize: 11, fontWeight: 400 }}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* "Started" Curve */}
            <Area
              type="monotone"
              dataKey="started"
              stroke="#F26539"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradientStarted)"
              animationDuration={600}
              animationEasing="ease-in-out"
              isAnimationActive={!reduce}
            />

            {/* "Sent" Curve */}
            <Area
              type="monotone"
              dataKey="sent"
              stroke="#2E7D5B"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradientSent)"
              animationDuration={600}
              animationEasing="ease-in-out"
              isAnimationActive={!reduce}
            />
          </AreaChart>
        </ResponsiveContainer>

        {empty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 text-center">
            <p className="font-heading font-semibold">Your first complaint will appear here.</p>
            {onStartCase && (
              <button type="button" onClick={onStartCase} className="text-sm font-medium text-brand-strong hover:underline">
                Start a case →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
