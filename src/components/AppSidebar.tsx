"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FixoraLogo } from "@/components/logo/FixoraLogo";

type AppSidebarProps = {
  active: "auth" | "dashboard" | "cases" | "replies" | "conversation" | "case" | "learn";
  onHome: () => void;
  onCases: () => void;
  onReplies: () => void;
  onLearn: () => void;
  onLogout: () => void;
  repliesAttentionCount?: number;
};

const ITEMS = [
  { label: "Home", icon: "M3 11l9-8 9 8M5 10v10h14V10", action: "home" },
  { label: "Cases", icon: "M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18", action: "cases" },
  { label: "Replies", icon: "M4 6h16v12H4zM4 7l8 6 8-6", action: "replies" },
  { label: "Learn", icon: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13", action: "learn" },
  { label: "Sign out", icon: "M9 5H5v14h4M14 8l4 4-4 4M10 12h8", action: "logout" },
] as const;

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function AppSidebar({ active, onHome, onCases, onReplies, onLearn, onLogout, repliesAttentionCount = 0 }: AppSidebarProps) {
  const reduce = useReducedMotion();

  return (
    <>
      <motion.aside
        initial={reduce ? false : { x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.08 }}
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 overflow-y-auto border-r-0 px-4 py-6 md:flex"
      >
        <motion.div
          initial={reduce ? false : { y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="mb-8 px-2"
        ><FixoraLogo size="md" /></motion.div>
        <Navigation active={active} onHome={onHome} onCases={onCases} onReplies={onReplies} onLearn={onLearn} onLogout={onLogout} repliesAttentionCount={repliesAttentionCount} />
      </motion.aside>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t-0 px-1 py-2 backdrop-blur md:hidden">
        <Navigation active={active} onHome={onHome} onCases={onCases} onReplies={onReplies} onLearn={onLearn} onLogout={onLogout} repliesAttentionCount={repliesAttentionCount} compact />
      </nav>
    </>
  );
}

function Navigation({
  active,
  onHome,
  onCases,
  onReplies,
  onLearn,
  onLogout,
  repliesAttentionCount = 0,
  compact = false,
}: AppSidebarProps & { compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={compact ? "flex w-full justify-around gap-1" : "flex flex-col gap-1"}>
      {ITEMS.map((item) => {
        const selected =
          (item.action === "home" && active === "dashboard") ||
          (item.action === "cases" && (active === "cases" || active === "conversation" || active === "case")) ||
          (item.action === "replies" && active === "replies") ||
          (item.action === "learn" && active === "learn");
        const className = compact
          ? `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[11px] font-medium ${selected ? "text-brand-strong" : "text-muted"}`
          : `relative flex items-center justify-between rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-colors ${selected ? "bg-surface text-foreground shadow-soft" : "text-muted hover:bg-surface/70 hover:text-foreground"}`;

        const handler =
          item.action === "home" ? onHome :
          item.action === "cases" ? onCases :
          item.action === "replies" ? onReplies :
          item.action === "learn" ? onLearn :
          onLogout;

        const hasBadge = item.action === "replies" && repliesAttentionCount > 0;

        return (
          <motion.button
            key={item.label}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={handler}
            className={className}
            initial={reduce || compact ? false : { x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: compact ? 0 : 0.18 + ITEMS.indexOf(item) * 0.055 }}
            whileHover={reduce || compact ? undefined : { x: 4, scale: 1.015 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <Icon path={item.icon} />
                {compact && hasBadge && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand" />
                )}
              </span>
              <span>{item.label}</span>
            </span>
            {!compact && hasBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white shadow-xs">
                {repliesAttentionCount}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
