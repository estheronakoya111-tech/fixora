import { NextResponse } from "next/server";
import { explainReply } from "@/lib/fixora";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await explainReply(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Fixora could not explain that reply. Please try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({ meaning: result.meaning, unresolved: result.unresolved, options: result.options });
}
