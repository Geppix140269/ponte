import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getBalance, ledgerFor, COST_VERIFICATION_L2 } from "@/lib/credits";
import { CREDIT_PACKS, formatUsd } from "@/lib/credits/packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's balance, their ledger, and what things cost.
 *
 * The prices come back with the balance on purpose: every credit-priced button
 * prints its price, and a button that has to guess is a button that will one
 * day print the wrong number.
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
      packs: CREDIT_PACKS.map((p) => ({
        id: p.id,
        credits: p.credits,
        price: formatUsd(p.amountCents),
        saving: p.saving,
      })),
    });
  } catch (err) {
    console.error("[ponte] balance read failed:", err);
    return NextResponse.json(
      { error: "Could not read your balance." },
      { status: 500 },
    );
  }
}
