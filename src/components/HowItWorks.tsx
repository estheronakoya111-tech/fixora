"use client";

import { useRef } from "react";
import {
  cubicBezier,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { StageDecor, WordReveal } from "@/components/ui/stage";

// Same easing vocabulary as the hero lift: slow move, held rests.
const easeMove = cubicBezier(0.42, 0, 0.58, 1);

const STEPS = [
  {
    label: "01 / tell it straight",
    title: "Write the messy version",
    body: "Type what happened in your own words. No forms, no legal language — get it out of your head and onto the page.",
    chipA: "“they charged me again…”",
    chipB: "no forms · no legal words",
  },
  {
    label: "02 / we shape the case",
    title: "The facts come forward",
    body: "Fixora picks out the company, amounts, dates, and what you're actually asking for — then drafts a clear, calm complaint.",
    chipA: "company · amount · dates",
    chipB: "draft: calm and clear",
  },
  {
    label: "03 / you stay in charge",
    title: "Review, send, follow up",
    body: "You approve the draft, attach evidence, send it, and Fixora helps you track the reply until it's resolved.",
    chipA: "you press send",
    chipB: "reply tracked to the end",
  },
];

/**
 * One glass card. Its wrapper is a tall scroll block so the card pins briefly,
 * then recedes (scale + tilt + pull-away) as the next card slides over it.
 */
function StackCard({
  step,
  i,
  total,
  glare,
}: {
  step: (typeof STEPS)[number];
  i: number;
  total: number;
  glare: MotionValue<number> | null;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Progress across this card's wrapper: pins, then recedes as the next covers.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const end = 0.55;
  // Recession is per-depth-level: a covered card doesn't just shrink once —
  // each new card that stacks above pushes it another step back (smaller,
  // lower, more tilted), so the pile reads as a deck with real gaps.
  const scale = useSpring(useTransform(scrollYProgress, [end - 0.12, end, 1], [1, 0.93 - i * 0.045, 0.88 - i * 0.045]), {
    stiffness: 90,
    damping: 22,
  });
  const lift = useTransform(scrollYProgress, [end - 0.12, end, 1], [0, 12, 4 - i * 6]);
  const tilt = useTransform(scrollYProgress, [end - 0.12, end, 1], [0, 3, 5]);
  // Alternating ±3° yaw so the pile isn't perfectly aligned — cards look
  // naturally dealt rather than machine-stacked.
  const rawYaw = (i % 2 === 0 ? -1 : 1) * 3;
  const yaw = useTransform(scrollYProgress, [end - 0.12, end, 1], [0, rawYaw * 0.4, rawYaw]);
  // Fog: distance dimming per depth level (A + G).
  const fog = useTransform(scrollYProgress, [end - 0.12, end, 1], [0, 0.32 + i * 0.16, 0.42 + i * 0.16]);

  // Holographic glare tracking the cursor, only on the frontmost card.
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const smx = useSpring(mx, { stiffness: 100, damping: 20 });
  const smy = useSpring(my, { stiffness: 100, damping: 20 });
  const glareBg = useMotionTemplate`radial-gradient(circle 420px at ${smx}% ${smy}%, rgba(255,176,120,0.13), transparent 70%)`;

  return (
    <div ref={ref} className="min-h-[70vh] pt-[7vh]">
      <div className="sticky" style={{ top: `calc(5.5rem + ${i * 14}px)`, paddingBottom: "3rem" }}>
        <motion.div
          style={
            reduce
              ? undefined
              : {
                  scale,
                  y: lift,
                  rotateX: tilt,
                  rotateY: yaw,
                  transformPerspective: 1100,
                  transformOrigin: "top center",
                }
          }
          onPointerMove={(e) => {
            if (reduce || e.pointerType !== "mouse" || i < total - 1) return;
            const r = e.currentTarget.getBoundingClientRect();
            mx.set(((e.clientX - r.left) / r.width) * 100);
            my.set(((e.clientY - r.top) / r.height) * 100);
          }}
          className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-8 sm:p-12 ${
            // Depth shadows (J): each level casts a harder shadow onto the card
            // below it, selling the physical stack without blur filters.
            [
              "shadow-[0_18px_50px_-18px_rgba(0,0,0,0.55)]",
              "shadow-[0_28px_60px_-18px_rgba(0,0,0,0.62)]",
              "shadow-[0_38px_70px_-18px_rgba(0,0,0,0.68)]",
            ][Math.min(i, 2)]
          } ${reduce ? "" : "will-change-transform"}`}
        >
          {/* Cursor-tracked glare, only ever visible on the front card */}
          {i === total - 1 && glare !== null && !reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: glareBg }}
            />
          )}
          {/* Fog layer: deepens as the card is covered (A). Sits above content
              so covered text dims faster than the card surface reads (G). */}
          {!reduce && (
            <motion.span
              aria-hidden
              style={{ opacity: fog }}
              className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[#101010]"
            />
          )}
          {/* Card number watermark, huge and faint at the card's edge */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-9 select-none font-heading text-[9rem] font-medium leading-none text-white/[0.045]"
          >
            {i + 1}
          </span>

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                {step.label}
              </span>
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-xs text-white/60"
              >
                ↗
              </span>
            </div>
            <h3 className="mt-7 max-w-md font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {step.title}
            </h3>
            <p className="mt-4 max-w-md font-body text-base leading-7 text-white/70">{step.body}</p>

            {/* Mini demo chips at the card's foot */}
            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-brand/40 bg-brand/15 px-4 py-1.5 font-body text-xs font-medium text-brand-100">
                {step.chipA}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-body text-xs font-medium text-white/70">
                {step.chipB}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Arrival — dock-to-fullscreen: while the sheet's top edge travels from the
  // bottom of the viewport to the top, the section starts as a small rounded
  // "phone" card floating over the hero, then grows and docks to the screen
  // edges. Content inside counter-scales so the text never looks zoomed.
  const { scrollYProgress: arrive } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });
  const dock = useTransform(arrive, [0.05, 0.85], [0, 1], { ease: easeMove });
  // Phone card → fullscreen: scale and Y come from the card's own progress.
  const dockScale = useTransform(dock, [0, 1], [1, 1]);
  const dockY = useTransform(dock, [0, 1], ["0vh", "0vh"]);
  const dockRadius = useTransform(dock, [0, 1], [0, 0]);
  const dockShadow = useTransform(
    dock,
    [0, 1],
    ["0 40px 90px -20px rgba(0,0,0,0.55)", "0 0px 0px rgba(0,0,0,0)"],
  );
  const dockContent = useTransform(dock, [0, 1], [1, 1]);
  // Background light slides in as the section arrives, echoing the hero's dim.
  const { scrollYProgress: bgProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });
  const glowWarm = useTransform(bgProgress, [0.15, 1], [90, 0]);
  const glowCalm = useTransform(bgProgress, [0.15, 1], [150, -50]);

  // Exit drift: as the section's bottom edge rises (the case-preview section
  // approaching from below), the step cards pass their moment — they drift
  // backwards, shrink and dim slightly, like going out of focus while the
  // product takes the stage.
  const { scrollYProgress: exitProgress } = useScroll({
    target: sectionRef,
    offset: ["end end", "end 40%"],
  });
  const exitScale = useTransform(exitProgress, [0, 1], [1, 0.9], { ease: easeMove });
  const exitLift = useTransform(exitProgress, [0, 1], [0, -42], { ease: easeMove });
  const exitDim = useTransform(exitProgress, [0, 1], [0, 0.45], { ease: easeMove });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative isolate"
    >
      <motion.div
        className="overflow-hidden bg-foreground text-white"
        style={
          reduce
            ? undefined
            : {
                scale: dockScale,
                y: dockY,
                borderRadius: dockRadius,
                boxShadow: dockShadow,
              }
        }
      >
      {/* No checkerboard here — that stays in the hero and closing CTA */}
      <StageDecor showChecker={false} />
      {/* Glows that slide in with the section */}
      <motion.div
        aria-hidden
        style={{ y: glowWarm }}
        className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-80 w-80 rounded-full bg-brand/20 blur-[110px]"
      />
      <motion.div
        aria-hidden
        style={{ y: glowCalm }}
        className="pointer-events-none absolute -right-24 bottom-8 -z-10 h-72 w-72 rounded-full bg-positive/15 blur-[100px]"
      />

      <motion.div
        className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:px-12"
        style={
          reduce
            ? undefined
            : {
                scale: dockContent,
                transformPerspective: 1100,
              }
        }
      >
        {/* Section head: word-reveal headline matching the closing CTA */}
        <div className="max-w-3xl">
          <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
            <span className="h-px w-9 bg-positive" />
            Fixora / how it works
          </p>
          <h2 className="mt-6 font-heading text-[clamp(2.7rem,5.6vw,4.8rem)] font-medium leading-[0.95] tracking-[-0.07em]">
            <WordReveal words={["Three", "steps.", "One", "calm", "case."]} accentIndex={4} />
          </h2>
          <p className="mt-7 max-w-md font-body text-base leading-7 text-white/70 sm:text-lg">
            The whole flow is one conversation. Fixora asks the right questions, you answer
            casually, and a clear complaint comes out the other side.
          </p>
        </div>

        {/* Sticky stack: each card pins, the next covers it, the pile recedes */}
        <div className="mt-14">
          {STEPS.map((step, i) => (
            <StackCard key={step.label} step={step} i={i} total={STEPS.length} glare={null} />
          ))}
        </div>
      </motion.div>
      </motion.div>
    </section>
  );
}
