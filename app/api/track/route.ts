import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/analytics/track";
import { isKnownEvent } from "@/lib/analytics/events";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { event?: string; props?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (!body.event || !isKnownEvent(body.event)) return NextResponse.json({ error: "unknown_event" }, { status: 400 });
  const user = await getUser();
  await track(body.event as never, body.props ?? {}, { profileId: user?.id });
  return NextResponse.json({ ok: true });
}
