"use client";

import { PenLine, Mic, FolderOpen, FileText, Mail, MessageSquare, type LucideIcon } from "lucide-react";
import Reveal from "@/components/Reveal";

type Block = { id: string; text: string; kind?: "button" };
type Step = { focus: string; title: string; body: string };
type GoTo = "start" | "case" | "replies";
type Lesson = {
  id: string;
  title: string;
  blurb: string;
  time: string;
  Icon: LucideIcon;
  blocks: Block[];
  steps: Step[];
  go: { label: string; to: GoTo };
};
type LearnProps = { onGo?: (to: GoTo) => void };

const LESSONS: Lesson[] = [
  {
    id: "start",
    title: "Start a case",
    blurb: "Tell us what went wrong.",
    time: "1 min",
    Icon: PenLine,
    blocks: [
      { id: "a", text: "+ Start a case", kind: "button" },
      { id: "b", text: "Type your story in your own words..." },
      { id: "c", text: "Fixora asks one question at a time" },
    ],
    steps: [
      { focus: "a", title: "Press Start a case", body: "You'll find it at the top of every page." },
      { focus: "b", title: "Say what happened", body: "Write it the way you'd tell a friend. Short or long, both are fine." },
      { focus: "c", title: "Answer Fixora's questions", body: "She asks one at a time. Any question can be skipped." },
    ],
    go: { label: "Start a case", to: "start" },
  },
  {
    id: "talk",
    title: "Talk to Fixora",
    blurb: "Type, or use your voice.",
    time: "2 min",
    Icon: Mic,
    blocks: [
      { id: "a", text: "Message Fixora..." },
      { id: "b", text: "Mic: speak instead of typing" },
      { id: "c", text: "Quick replies · Skip" },
    ],
    steps: [
      { focus: "a", title: "Type your answer", body: "Press Enter to send. Press Shift and Enter to start a new line." },
      { focus: "b", title: "Or press the microphone", body: "Speak, and your words appear in the box. Voice works in browsers like Chrome and Edge." },
      { focus: "c", title: "Tap a quick reply", body: "Fixora suggests short answers. You can also skip any question." },
    ],
    go: { label: "Start a case", to: "start" },
  },
  {
    id: "evidence",
    title: "Add evidence",
    blurb: "Screenshots and emails help.",
    time: "1 min",
    Icon: FolderOpen,
    blocks: [
      { id: "a", text: "+ Evidence (optional)" },
      { id: "b", text: "charge.png · PNG · 240 KB · Added" },
      { id: "c", text: "Fixora saves file names only" },
    ],
    steps: [
      { focus: "a", title: "Choose your files", body: "Evidence is optional. You can send a complaint without it." },
      { focus: "b", title: "Check the list", body: "You'll see each file's name, type and size so you remember what to attach." },
      { focus: "c", title: "Attach the originals yourself", body: "Fixora never uploads or reads your files. They stay on your device." },
    ],
    go: { label: "Go to my cases", to: "case" },
  },
  {
    id: "letter",
    title: "Check your letter",
    blurb: "Edit it any way you like.",
    time: "2 min",
    Icon: FileText,
    blocks: [
      { id: "a", text: "To: support@company.com" },
      { id: "b", text: "Your letter, ready to edit" },
      { id: "c", text: "Redraft · Looks good →", kind: "button" },
    ],
    steps: [
      { focus: "a", title: "Add who it's going to", body: "Find the company's support email on their contact page and type it in." },
      { focus: "b", title: "Read it and change anything", body: "Every word is yours to edit. Nothing is final until you send it." },
      { focus: "c", title: "Press Looks good", body: "Not happy? Press Redraft and Fixora will write it again." },
    ],
    go: { label: "Go to my cases", to: "case" },
  },
  {
    id: "send",
    title: "Send it from Gmail",
    blurb: "We open Gmail. You press send.",
    time: "1 min",
    Icon: Mail,
    blocks: [
      { id: "a", text: "Open in Gmail →", kind: "button" },
      { id: "b", text: "Attach your files" },
      { id: "c", text: "I've sent it" },
    ],
    steps: [
      { focus: "a", title: "Press Open in Gmail", body: "Gmail opens with the address, subject and letter already filled in." },
      { focus: "b", title: "Attach your files", body: "Add your screenshots or emails yourself. Fixora can't attach them for you." },
      { focus: "c", title: "Send it, then tell us", body: "Press send in Gmail, come back, and tap I've sent it. Fixora only marks it as sent when you say so." },
    ],
    go: { label: "Go to my cases", to: "case" },
  },
  {
    id: "reply",
    title: "Paste their reply",
    blurb: "We explain it in simple words.",
    time: "2 min",
    Icon: MessageSquare,
    blocks: [
      { id: "a", text: "Paste company reply", kind: "button" },
      { id: "b", text: "Paste their reply..." },
      { id: "c", text: "What this means · What they didn't address" },
    ],
    steps: [
      { focus: "a", title: "Open Replies", body: "When a company answers, find your case and press Paste company reply." },
      { focus: "b", title: "Paste their email", body: "Copy it from Gmail and paste it in. Fixora only reads what you paste." },
      { focus: "c", title: "Read Fixora's explanation", body: "You'll see what it means, what they left out, and what you can do next." },
    ],
    go: { label: "Go to Replies", to: "replies" },
  },
];

