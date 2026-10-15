"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FixoraMark } from "@/components/logo/FixoraLogo";
import type { CaseDetails } from "@/lib/case";
import type { CaseConversationTurn } from "@/lib/types";

export type { CaseDetails };

type Msg = { id: string; role: "user" | "assistant"; content: string };

type ConversationProps = {
  initialStory?: string;
  initialMessages?: CaseConversationTurn[];
  initialDetails?: CaseDetails;
  onUpdate?: (state: { messages: CaseConversationTurn[]; details: CaseDetails }) => void;
  onExit?: () => void;
  onDiscard?: () => boolean;
  onDraft?: (details: CaseDetails) => void;
};

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type SRWindow = { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };

const MARK = "###CASE###";
const EMPTY: CaseDetails = { issue: null, company: null, amount: null, date: null, goal: null, ready: false, quick: [] };

const STARTERS = [
  { label: "I was charged twice", text: "I was charged twice for something and I want to sort it out." },
  { label: "My order never arrived", text: "My order never arrived and the company isn't helping." },
  { label: "My account got locked", text: "My account got locked and I can't get back in." },
  { label: "Something else", text: "Something else went wrong and I need help with it." },
];

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

const CHIP =
  "rounded-full bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-brand-soft hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand";

function visibleText(buf: string) {
  const i = buf.indexOf(MARK);
  if (i >= 0) return buf.slice(0, i).trim();
  for (let k = MARK.length - 1; k > 0; k--) {
    if (buf.endsWith(MARK.slice(0, k))) return buf.slice(0, -k).trimEnd();
  }
  return buf;
}

function parseDetails(buf: string, prev: CaseDetails): CaseDetails {
  const i = buf.indexOf(MARK);
  if (i < 0) return prev;
  try {
    const raw = buf.slice(i + MARK.length).trim().replace(/^```json|```$/g, "");
    const j = JSON.parse(raw);
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      issue: str(j.issue),
      company: str(j.company),
      amount: str(j.amount),
      date: str(j.date),
      goal: str(j.goal),
      ready: j.ready === true,
      quick: Array.isArray(j.quick) ? j.quick.filter((q: unknown) => typeof q === "string").slice(0, 4) : [],
    };
  } catch {
    return prev;
  }
}

