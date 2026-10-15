import { NextResponse } from "next/server";
import { simulateOutcome } from "@/lib/fixora";

// Generates the one simulated final outcome for an escalated complaint, from
// the complaint, the first reply, and what that reply left unanswered. The
// scheduler in the app calls this once per case and saves the result.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await simulateOutcome(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Fixora could not generate the simulated final outcome. Please try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({
    replyText: result.replyText,
    meaning: result.meaning,
    verdict: result.verdict,
    guidance: result.guidance,
  });
}
