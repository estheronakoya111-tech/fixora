"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Scroll-triggered reveal: content fades and rises into view the first time it
// enters the viewport. For content already on screen it doubles as a soft mount
// animation. className can carry layout classes (grid, margins) directly.
// Pass `x` instead of `y` for a slide-in-from-the-side variant.
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  x = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, x }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
