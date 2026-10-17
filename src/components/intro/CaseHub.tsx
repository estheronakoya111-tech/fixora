"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

const PHASES = [
  { title: "Discover", hint: "We read your story" },
  { title: "Prove", hint: "Gather your evidence" },
  { title: "Review", hint: "Check your letter" },
  { title: "Solve", hint: "Send it and follow up" },
] as const;

const GEO = {
  stageW: 576,
  stageH: 300,
  w: 220,
  h: 56,
  left: [0, 118, 236, 354],
  top: [0, 80, 160, 240],
} as const;

const spring = { type: "spring", stiffness: 130, damping: 18 } as const;

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhaseCard({ index, active, visible }: { index: number; active: number; visible: boolean }) {
  const phase = PHASES[index];
  const state = index < active ? "done" : index === active ? "active" : "locked";

  const shell = {
    active: "border-brand-400 bg-gradient-to-br from-brand to-brand-strong text-white shadow-brand",
    done: "border-positive/30 bg-surface shadow-card",
    locked: "border-dashed border-border-strong bg-surface-muted/90 text-muted",
  }[state];

  const badge = {
    active: "bg-white/20 text-white",
    done: "bg-positive text-white",
    locked: "bg-surface-sunken text-muted",
  }[state];

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        y: !visible ? 24 : state === "active" ? -8 : 0,
        z: index * 12 + (state === "active" ? 56 : state === "done" ? 24 : 0),
      }}
      transition={{ ...spring, delay: visible ? 0.3 + index * 0.12 : 0 }}
      style={{ left: GEO.left[index], top: GEO.top[index], width: GEO.w, height: GEO.h }}
      className={`absolute flex items-center gap-3 rounded-2xl border px-4 ${shell}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${badge}`}>
        {state === "done" ? <Check /> : index + 1}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm font-semibold">{phase.title}</span>
        <span className={`block truncate text-xs ${state === "active" ? "text-white/85" : "text-muted"}`}>
          {phase.hint}
        </span>
      </span>
    </motion.div>
  );
}

function StaggerArrow({ index, active, visible }: { index: number; active: number; visible: boolean }) {
  const sx = GEO.left[index] + 150;
  const sy = GEO.top[index] + GEO.h;
  const ex = GEO.left[index + 1] + 70;
  const ey = GEO.top[index + 1];

  const line = `M${sx} ${sy} C${sx} ${sy + 16} ${ex} ${ey - 16} ${ex} ${ey - 3}`;
  const head = `M${ex - 4} ${ey - 9} L${ex} ${ey - 3} L${ex + 4} ${ey - 9}`;
  const done = index < active;
  const delay = 1 + index * 0.2;

  return (
    <g fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d={line}
        stroke="#D2CFC7"
        initial={false}
        animate={{ pathLength: visible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: visible ? delay : 0 }}
      />
      <motion.path
        d={line}
        stroke="#E86A2A"
        strokeWidth="2.5"
        initial={false}
        animate={{ pathLength: done ? 1 : 0 }}
        transition={{ duration: 0.6, delay: done ? 0.2 + index * 0.2 : 0 }}
      />
      <motion.path
        d={head}
        initial={false}
        animate={{ opacity: visible ? 1 : 0, stroke: done ? "#E86A2A" : "#D2CFC7" }}
        transition={{ duration: 0.4, delay: visible ? delay + 0.5 : 0 }}
      />
    </g>
  );
}

function FixoraPointer({ target, visible, reading }: { target: number; visible: boolean; reading: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute flex items-start gap-1"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        left: GEO.left[target] + GEO.w - 44,
        top: GEO.top[target] + GEO.h - 16,
      }}
      transition={{ ...spring, stiffness: 90 }}
      style={{ z: 110 }}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5 drop-shadow" fill="#E86A2A">
        <path d="M3 2l14 7-6 2-2 6z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="mt-3 rounded-full bg-foreground px-2.5 py-1 font-heading text-[11px] font-medium text-white shadow-lift">
        Fixora · {reading ? "reading" : "ready"}
      </span>
    </motion.div>
  );
}

function MobileStepper({ active, visible }: { active: number; visible: boolean }) {
  return (
    <ol
      className={`mx-auto flex w-full max-w-sm items-start transition-opacity duration-700 sm:hidden ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {PHASES.map((p, i) => {
        const done = i < active;
        const on = i === active;
        return (
          <li key={p.title} className="relative flex flex-1 flex-col items-center gap-1.5">
            {i < PHASES.length - 1 && (
              <span className={`absolute left-1/2 top-3.5 h-0.5 w-full ${done ? "bg-brand" : "bg-border-strong"}`} />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-positive text-white" : on ? "bg-brand text-white shadow-brand" : "bg-surface-sunken text-muted"
              }`}
            >
              {done ? <Check /> : i + 1}
            </span>
            <span className={`text-xs ${on ? "font-medium text-foreground" : "text-muted"}`}>{p.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function CaseHub({
  active,
  visible,
  reading,
  hasStory,
}: {
  active: number;
  visible: boolean;
  reading: boolean;
  hasStory: boolean;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-16, -4]), { stiffness: 80, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [20, 10]), { stiffness: 80, damping: 16 });

  return (
    <>
      <div
        className="relative mx-auto hidden sm:block"
        style={{ perspective: 1200, width: GEO.stageW, height: GEO.stageH }}
        onPointerMove={(e) => {
          if (reduce) return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            rotateX: reduce ? 15 : rotateX,
            rotateY: reduce ? -10 : rotateY,
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] border border-white/70 bg-white/40"
            initial={false}
            animate={{ opacity: visible ? 1 : 0 }}
            style={{
              transform: "translateZ(-60px)",
              backgroundImage: "radial-gradient(rgba(32,32,30,0.14) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              boxShadow: "0 40px 60px -30px rgba(32,32,30,0.25)",
            }}
          />

          <motion.div
            aria-hidden
            className="pointer-events-none absolute h-24 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(232,106,42,0.4),transparent)]"
            animate={{ left: GEO.left[active] - 6, top: GEO.top[active] - 20 }}
            transition={spring}
          />

          <svg
            aria-hidden
            viewBox={`0 0 ${GEO.stageW} ${GEO.stageH}`}
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            {[0, 1, 2].map((i) => (
              <StaggerArrow key={i} index={i} active={active} visible={visible} />
            ))}
          </svg>

          {PHASES.map((p, i) => (
            <PhaseCard key={p.title} index={i} active={active} visible={visible} />
          ))}

          <FixoraPointer target={reading ? 0 : 2} visible={hasStory} reading={reading} />
        </motion.div>
      </div>

      <MobileStepper active={active} visible={visible} />
    </>
  );
}