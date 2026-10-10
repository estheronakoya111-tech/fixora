"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type FixoraWriterProps = {
  lines: string[];
  startDelay?: number;
  cps?: number;
  onDone?: () => void;
  lineClassName?: (index: number) => string;
  className?: string;
};

function Line({ text, visible, animate }: { text: string; visible: number; animate: boolean }) {
  const words = text.split(/(?<=\s)/);

  return (
    <>
      {words.map((word, w) => {
        const from = words.slice(0, w).reduce((acc, curr) => acc + curr.length, 0);
        const chars = word.slice(0, Math.max(0, visible - from)).split("");
        return (
          <span key={w} className="inline-block whitespace-nowrap">
            {chars.map((c, k) => (
              <motion.span
                key={k}
                initial={animate ? { opacity: 0, y: 4, filter: "blur(3px)" } : false}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.25 }}
                className="inline-block whitespace-pre"
              >
                {c}
              </motion.span>
            ))}
          </span>
        );
      })}
    </>
  );
}

export default function FixoraWriter({
  lines,
  startDelay = 700,
  cps = 24,
  onDone,
  lineClassName,
  className = "",
}: FixoraWriterProps) {
  const reduce = useReducedMotion();
  const total = lines.reduce((n, l) => n + l.length, 0);
  const [count, setCount] = useState(0);
  const shown = reduce ? total : count;

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (reduce || count >= total) return;
    let end = 0;
    const atLineEnd = lines.some((l) => (end += l.length) === count);
    const wait =
      count === 0 ? startDelay : atLineEnd ? 420 : (1000 / cps) * (0.6 + Math.random() * 0.8);
    const t = setTimeout(() => {
      setCount(count + 1);
      if (count + 1 >= total) doneRef.current?.();
    }, wait);
    return () => clearTimeout(t);
  }, [count, total, lines, reduce, startDelay, cps]);

  return (
    <span className={className} aria-label={lines.join(" ")}>
      <span aria-hidden className="grid">
        <span className="invisible col-start-1 row-start-1">
          {lines.map((l, i) => (
            <span key={i} className={`block ${lineClassName?.(i) ?? ""}`}>
              {l}
            </span>
          ))}
        </span>
        <span className="col-start-1 row-start-1">
          {lines.map((line, i) => {
            const start = lines.slice(0, i).reduce((acc, curr) => acc + curr.length, 0);
            const visible = Math.max(0, Math.min(line.length, shown - start));
            const caret =
              shown < total && ((shown >= start && shown < start + line.length) || (i === 0 && shown === 0));
            return (
              <span key={i} className={`block ${lineClassName?.(i) ?? ""}`}>
                {line ? <Line text={line} visible={visible} animate={!reduce} /> : "\u200b"}
                {caret && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="ml-1 inline-block h-[0.9em] w-0.5 translate-y-[0.1em] bg-brand"
                  />
                )}
              </span>
            );
          })}
        </span>
      </span>
    </span>
  );
}