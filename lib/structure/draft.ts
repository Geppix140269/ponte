/**
 * The Structure & Submit draft: the model a visitor builds by tapping, and the
 * pure rules over it. No database, no Next, no server imports, so the whole
 * thing is unit-tested standalone under tsx.
 *
 * Three rules from the brief live here:
 *   - Tap, not type. The commercial record is built from selectable values; the
 *     ONLY free text is the optional paste and the optional note. `details` (the
 *     one field the submit API requires as text) is SYNTHESISED from the facts,
 *     so no step ever requires typing to proceed. synthesiseDetails is the proof.
 *   - Nothing invented. A fact absent from the draft stays absent everywhere:
 *     the buckets show it as a gap, the preview renders it "not stated", and the
 *     synthesised details omit it. Nothing is guessed to fill a hole.
 *   - Value before authentication. This is plain client state; it becomes a
 *     submit payload only at the gate, and the gate resumes it once.
 */

export type Intent = "offer" | "requirement" | "service";

export const INTENTS: readonly Intent[] = ["offer", "requirement", "service"];

export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v);
}

/** The whole tapped record. Every commercial field is a selected value. */
export type StructureDraft = {
  intent: Intent | null;
  product: string | null;
  hsCode: string | null;
  quantity: number | null;
  unit: string | null;
  frequency: string | null;
  origin: string | null;
  destination: string | null;
  incoterm: string | null;
  payment: string | null;
  /** Validity as a day count from a pill (7/30/60/90); a date is derived at submit. */
  validityDays: number | null;
  role: string | null;
  /** The one optional free-text note. */
  note: string | null;
};

export function emptyDraft(): StructureDraft {
  return {
    intent: null, product: null, hsCode: null, quantity: null, unit: null,
    frequency: null, origin: null, destination: null, incoterm: null,
    payment: null, validityDays: null, role: null, note: null,
  };
}

const has = (v: unknown): boolean => v !== null && v !== undefined && String(v).trim() !== "";

/**
 * The order Ponte asks for the still-open facts, one at a time (S03). Only the
 * unfilled ones are asked; each is skippable. `note` is always last and always
 * optional.
 */
export const COMPLETION_QUEUE = [
  "quantity", "origin", "destination", "incoterm", "payment", "validity", "role", "note",
] as const;
export type CompletionField = (typeof COMPLETION_QUEUE)[number];

function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  switch (field) {
    case "quantity": return has(draft.quantity);
    case "origin": return has(draft.origin);
    case "destination": return has(draft.destination);
    case "incoterm": return has(draft.incoterm);
    case "payment": return has(draft.payment);
    case "validity": return has(draft.validityDays);
    case "role": return has(draft.role);
    case "note": return has(draft.note);
  }
}

/** The still-open completion steps, in order. `note` appears only if unfilled. */
export function openGaps(draft: StructureDraft): CompletionField[] {
  return COMPLETION_QUEUE.filter((f) => !isFilled(draft, f));
}

/** The four honest buckets for S02. Values are field keys; the UI supplies copy. */
export type FactBuckets = {
  /** Facts Ponte can already state. */
  commercial: string[];
  /** Decisive facts still open (the dashed "Add" chips). */
  missing: string[];
  /** Evidence or authority a reviewer will need. */
  evidence: string[];
  /** What is kept private (never public). */
  keptPrivate: string[];
};

export function bucketize(draft: StructureDraft): FactBuckets {
  const commercial: string[] = [];
  if (has(draft.intent)) commercial.push("intent");
  if (has(draft.product)) commercial.push("product");
  if (has(draft.hsCode)) commercial.push("hsCode");
  for (const f of ["quantity", "frequency", "origin", "destination", "incoterm"] as const) {
    if (has(draft[f])) commercial.push(f);
  }

  // The decisive fields that, when open, are worth asking for. Not every open
  // field is a gap worth surfacing (a note never is); these are the ones a
  // reviewer needs to see resolved.
  const missing = (["quantity", "origin", "destination", "incoterm", "payment", "validity", "role"] as const)
    .filter((f) => !isFilled(draft, f));

  // Evidence is authority to act, deferred to review (never uploaded pre-account).
  const evidence = draft.intent === "service" ? ["serviceAuthority"] : ["tradeAuthority"];

  // Always private: who you are, and your exact company, until an introduction.
  const keptPrivate = ["identity", "exactCompany"];

  return { commercial, missing, evidence, keptPrivate };
}