function Mark({ pulse }: { pulse?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface shadow-[0_2px_0_rgba(111,45,15,0.18)] ${pulse ? "animate-pulse" : ""}`}
    >
      <FixoraMark className="scale-[0.72]" />
    </span>
  );
}

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  mic: "M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM6 11a6 6 0 0012 0M12 17v4",
  stop: "M7 7h10v10H7z",
  up: "M12 19V5M6 11l6-6 6 6",
  copy: "M9 9h10v10H9zM5 15V5h10",
  redo: "M20 11a8 8 0 10-2.3 5.7M20 5v6h-6",
  down: "M12 5v14M6 13l6 6 6-6",
};

export default function Conversation({ initialStory, initialMessages, initialDetails, onUpdate, onExit, onDiscard, onDraft }: ConversationProps) {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>(initialMessages ?? (initialStory ? [{ id: "story", role: "user", content: initialStory }] : []));
  const [live, setLive] = useState("");
  const [card, setCard] = useState<CaseDetails>(initialDetails ?? EMPTY);
  const [busy, setBusy] = useState((initialMessages?.at(-1)?.role === "user") || (!!initialStory && !initialMessages));
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [chipOpen, setChipOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const started = useRef(false);
  const stuck = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SR | null>(null);
  // Whether the user still wants the mic active; false makes onend() a real
  // stop instead of a hands-free restart.
  const wantListen = useRef(false);

  const canSpeak = useSyncExternalStore(
    () => () => {},
    () => {
      const w = window as unknown as SRWindow;
      return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    },
    () => false
  );

  async function run(history: Msg[]) {
    try {
      const res = await fetch("/api/fixora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (res.status === 503) throw new Error("Fixora isn't set up yet. Add GROQ_API_KEY to .env.local and restart the server.");
      if (!res.ok || !res.body) throw new Error("Fixora couldn't answer just now. Your message is saved, so try again.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setLive(visibleText(buf));
      }

      const text = visibleText(buf);
      if (!text) throw new Error("Fixora didn't say anything. Try again.");
      setCard((prev) => parseDetails(buf, prev));
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: text }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLive("");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (messages.length && messages[messages.length - 1].role === "user" && !started.current) {
      started.current = true;
      void run(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onUpdate?.({
      messages: messages.map(({ id, role, content }) => ({ id, role, content })),
      details: card,
    });
  }, [messages, card, onUpdate]);

  useEffect(() => {
    const onScroll = () => {
      const gap = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stuck.current = gap < 140;
      setShowJump(gap > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stuck.current) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, live, error, card.ready]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    wantListen.current = false;
    return () => recRef.current?.stop();
  }, []);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    wantListen.current = false;
    recRef.current?.stop();
    stuck.current = true;
    const next = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: t }];
    setMessages(next);
    setDraft("");
    setError(null);
    setBusy(true);
    void run(next);
  }

  function retry() {
    setError(null);
    setBusy(true);
    void run(messages);
  }

  function regenerate() {
    const base = messages.slice(0, -1);
    setMessages(base);
    setError(null);
    setBusy(true);
    void run(base);
  }

  async function copy(msg: Msg) {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(msg.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  function toggleMic() {
    if (listening) {
      wantListen.current = false;
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as SRWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    const base = draft ? `${draft.trimEnd()} ` : "";
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    // Chrome's `continuous: true` re-processes its buffered audio after every
    // internal auto-restart and re-delivers the same results, so each spoken
    // phrase gets appended again — text repeats 3-5x or more. Running one
    // utterance at a time and restarting in onend avoids that entirely.
    rec.continuous = false;
    // Finals recognized so far in this dictation; only new results
    // (index >= e.resultIndex) are ever added, so nothing is appended twice.
    let finals = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += `${t} `;
        else interim += t;
      }
      setDraft(`${base}${finals}${interim}`);
    };
    rec.onend = () => {
      // Hands-free continuation: each utterance ends its own session; as
      // long as the mic is still toggled on, listen for the next one.
      if (wantListen.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setMicError("Microphone access was denied. Allow mic access in your browser settings and try again.");
      } else if (e.error === "audio-capture") {
        setMicError("No microphone found. Plug one in and try again.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setMicError("Voice input stopped unexpectedly. Try again.");
      }
    };
    recRef.current = rec;
    wantListen.current = true;
    setListening(true);
    setMicError(null);
    rec.start();
    inputRef.current?.focus();
  }

  const empty = messages.length === 0 && !busy;
  const last = messages[messages.length - 1];
  const showConfirm = card.ready && !busy && !live && last?.role === "assistant";
  const chipLabel = card.amount ?? card.issue ?? "New case";
  const details = [["Company", card.company], ["Issue", card.issue], ["Amount", card.amount], ["Date", card.date], ["Goal", card.goal]] as const;
  const fade = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: "easeOut" as const } };

  return (
    <div className="relative flex min-h-dvh flex-col text-foreground">
      <div aria-hidden className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />

      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
          <div className="relative flex items-center gap-2">
            {(card.company || card.issue || card.amount) && (
              <button
                type="button"
                onClick={() => setChipOpen((v) => !v)}
                aria-expanded={chipOpen}
                className="hidden max-w-[11rem] items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-medium shadow-soft transition-shadow hover:shadow-card sm:flex"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="truncate">{[card.company, chipLabel].filter(Boolean).join(" · ")}</span>
              </button>
            )}
            <button type="button" onClick={onExit} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
              Save and exit
            </button>
            <button type="button" onClick={() => setConfirmDiscard(true)} className="rounded-full px-2 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft sm:px-3 sm:text-sm">
              Discard
            </button>
            <AnimatePresence>
              {chipOpen && (
                <motion.dl
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 z-40 w-64 space-y-2 rounded-2xl bg-surface p-4 text-sm shadow-lift"
                >
                  {details.map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted">{k}</dt>
                      <dd className={v ? "font-medium" : "text-subtle"}>{v ?? "Not yet"}</dd>
                    </div>
                  ))}
                </motion.dl>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {confirmDiscard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-5"
            onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDiscard(false); }}
          >
            <motion.section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-title"
              aria-describedby="discard-description"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-3xl bg-background p-6 shadow-lift"
            >
              <h2 id="discard-title" className="font-heading text-xl font-semibold">Discard this case?</h2>
              <p id="discard-description" className="mt-2 text-sm leading-relaxed text-muted">The conversation, summary, and saved case will be deleted from this browser.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-full bg-surface px-4 py-2.5 text-sm font-medium">Keep case</button>
                <button type="button" onClick={() => { if (onDiscard?.()) setConfirmDiscard(false); }} className="rounded-full bg-danger px-4 py-2.5 text-sm font-semibold text-white">Discard without saving</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-6" aria-live="polite">
        {empty ? (
          <motion.div {...fade} className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-surface shadow-lift"><FixoraMark className="scale-110" /></span>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight">What&apos;s gone wrong?</h1>
            <p className="mt-2 max-w-sm text-muted">Tell me in your own words, or pick a place to start. You can talk or type.</p>
            <div className="mt-7 flex max-w-lg flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button key={s.label} type="button" onClick={() => send(s.text)} className={CHIP}>
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-7 pt-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <motion.p key={m.id} {...fade} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-brand-soft px-5 py-3 text-[15px] leading-relaxed text-brand-800">
                  {m.content}
                </motion.p>
              ) : (
                <motion.div key={m.id} {...fade} className="flex gap-3">
                  <Mark />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-[15px] leading-7">{m.content}</p>
                    {i === messages.length - 1 && !busy && (
                      <div className="mt-2 flex items-center gap-1 text-muted">
                        <button type="button" onClick={() => copy(m)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-surface hover:text-foreground">
                          <Icon d={ICON.copy} className="h-3.5 w-3.5" />
                          {copied === m.id ? "Copied" : "Copy"}
                        </button>
                        <button type="button" onClick={regenerate} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-surface hover:text-foreground">
                          <Icon d={ICON.redo} className="h-3.5 w-3.5" />
                          Regenerate
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            )}

            {busy && (
              <div className="flex gap-3">
                <Mark pulse />
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-7">
                  {live || <span className="text-muted">Thinking…</span>}
                  {live && <span aria-hidden className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-brand" />}
                </p>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">
                <p>{error}</p>
                <button type="button" onClick={retry} className="mt-2 font-medium underline">
                  Try again
                </button>
              </div>
            )}

            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="ml-10 rounded-3xl bg-surface p-5 shadow-lift"
                >
                  <p className="font-heading text-base font-semibold">Here&apos;s what I&apos;ll write up</p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {details.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button type="button" onClick={() => onDraft?.(card)} className={BTN3D}>
                      Draft my complaint
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                    <button type="button" onClick={() => inputRef.current?.focus()} className="text-sm font-medium text-muted hover:text-foreground">
                      Change something
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-16 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pb-4 pt-8 md:bottom-0">
        <div className="relative mx-auto w-full max-w-3xl px-5">
          <AnimatePresence>
            {showJump && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                type="button"
                onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
                aria-label="Jump to latest"
                className="absolute -top-2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-surface shadow-lift"
              >
                <Icon d={ICON.down} className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {!empty && !busy && !showConfirm && !draft && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 flex flex-wrap gap-2">
                {card.quick.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)} className={CHIP}>
                    {q}
                  </button>
                ))}
                {messages.length > 1 && (
                  <button type="button" onClick={() => send("I'd rather skip that one.")} className={`${CHIP} text-muted`}>
                    Skip
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 rounded-[28px] bg-surface p-2 pl-5 shadow-lift">
            <div className="relative min-w-0 flex-1 py-2.5">
              {listening && !draft && (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 text-sm text-brand-strong">
                  <span className="flex h-5 items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.span
                        key={i}
                        className="h-5 w-1 origin-center rounded-full bg-brand"
                        animate={reduce ? undefined : { scaleY: [0.3, 1, 0.4, 0.9, 0.3] }}
                        transition={{ duration: 1 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ))}
                  </span>
                  Listening… speak now
                </span>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                aria-label="Message Fixora"
                placeholder={listening ? "" : "Message Fixora..."}
                className="block max-h-40 w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-subtle"
              />
            </div>

            <motion.button
              type="button"
              onClick={toggleMic}
              disabled={!canSpeak}
              whileTap={{ scale: 0.92 }}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Speak to Fixora"}
              title={canSpeak ? undefined : "Voice isn't supported in this browser"}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${listening ? "bg-brand text-white" : "bg-surface-sunken text-muted hover:text-foreground"}`}
            >
              {listening && !reduce && (
                <motion.span aria-hidden className="absolute inset-0 rounded-full bg-brand/40" animate={{ scale: [1, 1.7], opacity: [0.5, 0] }} transition={{ duration: 1.3, repeat: Infinity }} />
              )}
              <Icon d={listening ? ICON.stop : ICON.mic} className="relative h-[18px] w-[18px]" />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => send(draft)}
              disabled={!draft.trim() || busy}
              whileTap={{ scale: 0.92 }}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brand to-brand-strong text-white shadow-[0_2px_0_#9A3F12] transition-opacity disabled:opacity-30 disabled:shadow-none"
            >
              <Icon d={ICON.up} className="h-[18px] w-[18px]" />
            </motion.button>
          </div>
          <p className="mt-2.5 text-center text-xs text-subtle">Fixora can make mistakes. Check the details.</p>
          {micError && (
            <div role="alert" className="mt-2 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
              <span className="flex-1">{micError}</span>
              <button type="button" onClick={() => setMicError(null)} aria-label="Dismiss" className="shrink-0 font-bold leading-none hover:opacity-70">✕</button>
            </div>
          )}
        </div>
        </div>
      </div>
  );
}
