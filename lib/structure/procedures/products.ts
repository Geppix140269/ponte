import { formatQuantity, validateQuantity, quantityToColumns } from "../../listings/quantity";
import { PRODUCT_SECTORS } from "../../taxonomy/market";
import type { StructureDraft, Intent } from "../draft";
import { has, draftQuantity, trimmed } from "./shared";
import type {
  Blocker,
  CompletionField,
  FactBuckets,
  FamilyProcedure,
  ReviewModel,
  ReviewSection,
  SubmissionReadiness,
} from "./types";

/**
 * The Products procedure: unchanged behaviour, moved behind the contract.
 *
 * This file is a REFACTOR, not a redesign. Every rule here is the rule the
 * shared composer already applied. The queue order, the one end of the route
 * a member actually decides, the quantity-basis test that treats "on request"
 * as a complete answer, the four blockers: all of them stand, because the
 * requirement is explicit that the Products journey is correct and must not
 * regress. What changed is
 * that these rules now apply to Products only, instead of to every family.
 *
 * The quantity fix is preserved exactly. There is no displayed default, "on
 * request" and "negotiable" are stated answers carrying no figure, and a
 * quantity is filled when its MODE is chosen and coherent rather than when a
 * number is present.
 */

const QUEUE: readonly CompletionField[] = [
  "quantity",
  "origin",
  "destination",
  "incoterm",
  "payment",
  "validity",
  "role",
  "note",
];

/**
 * Which end of the route this member actually decides.
 *
 * A seller knows where the goods ship FROM; where they end up is the buyer's
 * decision, and asking a seller for a destination invites an invented answer or
 * an unnecessary constraint on their own listing. A buyer is the mirror image.
 *
 * The field that is not asked is not a gap, is not a blocker and is not printed
 * as "not stated": it was never this member's fact to give.
 */
export function asksFor(intent: Intent | null, field: "origin" | "destination"): boolean {
  if (intent === "offer") return field === "origin";
  if (intent === "requirement") return field === "destination";
  return true; // service, or intent not yet chosen
}

function fields(draft: StructureDraft): readonly CompletionField[] {
  return QUEUE.filter((f) =>
    f === "origin" || f === "destination" ? asksFor(draft.intent, f) : true,
  );
}

function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  switch (field) {
    // A quantity is stated when its MODE is chosen and coherent. "On request"
    // and "negotiable" are complete answers that carry no number, so testing
    // for a number here would keep asking a member who has already answered.
    case "quantity": {
      const q = draftQuantity(draft);
      return q !== null && validateQuantity(q).length === 0;
    }
    case "origin": return has(draft.origin);
    case "destination": return has(draft.destination);
    case "incoterm": return has(draft.incoterm);
    case "payment": return has(draft.payment);
    case "validity": return has(draft.validity);
    case "role": return has(draft.role);
    case "note": return has(draft.note);
    default: return false;
  }
}

function routeValue(draft: StructureDraft): string | null {
  const from = trimmed(draft.origin);
  const to = trimmed(draft.destination);
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? null;
}

function validityValue(draft: StructureDraft): string | null {
  if (draft.validity === "standing") return "Open until withdrawn";
  if (typeof draft.validity === "number") return `${draft.validity} days`;
  return null;
}

