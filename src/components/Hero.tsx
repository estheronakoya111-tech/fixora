"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { FixoraLogo } from "@/components/logo/FixoraLogo";
import FixoraBackground from "@/components/ui/FixoraBackground";

const ease = [0.22, 1, 0.36, 1] as const;

function ActionButton({ onClick, children, compact = false }: { onClick: () => void; children: React.ReactNode; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.97, y: 1 }}
      className={`group relative isolate inline-flex shrink-0 items-center justify-center gap-3 overflow-hidden rounded-full border border-brand bg-brand font-heading font-semibold leading-[1.2] text-white shadow-brand transition-shadow duration-500 hover:shadow-[0_18px_35px_-14px_rgb(95_138_108_/_0.8)] ${compact ? "px-5 py-2.5 text-xs uppercase tracking-[0.14em]" : "min-h-12 px-6 py-3.5 text-sm"}`}
    >
      <span className="absolute inset-0 -z-10 origin-left scale-x-0 bg-positive transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-x-100" />
      <span className="relative">{children}</span>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:rotate-45 group-hover:bg-white/30" aria-hidden>↗</span>
    </motion.button>
  );
}

/**
 * progress: 0 -> 1 while the next section slides up over the hero.
 * 2D recede: the hero slides up slightly and fades as the next screen covers
 * it — grounded and quick, no tilt. The screen swap reads as a wipe, not a
 * camera move.
 */
export default function Hero({ onStart, progress }: { onStart: () => void; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const scale = useTransform(progress, [0, 1], [1, 0.94]);
  const dim = useTransform(progress, [0, 1], [0, 0.4]);
  const hint = useTransform(progress, [0, 0.06, 0.2], [1, 0, 0]); // gone as the cover starts

  return (
    <motion.div
      className="sticky top-0 z-0 h-dvh origin-top overflow-hidden will-change-transform lg:overflow-visible"
      style={reduce ? undefined : { scale }}
    >
      <FixoraBackground className="h-dvh text-foreground lg:overflow-visible">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-12" aria-label="Main navigation">
          <FixoraLogo size="md" showWordmark />
          <ActionButton onClick={onStart} compact>Sign up</ActionButton>
        </nav>

        <section className="mx-auto grid min-h-[calc(100dvh-160px)] w-full max-w-7xl items-center gap-16 px-6 pb-12 pt-4 lg:grid-cols-[minmax(0,.95fr)_minmax(34rem,1.05fr)] lg:px-12 lg:pb-16 lg:pt-0">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="relative z-10 max-w-2xl"
          >
            <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-positive-strong"><span className="h-px w-10 bg-positive" />Fixora / consumer clarity</div>
            <h1 className="max-w-2xl font-heading text-[clamp(3.6rem,7vw,6.9rem)] font-medium leading-[0.9] tracking-[-0.075em]">
              Make the problem
              <span className="relative mt-2 block text-brand-strong">
                make sense.
                <svg aria-hidden className="absolute -bottom-4 left-0 h-4 w-[9.5rem] overflow-visible text-positive" viewBox="0 0 160 16" fill="none"><motion.path d="M2 10C38 2 104 2 158 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.8, ease }} /></svg>
              </span>
            </h1>
            <p className="mt-10 max-w-md font-body text-lg leading-8 text-muted sm:text-xl">The company made it confusing. Fixora helps you explain what happened, build a clear case, and decide what comes next.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5"><ActionButton onClick={onStart}>Start with your story</ActionButton></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-body text-xs text-subtle"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-positive" />You approve everything</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Free to start</span></div>
          </motion.div>

          <motion.div initial={reduce ? false : { opacity: 0, x: 42, rotate: 3 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ delay: 0.16, duration: 0.95, ease }} className="relative mx-auto w-full max-w-2xl lg:translate-y-4">
            <div className="relative min-h-[25rem] sm:min-h-[29rem]">
              <motion.div animate={reduce ? undefined : { y: [0, -9, 0], rotate: [3, 1, 3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute left-0 top-10 w-[76%] rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-card backdrop-blur-xl sm:p-8"><div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle"><span>01 / the messy version</span><span className="text-brand-strong">incoming</span></div><p className="mt-8 max-w-sm font-body text-xl leading-8 text-foreground/80 sm:text-2xl">“I don&apos;t know why they charged me again. I already cancelled and support keeps sending the same reply.”</p><div className="mt-10 flex flex-wrap gap-2"><span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-700">unexpected charge</span><span className="rounded-full bg-surface-sunken px-3 py-1.5 text-xs font-medium text-muted">subscription</span></div></motion.div>
              <motion.div animate={reduce ? undefined : { y: [0, 10, 0], rotate: [-4, -2, -4] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="absolute bottom-2 right-0 w-[76%] rounded-[1.75rem] bg-foreground p-6 text-white shadow-lift sm:p-8"><div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45"><span>02 / the clear case</span><span className="text-positive">ready</span></div><div className="mt-7 space-y-5"><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Issue</p><p className="mt-1 font-heading text-lg font-semibold">Charged after cancellation</p></div><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Amount</p><p className="mt-1 text-sm">$24.99</p></div><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Next move</p><p className="mt-1 text-sm text-positive">Review complaint</p></div></div></div><div className="mt-8 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/55"><span>Fixora organized the story</span><span className="text-lg text-positive">↗</span></div></motion.div>
              <motion.div initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.75, duration: 0.55, ease }} className="absolute right-[8%] top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-8 border-positive-soft bg-positive text-2xl text-white shadow-[0_10px_30px_-8px_rgb(95_138_108_/.8)]" aria-hidden>→</motion.div>
            </div>
          </motion.div>
        </section>

        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 pb-5 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle lg:px-12"><span className="h-px flex-1 bg-positive/25" /><span>From confusion to a clear next step</span><span className="h-px flex-1 bg-positive/25" /></div>
      </FixoraBackground>

      {/* Scroll hint: fades out as soon as the person starts scrolling */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-14 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle sm:flex"
        style={{ opacity: hint }}
      >
        <span>Scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-positive/25">
          <motion.span
            className="absolute left-0 top-0 h-3 w-px bg-positive"
            animate={reduce ? undefined : { y: [-12, 40] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
          />
        </span>
      </motion.div>
    </motion.div>
  );
}
