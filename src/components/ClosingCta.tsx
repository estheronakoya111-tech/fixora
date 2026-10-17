"use client";

import { useEffect, useRef, useState } from "react";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Reveal from "@/components/Reveal";
import { StageDecor, WordReveal } from "@/components/ui/stage";

// --- CTA that leans toward the cursor before your finger lands
function Magnetic({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 160, damping: 14, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 160, damping: 14, mass: 0.4 });

  return (
    <motion.div
      style={reduce ? undefined : { x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * 18);
        y.set(((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}

// --- The clear-case card: leans toward the cursor in 3D, floats on its own depth
function TiltTicket() {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 130, damping: 15 });
  const sry = useSpring(ry, { stiffness: 130, damping: 15 });
  const shineLeft = useTransform(sry, (v) => `${42 + v * 7}%`);
  const shineOpacity = useTransform(sry, (v) => Math.min(1, Math.abs(v) * 0.28));

  return (
    <motion.div
      style={{ rotateX: reduce ? 0 : srx, rotateY: reduce ? 0 : sry, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 9);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 9);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className="relative mx-auto w-full max-w-md"
    >
      <motion.div
        whileHover={reduce ? undefined : { rotate: -1.2, scale: 1.03 }}
        transition={{ type: "spring", stiffness: 170, damping: 16 }}
        className="relative overflow-hidden rounded-[1.6rem] border border-border bg-surface p-7 text-foreground sm:p-9"
      >
        {/* Shine appears while the card is being tilted */}
        <motion.span
          aria-hidden
          style={{ left: shineLeft, opacity: shineOpacity }}
          className="pointer-events-none absolute inset-y-0 w-2/5 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        />
        <div className="flex items-center justify-between font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          <span>Your clear case</span>
          <span className="text-positive-strong">Ready to send</span>
        </div>
        <h3 className="mt-6 font-heading text-3xl font-semibold tracking-[-0.04em]">
          Charged after cancellation
        </h3>
        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 font-body text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-subtle">Amount</p>
            <p className="mt-1 font-heading font-semibold">$24.99</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-subtle">Next move</p>
            <p className="mt-1 text-positive-strong">Send the complaint</p>
          </div>
        </div>
        <p className="mt-5 font-body text-xs text-subtle">
          Written by you, organized by Fixora — nothing sent without your click.
        </p>
      </motion.div>
    </motion.div>
  );
}

// A floating chip sitting at its own depth: outer wrapper carries scroll
// parallax, inner carries the ambient float loop.
function DepthChip({
  y,
  className = "",
  duration = 5,
  children,
}: {
  y: MotionValue<number>;
  className?: string;
  duration?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div style={{ y }} className={`absolute ${className}`}>
      <motion.div
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const easeMove = cubicBezier(0.42, 0, 0.58, 1);

export default function ClosingCta({ onStart }: { onStart?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Phones skip the whole depth stack: section perspective, scroll-linked
  // arrival scale, and the 3D watermark all force off-axis rasterization on
  // mobile, which softens text until a full repaint. Desktop keeps the show.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setLite(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // One scroll timeline drives every layer; each moves at its own speed so the
  // section reads as depth, not a flat backdrop.
  // Anchoring to the element ("start 95%" → "end 5%") stretches every parallax
  // across the full time the section is actually seen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "end 5%"] });
  const watermarkY = useTransform(scrollYProgress, [0, 1], [150, -60]);
  const watermarkTilt = useTransform(scrollYProgress, [0.3, 0.9], [26, 0]);
  const ticketY = useTransform(scrollYProgress, [0.15, 0.85], [34, -26]);
  const chipNear = useTransform(scrollYProgress, [0.15, 0.85], [55, -40]);
  const chipFar = useTransform(scrollYProgress, [0.15, 0.85], [20, -14]);
  const pillDrift = useTransform(scrollYProgress, [0.2, 0.8], [-14, 14]);

  // Arrival — dimming wipe: as the dark section rises over the white screen,
  // everything inside starts slightly deep (scaled back and dim) and settles
  // to full while the section's top edge travels up. Reads as the lights
  // dimming for the final shot; the white section visually recedes under it.
  const { scrollYProgress: arrive } = useScroll({
    target: ref,
    offset: ["start end", "start 6%"],
  });
  const arriveSpan = [0, 0.8];
  const arriveScale = useTransform(arrive, arriveSpan, [0.95, 1], { ease: easeMove });
  const arriveY = useTransform(arrive, arriveSpan, ["6vh", "0vh"], { ease: easeMove });
  const arriveDim = useTransform(arrive, arriveSpan, [0.65, 0], { ease: easeMove });

  return (
    <section
      ref={ref}
      className={`relative isolate overflow-hidden bg-foreground text-white ${reduce || lite ? "" : "[perspective:1200px]"}`}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black"
        style={{ opacity: reduce || lite ? 0 : arriveDim }}
      />
      <motion.div
        className={`relative ${reduce || lite ? "" : "will-change-transform"}`}
        style={reduce || lite ? undefined : { scale: arriveScale, y: arriveY, transformOrigin: "50% 0%" }}
      >
      <StageDecor glowWarm={40} glowCalm={-40} />

      {/* Giant parallax wordmark rising from the floor of the section */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 select-none text-center font-heading text-[21vw] font-medium leading-[0.8] tracking-[-0.05em] text-white/[0.04]"
        style={reduce || lite ? undefined : { y: watermarkY, rotateX: watermarkTilt, transformPerspective: 900, transformOrigin: "bottom" }}
      >
        fixora
      </motion.div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-32">
        {/* Left: revealed headline, magnetic CTA, floating pills */}
        <div>
          <Reveal>
            <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
              <span className="h-px w-9 bg-positive" />
              Fixora / the next step
            </p>
          </Reveal>

          <h2 className="mt-6 max-w-xl font-heading text-[clamp(2.7rem,5.6vw,4.8rem)] font-medium leading-[0.95] tracking-[-0.07em]">
            <WordReveal words={["Your", "story", "is", "already", "enough."]} accentIndex={4} />
          </h2>

          <Reveal delay={0.16}>
            <p className="mt-7 max-w-md font-body text-base leading-7 text-white/70 sm:text-lg">
              You&apos;ve explained it once, right here. That&apos;s all Fixora needs to start
              building the case. Take a breath — the writing part can wait.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-10 hidden flex-wrap items-center gap-6 md:flex">
              <Magnetic>
                <motion.button
                  type="button"
                  onClick={onStart}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-3.5 font-body text-sm font-semibold text-white shadow-brand transition-colors duration-300 hover:bg-brand-hover"
                >
                  Start with your story
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:rotate-45 group-hover:bg-white/30"
                  >
                    ↗
                  </span>
                </motion.button>
              </Magnetic>
              <div className="flex items-center gap-2 font-body text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Free to start
              </div>
            </div>
          </Reveal>

          {/* Unfinished-story echoes, drifting with scroll like debris in the light */}
          <Reveal delay={0.3}>
            <motion.div style={lite ? undefined : { x: pillDrift }} className="mt-14 hidden flex-wrap items-center gap-3 sm:flex">
              {["Charged again", "Support went quiet", "Refund owed"].map((word, i) => (
                <motion.span
                  key={word}
                  animate={reduce || lite ? undefined : { y: [0, -6 - i * 1.5, 0] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                  className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium ${
                    i === 0
                      ? "border-brand/40 bg-brand/15 text-brand-100"
                      : i === 1
                        ? "border-white/15 bg-white/5 text-white/70"
                        : "border-positive/40 bg-positive/10 text-positive"
                  }`}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </Reveal>
        </div>

        {/* Right: a small depth stack — cards at three different distances */}
        <Reveal delay={0.14} y={30}>
          <div className="relative mx-auto max-w-md py-10 md:py-14">
            {/* Far: evidence chip, faint and slow */}
            {!lite && (
            <DepthChip y={chipFar} duration={6.5} className="-left-14 top-0 z-0 hidden md:block">
              <div className={`rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 ${lite ? "" : "backdrop-blur-md"}`}>
                <p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Evidence</p>
                <p className="mt-1 font-body text-xs text-white/75">Receipt-01.pdf attached</p>
              </div>
            </DepthChip>
            )}

            {/* Middle: the clear-case card */}
            <motion.div style={lite ? undefined : { y: ticketY }}>
              <TiltTicket />
            </motion.div>

            {/* On phones, show the case card before the final action so the
                person sees what Fixora prepares before choosing to begin. */}
            <div className="mt-10 flex flex-wrap items-center gap-4 md:hidden">
              <Magnetic>
                <motion.button
                  type="button"
                  onClick={onStart}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-3.5 font-body text-sm font-semibold text-white shadow-brand transition-colors duration-300 hover:bg-brand-hover"
                >
                  Start with your story
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:rotate-45 group-hover:bg-white/30"
                  >
                    &#8599;
                  </span>
                </motion.button>
              </Magnetic>
              <div className="flex items-center gap-2 font-body text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Free to start
              </div>
            </div>

            {/* Near: outcome chip, bright and fast */}
            {!lite && (
            <DepthChip y={chipNear} duration={4.5} className="-right-10 bottom-0 z-20 hidden md:block">
              <div className="rounded-2xl bg-positive px-4 py-3 text-white shadow-[0_14px_35px_-12px_rgb(70_112_90_/.9)]">
                <p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Outcome</p>
                <p className="mt-1 font-heading text-sm font-semibold">Refund + $24.99</p>
              </div>
            </DepthChip>
            )}
          </div>
        </Reveal>
      </div>
      </motion.div>
    </section>
  );
}
