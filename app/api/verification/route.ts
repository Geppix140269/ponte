import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getBalance, COST_VERIFICATION_L2 } from "@/lib/credits";
import { runLevel2 } from "@/lib/verification/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The pipeline fans out to several upstreams and one model call, so the
// default serverless budget is not enough.
export const maxDuration = 120;

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Level 2 business verification, requested by a signed in member.
 *
 * This route does not decide anything. It validates the input, confirms the
 * member can pay, and hands the case to the pipeline, which spends the
 * credits, runs the checks and applies the rules. A case that is not fully
 * clean comes back as "review" and waits for a person.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to run a verification." },
      { status: 401 },
    );
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`verify:${user.id}:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many verifications. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = clean(body.name, 200);
  const country = clean(body.country, 2).toUpperCase();
  const regNumber = clean(body.regNumber, 60);
  const vat = clean(body.vat, 40);
  const lei = clean(body.lei, 20);

  if (!name) {
    return NextResponse.json(
      { error: "Enter the company name." },
      { status: 400 },
    );
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "Select the country of registration." },
      { status: 400 },
    );
  }

  // Check the balance before opening a case. The pipeline spends atomically
  // and would refuse anyway, but a member should be told before a record
  // exists rather than after.
  try {
    const balance = await getBalance(user.id);
    if (balance < COST_VERIFICATION_L2) {
      return NextResponse.json(
        {
          error: "Not enough credits for this check.",
          balance,
          cost: COST_VERIFICATION_L2,
        },
        { status: 402 },
      );
    }
  } catch (err) {
    console.error("[ponte] balance check failed:", err);
    return NextResponse.json(
      { error: "Could not read your credit balance. Please try again." },
      { status: 500 },
    );
  }

  try {
    const outcome = await runLevel2({
      userId: user.id,
      name,
      country,
      regNumber: regNumber || null,
      vat: vat || null,
      lei: lei || null,
    });

    if (outcome.status === "failed" && /insufficient credits/i.test(outcome.reason)) {
      return NextResponse.json(
        { ...outcome, cost: COST_VERIFICATION_L2 },
        { status: 402 },
      );
    }

    return NextResponse.json(outcome);
  } catch (err) {
    console.error("[ponte] verification pipeline threw:", err);
    return NextResponse.json(
      { error: "The check could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
