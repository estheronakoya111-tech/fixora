"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

// Faint film grain (inline SVG noise, no image file needed) — the same grain
// the paper sheet uses, so dark stages don't look flat next to it.
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * Layered backdrop for full-bleed dark stages: warm light falling in from the
 * top, drifting soft glows, the hero's checkerboard echo, and film grain.
 * Drop it inside any `relative isolate overflow-hidden bg-foreground` section
 * and put content in a `relative` wrapper above it.
 */
export function StageDecor({ glowWarm, glowCalm, showChecker = true }: { glowWarm?: number; glowCalm?: number; showChecker?: boolean }) {
  // The film-grain blend layer is decorative and desktop-only: a
  // mix-blend-mode surface spanning the section forces the whole subtree into
  // one composited layer on mobile, which rasterizes every line of text
  // softer while the section scrolls past.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setLite(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return (
    <>
      {/* Warm light cone at the top of the stage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 85% 55% at 50% -8%, rgba(232,106,42,0.15), transparent 72%)",
        }}
      />
      {/* Top checkerboard echo of the hero's tiles (hero-side sections only) */}
      {showChecker && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "conic-gradient(rgba(255,255,255,0.05) 25%, transparent 0 50%, rgba(255,255,255,0.05) 0 75%, transparent 0)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 65% at 50% 0%, black, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 65% at 50% 0%, black, transparent 85%)",
          }}
        />
      )}
      {/* Drifting soft glows (colors from the design system) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(232,106,42,0.2),transparent)]"
        animate={{ y: glowWarm ?? 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(95,138,108,0.15),transparent)]"
        animate={{ y: glowCalm ?? 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
{/* Film grain over everything — desktop only (see lite above) */}
      {!lite && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: GRAIN }}
        />
      )}
    </>
  );
}

/**
 * The seam transition: the wrapped section is unveiled from under a clip mask
 * that opens top-to-bottom while the visitor scrolls. Two modes, chosen by a
 * measurement pass:
 *
 * - pin mode (section fits the viewport): the section parks sticky at the top
 *   and the mask opens across a dedicated scrub zone (60vh desktop / 30vh
 *   small screens).
 * - veil mode (section taller than the viewport, e.g. stacked mobile layout):
 *   no pinning — the mask opens while the section travels through the
 *   viewport, which reads the same without breaking scroll on tall content.
 *
 * Reduced-motion visitors get the plain section with no masking.
 */
const HIDDEN = "inset(0% 0% 100% 0%)";
const SHOWN = "inset(0% 0% 0% 0%)";

export function CurtainReveal({ children, scrubVh = 60, scrubVhSmall = 30, pushMode = false }: { children: ReactNode; scrubVh?: number; scrubVhSmall?: number; pushMode?: boolean }) {
  const reduce = useReducedMotion();
  const outerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState<{ h: number; scrub: number; pin: boolean } | null>(null);

  // Measure the section's natural height and pick the scrub distance
  // (desktop vs small screens) whenever either changes.
  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const small = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
      const scrubPx = ((small ? scrubVhSmall : scrubVh) / 100) * window.innerHeight;
      setLayout({ h: el.offsetHeight, scrub: scrubPx, pin: el.offsetHeight <= window.innerHeight * 1.15 });
    };
    update();
    const ro = new ResizeObserver(update);
    if (sectionRef.current) ro.observe(sectionRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [scrubVh, scrubVhSmall]);

  // Pin mode: progress runs while the wrapper scrolls from "top at viewport top"
  // to "bottom at viewport top"; the sticky stage is parked for that whole span.
  // Veil mode: progress runs while the section travels up through the viewport.
  const pin = layout?.pin ?? false;
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: pin ? ["start start", "end start"] : ["start end", "start start"],
  });

  // Pin mode: the reveal consumes exactly the scrub distance of the wrapper's
  // travel, so the mask fully opens the moment the park ends.
  const revealEnd = layout && pin ? layout.scrub / Math.max(1, layout.h + layout.scrub) : 0.8;
  const clip = useTransform(scrollYProgress, [0, revealEnd], [HIDDEN, SHOWN]);
  // A slight settle while the mask opens. Default mode: the unveiled sheet
  // starts a touch large and eases to rest. pushMode (camera push): the
  // incoming section starts smaller and pushed back, then grows to full size —
  // it reads as arriving from a distance instead of falling onto the viewer.
  const settle = useTransform(
    scrollYProgress,
    [0, revealEnd],
    pushMode ? [0.93, 1] : [1.06, 1],
  );

  if (reduce || !layout) return <div ref={outerRef}>{children}</div>;

  if (!pin) {
    // Veil mode: the section keeps its natural height and normal flow; only the
    // mask animates while it passes through the viewport.
    return (
      <div ref={outerRef} className="relative">
        <motion.div
          className="w-full overflow-hidden"
          style={{ clipPath: clip, scale: pushMode ? settle : undefined }}
        >
          {children}
        </motion.div>
      </div>
    );
  }

  // Pin mode: wrapper = section height + scrub headroom; sticky stage parks at
  // the top while the mask opens.
  return (
    <div ref={outerRef} className="relative" style={{ height: layout.h + layout.scrub }}>
      <div className="sticky top-0 overflow-hidden" style={{ height: layout.h }}>
        <motion.div className="h-full w-full overflow-hidden" style={{ clipPath: clip, scale: settle }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Headline that rises word-by-word out of an overflow mask. Pass the whole
 * sentence as an array and one word's index to give it the accent color.
 */
export function WordReveal({
  words,
  accentIndex,
  delay = 0,
  className = "",
  accentClass = "text-brand-300",
}: {
  words: string[];
  accentIndex?: number;
  delay?: number;
  className?: string;
  accentClass?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`inline-flex flex-wrap gap-x-[0.22em] ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="-mb-[0.14em] overflow-hidden pb-[0.14em]">
          <motion.span
            className={`inline-block ${i === accentIndex ? accentClass : ""}`}
            initial={reduce ? false : { y: "112%" }}
            whileInView={reduce ? undefined : { y: 0 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={{ duration: 0.75, delay: delay + i * 0.09, ease: EASE }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
