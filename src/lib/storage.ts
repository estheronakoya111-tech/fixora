// localStorage read/write helpers (spec: Data Model).
// Demo-only: profiles, current demo user, and cases stay in this browser.

import type { Case, DemoProfile } from "./types";

const KEYS = {
  profiles: "fix-this:profiles",
  currentEmail: "fix-this:current-email",
  cases: "fix-this:cases",
  session: "fix-this:session",
  introSeen: "fix-this:intro-seen",
  introStory: "fix-this:intro-story",
} as const;

export type StoredCase = Case;

// Where the user left off, so a page refresh continues the same screen.
export type SessionScreen = "dashboard" | "cases" | "replies" | "learn" | "conversation" | "case";

export type StoredSession = {
  screen: SessionScreen | null;
  caseId: string | null;
};

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // storage unavailable or unreadable (spec: Failure Modes)
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getProfiles(): DemoProfile[] {
  return readJson<DemoProfile[]>(KEYS.profiles) ?? [];
}

export function saveProfiles(profiles: DemoProfile[]): boolean {
  return writeJson(KEYS.profiles, profiles);
}

export function getCurrentEmail(): string | null {
  return readJson<string>(KEYS.currentEmail);
}

export function setCurrentEmail(email: string | null): boolean {
  if (email === null) {
    try {
      window.localStorage.removeItem(KEYS.currentEmail);
      return true;
    } catch {
      return false;
    }
  }
  return writeJson(KEYS.currentEmail, email);
}

export function getSession(): StoredSession | null {
  return readJson<StoredSession>(KEYS.session);
}

export function saveSession(session: StoredSession): boolean {
  return writeJson(KEYS.session, session);
}

export function getCases(ownerEmail?: string): StoredCase[] {
  const all = readJson<Case[]>(KEYS.cases) ?? [];
  return ownerEmail ? all.filter((c: Case) => c.ownerEmail === ownerEmail) : all;
}

export function saveCases(cases: StoredCase[]): boolean {
  return writeJson(KEYS.cases, cases);
}

export function upsertCase(updated: Case): boolean {
  const all = getCases();
  const next = all.some((c) => c.id === updated.id)
    ? all.map((c) => (c.id === updated.id ? updated : c))
    : [...all, updated];
  return saveCases(next);
}

// A case opened but never typed into would otherwise hijack "Continue conversation"
// on the dashboard, so empty in-progress cases are cleaned up.
export function removeEmptyInProgressCases(): boolean {
  const all = getCases();
  const kept = all.filter((c) => !(c.status === "in-progress" && !c.rawStory && !(c.conversation && c.conversation.length)));
  if (kept.length === all.length) return true;
  return saveCases(kept);
}

export function deleteCase(id: string): boolean {
  const all = getCases();
  if (!all.some((item) => item.id === id)) return true;
  return saveCases(all.filter((item) => item.id !== id));
}

// The animated intro plays once per browser: after "Get started" is pressed,
// refreshes skip straight to the app. It stays reachable at /intro.
export function hasSeenIntro(): boolean {
  return readJson<boolean>(KEYS.introSeen) === true;
}

export function markIntroSeen(): boolean {
  return writeJson(KEYS.introSeen, true);
}

// The story typed during the intro carries over to sign-up, so the demo
// narrative the visitor just watched becomes their first case.
export function getIntroStory(): string {
  return readJson<string>(KEYS.introStory) ?? "";
}

export function setIntroStory(story: string): boolean {
  return writeJson(KEYS.introStory, story);
}