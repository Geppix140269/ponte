import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getBalance, ledgerFor, COST_VERIFICATION_L2 } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's balance, their ledger, and what things cost.
 *
 * The prices come back with the balance on purpose: every credit-priced button
 * prints its price, and a button that has to guess is a button that will one
 * day print the wrong number.
 *
 * ## `packs` was removed here, and the balance was not (DECISION-21)
 *
 * This response used to carry the purchasable pack list. That is an OFFER TO
 * BUY, and `AUTH-01` removed credits from the product, so it is withdrawn with
 * the checkout it advertised. Leaving it would have left a price list for a
 * thing that answers 410.
 *
 * The balance and the ledger stay, deliberately and permanently. Somebody who
 * bought credits owns them, and a member must always be able to see what they
 * paid for and what became of it. Withdrawing the way IN is not the same act
 * as erasing the record, and only the first was decided.
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const [balance, ledger] = await Promise.all([
      getBalance(user.id),
      ledgerFor(user.id, 50),
    ]);

    return NextResponse.json({
      ok: true,
      balance,
      ledger,
      prices: { verification: COST_VERIFICATION_L2 },
      // Stated rather than implied by absence, so a caller that still reads
      // `packs` learns why it is gone instead of reading undefined as zero.
      purchasable: false,
    });
  } catch (err) {
    console.error("[ponte] balance read failed:", err);
    return NextResponse.json(
      { error: "Could not read your balance." },
      { status: 500 },
    );
  }
}
