"use client";

// FixoraCursor — an on-brand cursor trail for Fix This.
// Moving the mouse leaves a fading path of Fix This Orange dots (#E86A2A,
// mirroring --color-brand in globals.css); clicking spawns an expanding ring.
//
// Guards: renders nothing on coarse pointers (touch), respects
// prefers-reduced-motion, and suppresses the trail over text inputs.
// The canvas is pointer-events-none and the rAF loop sleeps when idle.
// Mounted once in src/app/layout.tsx so it works on every page.

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; t: number };

const DOT_LIFE = 700;
const RING_LIFE = 600;
const SPACING = 14;
const MAX_DOTS = 22;

export default function FixoraCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let dots: Point[] = [];
    let rings: Point[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      dots = dots.filter((d) => now - d.t < DOT_LIFE);
      rings = rings.filter((r) => now - r.t < RING_LIFE);

      ctx.fillStyle = "#E86A2A";
      for (const d of dots) {
        const life = 1 - (now - d.t) / DOT_LIFE;
        ctx.globalAlpha = life * 0.55;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + life * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#E86A2A";
      ctx.lineWidth = 1.5;
      for (const r of rings) {
        const age = (now - r.t) / RING_LIFE;
        ctx.globalAlpha = (1 - age) * 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 6 + age * 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      raf = dots.length || rings.length ? requestAnimationFrame(draw) : 0;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      if (target?.closest?.("textarea, input, [contenteditable='true']")) {
        dots = [];
        return;
      }
      const last = dots[dots.length - 1];
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < SPACING)
        return;
      dots.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (dots.length > MAX_DOTS) dots.shift();
      wake();
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      rings.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      wake();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
}
