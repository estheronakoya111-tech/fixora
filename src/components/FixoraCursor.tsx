"use client";

// FixoraCursor — an on-brand cursor trail for Fix This.
// A "depth comet": a chain of glowing orange orbs that starts big, sharp and
// bright right at the cursor and recedes into depth as it falls back — each
// successive orb smaller, dimmer and softer (blurred), boosted by additive
// blending so the head has a bold glow. Clicking keeps the original ring.
//
// Guards: renders nothing on coarse pointers (touch), respects
// prefers-reduced-motion, and suppresses the trail over text inputs.
// The canvas is pointer-events-none and the rAF loop sleeps when idle.
// Mounted once in src/app/layout.tsx so it works on every page.

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; t: number };

const DOT_LIFE = 750;
const RING_LIFE = 600;
const SPACING = 12;
const MAX_DOTS = 26;

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

    // Pre-rendered glow sprite: one radial gradient, drawn scaled per orb.
    // Far cheaper and softer-edged than per-dot gradients/shadowBlur.
    const SPRITE = 128;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = SPRITE;
    const sctx = sprite.getContext("2d")!;
    const g = sctx.createRadialGradient(
      SPRITE / 2,
      SPRITE / 2,
      0,
      SPRITE / 2,
      SPRITE / 2,
      SPRITE / 2,
    );
    g.addColorStop(0, "#FFE1C8"); // hot core (near-white orange)
    g.addColorStop(0.22, "#FFB369"); // bright body
    g.addColorStop(0.5, "#E86A2A"); // --color-brand
    g.addColorStop(1, "rgba(232,106,42,0)"); // falls to transparent
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, SPRITE, SPRITE);

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

      // Depth comet: the newest orb is the biggest and brightest; the trail
      // gets smaller, dimmer and softer (looks blurred) as it recedes.
      // Draw tail-first so the head sits on top, and use additive blending
      // ("lighter") so overlapping orbs bloom into one continuous comet.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
      // Clamp age: a rAF timestamp can be slightly earlier than the
      // performance.now() captured when the dot/ring was pushed (the frame's
      // start time precedes the event), which produced negative ages and
      // radii below 0 — throwing on ctx.arc.
      const age = Math.min(1, Math.max(0, (now - d.t) / DOT_LIFE));
      const depth = i === dots.length - 1 ? 0 : 1 - i / (dots.length - 1); // 1 = head, 0 = tail
      const life = 1 - age;
      const radius = Math.max(0.1, (3 + life * (5 + depth * 20)) * (0.25 + life * 0.75));
      const alpha = (0.12 + life * depth * 0.85) * life;
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite,
          d.x - radius,
          d.y - radius,
          radius * 2,
          radius * 2,
        );
      }
      ctx.globalCompositeOperation = "source-over";

      ctx.strokeStyle = "#E86A2A";
      ctx.lineWidth = 1.5;
      for (const r of rings) {
        const age = Math.min(1, Math.max(0, (now - r.t) / RING_LIFE));
        ctx.globalAlpha = (1 - age) * 0.5;
        ctx.beginPath();
        // Math.max guards against a sub-zero radius even if age ever slips
        // below 0 — ctx.arc throws on any negative radius.
        ctx.arc(r.x, r.y, Math.max(0.1, 6 + age * 16), 0, Math.PI * 2);
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
