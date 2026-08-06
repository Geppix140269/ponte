/**
 * The member's own record, growing as they answer.
 *
 * ## Why this is the load-bearing idea
 *
 * `ADR-0032`: *"The member's own record is always visible and always growing.
 * In the publish path it is a reversed cream ledger rising from the bottom.
 * That is what stops people leaving at the third screen: by then something of
 * theirs exists."*
 *
 * A member three questions into a form has nothing to show for it, so leaving
 * costs them nothing. A member three questions into a RECORD can see a thing of
 * their own that did not exist before.
 *
 * ## Derived, never accumulated
 *
 * A pure function of the draft. Nothing appends to a list as the member walks,
 * because an appended list and the record eventually disagree: going back would
 * leave a line behind that nothing on the draft supports, and the member would
 * be shown a fact they had just retracted. Going back here removes the line,
 * because the line was never anywhere but here.
 *
 * ## What it reads
 *
 * `lib/structure/intent-choice.ts` and `lib/taxonomy/market.ts`, which are the
 * AUTHORITY for what B01 stores. `ponte-platform.html` governs how this looks
 * and nothing about what is in it. `ADR-0032-AMENDMENT-1` section 7.
 */

import { MARKET_INTENTS, type MarketFamily } from "../taxonomy/market";

export interface RecordLine {
  key: string;
  /** The mono label. Quiet, and never a sentence. */
  label: string;
  /** The member's answer, in their terms. */
  value: string;
}

const FAMILY_LABEL: Readonly<Record<MarketFamily, string>> = {
  products: "A product",
  services: "A trade service",
  distribution: "Distribution or representation",
};

/**
 * The position, stated as the member chose it.
 *
 * Only distribution has a side to be on. Deriving it from the stored intent
 * rather than from a separate answer means the ledger can never disagree with
 * the record: there is one source, and it is the value that will be stored.
 */
function positionOf(intent: string): string | null {
  if (intent === "seek_brands_or_products_to_represent") {
    return "Seeking brands or products to represent";
  }
  if (intent === "seek_distribution_partner") return "Seeking a distributor or agent";
  if (intent === "offer_distribution_or_representation") return "Offering to distribute or represent";
  return null;
}

/**
 * What the member has answered so far, in the order they answered it.
 *
 * Order is the walk, not a schema order: the ledger reads back as the passage
 * they have just taken, so the newest line is always last.
 */
export function recordLines(answer: {
  direction?: "need" | "offer" | null;
  family?: MarketFamily | null;
  intent?: string | null;
}): RecordLine[] {
  const lines: RecordLine[] = [];

  if (answer.direction) {
    lines.push({
      key: "direction",
      label: "Direction",
      value: answer.direction === "need" ? "You need something" : "You are offering",
    });
  }
  if (answer.family) {
    lines.push({ key: "family", label: "Opportunity", value: FAMILY_LABEL[answer.family] });
  }
  if (answer.intent) {
    const position = positionOf(answer.intent);
    if (position) lines.push({ key: "position", label: "Position", value: position });
  }

  return lines;
}

/** The stored value, for the one line that is not shown to the member. */
export function storedIntentOf(intent: string | null | undefined): string | null {
  return MARKET_INTENTS.find((entry) => entry.key === intent)?.key ?? null;
}

/**
 * The same record, once a draft exists, and it is what every surface after
 * `B01` shows.
 *
 * `ADR-0032`: the member's own record is always visible and always growing. It
 * does not stop growing at the second screen, so this reads the draft rather
 * than the three answers `recordLines` was given before a draft existed.
 *
 * Still derived, still never accumulated. And the DIRECTION is derived from the
 * stored intent through `MARKET_INTENTS` rather than carried separately: the
 * member answered it on `B01`, it is not stored anywhere of its own, and a
 * second copy of it here would be a value that could disagree with the record.
 */
export function ledgerLines(input: {
  intent?: string | null;
  family?: MarketFamily | null;
  /** The declared capacity's own label, or null before `B01b` is answered. */
  capacity?: string | null;
  /** What the listing is FOR, in the member's words. Never case-folded. */
  subject?: string | null;
  hsCode?: string | null;
}): RecordLine[] {
  const entry = MARKET_INTENTS.find((candidate) => candidate.key === input.intent);
  const lines = recordLines({
    direction: entry ? (entry.side === "demand" ? "need" : "offer") : null,
    family: input.family ?? null,
    intent: input.intent ?? null,
  });

  if (input.subject) {
    lines.push({
      key: "subject",
      label: "Subject",
      // The HS code travels WITH the thing it classifies. It was once hung off
      // the quantity row and printed "On requestHS 271019": glued to a value,
      // and attached to the wrong fact.
      value: input.hsCode ? `${input.subject}, HS ${input.hsCode}` : input.subject,
    });
  }
  if (input.capacity) {
    lines.push({ key: "capacity", label: "Capacity", value: input.capacity });
  }

  return lines;
}
