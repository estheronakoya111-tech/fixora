"use client";

import { useEffect, useRef, useState } from "react";
import {
  cubicBezier,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

// One shared easing vocabulary with the page-lift: slow move, small settle.
const easeMove = cubicBezier(0.42, 0, 0.58, 1);
const easeBack = cubicBezier(0.34, 1.4, 0.64, 1); // tiny overshoot for arrivals

/**
 * A fact chip that pops in on its own depth, staggered after the panel
 * settles upright — the "brief prepared" beats of the product story.
 */
function FactChip({ children, delay, accent = false }: { children: React.ReactNode; delay: number; accent?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, scale: 0.6, y: 14 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ delay, duration: 0.45, ease: easeBack }}
      className={`rounded-full px-3 py-1.5 font-body text-xs font-medium ${
        accent ? "bg-brand-soft text-brand-strong" : "bg-surface-sunken text-muted"
      }`}
    >
      {children}
    </motion.span>
  );
}

/**
 * The complaint letter text typed out over ~1.2s with a caret, starting when
 * it enters the viewport. Reduced motion: full text immediately.
 */
function TypedLetter({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [chars, setChars] = useState(reduce ? text : "");
  const typedAll = chars.length >= text.length;

  useEffect(() => {
    if (!inView || reduce || typedAll) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 2; // two characters per tick — reads as fast typing
      setChars(text.slice(0, n));
      if (n >= text.length) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [inView, reduce, text, typedAll]);

  return (
    <p ref={ref} className="mt-6 font-body text-sm leading-6 text-muted" aria-label={text}>
      {chars}
      {!typedAll && <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-brand" />}
      {typedAll && text}
    </p>
  );
}

/**
 * The product moment: the case panel starts lying back (~60°, hinged at its
 * bottom edge, like a card on a table) and stands upright to meet the middle
 * of the viewport — overshooting ~3° and settling, with its floor shadow
 * shrinking and its content popping in layered beats afterward. Once upright,
 * the panel leans a few degrees toward the cursor (desktop only).
 */
function StandingPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Mobile: keep depth/scale/shadow, reduce the strong tilt per the plan.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setLite(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Progress across the panel's own travel: 0 as its top enters the bottom of
  // the viewport, 1 once it reaches the vertical middle.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const startTilt = lite ? 35 : 58;
  // Phones land flat instead of resting at a slight -3°: a resting 3D
  // rotation rasterizes the panel off-axis and its text reads blurred on
  // small screens, in both scroll directions. Desktop keeps the subtle
  // lean-back settle.
  const tilt = useTransform(scrollYProgress, [0, 0.85], [startTilt, lite ? 0 : -3], { ease: easeMove });
  const settle = useSpring(tilt, { stiffness: 160, damping: 16, mass: 0.7 }); // overshoot past 0, then rest
  const glare = useTransform(scrollYProgress, [0, 0.55], [0.5, 0]); // table-glare fades as it stands
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.35, 1]);

  // Cursor tilt after upright, spring-damped, desktop only
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const cursorX = useSpring(mx, { stiffness: 120, damping: 16 });
  const cursorY = useSpring(my, { stiffness: 120, damping: 16 });

  // Floor shadow shrinks as the panel rises off the table
  const shadowY = useTransform(scrollYProgress, [0, 1], [-30, 6]);
  const shadowWidth = useTransform(scrollYProgress, [0, 1], ["106%", "88%"]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.7], [0.5, 0.2]);

  return (
    <div ref={ref} className="[perspective:1600px] [perspective-origin:50%_100%]">
      {/* No will-change on phones: keeping the panel on its own compositor
          layer there rasterizes text softer (blurred) for no gain — the
          panel rests flat now. */}
      <motion.div
        onPointerMove={(e) => {
          if (reduce || lite || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          mx.set(-py * 4); // gentle lean toward the cursor
          my.set(px * 5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        style={
          reduce
            ? { opacity }
            : {
                opacity,
                rotateX: settle,
                rotateY: cursorY,
              }
        }
        className={`relative ${reduce || lite ? "" : "will-change-transform"}`}
      >
        <div className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-5 py-4 sm:px-7"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand/70" /><span className="h-2.5 w-2.5 rounded-full bg-positive/70" /><span className="h-2.5 w-2.5 rounded-full bg-border" /></div><span className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">Your Fixora case</span><span className="w-11" /></div>
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.3fr_.7fr]">
            <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><div><p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-positive-strong">Complaint draft</p><h3 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em]">Charged after cancellation</h3></div><TypedLetter text="I cancelled my subscription before the renewal date, but I was charged again. I contacted support and have not received a clear resolution or refund." /><div className="mt-7 border-t border-border pt-4 font-body text-xs text-subtle"><span className="font-semibold text-foreground">Requested outcome:</span> Refund of $24.99</div><div className="mt-4 flex flex-wrap items-center gap-2"><FactChip delay={0.9} accent>cancellation confirmed</FactChip><FactChip delay={1.0}>$24.99</FactChip><FactChip delay={1.1}>no reply since</FactChip></div></article>
            <aside className="space-y-5"><motion.div initial={reduce ? false : { opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ delay: 1.35, duration: 0.35, ease: easeBack }} className="inline-flex -rotate-3 items-center gap-2 rounded-lg border-2 border-dashed border-positive/70 bg-positive-soft px-3.5 py-2 font-heading text-sm font-semibold text-positive-strong [transform:rotate(-3deg)_scale(1)]"><span aria-hidden>✔</span> Brief prepared</motion.div><div className="rounded-2xl bg-brand-soft p-5"><p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-strong">Next action</p><p className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">Review and send your complaint</p><button type="button" className="mt-5 rounded-full bg-brand px-4 py-2 font-body text-xs font-semibold text-white">Review complaint</button></div><div className="rounded-2xl border border-border p-5"><p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">Case timeline</p><ul className="mt-4 space-y-3 font-body text-sm text-muted"><li className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />Charged again</li><li className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-positive" />Support contacted</li><li className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border" />Complaint prepared</li></ul></div></aside>
          </div>
        </div>

        {/* Sheen sliding down the surface while the panel is lying back */}
        {!reduce && (
          <motion.span
            aria-hidden
            style={{ opacity: glare }}
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/95 via-white/25 to-transparent to-55%"
          />
        )}
      </motion.div>

      {/* Floor shadow, tightening as the panel stands up */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{
            y: shadowY,
            scaleX: shadowWidth,
            opacity: shadowOpacity,
          }}
          className="mx-auto h-8 rounded-[100%] bg-black/35 blur-2xl"
        />
      )}
    </div>
  );
}

export default function CasePreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [compact, setCompact] = useState(false);

  // A 3D page turn crops its own content on short, narrow viewports. Keep
  // the case preview in normal document flow there so every line stays visible.
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The letter lifts about 60px out of the panel (parallax depth cue) while
  // the section is upright. Panel-level translateY on a pseudo-inner layer.
  const { scrollYProgress } = useScroll({ target: letterRef, offset: ["start end", "end start"] });
  const letterLift = useTransform(scrollYProgress, [0.3, 0.7], [0, -60], { ease: easeMove });

  // Lid open: while the section travels from below the viewport to its
  // parked position, the whole content — text column and panel together —
  // stands up from a hinge at its bottom edge, like a MacBook lid opening,
  // with the surface sheen sliding off and the floor shadow tightening as it
  // rises. It lands level as it reaches the viewport top. Scroll-linked and
  // reversible; reduced motion and compact layouts get the plain section.
  const { scrollYProgress: flip } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });
  const flipSpan = [0.05, 0.7];
  const flipTilt = useTransform(flip, flipSpan, [24, 0], { ease: easeMove });
  const flipLift = useTransform(flip, flipSpan, ["6vh", "0vh"], { ease: easeMove });
  const flipOpacity = useTransform(flip, [0, 0.2], [0.4, 1]);
  const flipShadow = useTransform(
    flip,
    flipSpan,
    [
      "0 -40px 80px -20px rgba(20,20,18,0.5)",
      "0 0px 0px rgba(20,20,18,0)",
    ],
    { ease: easeMove },
  );
  // Surface sheen sliding down while the lid is still lying back, mirroring
  // the complaint-draft panel's glare.
  const flipGlare = useTransform(flip, [0, 0.55], [0.5, 0], { ease: easeMove });

  // Handoff to the dark closer: as the closing CTA rises over from below,
  // the page dims out like the lights going down for the finale. This bridges
  // the white → dark seam — HowItWorks does the same to this section — so the
  // sections read as one continuous chain. Scroll-linked and reversible.
  const { scrollYProgress: exitProgress } = useScroll({
    target: sectionRef,
    offset: ["end end", "end 40%"],
  });
  const exitDim = useTransform(exitProgress, [0.35, 1], [0, 0.4], { ease: easeMove });

  return (
    <section ref={sectionRef} className="relative bg-background [perspective:1400px]">
      <motion.div
        style={
          reduce || compact
            ? undefined
            : {
                rotateX: flipTilt,
                y: flipLift,
                opacity: flipOpacity,
                boxShadow: flipShadow,
                transformOrigin: "50% 100%",
              }
        }
        className={`relative bg-background px-6 py-20 lg:px-12 lg:py-28 ${reduce || compact ? "" : "will-change-transform"}`}
      >
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-positive-strong"><span className="h-px w-9 bg-positive" />A calmer case, in one place</p>
          <h2 className="mt-5 max-w-xl font-heading text-4xl font-medium leading-[0.98] tracking-[-0.06em] sm:text-5xl lg:text-6xl">Everything you need to move forward.</h2>
          <p className="mt-6 max-w-md font-body text-base leading-7 text-muted">Fixora brings your story, evidence, timeline, and next action together—so you are never left wondering what to say or do.</p>
        </div>

        <div ref={letterRef} className="relative">
          <motion.div style={reduce || compact ? undefined : { y: letterLift }} className={`relative ${reduce || compact ? "" : "will-change-transform"}`}>
            <StandingPanel />
          </motion.div>
        </div>
      </div>

      {/* Lid sheen: only while the section is still standing up */}
      {!reduce && !compact && (
        <motion.span
          aria-hidden
          style={{ opacity: flipGlare }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-white/20 to-transparent to-55%"
        />
      )}
      </motion.div>

      {/* Lights dim as the dark closer rises over the page */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: exitDim }}
        />
      )}
    </section>
  );
}
