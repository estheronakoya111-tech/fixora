"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Auth, { type AuthProfile } from "@/components/Auth";
import AppSidebar from "@/components/AppSidebar";
import Case from "@/components/Case";
import Cases from "@/components/Cases";
import Conversation, { type CaseDetails } from "@/components/Conversation";
import Replies from "@/components/Replies";
import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";
import Learn from "@/components/Learn";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FixoraLogo } from "@/components/logo/FixoraLogo";
import {
  deleteCase,
  getCases,
  getCurrentEmail,
  getIntroStory,
  getProfiles,
  getSession,
  hasSeenIntro,
  removeEmptyInProgressCases,
  saveSession,
  setCurrentEmail,
  setIntroStory,
  upsertCase,
} from "@/lib/storage";
import { isReplyDue, isOutcomeDue, toReplyDueAt, OUTCOME_DELAY_MS, SIMULATE_RETRY_MS } from "@/lib/demo-reply";
import { nowMs } from "@/lib/case";
import type { Case as StoredCase, CaseConversationTurn, CaseStatus, CaseTimelineEvent, CompanyReplyAnalysis, ComplaintDraft, DemoProfile, EvidenceFileMeta, FinalOutcomeRecord, NextActionChoice, Recommendation, ReplyVerdict } from "@/lib/types";

type Screen = "auth" | "dashboard" | "cases" | "replies" | "learn" | "conversation" | "case";

function newCase(ownerEmail: string, rawStory = ""): StoredCase {
  const createdAt = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerEmail,
    rawStory,
    conversation: rawStory ? [{ id: "story", role: "user", content: rawStory }] : [],
    answers: [],
    evidenceFiles: [],
    status: "in-progress",
    events: [{ id: crypto.randomUUID(), label: "Complaint created", at: createdAt, kind: "complaint" }],
    createdAt,
    updatedAt: createdAt,
  };
}

// The timeline records each real milestone once. Deduping by label means
// retries or revisits can never add the same event twice.
function pushEvent(record: StoredCase, label: string, kind: CaseTimelineEvent["kind"]): StoredCase {
  const events = record.events ?? [];
  if (events.some((event) => event.label === label)) return record;
  return { ...record, events: [...events, { id: crypto.randomUUID(), label, at: Date.now(), kind }] };
}

const NEXT_ACTION_LABELS: Record<NextActionChoice, string> = {
  wait: "Wait for the investigation",
  clarify: "Request clarification",
  escalate: "Escalate the complaint",
  resolved: "Resolved",
};