export const productsProcedure: FamilyProcedure = {
  family: "products",

  completionFields: fields,

  openGaps(draft) {
    return fields(draft).filter((f) => !isFilled(draft, f));
  },

  isFilled,

  factBuckets(draft): FactBuckets {
    const commercial: string[] = [];
    if (has(draft.intent)) commercial.push("intent");
    if (has(draft.product)) commercial.push("product");
    if (has(draft.productSector)) commercial.push("sector");
    if (has(draft.hsCode)) commercial.push("hsCode");
    if (isFilled(draft, "quantity")) commercial.push("quantity");
    for (const f of ["frequency", "origin", "destination", "incoterm"] as const) {
      if (has(draft[f])) commercial.push(f);
    }

    // The decisive fields that, when open, are worth asking for. Not every open
    // field is a gap worth surfacing: a note never is, and the end of the route
    // this member does not decide never is.
    const missing = (["quantity", "origin", "destination", "incoterm", "payment", "validity", "role"] as const)
      .filter((f) => (f === "origin" || f === "destination" ? asksFor(draft.intent, f) : true))
      .filter((f) => !isFilled(draft, f));

    return {
      commercial,
      missing,
      // The legacy composer entrance can produce a `service` record with no
      // canonical family, and it really is a service: it is asked for authority
      // to provide one, not authority to buy or sell. Every canonical service
      // record follows the services procedure instead and never reaches here.
      evidence: draft.intent === "service" ? ["serviceAuthority"] : ["tradeAuthority"],
      keptPrivate: ["identity", "exactCompany"],
    };
  },

  blockers(draft): Blocker[] {
    const out: Blocker[] = [];
    if (!isFilled(draft, "quantity")) out.push({ key: "quantity", resolve: "complete", field: "quantity" });
    if (!has(draft.incoterm)) out.push({ key: "incoterm", resolve: "complete", field: "incoterm" });
    if (!has(draft.validity)) out.push({ key: "validity", resolve: "complete", field: "validity" });
    if (!has(draft.role)) out.push({ key: "role", resolve: "complete", field: "role" });
    // Publication always needs a current member-business verification.
    out.push({ key: "businessVerification", resolve: "verify" });
    return out;
  },

  reviewModel(draft): ReviewModel {
    const routeField: CompletionField = asksFor(draft.intent, "origin") ? "origin" : "destination";
    const sector = PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null;

    const product: ReviewSection = {
      key: "product",
      headingKey: "product",
      rows: [
        { key: "product", labelKey: "product", value: trimmed(draft.product) },
        ...(sector ? [{ key: "sector", labelKey: "sector", value: sector }] : []),
        // The HS code is a suggestion on this route, not a gate, so it is shown
        // where it exists and is not demanded where it does not.
        ...(draft.hsCode ? [{ key: "hsCode", labelKey: "hsCode", value: `HS ${draft.hsCode}` }] : []),
      ],
    };

    const terms: ReviewSection = {
      key: "terms",
      headingKey: "commercialTerms",
      rows: [
        { key: "quantity", labelKey: "quantity", value: formatQuantity(draftQuantity(draft)), editField: "quantity" },
        { key: "frequency", labelKey: "frequency", value: trimmed(draft.frequency), editField: "quantity" },
        { key: "route", labelKey: "route", value: routeValue(draft), editField: routeField },
        { key: "incoterm", labelKey: "incoterm", value: trimmed(draft.incoterm), editField: "incoterm" },
        { key: "validity", labelKey: "validity", value: validityValue(draft), editField: "validity" },
      ],
    };

    return {
      family: "products",
      titleKey: "titleProducts",
      publicSections: [product, terms],
      privateSections: [
        {
          key: "private",
          headingKey: null,
          rows: [
            { key: "payment", labelKey: "payment", value: trimmed(draft.payment), editField: "payment" },
            { key: "role", labelKey: "role", value: trimmed(draft.role), editField: "role" },
            { key: "note", labelKey: "note", value: trimmed(draft.note), editField: "note" },
          ],
        },
      ],
    };
  },

  submissionReadiness(draft): SubmissionReadiness {
    const blockers = productsProcedure.blockers(draft);
    return { ready: !blockers.some((b) => b.resolve === "complete"), blockers };
  },

  submitTerms(draft) {
    return {
      hs_code: draft.hsCode,
      ...quantityToColumns(draftQuantity(draft)),
      frequency: draft.frequency,
      origin: draft.origin,
      destination: draft.destination,
      incoterm: draft.incoterm,
      payment_terms: draft.payment,
    };
  },

  detailClauses(draft) {
    const out: string[] = [];
    const quantityText = formatQuantity(draftQuantity(draft));
    // The quantity is written with its MODE. "Approximately 2,500 MT" and
    // "2,500 MT" are different commercial claims, and dropping the qualifier
    // states a firmness the member did not offer.
    //
    // One clause, not two. The raw `quantity`/`unit`/`frequency` concatenation
    // that used to follow this is gone: a listing built through the composer
    // carried BOTH, so its stored `details` said "Quantity:" twice, once
    // formatted and once not. This is the survivor because it is the only one
    // that can express approximate, minimum, maximum, a range or "on request",
    // and `draftQuantity` reads a mode-less number as `exact` so the AI intake
    // route keeps its quantity.
    if (quantityText) out.push(`Quantity: ${quantityText}.`);
    // One end of the route is often the only end this member decides, so a
    // half-stated route is written as the half it is rather than padded with an
    // "unspecified" the reader could mistake for a fact.
    if (has(draft.origin) && has(draft.destination)) {
      out.push(`Route: ${draft.origin} to ${draft.destination}.`);
    } else if (has(draft.origin)) {
      out.push(`Ships from: ${draft.origin}.`);
    } else if (has(draft.destination)) {
      out.push(`Delivered to: ${draft.destination}.`);
    }
    if (has(draft.incoterm)) out.push(`Incoterm: ${draft.incoterm}.`);
    if (has(draft.payment)) out.push(`Payment terms: ${draft.payment}.`);
    return out;
  },
};