/** A thing that must resolve before Ponte can publish (S05). */
export type Blocker = {
  key: string;
  /** Where the member resolves it, when it is a member action. */
  resolve?: "complete" | "verify";
};

/**
 * What still stands between this draft and publication. Fact gaps the member
 * can close in the composer, plus business verification, which is resolved at
 * /verify and always applies until it is done. Submitting for review is always
 * allowed regardless: these inform, they do not block the submit button.
 */
export function blockers(draft: StructureDraft): Blocker[] {
  const out: Blocker[] = [];
  if (!has(draft.quantity)) out.push({ key: "quantity", resolve: "complete" });
  if (!has(draft.incoterm)) out.push({ key: "incoterm", resolve: "complete" });
  if (!has(draft.validityDays)) out.push({ key: "validity", resolve: "complete" });
  if (!has(draft.role)) out.push({ key: "role", resolve: "complete" });
  // Publication always needs a current member-business verification.
  out.push({ key: "businessVerification", resolve: "verify" });
  return out;
}

/** A stable label for an intent used in the synthesised details. */
function intentClause(intent: Intent | null, product: string): string {
  if (intent === "offer") return `Supplier offer for ${product}.`;
  if (intent === "service") return `Trade service offered relating to ${product}.`;
  return `Buyer requirement for ${product}.`; // requirement or unknown
}

/**
 * Compose the human-readable `details` the submit API requires FROM the tapped
 * facts, so a member never has to type to submit. Only present facts appear;
 * nothing is invented. Always non-empty as long as a product is set (which S01
 * guarantees before this is ever called). The optional note is appended as the
 * member's own words when given.
 */
export function synthesiseDetails(draft: StructureDraft): string {
  const product = (draft.product ?? "").trim();
  const parts: string[] = [intentClause(draft.intent, product || "the stated product")];

  if (has(draft.quantity)) {
    const q = `Quantity: ${draft.quantity}${draft.unit ? ` ${draft.unit}` : ""}` +
      (draft.frequency ? ` (${draft.frequency})` : "") + ".";
    parts.push(q);
  }
  if (has(draft.origin) || has(draft.destination)) {
    const from = draft.origin ?? "unspecified origin";
    const to = draft.destination ?? "unspecified destination";
    parts.push(`Route: ${from} to ${to}.`);
  }
  if (has(draft.incoterm)) parts.push(`Incoterm: ${draft.incoterm}.`);
  if (has(draft.payment)) parts.push(`Payment terms: ${draft.payment}.`);
  if (has(draft.validityDays)) parts.push(`Valid for ${draft.validityDays} days.`);
  if (has(draft.role)) parts.push(`Stated role: ${draft.role}.`);
  if (has(draft.note)) parts.push(draft.note!.trim());

  return parts.join(" ");
}

const DAY_MS = 86_400_000;

/**
 * The request body for POST /api/marketplace/submit. Maps the tapped draft onto
 * the columns the route already reads, converts the validity pill to a
 * dated horizon, and carries the synthesised details. `nowIso` is injected so
 * the derived date is deterministic in tests.
 */
export function toSubmitPayload(
  draft: StructureDraft,
  opts: { draft: boolean; nowIso: string },
): Record<string, unknown> {
  const validUntil =
    draft.validityDays && draft.validityDays > 0
      ? new Date(Date.parse(opts.nowIso) + draft.validityDays * DAY_MS).toISOString().slice(0, 10)
      : null;

  return {
    type: draft.intent,
    product: draft.product,
    hs_code: draft.hsCode,
    quantity: draft.quantity,
    unit: draft.unit,
    frequency: draft.frequency,
    origin: draft.origin,
    destination: draft.destination,
    incoterm: draft.incoterm,
    payment_terms: draft.payment,
    submitter_role: draft.role,
    validity_type: validUntil ? "dated" : null,
    valid_until: validUntil,
    key_notes: draft.note,
    details: synthesiseDetails(draft),
    draft: opts.draft,
  };
}
