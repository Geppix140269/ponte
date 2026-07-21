import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resumeLevel2WithSelection } from "@/lib/verification/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resuming runs the same fan out as a first run: registry, VAT, LEI, a
// screening per name, and one model call. Same budget as the parent route.
export const maxDuration = 120;

/**
 * The member picked which of the matching companies they meant.
 *
 * This finishes a verification that is already paid for. It does NOT open a new
 * one and it does NOT spend credits, so there is no balance check here and no
 * 402: a member with an empty balance is still entitled to the result of the
 * check they bought. See the payment boundary note in lib/verification/pipeline.
 *
 * Authorisation is not this route's opinion. The route proves there is a signed
 * in member and hands the id through; the pipeline loads the case by id AND by
 * that member's user_id, so a case belonging to somebody else does not exist as
 * far as this endpoint is concerned. A missing case and another member's case
 * return the same 404 on purpose, because telling the two apart would confirm
 * that an id exists.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to continue this check." },
      { status: 401 },
    );
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`verify-select:${user.id}:${ip}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const verificationId =
    typeof body.verificationId === "string" ? body.verificationId.trim() : "";
  const regNumber =
    typeof body.regNumber === "string" ? body.regNumber.trim().slice(0, 60) : "";

  if (!verificationId || !regNumber) {
    return NextResponse.json(
      { error: "Choose a company to continue." },
      { status: 400 },
    );
  }

  try {
    const result = await resumeLevel2WithSelection({
      verificationId,
      userId: user.id,
      regNumber,
    });

    if (!result.ok) {
      const status =
        result.rejection === "not_found"
          ? 404
          : result.rejection === "not_selectable"
            ? 409
            : 400;
      return NextResponse.json({ error: result.rejection }, { status });
    }

    return NextResponse.json(result.outcome);
  } catch (err) {
    // The id is safe to log, the case is not: a verification row carries the
    // registry record and the officer names screened against it.
    console.error("[ponte] verification resume threw:", err);
    return NextResponse.json(
      { error: "The check could not be continued. Please try again." },
      { status: 500 },
    );
  }
}
