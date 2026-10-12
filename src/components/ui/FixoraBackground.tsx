"use client";

import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

type FixoraBackgroundProps = PropsWithChildren<{
  active?: boolean;
  /** give the hero its height here, e.g. "min-h-[88dvh]" */
  className?: string;
}>;

// ---- shared look ----
const checker = (a: string, b: string) => `conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0)`;

// faint grid across the whole hero, a bit stronger toward the light
const ASH_MASK =
  "radial-gradient(ellipse 130% 120% at 78% 0%, #000 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.4) 100%)";
const DEEP_MASK = "radial-gradient(ellipse 38% 60% at 78% 0%, #000 0%, transparent 100%)";
const FADE_MASK = "linear-gradient(to bottom, black 90%, transparent)";
// the cone fades with distance from the source
const FALLOFF = "radial-gradient(ellipse 120% 135% at 78% -4%, #000 0%, rgba(0,0,0,.65) 45%, transparent 100%)";
const SOURCE = "radial-gradient(circle 14rem at 78% 0%, rgba(255,196,150,.6), transparent 70%)";

export default function FixoraBackground({ children, active = true, className = "" }: FixoraBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: "120px" });

  // lighter tier for touch devices and small screens
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setLite(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Keep the hero responsive, but update it sparingly so mask paints do not
  // compete with scrolling on less powerful desktops.
  const live = active && inView && !reduce && !lite;
  const TILE = lite ? 44 : 56; // one checker cell = 2 x 2 squares
  const size = `${TILE}px ${TILE}px`;
  // cursor position in % of the hero; the spring makes it trail the cursor
  const lx = useMotionValue(70);
  const ly = useMotionValue(35);
  const slx = useSpring(lx, { stiffness: 60, damping: 20, mass: 0.9 });
  const sly = useSpring(ly, { stiffness: 60, damping: 20, mass: 0.9 });

  // tight bright core + wide soft halo of orange tiles around the cursor
  const litMask = useMotionTemplate`radial-gradient(circle 120px at ${slx}% ${sly}%, #000 0%, transparent 100%), radial-gradient(circle 280px at ${slx}% ${sly}%, rgba(0,0,0,.45) 0%, transparent 100%)`;

  // the cone tilts toward the cursor (cursor left = cone swings left), slowly
  const angleRaw = useTransform(slx, [0, 100], [188, 174]);
  const angle = useSpring(angleRaw, { stiffness: 22, damping: 24 });
  const coneBg = useMotionTemplate`conic-gradient(from ${angle}deg at 78% -4%, transparent 0deg, rgba(255,176,120,.4) 12deg, rgba(255,198,152,.56) 24deg, rgba(255,176,120,.4) 36deg, transparent 48deg)`;
  const coneMask = useMotionTemplate`conic-gradient(from ${angle}deg at 78% -4%, transparent 0deg, rgba(0,0,0,.55) 12deg, #000 24deg, rgba(0,0,0,.55) 36deg, transparent 48deg)`;

  // everything thins out and lifts as the hero scrolls away
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -50]);

  // Motion returns at a capped rate: it still follows the pointer, but only
  // asks the browser to repaint these large masks about 12 times per second.
  const idle = useRef<{ stop: () => void }[]>([]);
  useEffect(() => {
    const el = ref.current;
    if (!live || !el) return;

    const stop = () => {
      idle.current.forEach((control) => control.stop());
      idle.current = [];
    };
    const start = () => {
      stop();
      idle.current = [
        animate(lx, [64, 76, 58, 70, 64], { duration: 54, repeat: Infinity, ease: "easeInOut" }),
        animate(ly, [34, 46, 58, 40, 34], { duration: 48, repeat: Infinity, ease: "easeInOut" }),
      ];
    };
    let lastMove = 0;
    const move = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove < 80) return;
      lastMove = now;
      stop();
      const bounds = el.getBoundingClientRect();
      lx.set(((event.clientX - bounds.left) / bounds.width) * 100);
      ly.set(((event.clientY - bounds.top) / bounds.height) * 100);
    };

    start();
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", start);
    return () => {
      stop();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", start);
    };
  }, [live, lx, ly]);

  return (
    <div ref={ref} className={`relative isolate overflow-hidden ${className}`}>
      {active && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ opacity: fade, y: lift, maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
          {/* ash tiles: faintly visible across the whole hero */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: checker("rgba(60,62,58,.10)", "transparent"),
              backgroundSize: size,
              maskImage: ASH_MASK,
              WebkitMaskImage: ASH_MASK,
            }}
          />
          {/* a little darker near the source */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: checker("rgba(24,26,24,.15)", "transparent"),
              backgroundSize: size,
              maskImage: DEEP_MASK,
              WebkitMaskImage: DEEP_MASK,
            }}
          />

          {/* the cone of light: soft glow + the tiles inside it run warm */}
          <div
            className="absolute inset-0"
            style={{ maskImage: FALLOFF, WebkitMaskImage: FALLOFF, opacity: lite ? 0.75 : 1 }}
          >
            <motion.div className="absolute inset-0" style={{ backgroundImage: coneBg }} />
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage: checker("rgba(232,106,42,.32)", "rgba(232,106,42,.08)"),
                backgroundSize: size,
                maskImage: coneMask,
                WebkitMaskImage: coneMask,
              }}
            />
          </div>

          {/* hot spot at the source */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundImage: SOURCE }}
            animate={live ? { opacity: [0.85, 1, 0.85] } : undefined}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          {!lite && (
            <>
              {/* orange tiles glowing around the cursor */}
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: checker("rgba(232,106,42,.32)", "rgba(232,106,42,.08)"),
                  backgroundSize: size,
                  maskImage: litMask,
                  WebkitMaskImage: litMask,
                }}
              />
            </>
          )}
        </motion.div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
