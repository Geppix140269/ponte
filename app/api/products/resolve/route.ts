import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveProductSemantically } from "@/lib/products/ai-resolve";
import { resolveProduct } from "@/lib/products/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Product resolution for both product intents.
 *
 * One endpoint, because there is one resolver. A supply offer and a sourcing
 * requirement differ in the language around the product and in which end of the
 * route Ponte asks for; they do not differ in what a product is. Two endpoints
 * would be two vocabularies within a month.
 *
 *   POST { text, semantic? }  ->  { ok: true, outcome }
 *
 * `outcome` is the discriminated union from `lib/products/model.ts`, so the
 * client renders `resolved`, `candidates`, `ambiguous` or `none` and there is no
 * fourth shape that could arrive as a blank screen.
 *
 * Open to anonymous callers, like `/api/hs/search`, and for the same reason: the
 * whole composer is anonymous until the publish gate, and asking a visitor to
 * sign in before Ponte will understand their product is the behaviour this
 * change exists to remove.
 *
 * `semantic: false` forces the free deterministic path. The client uses it for
 * the keystroke-time preview so typing never spends a token; the Resolve action
 * asks for the full answer.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (
    !checkRateLimit(`presolve:min:${ip}`, 30, 60 * 1000) ||
    !checkRateLimit(`presolve:hr:${ip}`, 200, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const raw = (body as { text?: unknown })?.text;
  const text = typeof raw === "string" ? raw.slice(0, 600) : "";
  if (text.trim().length < 2) {
    return NextResponse.json({ ok: false, reason: "too_short" }, { status: 400 });
  }

  const semantic = (body as { semantic?: unknown })?.semantic !== false;

  // The lexical stage always runs and always answers. The semantic stage may
  // fail, and when it does `resolveProductSemantically` returns the lexical
  // outcome rather than an error, so this route has no failure branch that
  // leaves the member with nothing.
  const outcome = semantic ? await resolveProductSemantically(text) : resolveProduct(text);

  return NextResponse.json({ ok: true, outcome });
}
