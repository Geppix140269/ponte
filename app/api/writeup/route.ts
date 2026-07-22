import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai";
import {
  generateWriteup,
  WriteupBelowMinimum,
  type WriteupDraft,
} from "@/lib/writeup";
import { scoreCompleteness } from "@/lib/writeup/completeness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The AI deal write-up.
 *
 * Free, ungated, and open to anonymous callers. That is the entire point: the
 * visitor gets something finished back before we ask for their email, and the
 * gate moves to Publish, by which time they are looking at something they want
 * to publish. It is not a credit action and it does not check a plan.
 *
 * Abuse control is a per-IP rate limit set generously enough that a person
 * iterating on one listing never meets it, plus the payload cache, which makes
 * pressing Update without changing anything free.
 */

const LIMIT_PER_HOUR = 40;

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Flexibility arrives as a map of term to state. Both sides are constrained
 * here rather than trusted, so a hostile payload cannot smuggle free text into
 * the prompt through a key name.
 */
const FLEX_TERMS = new Set([
  "price", "payment_terms", "quantity", "delivery_window", "incoterm", "inspection",
]);
const FLEX_STATES = new Set(["fixed", "negotiable", "open"]);

function flexibility(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [term, state] of Object.entries(v as Record<string, unknown>)) {
    if (FLEX_TERMS.has(term) && typeof state === "string" && FLEX_STATES.has(state)) {
      out[term] = state;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`writeup:${ip}`, LIMIT_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many write-ups from here. Try again in a while." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Built field by field. Never spread the request body into the prompt: that
  // is how a payload ends up carrying text the poster did not write.
  const draft: WriteupDraft = {
    type: clean(body.type, 20) || null,
    product: clean(body.product, 200) || null,
    hs_code: clean(body.hs_code, 12).replace(/\D/g, "") || null,
    quantity: num(body.quantity),
    unit: clean(body.unit, 30) || null,
    incoterm: clean(body.incoterm, 20) || null,
    payment_terms: clean(body.payment_terms, 120) || null,
    origin_country: clean(body.origin_country, 2).toUpperCase() || null,
    destination_country: clean(body.destination_country, 2).toUpperCase() || null,
    origin: clean(body.origin, 80) || null,
    destination: clean(body.destination, 80) || null,
    submitter_role: clean(body.submitter_role, 60) || null,
    chain_depth: clean(body.chain_depth, 60) || null,
    validity_type: clean(body.validity_type, 20) || null,
    valid_until: clean(body.valid_until, 12) || null,
    key_notes: clean(body.key_notes, 400) || null,
    details: clean(body.details, 2000) || null,
    flexibility: flexibility(body.flexibility),
    media_count: Math.min(Number(body.media_count) || 0, 20),
  };

  // Deterministic, and returned whether or not the model runs, so the meter
  // still moves on a draft that is not yet worth writing up.
  const completeness = scoreCompleteness(draft);

  // Anonymous is the normal case here. A user id is attached when there is one
  // purely so the call is attributable in ai_calls.
  const user = await getUser().catch(() => null);

  try {
    const result = await generateWriteup(draft, { userId: user?.id ?? null });
    return NextResponse.json({
      ok: true,
      writeup: result.writeup,
      completeness,
      meta: {
        model: result.model,
        prompt_version: result.promptVersion,
        cached: result.cached,
      },
    });
  } catch (err) {
    if (err instanceof WriteupBelowMinimum) {
      // Not an error the member caused. They are simply still typing, so the
      // meter comes back and the interface shows what is still needed.
      return NextResponse.json(
        {
          ok: false,
          reason: "below_minimum",
          completeness,
          needed: ["type", "product", "quantity", "origin or destination"],
        },
        { status: 200 },
      );
    }
    console.error("[ponte] write-up failed:", err);
    return NextResponse.json(
      { error: "Could not write this up just now. Your listing is not affected." },
      { status: 502 },
    );
  }
}
