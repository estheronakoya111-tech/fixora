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
import type { Case as StoredCase, CaseConversationTurn, CaseStatus, CompanyReplyAnalysis, ComplaintDraft, DemoProfile, EvidenceFileMeta } from "@/lib/types";

type Screen = "auth" | "dashboard" | "cases" | "replies" | "learn" | "conversation" | "case";

function newCase(ownerEmail: string, rawStory = ""): StoredCase {
  return {
    id: crypto.randomUUID(),
    ownerEmail,
    rawStory,
    conversation: rawStory ? [{ id: "story", role: "user", content: rawStory }] : [],
    answers: [],
    evidenceFiles: [],
    status: "in-progress",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

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
    } else if (record.status === "response-needs-attention" || record.status === "response-reviewed") {
      setScreen("replies");
    } else {
      setScreen("case");
    }
  }, [profile]);

  const openCaseDetails = useCallback((id: string) => {
    if (!profile) return;
    const record = getCases(profile.email).find((item) => item.id === id);
    if (!record) return;
    setActiveCaseId(record.id);
    setStory(record.rawStory);
    setCaseDetails(detailsFor(record));
    setScreen("case");
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
    updateCase(id, (record) => ({ ...record, companyReply, status: "response-needs-attention" }));
  }, [updateCase]);

  const markReplyHandled = useCallback((id: string, handled: boolean) => {
    updateCase(id, (record) => record.companyReply
      ? { ...record, companyReply: { ...record.companyReply, handled }, status: handled ? "response-reviewed" : "response-needs-attention" }
      : record);
  }, [updateCase]);

  const changeStatus = useCallback((status: CaseStatus) => {
    if (activeCaseId) updateCase(activeCaseId, (record) => ({
      ...record,
      status,
      sentAt: status === "waiting-for-response" ? Date.now() : undefined,
    }));
  }, [activeCaseId, updateCase]);

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

  const repliesAttentionCount = cases.filter((c) => Boolean(c.companyReply && !c.companyReply.handled)).length;

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
      <div className={screen === "auth" ? "" : "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:ml-56 md:pb-0"}>
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
          <Replies cases={cases} onStartCase={startConversation} onOpenCase={openCaseDetails} onSaveReply={saveReply} onMarkHandled={markReplyHandled} />
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
            userName={profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined}
            onSaveDraft={saveDraft}
            onEvidenceChange={saveEvidence}
            onStatusChange={changeStatus}
            onBack={() => setScreen("dashboard")}
            onGoToReplies={() => setScreen("replies")}
          />
        )}
        {screen !== "auth" && <Footer />}
      </div>
    </>
  );
}
