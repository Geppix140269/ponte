import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getHsCode, searchHsCodes } from "@/lib/hs";
import { resolveThroughCascade } from "@/lib/products/cascade";
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
 * `semantic: false` forces the free deterministic path over the curated
 * catalogue only. The client uses it for a keystroke-time preview so typing
 * never spends a token; the Resolve action asks for the full cascade.
 *
 * The cascade is wired to the real HS 2022 catalogue here, and only here:
 * `getHsCode` checks that a customs code the model proposed actually exists
 * before it is ever shown, and `searchHsCodes` is the deterministic fallback
 * when the model is unavailable. Both degrade to empty rather than throwing
 * when the catalogue table is absent, so a missing HS import weakens the answer
 * and never breaks the journey.
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

  // Every stage degrades to the one below it, so this route has no failure
  // branch that leaves the member with nothing.
  const outcome = semantic
    ? await resolveThroughCascade(text, {
        hsLookup: async (code) => {
          const found = await getHsCode(code);
          return found ? { code: found.code, description: found.short_title || found.description } : null;
        },
        hsSearch: async (query) => {
          const hits = await searchHsCodes(query, 6);
          return hits.map((h) => ({ code: h.code, description: h.short_title || h.description }));
        },
      })
    : resolveProduct(text);

  return NextResponse.json({ ok: true, outcome });
}
