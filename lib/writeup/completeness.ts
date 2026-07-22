// The listing quality score.
//
// Deterministic, field-weighted, and never an AI call. It updates on every
// keystroke, so it has to be a pure function of the draft and nothing else:
// the same draft must always produce the same number, on the server and in the
// browser, without a network round trip.
//
// The weights encode what a counterparty actually needs before they can decide
// whether to reply. They are not evenly spread, because the fields are not
// equally useful: a deal with no quantity cannot be quoted at all, while a
// missing deal-team note costs a reader nothing.

export type DraftForScore = {
  type?: string | null;
  product?: string | null;
  hs_code?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  incoterm?: string | null;
  payment_terms?: string | null;
  origin_country?: string | null;
  destination_country?: string | null;
  origin?: string | null;
  destination?: string | null;
  details?: string | null;
  key_notes?: string | null;
  submitter_role?: string | null;
  chain_depth?: string | null;
  validity_type?: string | null;
  valid_until?: string | null;
  flexibility?: Record<string, string> | null;
  media_count?: number | null;
};

export type CompletenessBand = "thin" | "workable" | "strong" | "complete";

export type Completeness = {
  /** 0 to 100. */
  score: number;
  band: CompletenessBand;
  /** Field keys that would raise the score most, best first. */
  missing: string[];
};

type Rule = {
  key: string;
  weight: number;
  has: (d: DraftForScore) => boolean;
};

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

/**
 * Weights sum to 100.
 *
 * The first four are what makes a listing a listing. Without them there is
 * nothing to quote against, which is why they carry nearly half the score
 * between them.
 */
const RULES: Rule[] = [
  { key: "type", weight: 6, has: (d) => has(d.type) },
  { key: "product", weight: 12, has: (d) => has(d.product) },
  { key: "quantity", weight: 12, has: (d) => has(d.quantity) && Number(d.quantity) > 0 },
  { key: "unit", weight: 5, has: (d) => has(d.unit) },

  // A corridor needs one end declared to be searchable and both to be
  // quotable. Half marks for one is the honest split.
  {
    key: "corridor",
    weight: 10,
    has: (d) =>
      has(d.origin_country) || has(d.destination_country) || has(d.origin) || has(d.destination),
  },
  {
    key: "corridor_both",
    weight: 5,
    has: (d) =>
      (has(d.origin_country) || has(d.origin)) &&
      (has(d.destination_country) || has(d.destination)),
  },

  { key: "incoterm", weight: 8, has: (d) => has(d.incoterm) },
  { key: "payment_terms", weight: 9, has: (d) => has(d.payment_terms) },

  // Classification is what puts a listing in front of the right reader.
  { key: "hs_code", weight: 7, has: (d) => /^\d{6}$/.test(String(d.hs_code ?? "")) },

  // The declarations that let a reader self-qualify in seconds.
  { key: "poster_role", weight: 5, has: (d) => has(d.submitter_role) },
  { key: "chain", weight: 5, has: (d) => has(d.chain_depth) },
  {
    key: "flexibility",
    weight: 6,
    has: (d) => Object.keys(d.flexibility ?? {}).length >= 2,
  },

  // No silent open-endedness: a listing declares its horizon or it does not
  // score for it.
  { key: "validity", weight: 5, has: (d) => has(d.validity_type) },

  // Substance the numbers cannot carry.
  { key: "details", weight: 3, has: (d) => (d.details ?? "").trim().length >= 40 },
  { key: "key_notes", weight: 1, has: (d) => (d.key_notes ?? "").trim().length >= 20 },
  { key: "media", weight: 1, has: (d) => (d.media_count ?? 0) > 0 },
];

export const TOTAL_WEIGHT = RULES.reduce((sum, r) => sum + r.weight, 0);

function bandFor(score: number): CompletenessBand {
  if (score >= 90) return "complete";
  if (score >= 70) return "strong";
  if (score >= 40) return "workable";
  return "thin";
}

/**
 * Score a draft.
 *
 * Never returns a failing grade and never uses alarm language: the meter is a
 * nudge on a listing somebody is still writing, not a verdict on their deal.
 * The bands are named for what the listing IS, not for what it lacks.
 */
export function scoreCompleteness(draft: DraftForScore): Completeness {
  let earned = 0;
  const missing: { key: string; weight: number }[] = [];

  for (const rule of RULES) {
    if (rule.has(draft)) earned += rule.weight;
    else missing.push({ key: rule.key, weight: rule.weight });
  }

  const score = Math.round((earned / TOTAL_WEIGHT) * 100);

  return {
    score,
    band: bandFor(score),
    missing: missing.sort((a, b) => b.weight - a.weight).map((m) => m.key),
  };
}

/**
 * Enough to be worth generating a write-up for.
 *
 * The addendum's minimum: type, product, quantity, and one end of the
 * corridor. Below this the model would be inventing rather than interpreting,
 * which is the one thing it is forbidden to do.
 */
export function meetsWriteupMinimum(draft: DraftForScore): boolean {
  return (
    has(draft.type) &&
    has(draft.product) &&
    has(draft.quantity) &&
    (has(draft.origin_country) ||
      has(draft.destination_country) ||
      has(draft.origin) ||
      has(draft.destination))
  );
}
