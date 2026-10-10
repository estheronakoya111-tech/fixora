"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type ExtractedComplaint = {
  company: string | null;
  amount: string | null;
  date: string | null;
};

export type IntroPayload = {
  story: string;
  extracted: ExtractedComplaint;
  letter: string;
};

export const STEP = { HEADLINE: 0, STAGE: 1, READING: 2, REVIEW: 3 } as const;

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function titleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) =>
      /[A-Z]/.test(w.slice(1)) || (w.length > 1 && w === w.toUpperCase())
        ? w
        : w.length <= 3
          ? w.toUpperCase()
          : w[0].toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

export function extract(story: string): ExtractedComplaint {
  const amount =
    story.match(/(?:[$₦£€]|ngn\s?)\s?\d[\d,]*(?:\.\d{1,2})?/i)?.[0].replace(/\s+/g, "") ?? null;

  const date =
    story.match(new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, "i"))?.[0] ??
    story.match(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\b`, "i"))?.[0] ??
    null;

  const company = story.match(
    /\b(?:by|from|with|at)\s+([a-z0-9&.\-]+(?:\s+[a-z0-9&.\-]+){0,2}?)(?=\s+(?:even|after|for|when|on|but|and|because|since|without|again)\b|[.,;!?]|$)/i
  )?.[1];

  return {
    company: company ? titleCase(company) : null,
    amount,
    date: date
      ? date.replace(/\b[a-z]+/gi, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      : null,
  };
}

export function buildLetter(e: ExtractedComplaint) {
  const company = e.company ?? "your company";
  const amount = e.amount ? ` of ${e.amount}` : "";
  const when = e.date ? ` on ${e.date}` : "";
  return [
    `To the customer support team at ${company},`,
    `I am writing about a charge${amount}${when} that I believe was made in error.`,
    `Please review it, correct the mistake and confirm the outcome in writing. If it cannot be resolved, I will escalate it to the relevant consumer protection authority.`,
  ].join("\n\n");
}

function commonPrefixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// Ultra-fast typewriter stream without artificially imposed pauses
function useTypewriter(target: string, enabled: boolean, cps = 180) {
  const [state, setState] = useState({ target, count: 0 });

  let count = state.count;
  if (state.target !== target) {
    count = Math.min(state.count, commonPrefixLength(state.target, target));
    setState({ target, count });
  }

  useEffect(() => {
    if (!enabled || count >= target.length) return;
    const t = setTimeout(() => {
      setState((s) => (s.target === target ? { ...s, count: s.count + 1 } : s));
    }, 1000 / cps);
    return () => clearTimeout(t);
  }, [count, target, enabled, cps]);

  return enabled ? target.slice(0, count) : target;
}

export function useIntroSequence(story: string) {
  const reduce = useReducedMotion();
  const [written, setWritten] = useState(false);
  const markHeadlineDone = useCallback(() => setWritten(true), []);

  // Zero-debounce immediate parsing
  const hasStory = story.trim().length >= 12;
  const extracted = useMemo(() => extract(story), [story]);
  const letter = useMemo(() => (hasStory ? buildLetter(extracted) : ""), [hasStory, extracted]);
  const typed = useTypewriter(letter, !reduce);
  const isTyping = hasStory && typed.length < letter.length;

  const headlineDone = written || !!reduce;
  const step = !headlineDone
    ? STEP.HEADLINE
    : !hasStory
      ? STEP.STAGE
      : isTyping
        ? STEP.READING
        : STEP.REVIEW;

  return {
    step,
    reached: (s: number) => step >= s,
    markHeadlineDone,
    hasStory,
    extracted,
    letter,
    typed,
    isTyping,
    active: hasStory ? 2 : 0,
  };
}