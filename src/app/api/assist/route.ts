import { NextResponse } from "next/server";
import { draftComplaint } from "@/lib/fixora";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await draftComplaint(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ subject: result.subject, message: result.message });
}