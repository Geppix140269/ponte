import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { lookupRegistry, type RegistryCandidate } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * K02 candidate search for the Check & Verify journey.
 *
 * Free, unauthenticated, and spends nothing: it runs the pure registry lookup
 * so a visitor can pick the right legal entity BEFORE the account/credits gate.
 * No verifications row is created and no credit is touched here; payment and the
 * full screen happen later, at K06, through /api/verification.
 *
 *   POST { name, country }  ->  { ok, candidates, candidateTotal, available, reason }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`vcand:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const country =
    typeof body.country === "string" ? body.country.trim().slice(0, 2).toUpperCase() : "";

  if (!name) {
    return NextResponse.json({ ok: false, reason: "Enter the company name." }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { ok: false, reason: "Select the country of registration." },
      { status: 400 },
    );
  }

  try {
    const result = await lookupRegistry({ name, country });

    // A name can match many companies (candidates), exactly one (a single
    // available result), or none. Normalise all three to one list.
    let candidates: RegistryCandidate[] = result.candidates ?? [];
    if (candidates.length === 0 && result.available && result.companyName) {
      candidates = [
        {
          companyName: result.companyName,
          regNumber: result.regNumber,
          status: result.status,
          incorporationDate: result.incorporationDate,
          address: result.address,
        },
      ];
    }

    return NextResponse.json({
      ok: true,
      candidates,
      candidateTotal: result.candidateTotal ?? candidates.length,
      available: result.available === true || candidates.length > 0,
      reason: result.reason ?? null,
      source: result.source,
    });
  } catch (err) {
    console.error("[ponte] candidate lookup failed:", err);
    return NextResponse.json({ ok: false, reason: "lookup_failed" });
  }
}
