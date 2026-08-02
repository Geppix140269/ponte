import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Credit purchase. WITHDRAWN.
 *
 * `AUTH-01` removed credits from the product and `DECISION-21` withdraws this
 * route. The Deal Room is the only paid product, and its price is stated at
 * activation.
 *
 * ## Why the endpoint still exists, rather than the file being deleted
 *
 * `DECISION-21` is explicit that this is a sequence and not a delete, and the
 * order matters: disable new purchases FIRST, prove compatibility, remove code
 * LAST. A deleted route answers 404, which is indistinguishable from a
 * deployment fault and tells a caller nothing. This answers 410 Gone, which
 * says the resource existed and has been withdrawn deliberately, and names
 * where the product's pricing now lives.
 *
 * There was no caller. `POST /api/credits/checkout` has no reference anywhere
 * in the interface, so nothing in the product could reach it; only a bookmark,
 * a script or an accidental link could. That is precisely why it had to be
 * closed rather than left: dead payment surface with a live Stripe path
 * attached is reachable by exactly the routes nobody is watching.
 *
 * ## What is deliberately NOT changed
 *
 * `app/api/webhooks/stripe/route.ts` still fulfils credit sessions, and
 * `GET /api/credits/balance` still reports balances and the ledger. Anybody
 * who bought credits owns them. Withdrawing the way IN must not withdraw the
 * record of what was already paid for, and an in-flight webhook for a session
 * created before this change must still be honoured. Stripe retries until it
 * gets a 2xx; a webhook that stopped understanding credits would turn a
 * completed payment into a support case.
 */

/** Where the product's pricing actually lives now. */
const PRICING_PATH = "/pricing";

const WITHDRAWN = {
  error: "Ponte Credits have been withdrawn.",
  detail:
    "Credits are no longer part of Ponte. The Deal Room is the only paid product, and its price is stated before any amount is taken.",
  pricing: PRICING_PATH,
} as const;

export async function POST() {
  // 410, not 404 and not 400. The resource existed, it is gone on purpose, and
  // that distinction is the whole content of the answer.
  return NextResponse.json(WITHDRAWN, { status: 410 });
}

/**
 * A browser that reaches this by an old link is a person, not a script.
 *
 * There has never been a public credits PAGE - this path was always an API -
 * so there is nothing to redirect from. Somebody who arrives here anyway is
 * sent to the pricing page rather than shown JSON they cannot act on.
 */
export async function GET() {
  return NextResponse.redirect(new URL(PRICING_PATH, process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade"), 308);
}