const FAQ = [
  ["Does Fixora send the email for me?", "No. Fixora writes the letter and opens Gmail with it filled in. You read it and press send."],
  ["Where are my files kept?", "Fixora only saves file names and sizes. The files stay on your device, so you attach them yourself in Gmail."],
  ["Can I change what Fixora wrote?", "Yes. Every word is editable, and you can ask Fixora to redraft it."],
  ["What is the voice button?", "It lets you speak instead of typing. It works in browsers that support speech, like Chrome and Edge."],
];

const BTN3D =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-3 font-heading text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#9A3F12,0_12px_20px_-8px_rgba(232,106,42,0.6)] transition-all before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[9px] before:border before:border-dashed before:border-white/35 hover:-translate-y-px active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#9A3F12,0_4px_8px_-4px_rgba(232,106,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

const SOFT3D =
  "inline-flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium shadow-[0_3px_0_#D2CFC7,0_8px_14px_-8px_rgba(32,32,30,0.25)] transition-all hover:-translate-y-px active:translate-y-[2px] active:shadow-[0_1px_0_#D2CFC7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/* A small picture of the app. The block for this step glows and says "Tap here". */
function Preview({ blocks, focus }: { blocks: Block[]; focus: string }) {
  return (
    <div aria-hidden className="space-y-2 rounded-2xl bg-surface-muted p-4 shadow-[inset_0_1px_3px_rgba(32,32,30,0.08)]">
      {blocks.map((b) => {
        const on = b.id === focus;
        return (
          <div key={b.id} className="relative">
            <div
              className={`rounded-xl px-3 py-2.5 text-sm transition-all ${
                b.kind === "button" ? "bg-brand font-semibold text-white" : "bg-surface shadow-soft"
              } ${on ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-muted" : "opacity-30"}`}
            >
              {b.text}
            </div>
            {on && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background motion-safe:animate-pulse">
                Tap here
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Learn({ onGo }: LearnProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 py-3 backdrop-blur md:px-8">
        <h1 className="font-heading text-lg font-semibold tracking-tight md:text-xl">Learn Fixora</h1>
        <div className="ml-auto">
          <button type="button" onClick={() => onGo?.("start")} className={BTN3D}>
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-sm leading-none">+</span>
            Start a case
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-28 pt-4 md:px-8 md:pb-16">
        {/* Intro + jump links */}
        <p className="max-w-xl text-base leading-relaxed text-muted">
          How to use Fixora, from your first message to the company reply. Six short guides, about 9 minutes in all.
        </p>
        <nav aria-label="Guides" className="mt-5 flex flex-wrap gap-2">
          {LESSONS.map((l, i) => (
            <a key={l.id} href={`#guide-${l.id}`} className={SOFT3D}>
              <span className="text-muted">{i + 1}</span>
              {l.title}
            </a>
          ))}
        </nav>

        {/* Guides */}
        <div className="mt-12 space-y-16">
          {LESSONS.map((l, i) => (
            <Reveal key={l.id}>
            <section id={`guide-${l.id}`} aria-labelledby={`h-${l.id}`} className="scroll-mt-20">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong shadow-card">
                  <l.Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 id={`h-${l.id}`} className="font-heading text-2xl font-semibold tracking-tight">
                    <span className="text-muted">{i + 1}.&nbsp;</span>
                    {l.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {l.blurb} About {l.time}.
                  </p>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {l.steps.map((s, n) => (
                  <li key={n} className="grid items-center gap-4 rounded-3xl bg-surface p-5 shadow-card md:grid-cols-2 md:gap-8 md:p-6">
                    {/* Words first on mobile, picture second */}
                    <div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-[0_3px_0_#9A3F12]">
                        {n + 1}
                      </span>
                      <h3 className="mt-3 font-heading text-lg font-semibold leading-snug">{s.title}</h3>
                      <p className="mt-1.5 leading-relaxed text-muted">{s.body}</p>
                    </div>
                    <Preview blocks={l.blocks} focus={s.focus} />
                  </li>
                ))}
              </ol>

              <div className="mt-5">
                <button type="button" onClick={() => onGo?.(l.go.to)} className={SOFT3D}>
                  {l.go.label} <span aria-hidden>→</span>
                </button>
              </div>
            </section>
            </Reveal>
          ))}
        </div>

        {/* FAQ */}
        <Reveal>
        <section aria-labelledby="faq-heading" className="mt-16">
          <h2 id="faq-heading" className="font-heading text-2xl font-semibold tracking-tight">
            Common questions
          </h2>
          <div className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface shadow-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden className="shrink-0 text-lg text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
        </Reveal>

        <p className="mt-10 text-xs text-muted">Fixora never sends emails for you. You press send.</p>
      </main>
    </div>
  );
}