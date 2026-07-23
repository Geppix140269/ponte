/**
 * The structured "Ask Ponte to investigate" request on a Market Signal (brief
 * Block D). Pure logic: the field set, the closed requester-type vocabulary,
 * the normaliser and the completeness rule. No database, no Next, no server
 * imports, so the unit test runs standalone under tsx.
 *
 * A hard rule this module encodes by omission: nothing here names, references
 * or captures the third party behind the signal. The request is about the
 * REQUESTER and what they want Ponte to establish. A signal investigation that
 * revealed or contacted the underlying party is exactly what the brief forbids,
 * and the shape below makes it structurally impossible to record one.
 */

/** Who the requester is, relative to the signal. A closed set (brief Block D). */
export type RequesterType = "supplier" | "buyer" | "intermediary" | "adviser";

export const REQUESTER_TYPES: readonly RequesterType[] = [
  "supplier",
  "buyer",
  "intermediary",
  "adviser",
];

/** English labels for the new chrome. Block E migrates these to messages. */
export const REQUESTER_TYPE_LABELS: Record<RequesterType, string> = {
  supplier: "Potential supplier",
  buyer: "Potential buyer",
  intermediary: "Intermediary",
  adviser: "Adviser",
};

export function isRequesterType(v: unknown): v is RequesterType {
  return typeof v === "string" && (REQUESTER_TYPES as readonly string[]).includes(v);
}

/** The persisted, cleaned shape. Type is validated; wants_intro is a boolean. */
export type InvestigationRequest = {
  requesting_business: string;
  requester_type: RequesterType | null;
  establish_goal: string;
  indicative: string;
  geography: string;
  evidence: string;
  wants_intro: boolean;
};

const CAP = {
  requesting_business: 160,
  establish_goal: 600,
  indicative: 300,
  geography: 160,
  evidence: 400,
} as const;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** A checkbox may arrive as boolean true, "true" or "on". Anything else false. */
function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

/**
 * Normalise a raw request body into the stored shape. Unknown requester types
 * become null (the completeness check then rejects the request).
 */
export function cleanInvestigation(input: unknown): InvestigationRequest {
  const o = (input ?? {}) as Record<string, unknown>;
  const type = o.requester_type ?? o.type;
  return {
    requesting_business: clean(o.requesting_business ?? o.business, CAP.requesting_business),
    requester_type: isRequesterType(type) ? type : null,
    establish_goal: clean(o.establish_goal ?? o.goal, CAP.establish_goal),
    indicative: clean(o.indicative, CAP.indicative),
    geography: clean(o.geography, CAP.geography),
    evidence: clean(o.evidence, CAP.evidence),
    wants_intro: toBool(o.wants_intro ?? o.intro),
  };
}

/**
 * The minimum the brief requires before an investigation request may be
 * submitted. The three load-bearing facts are who is asking (requesting
 * business), what they are to the signal (requester type) and what they want
 * Ponte to establish. Geography, indicative volume, evidence and the
 * introduction wish are captured by the form and stored, but a request missing
 * one of those is still meaningful to the desk; a request with no business, no
 * standing and no ask is not.
 */
export function missingInvestigationFields(r: InvestigationRequest): string[] {
  const missing: string[] = [];
  if (!r.requesting_business) missing.push("requesting_business");
  if (!r.requester_type) missing.push("requester_type");
  if (!r.establish_goal) missing.push("establish_goal");
  return missing;
}

export function investigationIsComplete(r: InvestigationRequest): boolean {
  return missingInvestigationFields(r).length === 0;
}
