"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import FixoraLogo from "./logo/FixoraLogo";
import { getProfiles, saveProfiles, setCurrentEmail } from "@/lib/storage";

function CrossedPaperForms() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex w-full flex-col items-center text-center">
      <motion.div
        role="img"
        aria-label="Two folded Fixora paper forms crossing through one another"
        className="relative w-full max-w-[44rem] [perspective:1100px]"
        animate={reduceMotion ? undefined : { y: [0, -5, 0], rotateX: [0, 1.2, 0], rotateZ: [0, 0.35, 0] }}
        transition={reduceMotion ? undefined : { duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg viewBox="0 0 760 600" className="block h-auto w-full overflow-visible" fill="none" aria-hidden="true">
          <defs>
            <filter id="paper-shadow" x="40" y="20" width="680" height="560" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceAlpha" stdDeviation="12" />
              <feOffset dx="0" dy="18" />
              <feComponentTransfer><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="orange-paper" x1="180" y1="40" x2="560" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--color-brand-400)" />
              <stop offset="1" stopColor="var(--color-brand-600)" />
            </linearGradient>
          </defs>

          <ellipse cx="382" cy="530" rx="238" ry="24" fill="var(--color-slate)" opacity=".08" />

          {/* Rear orange sheet: a folded diagonal plane with a visible return face. */}
          <g filter="url(#paper-shadow)">
            <path d="M151 83 224 39 606 415 534 492 151 83Z" fill="url(#orange-paper)" />
            <path d="m151 83 42-25 383 397-42 37L151 83Z" fill="var(--color-brand-700)" opacity=".48" />
            <path d="m224 39 382 376-72 77L224 39Z" fill="var(--color-brand-400)" opacity=".52" />
            <path d="m193 58 383 397" stroke="var(--color-brand-100)" strokeOpacity=".48" strokeWidth="2" />
            <path d="m535 492 71-77-26 2-70 75 25 0Z" fill="var(--color-brand-800)" opacity=".48" />
          </g>

          {/* Front sheet crosses the orange fold; its folded facets establish the depth. */}
          <g filter="url(#paper-shadow)">
            <path d="m121 443 329-363 98 89-330 361-97-87Z" fill="var(--color-surface)" />
            <path d="m121 443 329-363 42 38-330 363-41-38Z" fill="var(--color-surface-muted)" />
            <path d="m162 481 330-363 56 51-330 361-56-49Z" fill="var(--color-surface)" />
            <path d="m450 80 48 0 50 89-98-89Z" fill="var(--color-border)" opacity=".9" />
            <path d="m121 443 41 38 26 0-67-38Z" fill="var(--color-border-strong)" />
            <path d="m144 431 329-363" stroke="white" strokeOpacity=".85" strokeWidth="2" />
            <path d="m185 469 330-363" stroke="var(--color-border-strong)" strokeOpacity=".8" strokeWidth="2" />
          </g>
        </svg>

        <div className="pointer-events-none absolute left-[50.5%] top-[34%] -translate-x-1/2 -translate-y-1/2 rotate-[-42deg]">
          <FixoraLogo size="md" showWordmark />
        </div>
      </motion.div>
      <div className="mt-1">
        <p className="font-heading text-sm font-semibold uppercase tracking-[.3em] text-brand-strong">What now?</p>
        <p className="mt-3 font-heading text-3xl font-medium tracking-[-.04em] text-foreground/90 2xl:text-4xl">Find your way forward.</p>
      </div>
    </div>
  );
}

type Mode = "signin" | "signup";

export type AuthProfile = { firstName: string; lastName: string; email: string };

