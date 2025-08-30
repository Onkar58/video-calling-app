import { NextRequest, NextResponse } from "next/server";
import { storeSdpOffer, getSdpOffer } from "@/server/sdpStore";

export async function POST(req: NextRequest) {
  const { username, sdp, offerId } = await req.json();
  if (!username || !sdp)
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  storeSdpOffer(username, sdp, offerId);
  return NextResponse.json({ offerId });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get("offerId");
  if (!offerId)
    return NextResponse.json({ error: "Missing offer id" }, { status: 400 });
  const offer = getSdpOffer(offerId);
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(offer);
}
