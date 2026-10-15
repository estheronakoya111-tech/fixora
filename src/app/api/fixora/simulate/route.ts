import { NextResponse } from "next/server";
import { simulateCompanyReply } from "@/lib/fixora";

// Generates the initial simulated demo company reply for a confirmed-sent
// complaint. The scheduler in the app calls this once per case and saves the
// result; the case itself guarantees one reply per complaint.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await simulateCompanyReply(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Fixora could not generate the simulated reply. Please try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({
    replyText: result.replyText,
    meaning: result.meaning,
    unresolved: result.unresolved,
    options: result.options,
    ...(result.verdict ? { verdict: result.verdict } : {}),
    ...(result.recommendation ? { recommendation: result.recommendation } : {}),
  });
}
