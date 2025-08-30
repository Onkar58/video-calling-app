import { NextRequest, NextResponse } from "next/server";

type AnswerEntry = {
  answer: string;
  createdAt: number;
};

const answerStore: Record<string, AnswerEntry> = {};

export async function POST(req: NextRequest) {
  const { offerId, answer } = await req.json();
  if (!offerId || !answer)
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  answerStore[offerId] = { answer, createdAt: Date.now() };
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get("offerId");
  if (!offerId)
    return NextResponse.json({ error: "Missing offerId" }, { status: 400 });
  const entry = answerStore[offerId];
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}
