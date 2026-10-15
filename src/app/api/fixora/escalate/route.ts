import { NextResponse } from "next/server";
import { draftEscalation } from "@/lib/fixora";

// Drafts the formal escalation letter from the complaint, its facts, and the
// company reply the user already received. The user reviews and edits the
// draft in the app before it is opened in Gmail — nothing is sent from here.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await draftEscalation(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Fixora could not draft the escalation. Please try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({ subject: result.subject, message: result.message });
}