export default function Auth({ onContinue }: { onContinue?: (profile: AuthProfile) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const reduceMotion = useReducedMotion();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const firstName = String(form.get("firstName") ?? "").trim() || email.split("@")[0] || "there";
    const lastName = String(form.get("lastName") ?? "").trim();
    const profiles = getProfiles();
    const existing = profiles.find((item) => item.email === email);
    if (mode === "signup") {
      if (existing) {
        setMessage("An account with this email already exists. Sign in instead.");
        return;
      }
      if (!saveProfiles([...profiles, { firstName, lastName, email }])) {
        setMessage("This browser could not save your account. Check local storage settings and try again.");
        return;
      }
    } else if (!existing) {
      setMessage("No local account was found for this email. Create an account first.");
      return;
    }
    if (!setCurrentEmail(email)) {
      setMessage("This browser could not save your sign-in. Check local storage settings and try again.");
      return;
    }
    onContinue?.({ firstName, lastName, email });
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground min-[950px]:grid min-[950px]:grid-cols-[1.04fr_.96fr]">
      <section className="relative hidden min-h-dvh flex-col justify-center overflow-hidden border-r border-border/70 px-8 min-[950px]:flex xl:px-12 2xl:px-16">
        <CrossedPaperForms />
      </section>

      <section className="auth-panel flex min-h-dvh flex-col px-6 pb-10 pt-8 sm:px-10 sm:pt-10 min-[950px]:items-center min-[950px]:justify-center min-[950px]:px-10 min-[950px]:py-12 xl:px-12 2xl:px-16">
        <header className="mb-12 flex items-center min-[950px]:hidden">
          <FixoraLogo size="md" showWordmark />
        </header>
        <div className="mx-auto w-full max-w-[30rem]">
          <div className="mb-8 min-[950px]:mb-9 xl:mb-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: .22 }}>
                <h1 className="font-heading text-[2rem] font-medium leading-tight tracking-[-.045em] sm:text-4xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
                <p className="mt-3 font-body text-sm leading-relaxed text-muted">{mode === "signin" ? "Pick up where you left off." : "A little clarity can change what comes next."}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <form onSubmit={submit}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} initial={reduceMotion ? false : { opacity: 0, x: mode === "signup" ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: mode === "signup" ? -8 : 8 }} transition={{ duration: .22 }} className="space-y-7">
                {mode === "signup" && <div className="grid grid-cols-1 gap-x-7 gap-y-7 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block font-body text-[10px] font-semibold uppercase tracking-[.17em] text-muted">First name</span><span className="auth-underline"><input name="firstName" autoComplete="given-name" required className="h-10 w-full border-0 bg-transparent px-0 font-body text-base outline-none placeholder:text-subtle focus-visible:outline-none" placeholder="Your first name" /></span></label>
                  <label className="block"><span className="mb-2 block font-body text-[10px] font-semibold uppercase tracking-[.17em] text-muted">Last name</span><span className="auth-underline"><input name="lastName" autoComplete="family-name" required className="h-10 w-full border-0 bg-transparent px-0 font-body text-base outline-none placeholder:text-subtle focus-visible:outline-none" placeholder="Your last name" /></span></label>
                </div>}
                <label className="block"><span className="mb-2 block font-body text-[10px] font-semibold uppercase tracking-[.17em] text-muted">Email</span><span className="auth-underline"><input name="email" type="email" autoComplete="email" required className="h-11 w-full border-0 bg-transparent px-0 font-body text-base outline-none placeholder:text-subtle focus-visible:outline-none" placeholder="you@email.com" /></span></label>
                <label className="block"><span className="mb-2 block font-body text-[10px] font-semibold uppercase tracking-[.17em] text-muted">Password</span><span className="auth-underline relative block"><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} className="h-11 w-full border-0 bg-transparent py-0 pr-12 pl-0 font-body text-base outline-none placeholder:text-subtle focus-visible:outline-none" placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted transition-colors hover:text-foreground"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{showPassword && <path d="m4 4 16 16"/>}</svg></button></span></label>
              </motion.div>
            </AnimatePresence>
            <motion.button whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: .99 }} type="submit" className="mt-9 flex min-h-14 w-full items-center justify-between rounded-control bg-positive px-5 font-heading text-xs font-semibold uppercase tracking-[.12em] text-white transition-colors hover:bg-positive-strong sm:px-6"><span>{mode === "signin" ? "Sign in" : "Create account"}</span><span aria-hidden className="text-lg font-normal">→</span></motion.button>
            {message && <p aria-live="polite" className="mt-3 font-body text-xs text-muted">{message}</p>}
          </form>
          <p className="mt-7 text-center font-body text-sm text-muted">{mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}<button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); setShowPassword(false); }} className="font-medium text-foreground underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-strong">{mode === "signin" ? "Create one" : "Sign in"}</button></p>
        </div>
      </section>
    </main>
  );
}
