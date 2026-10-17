"use client";

import { useRef } from "react";
import { useScroll } from "framer-motion";
import Hero from "@/components/Hero";
import ClosingCta from "@/components/ClosingCta";
import CasePreview from "@/components/CasePreview";
import HowItWorks from "@/components/HowItWorks";

import type { IntroPayload } from "@/components/intro/useIntroSequence";

export type { IntroPayload };

// Faint paper grain (inline SVG noise, no image file needed)
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export default function Intro({ onContinue }: { onContinue?: (payload: IntroPayload) => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // 0 when the sheet's top edge enters the bottom of the screen,
  // 1 when it reaches the top. Drives the hero's recede.
  const { scrollYProgress } = useScroll({
    target: sheetRef,
    offset: ["start end", "start start"],
  });

  function start() {
    onContinue?.({ story: "", extracted: { company: null, amount: null, date: null }, letter: "" });
  }

  return (
    <main className="bg-background text-foreground">
      {/* Hero is sticky, so it stays pinned while the sheet slides over it */}
      <Hero onStart={start} progress={scrollYProgress} />

      {/* The paper sheet */}
      <div
        ref={sheetRef}
        className="relative z-10 min-h-dvh overflow-x-clip rounded-t-[2.5rem] bg-background shadow-[0_-24px_60px_-20px_rgb(0_0_0_/_0.35)] lg:rounded-t-[3.5rem]"
      >
        <HowItWorks />
        <CasePreview />
        {/* Seam 3: the dark closer slides up as a rounded sheet with its own
            subtle reveal — simple, in-flow, no overlay tricks. */}
        <ClosingCta onStart={start} />
        {/* Grain is decorative; on phones a mix-blend layer forces the whole
            intro into one composited surface, which rasterizes every line of
            text softer — so the grain stays desktop-only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.07] mix-blend-multiply hidden md:block"
          style={{ backgroundImage: GRAIN }}
        />
      </div>
    </main>
  );
}