"use client";

import { useId, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

const C = {
  litTop: "#FFB98A",
  litBottom: "#F58A4C",
  faceStart: "#F47C3D",
  faceEnd: "#DC5C1E",
  sideNear: "#B9531B",
  sideFar: "#6F2D0F",
  shadow: "#3E4A55",
} as const;

const LOCKUP_SIZES = {
  sm: "text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-4xl sm:text-5xl",
} as const;

export interface FixoraLogoProps {
  size?: keyof typeof LOCKUP_SIZES;
  /** Omit for responsive default: mark only below `sm`, full lockup from `sm` up. */
  showWordmark?: boolean;
  className?: string;
}

function Mark() {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const ref = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      viewBox="0 0 92 106"
      fill="none"
      className="block w-auto"
      style={{ height: "0.92em" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id("top")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.litTop} />
          <stop offset="1" stopColor={C.litBottom} />
        </linearGradient>
        <linearGradient id={id("face")} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={C.faceStart} />
          <stop offset="1" stopColor={C.faceEnd} />
        </linearGradient>
        <linearGradient id={id("side")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={C.sideNear} />
          <stop offset="1" stopColor={C.sideFar} />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="0.7" y2="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="34" cy="102" rx="26" ry="2.6" fill={C.shadow} opacity="0.16" />

      <g strokeLinejoin="round" strokeWidth="1.4">
        <path
          d="M20 2 H84 V26 H44 V36 H74 V54 H44 V92 H20 Z"
          fill={ref("side")}
          stroke={ref("side")}
        />

        <path d="M10 10 H74 L84 2 H20 Z" fill={ref("top")} stroke={ref("top")} />
        <path d="M34 44 H64 L74 36 H44 Z" fill={ref("top")} stroke={ref("top")} />

        <path d="M74 10 V34 L84 26 V2 Z" fill={ref("side")} stroke={ref("side")} />
        <path d="M34 34 V44 L44 36 V26 Z" fill={ref("side")} stroke={ref("side")} />
        <path d="M64 44 V62 L74 54 V36 Z" fill={ref("side")} stroke={ref("side")} />
        <path d="M34 62 V100 L44 92 V54 Z" fill={ref("side")} stroke={ref("side")} />

        <path
          d="M10 10 H74 V34 H34 V44 H64 V62 H34 V100 H10 Z"
          fill={ref("face")}
          stroke={ref("face")}
        />
      </g>

      <path
        d="M10 10 H74 V34 H34 V44 H64 V62 H34 V100 H10 Z"
        fill={ref("sheen")}
      />
      <path
        d="M11.5 98.5 V11.5 H72.5"
        stroke="#fff"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FixoraMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center text-[26px] ${className}`}>
      <Mark />
    </span>
  );
}

export function FixoraLogo({
  size = "md",
  showWordmark,
  className = "",
}: FixoraLogoProps) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 160,
    damping: 16,
  });

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    setHovered(false);
  }

  const lifted = hovered && !reduceMotion;

  const wordmarkVisibility =
    showWordmark === undefined
      ? "hidden sm:block"
      : showWordmark
        ? "block"
        : "hidden";

  return (
    <span
      role="img"
      aria-label="Fixora"
      className={`inline-flex select-none items-center gap-[0.05em] leading-none ${LOCKUP_SIZES[size]} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <span className="relative inline-flex">
        <motion.span
          aria-hidden
          className="absolute -bottom-[0.07em] left-[8%] h-[0.09em] w-[78%] rounded-[50%] bg-[#3E4A55] blur-[2px]"
          animate={{
            scaleX: lifted ? 1.25 : 1,
            opacity: lifted ? 0.26 : 0.14,
          }}
          transition={{ type: "spring", stiffness: 170, damping: 18 }}
        />
        <motion.span
          className="relative block"
          style={{ rotateY, transformPerspective: 700 }}
          animate={{ y: lifted ? "-6%" : "0%" }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <Mark />
        </motion.span>
      </span>

      <span
        aria-hidden
        className={`font-heading font-bold leading-none tracking-tight text-foreground ${wordmarkVisibility}`}
        style={{
          textShadow:
            "0 -1px 0 rgba(32, 32, 30, 0.22), 0 1px 0 rgba(255, 255, 255, 0.95)",
        }}
      >
        ixora
      </span>
    </span>
  );
}

export default FixoraLogo;
