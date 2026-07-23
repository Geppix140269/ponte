import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getMarketSignal } from "@/lib/board/market-signals";
import { sendBrokerageSubmission } from "@/lib/email";
import {
  cleanInvestigation,
  investigationIsComplete,
  missingInvestigationFields,
  REQUESTER_TYPE_LABELS,
  type RequesterType,
} from "@/lib/signals/investigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Ask Ponte to investigate" on a Market Signal (brief Block D, tests 6-10).
 *
 * The request enters an admin investigation queue and does exactly two things
 * to the outside world: it records what the REQUESTER told us, and it notifies
 * the Ponte desk. It never contacts and never reveals the third party behind
 * the signal. There is no code path here that reads a counterparty column, so
 * a third-party disclosure cannot happen by accident.
 *
 * The account gate confirms the requester's email before this runs (a 401 is
 * what opens it), so every stored request is tied to a confirmed member.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`investigate:${user.id}:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let signalId = "";
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
    signalId = typeof body.signal_id === "string" ? body.signal_id.trim() : "";
  } catch {
    /* fallthrough */
  }
  if (!/^[0-9a-f-]{10,40}$/i.test(signalId)) {
    return NextResponse.json({ error: "Invalid signal." }, { status: 400 });
  }

  const request = cleanInvestigation(body);
  if (!investigationIsComplete(request)) {
    return NextResponse.json(
      { error: "Incomplete request.", missing: missingInvestigationFields(request) },
      { status: 400 },
    );
  }

  // The request is only valid on a signal the requester could actually see: a
  // live, approved, unexpired one. getMarketSignal selects public columns only,
  // so nothing internal is read here.
  const lookup = await getMarketSignal(signalId);
  if (lookup.state !== "visible") {
    return NextResponse.json({ error: "Signal not available." }, { status: 404 });
  }

  // Stored as the requester (RLS: requester_id must equal auth.uid()).
  const supabase = createClient();
  const { error: insertErr } = await supabase.from("signal_investigations").insert({
    signal_id: signalId,
    requester_id: user.id,
    requesting_business: request.requesting_business,
    requester_type: request.requester_type,
    establish_goal: request.establish_goal,
    indicative: request.indicative || null,
    geography: request.geography || null,
    evidence: request.evidence || null,
    wants_intro: request.wants_intro,
  });
  if (insertErr) {
    console.error("[ponte] investigation request failed:", insertErr);
    return NextResponse.json({ error: "Could not submit the request." }, { status: 500 });
  }

  // Keep the private per-signal counter accurate. Derived from the rows so it
  // cannot drift; it never appears in a public payload (the public read never
  // selects investigation_count).
  const adminSb = createAdminClient();
  const { count } = await adminSb
    .from("signal_investigations")
    .select("id", { count: "exact", head: true })
    .eq("signal_id", signalId);
  if (typeof count === "number") {
    await adminSb.from("desk_radar").update({ investigation_count: count }).eq("id", signalId);
  }

  // Notify the desk. The desk is internal, so this carries the requester's own
  // details and the ask, and nothing about the third party (there is nothing to
  // carry: this route never read one).
  await sendBrokerageSubmission({
    type: lookup.signal.side === "offer" ? "offer" : "requirement",
    name: user.email ?? user.id,
    company: request.requesting_business,
    email: user.email ?? "unknown@ponte.trade",
    country: request.geography || "-",
    product: lookup.signal.product,
    details: [
      `Investigation requested on Market Signal ${signalId} (${lookup.signal.product}).`,
      `Requesting business: ${request.requesting_business}`,
      `Requester is: ${REQUESTER_TYPE_LABELS[request.requester_type as RequesterType]}`,
      `Wants Ponte to establish: ${request.establish_goal}`,
      request.indicative ? `Indicative quantity/timing/capability: ${request.indicative}` : "",
      request.geography ? `Geography: ${request.geography}` : "",
      request.evidence ? `Certifications/evidence they can provide: ${request.evidence}` : "",
      `Wants an introduction if confirmed: ${request.wants_intro ? "yes" : "no"}`,
      `Queued for the admin investigation queue. No third party has been contacted or revealed.`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ ok: true });
}
