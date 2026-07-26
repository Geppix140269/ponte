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

/**
 * What the member is doing. Two different actions were being collected by one
 * questionnaire, which asked a would-be supplier what it wanted Ponte to
 * establish: the wrong question, since a supplier is answering the signal, not
 * enquiring about it.
 *
 *   investigate  Ask the desk to establish something about the signal.
 *   capability   Declare what you can supply, or what you would buy.
 *
 * Both are requests from the REQUESTER about themselves, and neither reveals or
 * contacts the party behind the signal.
 */
export type RequestKind = "investigate" | "capability";

export const REQUEST_KINDS: readonly RequestKind[] = ["investigate", "capability"];

export function isRequestKind(v: unknown): v is RequestKind {
  return typeof v === "string" && (REQUEST_KINDS as readonly string[]).includes(v);
}

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

/**
 * The languages the desk can hold a call in. A closed list, because it is
 * asked for one reason: to put someone on the phone who can actually be
 * understood. "Other" is on it so nobody has to claim a language they do not
 * speak, and the desk knows to ask.
 */
export const CONTACT_LANGUAGES: readonly string[] = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "Italian",
  "German",
  "Arabic",
  "Russian",
  "Hindi",
  "Mandarin",
  "Turkish",
  "Other",
];

/** The persisted, cleaned shape. Type is validated; wants_intro is a boolean. */
export type InvestigationRequest = {
  request_kind: RequestKind;
  requesting_business: string;
  requester_type: RequesterType | null;
  /**
   * A number the desk can call. Required: an investigation is worked by a
   * person who needs to ask a question back, and an email round trip across
   * time zones is how a live requirement goes cold.
   */
  contact_phone: string;
  /** The language that call should be held in. */
  contact_language: string;
  /** The ask, on an investigation request. Empty on a capability declaration. */
  establish_goal: string;
  /** What they can supply or would buy. Empty on an investigation request. */
  capability: string;
  indicative: string;
  geography: string;
  evidence: string;
  wants_intro: boolean;
};

const CAP = {
  requesting_business: 160,
  contact_phone: 40,
  contact_language: 40,
  establish_goal: 600,
  capability: 600,
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
  const kind = o.request_kind ?? o.kind;
  return {
    // An unknown or absent kind is an investigation request: the older shape,
    // and the one that asks the desk for nothing it would not already do.
    request_kind: isRequestKind(kind) ? kind : "investigate",
    requesting_business: clean(o.requesting_business ?? o.business, CAP.requesting_business),
    requester_type: isRequesterType(type) ? type : null,
    contact_phone: clean(o.contact_phone ?? o.phone, CAP.contact_phone),
    // An unrecognised language is dropped rather than stored: the list exists
    // so the desk can staff the call, and a value off it staffs nothing.
    contact_language: CONTACT_LANGUAGES.includes(clean(o.contact_language, CAP.contact_language))
      ? clean(o.contact_language, CAP.contact_language)
      : "",
    establish_goal: clean(o.establish_goal ?? o.goal, CAP.establish_goal),
    capability: clean(o.capability, CAP.capability),
    indicative: clean(o.indicative, CAP.indicative),
    geography: clean(o.geography, CAP.geography),
    evidence: clean(o.evidence, CAP.evidence),
    wants_intro: toBool(o.wants_intro ?? o.intro),
  };
}

/**
 * The minimum the brief requires before a request may be submitted. Three facts
 * are load-bearing whatever the member is doing: who is asking (requesting
 * business), what they are to the signal (requester type), and a number the
 * desk can call, because the desk works these by asking questions back and an
 * email round trip across time zones is how a live requirement goes cold. The
 * fourth is the substance, and it differs by kind: an investigation must say what Ponte is to
 * establish, a capability declaration must say what can be supplied or bought.
 * Geography, indicative volume, evidence and the introduction wish are captured
 * and stored, but a request missing one of those is still meaningful to the
 * desk; a request with no business, no standing and no substance is not.
 */
export function missingInvestigationFields(r: InvestigationRequest): string[] {
  const missing: string[] = [];
  if (!r.requesting_business) missing.push("requesting_business");
  if (!r.requester_type) missing.push("requester_type");
  if (!r.contact_phone) missing.push("contact_phone");
  if (r.request_kind === "capability") {
    if (!r.capability) missing.push("capability");
  } else if (!r.establish_goal) {
    missing.push("establish_goal");
  }
  return missing;
}

export function investigationIsComplete(r: InvestigationRequest): boolean {
  return missingInvestigationFields(r).length === 0;
}
