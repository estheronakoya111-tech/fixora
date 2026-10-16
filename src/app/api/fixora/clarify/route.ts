import { NextResponse } from "next/server";
import { draftClarification } from "@/lib/fixora";

// Drafts the short clarification email when the user picks "Request
// clarification" after reading a company reply. Nothing is sent from here —
// the user reviews, edits, and sends it from their own mail.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await draftClarification(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Fixora could not draft the clarification. Please try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({ subject: result.subject, message: result.message });
}
