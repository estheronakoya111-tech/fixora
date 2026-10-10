"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import FixoraWriter from "./intro/FixoraWriter";
import CaseHub from "./intro/CaseHub";
import { STEP, useIntroSequence, type IntroPayload } from "./intro/useIntroSequence";

export type { IntroPayload };

const DEMO_STORY =
  "I was charged $24.99 by Netflix on Oct 5 even after I cancelled my subscription last month.";

function Highlighted({ text, terms }: { text: string; terms: (string | null)[] }) {
  const list = terms.filter((t): t is string => !!t);
  if (!list.length) return <>{text}{"\u200b"}</>;
  const re = new RegExp(
    `(${list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded bg-brand-200/80 text-transparent">
            {part}
          </mark>
        ) : (
          part
        )
      )}
      {"\u200b"}
    </>
  );
}

function DisplayCard({
  value,
  terms,
  visible,
}: {
  value: string;
  terms: (string | null)[];
  visible: boolean;
}) {
  const field =
    "col-start-1 row-start-1 w-full whitespace-pre-wrap break-words p-5 font-body text-base leading-relaxed select-none";

  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <div className="grid rounded-2xl border border-border/80 bg-surface/90 shadow-lift min-h-[130px] backdrop-blur-md">
        <div aria-hidden className={`${field} pointer-events-none text-transparent`}>
          <Highlighted text={value} terms={terms} />
        </div>
        <div className={`${field} text-foreground/90`}>
          {value}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="ml-1 inline-block h-4 w-0.5 bg-brand translate-y-0.5"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Intro({
  onContinue,
}: {
  onContinue?: (payload: IntroPayload) => void;
}) {
  const reduce = useReducedMotion();
  const [story, setStory] = useState("");
  const [leaving, setLeaving] = useState(false);

  const seq = useIntroSequence(story);
  const stageVisible = seq.reached(STEP.STAGE);
  const canContinue = seq.step === STEP.REVIEW;

  // Auto-type demo story into textarea once stage is visible (18ms intervals)
  useEffect(() => {
    if (!stageVisible) return;

    if (reduce) {
      const timer = setTimeout(() => setStory(DEMO_STORY), 0);
      return () => clearTimeout(timer);
    }

    let current = 0;
    const interval = setInterval(() => {
      if (current < DEMO_STORY.length) {
        current++;
        setStory(DEMO_STORY.slice(0, current));
      } else {
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [stageVisible, reduce]);

  function handleContinue() {
    if (!canContinue || leaving) return;
    setLeaving(true);
    setTimeout(
      () => onContinue?.({ story: story.trim(), extracted: seq.extracted, letter: seq.letter }),
      reduce ? 0 : 250
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.25 }}
      className="relative min-h-dvh overflow-hidden bg-background text-foreground"
    >
      {/* Background Ambient Glows */}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-brand-100 blur-3xl opacity-70" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-brand-200/60 blur-3xl opacity-70" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-positive-soft blur-3xl opacity-50" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-8 lg:px-12">

        {/* ========================================================= */}
        {/* --- DESKTOP S-CURVE ZIG-ZAG LAYOUT --- */}
        {/* ========================================================= */}
        <div className="relative hidden grid-cols-12 items-center gap-y-16 lg:grid">

          {/* SVG Overlay for Desktop Curved 3D Arrows */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            fill="none"
          >
            <defs>
              <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E86A2A" />
                <stop offset="100%" stopColor="#FF9E66" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <marker id="boldArrowHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#E86A2A" />
              </marker>
            </defs>

            {/* Arrow 1: Only appears AFTER story starts typing */}
            {stageVisible && (
              <motion.path
                d="M 420 180 C 530 180, 620 140, 710 140"
                stroke="url(#arrowGrad)"
                strokeWidth="4"
                markerEnd="url(#boldArrowHead)"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: story.length > 5 ? 1 : 0 }}
                transition={{ duration: 0.35 }}
              />
            )}

            {/* Arrow 2: Only appears AFTER Case Hub reaches review stage */}
            {seq.hasStory && (
              <motion.path
                d="M 740 320 C 650 430, 500 450, 420 480"
                stroke="url(#arrowGrad)"
                strokeWidth="4"
                markerEnd="url(#boldArrowHead)"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35 }}
              />
            )}

            {/* Arrow 3: Only appears AFTER letter brief finishes typing */}
            {canContinue && (
              <motion.path
                d="M 520 620 C 640 620, 720 620, 790 620"
                stroke="url(#arrowGrad)"
                strokeWidth="4"
                markerEnd="url(#boldArrowHead)"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35 }}
              />
            )}
          </svg>

          {/* Step 1 Badge Overlay */}
          {story.length > 5 && (
            <div className="absolute left-[540px] top-[145px] z-20">
              <span className="rounded-full border border-brand/30 bg-surface px-3 py-1 font-heading text-[11px] font-bold text-brand shadow-card">
                ① Analyzing Story
              </span>
            </div>
          )}

          {/* Step 2 Badge Overlay */}
          {seq.hasStory && (
            <div className="absolute left-[540px] top-[410px] z-20">
              <span className="rounded-full border border-brand/30 bg-surface px-3 py-1 font-heading text-[11px] font-bold text-brand shadow-card">
                ② Brief Ready
              </span>
            </div>
          )}

          {/* Step 3 Badge Overlay */}
          {canContinue && (
            <div className="absolute left-[640px] top-[595px] z-20">
              <span className="rounded-full border border-brand/30 bg-surface px-3 py-1 font-heading text-[11px] font-bold text-brand shadow-card">
                ③ Ready for Your Review
              </span>
            </div>
          )}

          {/* STEP 1: Top Left */}
          <div className="col-span-5 flex flex-col items-start text-left">
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              <FixoraWriter
                lines={["Hey. I'm Fixora.", "Tell us what happened.", "We'll help with the paperwork."]}
                onDone={seq.markHeadlineDone}
                lineClassName={(i) => (i === 0 ? "text-brand-strong" : "")}
              />
            </h1>

            <div className="mt-8 w-full">
              <DisplayCard
                value={story}
                visible={stageVisible}
                terms={seq.hasStory ? [seq.extracted.company, seq.extracted.amount, seq.extracted.date] : []}
              />
            </div>
          </div>

          {/* STEP 2: Top Right */}
          <div className="col-span-7 flex justify-end">
            <div className="w-full max-w-xl">
              <CaseHub
                active={seq.active}
                visible={stageVisible}
                reading={seq.isTyping}
                hasStory={seq.hasStory}
              />
            </div>
          </div>

          {/* STEP 3: Bottom Left */}
          <div className="col-span-6">
            {seq.hasStory && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                aria-live="polite"
                className="relative rounded-3xl border border-border/80 bg-surface/90 p-6 shadow-lift backdrop-blur-md"
              >
                <div className="border-b border-border/60 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Document Status</span>
                  <h2 className="font-heading text-base font-semibold text-foreground">Dispute Brief</h2>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[seq.extracted.company, seq.extracted.amount, seq.extracted.date]
                    .filter(Boolean)
                    .map((v) => (
                      <span key={v} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-700">
                        {v}
                      </span>
                    ))}
                </div>

                <p className="mt-4 whitespace-pre-line font-body text-sm leading-relaxed text-foreground/90">
                  {seq.typed}
                  {seq.isTyping && (
                    <motion.span
                      aria-hidden
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-brand"
                    />
                  )}
                </p>

                {/* Visible & Crisply Positioned Watermark Stamp */}
                <div aria-hidden className="pointer-events-none absolute bottom-4 right-4 rotate-[-10deg] select-none rounded-lg border-2 border-positive/30 bg-positive-soft/40 px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-widest text-positive-strong shadow-sm backdrop-blur-xs">
                  Brief Prepared
                </div>
              </motion.section>
            )}
          </div>

          {/* STEP 4: Bottom Right (Green 3D Button) */}
          <div className="col-span-6 flex flex-col items-center justify-center pl-8 text-center">
            <motion.div
              initial={false}
              animate={{ opacity: canContinue ? 1 : 0, y: canContinue ? 0 : 12 }}
              className={`flex flex-col items-center gap-3 ${canContinue ? "" : "pointer-events-none"}`}
            >
              {/* Green 3D Tactile Button using --color-positive tokens */}
              <motion.button
                type="button"
                onClick={handleContinue}
                whileHover={reduce ? undefined : { scale: 1.03 }}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                className="group relative inline-flex cursor-pointer items-center gap-3 rounded-full border-b-4 border-positive-strong bg-positive px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-positive/20 transition-all duration-150 hover:bg-positive-strong active:border-b-0 active:translate-y-1"
              >
                <span>Get started</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white transition-transform duration-200 group-hover:rotate-45">
                  ↗
                </span>
              </motion.button>
              <p className="text-xs text-muted">Free to start. We&apos;ll pick up right here.</p>
            </motion.div>
          </div>

        </div>

        {/* ================================================================ */}
        {/* --- MOBILE LAYOUT (CLEAN 3D VERTICAL STACK WITH MODERN SPACING) --- */}
        {/* ================================================================ */}
        <div className="flex flex-col items-center gap-10 text-center lg:hidden" style={{ perspective: 1200 }}>

          {/* Headline */}
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <FixoraWriter
              lines={["Hey. I'm Fixora.", "Tell us what happened.", "We'll help with the paperwork."]}
              onDone={seq.markHeadlineDone}
              lineClassName={(i) => (i === 0 ? "text-brand-strong" : "")}
            />
          </h1>

          {/* 3D Floating Story Input Card */}
          <motion.div
            className="w-full"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateX: stageVisible ? 0 : 8, z: stageVisible ? 0 : -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <DisplayCard
              value={story}
              visible={stageVisible}
              terms={seq.hasStory ? [seq.extracted.company, seq.extracted.amount, seq.extracted.date] : []}
            />
          </motion.div>

          {/* 3D Floating Case Hub Stage */}
          <motion.div
            className="w-full my-2"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ opacity: stageVisible ? 1 : 0, scale: stageVisible ? 1 : 0.94, rotateX: stageVisible ? 0 : 6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <CaseHub
              active={seq.active}
              visible={stageVisible}
              reading={seq.isTyping}
              hasStory={seq.hasStory}
            />
          </motion.div>

          {/* 3D Floating Dispute Brief Card */}
          {seq.hasStory && (
            <motion.section
              initial={{ opacity: 0, y: 16, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              aria-live="polite"
              className="relative w-full rounded-3xl border border-border/80 bg-surface/90 p-5 text-left shadow-lift backdrop-blur-md"
            >
              <div className="border-b border-border/60 pb-3">
                <h2 className="font-heading text-sm font-semibold">Dispute Brief</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[seq.extracted.company, seq.extracted.amount, seq.extracted.date]
                  .filter(Boolean)
                  .map((v) => (
                    <span key={v} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-700">
                      {v}
                    </span>
                  ))}
              </div>
              <p className="mt-4 whitespace-pre-line font-body text-sm leading-relaxed text-foreground/90">
                {seq.typed}
                {seq.isTyping && (
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-brand"
                  />
                )}
              </p>

              {/* Mobile Stamp - Properly anchored inside padding */}
              <div aria-hidden className="pointer-events-none absolute bottom-3 right-3 rotate-[-10deg] select-none rounded-lg border-2 border-positive/30 bg-positive-soft/40 px-2 py-0.5 font-heading text-[9px] font-bold uppercase tracking-wider text-positive-strong shadow-xs">
                Brief Prepared
              </div>
            </motion.section>
          )}

          {/* Mobile Green 3D Tactile Button */}
          <motion.div
            initial={false}
            animate={{ opacity: canContinue ? 1 : 0, y: canContinue ? 0 : 12 }}
            className={`mt-2 flex flex-col items-center gap-3 ${canContinue ? "" : "pointer-events-none"}`}
          >
            <motion.button
              type="button"
              onClick={handleContinue}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className="group relative inline-flex cursor-pointer items-center gap-3 rounded-full border-b-4 border-positive-strong bg-positive px-3 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-positive/20 transition-all duration-150 hover:bg-positive-strong active:border-b-0 active:translate-y-1"
            >
              <span>Get started</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-white">
                ↗
              </span>
            </motion.button>
            <p className="text-xs text-muted">Free to start. We&apos;ll pick up right here.</p>
          </motion.div>

        </div>

        <p className="mt-12 text-center text-xs text-subtle">
          Your story stays private until you choose to send it.
        </p>
      </div>
    </motion.main>
  );
}
