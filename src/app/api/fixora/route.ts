import { NextResponse } from "next/server";
import { streamFixora } from "@/lib/fixora";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await streamFixora(body);
  if (!result.ok) {
    const message = result.error === "missing_key"
      ? "GROQ_API_KEY is missing on the server. Add it to .env.local and restart Next.js."
      : result.error.startsWith("upstream:")
        ? `Groq rejected the request. ${result.error.slice("upstream:".length).trim()}`
        : "Could not connect to Groq. Check the server network and try again.";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