function detailsFor(record: StoredCase): CaseDetails {
  return record.details ?? {
    issue: record.summary?.problem ?? null,
    company: record.company ?? null,
    amount: null,
    date: null,
    goal: record.summary?.desiredOutcome ?? null,
    ready: record.status !== "in-progress",
    quick: [],
  };
}

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [checkingIntro, setCheckingIntro] = useState(true);
  const [leavingAuth, setLeavingAuth] = useState(false);
  const [screen, setScreen] = useState<Screen>("auth");
  const [story, setStory] = useState("");
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [focusCaseId, setFocusCaseId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ kind: "logout" } | { kind: "delete"; id: string } | null>(null);
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  // A refresh (or reopening the browser) puts the user back where they stopped.
  // This only relies on browser storage, so clearing the browser's site data
  // starts everything fresh again.
  // First-time visitors are sent to /intro, the animated walkthrough. Pressing
  // "Get started" there marks it as seen, so refreshes skip it; /intro itself
  // stays reachable at its URL for anyone who wants to re-watch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time session restore from browser storage on mount; the render cascade is intentional */
    const email = getCurrentEmail();
    const savedProfile = email ? getProfiles().find((item) => item.email === email) : null;
    if (!savedProfile && !hasSeenIntro()) {
      router.replace("/intro");
      return;
    }
    setCheckingIntro(false);
    if (savedProfile) {
      const owned = getCases(savedProfile.email);
      setProfile(savedProfile);
      setCases(owned);
      const session = getSession();
      if (session?.screen) {
        const activeRecord = session.caseId ? owned.find((item) => item.id === session.caseId) : null;
        const needsCase = session.screen === "conversation" || session.screen === "case";
        if (!needsCase || activeRecord) {
          if (session.caseId) setActiveCaseId(session.caseId);
          setScreen(session.screen);
        } else {
          setScreen("dashboard");
        }
      } else {
        setScreen("dashboard");
      }
    }
    setBooted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  // Remember the current screen (and open case) so the next visit resumes here.
  useEffect(() => {
    if (!profile || screen === "auth") return;
    saveSession({ screen, caseId: activeCaseId });
  }, [profile, screen, activeCaseId]);

  // Switching screens starts at the top — otherwise the browser keeps the
  // scroll offset from the previous screen and opens the new one mid-page or
  // at its bottom, then the user has to scroll back up. Two screens manage
  // their own landing instead: the conversation opens pinned to the newest
  // message (Conversation.tsx jumps there on mount, so a scroll-to-top here
  // would cancel it), and "cases" with a focused case scrolls that card into
  // view (Cases.tsx).
  useEffect(() => {
    if (screen === "cases" && focusCaseId) return;
    if (screen === "conversation") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen, focusCaseId]);

  const updateCase = useCallback((id: string, update: (record: StoredCase) => StoredCase) => {
    const email = profile?.email;
    if (!email) return;
    const existing = getCases(email).find((record) => record.id === id);
    if (!existing) return;
    const updated = { ...update(existing), updatedAt: Date.now() };
    if (!upsertCase(updated)) {
      setStorageError("Could not save this case in your browser. Check local storage settings.");
      return;
    }
    setStorageError("");
    setCases(getCases(email));
  }, [profile]);

  // The story typed during the /intro walkthrough becomes the visitor's first
  // case at sign-up, then is cleared so it cannot create a duplicate later.
  function continueFromAuth(nextProfile: AuthProfile) {
    const savedProfile = getProfiles().find((item) => item.email === nextProfile.email) ?? nextProfile;
    setProfile(savedProfile);
    const introStory = getIntroStory();
    let ownedCases = getCases(savedProfile.email);
    if (introStory) {
      const record = newCase(savedProfile.email, introStory);
      if (upsertCase(record)) {
        ownedCases = getCases(savedProfile.email);
        setActiveCaseId(record.id);
        setIntroStory("");
      } else {
        setStorageError("Your story could not be saved in this browser. Check local storage settings.");
      }
    }
    setCases(ownedCases);
    setScreen("dashboard");
  }

  function startConversation() {
    if (!profile) return;
    const record = newCase(profile.email);
    if (!upsertCase(record)) {
      setStorageError("Could not start a case because browser storage is unavailable.");
      return;
    }
    setCases(getCases(profile.email));
    setActiveCaseId(record.id);
    setCaseDetails(null);
    setStory("");
    setScreen("conversation");
  }

  const pruneEmptyCases = useCallback(() => {
    if (profile) {
      removeEmptyInProgressCases();
      setCases(getCases(profile.email));
    }
  }, [profile]);

  // "Save and exit" keeps real content, but a case that was opened and never
  // typed into is removed so it cannot hijack "Continue conversation" later.
  const exitConversation = useCallback(() => {
    if (activeCaseId && profile) {
      const record = getCases(profile.email).find((item) => item.id === activeCaseId);
      if (record && record.status === "in-progress" && !record.rawStory && !(record.conversation && record.conversation.length)) {
        if (!deleteCase(activeCaseId)) {
          setStorageError("Could not clean up this case in browser storage. Try again.");
        }
      }
    }
    setActiveCaseId(null);
    setCaseDetails(null);
    setScreen("dashboard");
    if (profile) setCases(getCases(profile.email));
  }, [activeCaseId, profile]);

  // Arriving back on the dashboard clears out empty cases from earlier sessions.
  useEffect(() => {
    if (profile && screen === "dashboard") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cleanup pass when the dashboard opens
      pruneEmptyCases();
    }
  }, [profile, screen, pruneEmptyCases]);

  const openSavedCase = useCallback((id: string) => {
    if (!profile) return;
    const record = getCases(profile.email).find((item) => item.id === id);
    if (!record) return;
    setActiveCaseId(record.id);
    setStory(record.rawStory);
    setCaseDetails(detailsFor(record));
    if (record.status === "in-progress") {
      setScreen("conversation");
    } else if (record.companyReply || record.escalation || record.finalOutcome) {
      setScreen("replies");
    } else {
      setScreen("case");
    }
  }, [profile]);

  const saveConversation = useCallback(({ messages, details }: { messages: CaseConversationTurn[]; details: CaseDetails }) => {
    if (!activeCaseId || !profile) return;
    updateCase(activeCaseId, (record) => {
      const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "";
      const rawStory = record.rawStory || firstUserMessage;
      const hasDetails = Boolean(details.issue || details.company || details.amount || details.date || details.goal);
      return {
        ...record,
        rawStory,
        company: details.company ?? record.company,
        conversation: messages,
        answers: messages.filter((message) => message.role === "user" && message.content !== rawStory).map((message) => message.content),
        details: hasDetails ? details : record.details,
        summary: hasDetails ? {
          problem: details.issue ?? "Complaint in progress",
          whatHappened: rawStory,
          desiredOutcome: details.goal ?? "To be clarified",
        } : record.summary,
        status: details.ready ? "ready-to-send" : record.status === "ready-to-send" ? "in-progress" : record.status,
      };
    });
  }, [activeCaseId, profile, updateCase]);

  const openDraft = useCallback((details: CaseDetails) => {
    if (activeCaseId) {
      updateCase(activeCaseId, (record) => ({
        ...record,
        company: details.company ?? record.company,
        details,
        status: "ready-to-send",
        summary: {
          problem: details.issue ?? "Complaint",
          whatHappened: record.rawStory,
          desiredOutcome: details.goal ?? "To be clarified",
        },
      }));
    }
    setCaseDetails(details);
    setScreen("case");
  }, [activeCaseId, updateCase]);

  const saveDraft = useCallback((draft: ComplaintDraft) => {
    if (activeCaseId) updateCase(activeCaseId, (record) => ({ ...record, complaintDraft: draft }));
  }, [activeCaseId, updateCase]);

  const saveEvidence = useCallback((evidenceFiles: EvidenceFileMeta[]) => {
    if (activeCaseId) updateCase(activeCaseId, (record) => ({ ...record, evidenceFiles }));
  }, [activeCaseId, updateCase]);

  const deleteSavedCase = useCallback((id: string) => {
    if (!profile) return;
    setConfirmDialog({ kind: "delete", id });
  }, [profile]);

  const deleteConfirmedCase = useCallback((id: string) => {
    if (!profile) return;
    if (!deleteCase(id)) {
      setStorageError("Could not delete this case from browser storage. Try again.");
      return;
    }
    setStorageError("");
    if (activeCaseId === id) {
      setActiveCaseId(null);
      setCaseDetails(null);
    }
    setCases(getCases(profile.email));
  }, [profile, activeCaseId]);

  const viewCaseInCases = useCallback((id: string) => {
    setFocusCaseId(id);
    setScreen("cases");
  }, []);

  const clearFocusCase = useCallback(() => setFocusCaseId(null), []);

  const saveReply = useCallback((id: string, companyReply: CompanyReplyAnalysis) => {
    updateCase(id, (record) => pushEvent(
      pushEvent({ ...record, companyReply, status: "response-needs-attention" }, "Response received", "reply"),
      "Response interpreted",
      "reply",
    ));
  }, [updateCase]);

  // One clarification round per reply — the mirror of the escalation flow:
  // the user edits the draft (saved on every change), and confirming the
  // send arms exactly one simulated answer on replyDueAt. The answer then
  // replaces the saved evaluation and reopens the next-step choice.
  const saveClarificationDraft = useCallback((id: string, draft: ComplaintDraft) => {
    updateCase(id, (record) => !record.companyReply || record.clarification?.sentConfirmed
      ? record
      : pushEvent(
          { ...record, clarification: { draft, draftedAt: record.clarification?.draftedAt ?? Date.now() } },
          "Clarification drafted",
          "reply",
        ));
  }, [updateCase]);

  const confirmClarificationSent = useCallback((id: string) => {
    updateCase(id, (record) => {
      if (!record.companyReply || !record.clarification || record.clarification.sentConfirmed) return record;
      const sentAt = Date.now();
      return pushEvent(
        { ...record, clarification: { ...record.clarification, sentAt, sentConfirmed: true }, replyDueAt: toReplyDueAt(sentAt) },
        "Clarification sent — waiting for the answer",
        "reply",
      );
    });
  }, [updateCase]);

  // "Resolved" from the reply read view: the user considers this complaint
  // handled — records the choice, marks the reply handled, and closes the
  // case in Fixora. One-way: the case lands in resolved status.
  const resolveReplyCase = useCallback((id: string) => {
    updateCase(id, (record) => !record.companyReply
      ? record
      : pushEvent(
          {
            ...record,
            companyReply: { ...record.companyReply, decision: { action: "resolved", at: nowMs() }, handled: true },
            status: "resolved" as CaseStatus,
          },
          "Case marked resolved",
          "reply",
        ));
  }, [updateCase]);

  // Recording the next-action decision clears "needs attention": the reply
  // has been read and acted on. The choice drives what happens next: escalate
  // opens the escalation flow on the Replies screen, and the case stays
  // reviewable at any time.
  const decideNextAction = useCallback((id: string, action: NextActionChoice) => {
    updateCase(id, (record) => {
      if (!record.companyReply) return record;
      const decided = {
        ...record,
        companyReply: { ...record.companyReply, decision: { action, at: nowMs() }, handled: true },
        status: "response-reviewed" as CaseStatus,
      };
      return pushEvent(decided, `Next action chosen: ${NEXT_ACTION_LABELS[action]}`, "decision");
    });
  }, [updateCase]);

  const changeStatus = useCallback((status: CaseStatus) => {
    if (activeCaseId) updateCase(activeCaseId, (record) => {
      if (status === "waiting-for-response") {
        // Sending confirmed: arm the simulated demo reply exactly once. A
        // reply that was already saved (e.g. status bounced back and forth)
        // keeps its due time so it is never regenerated.
        const sentAt = record.sentAt ?? Date.now();
        return pushEvent(
          { ...record, status, sentAt, replyDueAt: record.companyReply ? record.replyDueAt : toReplyDueAt(sentAt) },
          "Send confirmed — waiting for a reply",
          "complaint",
        );
      }
      return { ...record, status, sentAt: undefined, replyDueAt: undefined };
    });
  }, [activeCaseId, updateCase]);

  // The simulated demo reply scheduler: one reply per confirmed-sent
  // complaint, ~1 minute after send. It reads saved state each tick, so a
  // refresh neither restarts the wait nor duplicates the reply — the saved
  // companyReply on the case is the guard. Failure just pushes the due time
  // forward and tries again later; nothing is saved half-way.
  useEffect(() => {
    if (!profile) return;
    const email = profile.email;
    const inFlight = new Set<string>();

    async function settleDueReplies() {
      const due = getCases(email).filter((record) => isReplyDue(record, nowMs()));
      for (const record of due) {
        if (inFlight.has(record.id)) continue;
        inFlight.add(record.id);
        try {
          const res = await fetch("/api/fixora/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: record.company ?? record.details?.company,
              issue: record.details?.issue ?? record.summary?.problem,
              amount: record.details?.amount,
              goal: record.details?.goal ?? record.summary?.desiredOutcome,
              rawStory: record.rawStory,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "simulate failed");
          if (typeof data.replyText !== "string" || typeof data.meaning !== "string" || !Array.isArray(data.unresolved) || !Array.isArray(data.options)) {
            throw new Error("Incomplete simulated reply. Please try again.");
          }
          updateCase(record.id, (saved) => {
            // One reply per complaint — unless the simulated answer to a sent
            // clarification is the one due: it deliberately replaces the
            // case's evaluation with the round-two reply.
            const pendingClarification = saved.clarification?.sentConfirmed && !saved.clarification.answered;
            if (saved.companyReply && !pendingClarification) return saved;
            const settled = {
              ...saved,
              // The answer closes the clarification round: the flag stops
              // further simulated replies, and the fresh evaluation (no
              // decision yet) reopens the next-step choice on the read view.
              ...(pendingClarification && saved.clarification
                ? { clarification: { ...saved.clarification, answered: true } }
                : {}),
              companyReply: {
                replyText: data.replyText,
                meaning: data.meaning,
                unresolved: data.unresolved.filter((item: unknown): item is string => typeof item === "string"),
                options: data.options.filter((item: unknown): item is string => typeof item === "string"),
                ...(typeof data.verdict === "string" ? { verdict: data.verdict as ReplyVerdict } : {}),
                ...(data.recommendation && typeof data.recommendation.action === "string" && ["wait", "clarify", "escalate"].includes(data.recommendation.action) && typeof data.recommendation.reason === "string"
                  ? { recommendation: { action: data.recommendation.action as NextActionChoice, reason: data.recommendation.reason } satisfies Recommendation }
                  : {}),
                addedAt: nowMs(),
                handled: false,
                isSimulated: true,
              } satisfies CompanyReplyAnalysis,
              status: "response-needs-attention" as CaseStatus,
              replyDueAt: undefined,
            };
            return pushEvent(
              pushEvent(settled, "Simulated response received", "reply"),
              "Response interpreted",
              "reply",
            );
          });
        } catch {
          updateCase(record.id, (saved) => saved.companyReply
            ? saved
            : { ...saved, replyDueAt: nowMs() + SIMULATE_RETRY_MS });
        } finally {
          inFlight.delete(record.id);
        }
      }

      // The one simulated final outcome per escalated complaint, driven by
      // outcomeDueAt — armed once on send-confirm, so a refresh neither
      // restarts the wait nor produces a second outcome.
      const dueOutcomes = getCases(email).filter((record) => isOutcomeDue(record, nowMs()));
      for (const record of dueOutcomes) {
        if (inFlight.has(record.id)) continue;
        inFlight.add(record.id);
        try {
          const res = await fetch("/api/fixora/outcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: record.company ?? record.details?.company,
              issue: record.details?.issue ?? record.summary?.problem,
              amount: record.details?.amount,
              date: record.details?.date,
              goal: record.details?.goal ?? record.summary?.desiredOutcome,
              rawStory: record.rawStory,
              reply: record.companyReply?.replyText ?? "",
              unresolved: record.companyReply?.unresolved ?? [],
              complaint: record.escalation?.draft.body ?? "",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "outcome failed");
          if (typeof data.replyText !== "string" || typeof data.meaning !== "string" || (data.verdict !== "resolved" && data.verdict !== "unresolved")) {
            throw new Error("Incomplete simulated outcome. Please try again.");
          }
          updateCase(record.id, (saved) => {
            if (saved.finalOutcome || saved.status !== "escalated") return saved; // one outcome only
            const outcome = {
              replyText: data.replyText,
              meaning: data.meaning,
              verdict: data.verdict as FinalOutcomeRecord["verdict"],
              guidance: Array.isArray(data.guidance)
                ? data.guidance.filter((item: unknown): item is string => typeof item === "string").slice(0, 4)
                : [],
              addedAt: nowMs(),
              isSimulated: true,
            } satisfies FinalOutcomeRecord;
            const ended = {
              ...saved,
              finalOutcome: outcome,
              // The demo's last automated step: the user then either marks the
              // case resolved or keeps the recorded final guidance.
              status: "outcome-needs-attention" as CaseStatus,
              outcomeDueAt: undefined,
            };
            return pushEvent(ended, "Final outcome demonstrated", "outcome");
          });
        } catch {
          updateCase(record.id, (saved) => saved.finalOutcome || saved.status !== "escalated"
            ? saved
            : { ...saved, outcomeDueAt: nowMs() + SIMULATE_RETRY_MS });
        } finally {
          inFlight.delete(record.id);
        }
      }
    }

    void settleDueReplies();
    const tick = window.setInterval(settleDueReplies, 5000);
    // Background tabs throttle setInterval, so a return to the tab also checks.
    const onVisible = () => { void settleDueReplies(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [profile, updateCase]);

  // Escalation: exactly one per complaint. The draft is saved as the user
  // edits it; confirming the send sets sentConfirmed once, which locks the
  // escalation action for the case and moves it to "escalated".
  const saveEscalationDraft = useCallback((id: string, draft: ComplaintDraft) => {
    updateCase(id, (record) => record.escalation?.sentAt
      ? record
      : pushEvent(
          { ...record, escalation: { draft, draftedAt: record.escalation?.draftedAt ?? Date.now() } },
          "Escalation drafted",
          "escalation",
        ));
  }, [updateCase]);

  const confirmEscalationSent = useCallback((id: string) => {
    updateCase(id, (record) => {
      if (!record.escalation || record.escalation.sentConfirmed) return record;
      const escalated = {
        ...record,
        escalation: { ...record.escalation, sentAt: Date.now(), sentConfirmed: true },
        // also stamped on the record so the case view can show the sent date
        sentAt: Date.now(),
        status: "escalated" as CaseStatus,
        // Arm the simulated final outcome exactly once. A saved outcome keeps
        // its due time untouched, so a refresh never restarts the wait.
        outcomeDueAt: record.finalOutcome ? record.outcomeDueAt : Date.now() + OUTCOME_DELAY_MS,
      };
      return pushEvent(escalated, "Escalation send confirmed", "escalation");
    });
  }, [updateCase]);

  // Terminal states after the simulated final outcome. Each runs once: the
  // status change itself is the one-way latch, and events dedupe by label.
  const markResolvedFromOutcome = useCallback((id: string) => {
    updateCase(id, (record) => !record.finalOutcome || record.status === "resolved"
      ? record
      : pushEvent(
          { ...record, status: "resolved" as CaseStatus },
          "Case marked resolved (simulated)",
          "outcome",
        ));
  }, [updateCase]);

  const saveOutcomeGuidance = useCallback((id: string) => {
    updateCase(id, (record) => !record.finalOutcome || record.status === "final-guidance"
      ? record
      : pushEvent(
          { ...record, status: "final-guidance" as CaseStatus },
          "Final guidance provided",
          "outcome",
        ));
  }, [updateCase]);

  const discardCurrentCase = useCallback(() => {
    if (!activeCaseId || !profile) return false;
    if (!deleteCase(activeCaseId)) {
      setStorageError("Could not delete this case from browser storage. Try again.");
      return false;
    }
    setCases(getCases(profile.email));
    setActiveCaseId(null);
    setCaseDetails(null);
    setStorageError("");
    setScreen("dashboard");
    return true;
  }, [activeCaseId, profile]);

  const logout = useCallback(() => {
    setConfirmDialog({ kind: "logout" });
  }, []);

  const confirmAction = useCallback(() => {
    if (!confirmDialog) return;
    if (confirmDialog.kind === "delete") {
      deleteConfirmedCase(confirmDialog.id);
    } else {
      setCurrentEmail(null);
      saveSession({ screen: null, caseId: null });
      setProfile(null);
      setCases([]);
      setActiveCaseId(null);
      setCaseDetails(null);
      setFocusCaseId(null);
      setStorageError("");
      setScreen("auth");
    }
    setConfirmDialog(null);
  }, [confirmDialog, deleteConfirmedCase]);

  const cancelConfirmation = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const activeCase = cases.find((record) => record.id === activeCaseId) ?? null;
  const conversationCase = activeCase;
  const selectedDetails = caseDetails ?? (activeCase ? detailsFor(activeCase) : null);

  // The sidebar badge: unhandled replies plus cases whose simulated final
  // outcome arrived and has not been closed out yet.
  const repliesAttentionCount = cases.filter((c) => (Boolean(c.companyReply && !c.companyReply.handled) && c.status !== "outcome-needs-attention") || c.status === "outcome-needs-attention").length;

  return (
    <>
      {screen !== "auth" && (
        <AppSidebar
          active={screen}
          onHome={() => setScreen("dashboard")}
          onCases={() => setScreen("cases")}
          onReplies={() => setScreen("replies")}
          onLearn={() => setScreen("learn")}
          onLogout={logout}
          repliesAttentionCount={repliesAttentionCount}
        />
      )}
      {/* The conversation manages its own full-height chat viewport (fixed
          composer, internally scrolling message list), so it neither needs
          the bottom nav reservation nor the Footer below it. */}
      <div className={screen === "auth" ? "" : screen === "conversation" ? "md:ml-56" : "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:ml-56 md:pb-0"}>
        <ConfirmDialog
          open={confirmDialog !== null}
          title={confirmDialog?.kind === "delete" ? "Delete this case?" : "Sign out of Fixora?"}
          description={confirmDialog?.kind === "delete" ? "This case and its saved reply will be removed from this browser. This cannot be undone." : "You will be returned to the sign-in screen. Your saved cases will stay in this browser."}
          confirmLabel={confirmDialog?.kind === "delete" ? "Delete case" : "Sign out"}
          danger={confirmDialog?.kind === "delete"}
          onCancel={cancelConfirmation}
          onConfirm={confirmAction}
        />
        {storageError && <p role="alert" className="fixed bottom-20 left-4 right-4 z-[60] mx-auto max-w-xl rounded-xl bg-danger-soft p-3 text-sm text-danger md:bottom-4">{storageError}</p>}
        {(!booted || checkingIntro) && (
          <div className="flex min-h-dvh items-center justify-center bg-background">
            <div className="flex flex-col items-center" role="status" aria-label="Loading Fixora">
              <FixoraLogo size="md" showWordmark />
              <span aria-hidden="true" className="mt-5 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand-strong" />
            </div>
          </div>
        )}
        {booted && !checkingIntro && (
          <AnimatePresence mode="wait" initial={false}>
            {screen === "auth" && (
              <motion.div
                key="auth"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <Auth onContinue={continueFromAuth} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {screen === "dashboard" && (
          <Dashboard firstName={profile?.firstName || "there"} cases={cases} onStartCase={startConversation} onOpenCase={openSavedCase} onViewCase={viewCaseInCases} onCases={() => setScreen("cases")} />
        )}
        {screen === "cases" && (
          <Cases cases={cases} onOpenCase={openSavedCase} onStartCase={startConversation} onGoToReplies={() => setScreen("replies")} onDeleteCase={deleteSavedCase} focusCaseId={focusCaseId} onClearFocus={clearFocusCase} />
        )}
        {screen === "replies" && (
          <Replies cases={cases} onStartCase={startConversation} onSaveReply={saveReply} onDecision={decideNextAction} onResolveReply={resolveReplyCase} onSaveClarificationDraft={saveClarificationDraft} onClarificationSent={confirmClarificationSent} onSaveEscalationDraft={saveEscalationDraft} onEscalationSent={confirmEscalationSent} onOutcomeResolved={markResolvedFromOutcome} onGuidanceSaved={saveOutcomeGuidance} />
        )}
        {screen === "learn" && (
          <Learn
            onGo={(to) => {
              if (to === "start") startConversation();
              else if (to === "case") setScreen("cases");
              else if (to === "replies") setScreen("replies");
            }}
          />
        )}
        {screen === "conversation" && conversationCase && (
          <Conversation
            key={conversationCase.id}
            initialStory={conversationCase.rawStory}
            initialMessages={conversationCase.conversation}
            initialDetails={conversationCase.details}
            onUpdate={saveConversation}
            onExit={exitConversation}
            onDiscard={discardCurrentCase}
            onDraft={openDraft}
          />
        )}
        {screen === "case" && activeCase && selectedDetails && (
          <Case
            key={activeCase.id}
            details={selectedDetails}
            initialDraft={activeCase.complaintDraft}
            initialEvidence={activeCase.evidenceFiles}
            initialStatus={activeCase.status}
            initialSentAt={activeCase.sentAt}
            events={activeCase.events}
            userName={profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined}
            onSaveDraft={saveDraft}
            onEvidenceChange={saveEvidence}
            onStatusChange={changeStatus}
            onBack={() => setScreen("dashboard")}
            onGoToReplies={() => setScreen("replies")}
          />
        )}
        {screen !== "auth" && screen !== "conversation" && <Footer />}
      </div>
    </>
  );
}
