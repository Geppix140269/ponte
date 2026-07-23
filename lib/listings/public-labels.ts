// The public trust labels on an opportunity, and the rule that every one of
// them corresponds to stored data (brief 5.1).
//
// There is one ambiguous `verified` label the brief forbids. Instead a public
// page shows separate, literal facts, and each is shown only when the stored
// record actually supports it:
//
//   Business checked      the submitter has a bound member-business verification
//   Role declared         a submitter role is recorded
//   Authority sighted     ONLY when the desk actually sighted evidence
//   Opportunity reviewed  the desk approved it (desk-approved public text exists)
//   Last confirmed [date] a reconfirmation (or decision) date is on record
//
// "Ponte-managed" is deliberately absent: it may be shown only under a current
// written Desk engagement, which has no data model yet, so it is never emitted
// here rather than being emitted untruthfully.
//
// Pure and import-free so the rule can be tested directly.

export type LabelInput = {
  /** The submitter has a bound, current member-business verification. */
  businessVerified: boolean;
  /** The submitter's declared role, as stored. */
  submitterRole: string | null | undefined;
  /** True only when the desk marked authority/mandate evidence sighted. */
  mandateSighted: boolean;
  /** The desk approved the opportunity (public text was written). */
  reviewed: boolean;
  /** Reconfirmation or decision timestamp, ISO, or null. */
  lastConfirmed: string | null | undefined;
};

export type PublicLabelKey =
  | "businessChecked"
  | "roleDeclared"
  | "authoritySighted"
  | "opportunityReviewed"
  | "lastConfirmed";

export type PublicLabel = { key: PublicLabelKey; date?: string };

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

/**
 * The labels that may truthfully be shown for a listing. Order is stable and
 * reads from most to least fundamental. Nothing is emitted that the input does
 * not support.
 */
export function truthfulLabels(input: LabelInput): PublicLabel[] {
  const out: PublicLabel[] = [];
  if (input.businessVerified) out.push({ key: "businessChecked" });
  if (has(input.submitterRole)) out.push({ key: "roleDeclared" });
  if (input.mandateSighted) out.push({ key: "authoritySighted" });
  if (input.reviewed) out.push({ key: "opportunityReviewed" });
  if (has(input.lastConfirmed)) {
    out.push({ key: "lastConfirmed", date: String(input.lastConfirmed) });
  }
  return out;
}
