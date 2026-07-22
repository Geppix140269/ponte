// Credit packs.
//
// USD throughout. The blueprint priced these in euro; the platform prices
// everything else in dollars and one currency is worth more than one
// document's preference.
//
// One credit is one dollar at the smallest pack, and the larger packs are the
// discount. That relationship is the whole pricing story and it should stay
// legible on the page: nobody needs a calculator to see what a pack is worth.

export type CreditPack = {
  id: string;
  credits: number;
  amountCents: number;
  /** Shown next to the price. Empty on the pack that sets the baseline. */
  saving: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 25, amountCents: 2500, saving: "" },
  { id: "trader", credits: 60, amountCents: 5000, saving: "17% less per credit" },
  { id: "desk", credits: 150, amountCents: 10000, saving: "33% less per credit" },
];

export function packById(id: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null;
}

/** What a credit costs in this pack, in cents. Used for the saving line. */
export function centsPerCredit(pack: CreditPack): number {
  return Math.round(pack.amountCents / pack.credits);
}

/** Prices that appear on buttons. Credits are whole, so no decimals. */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
