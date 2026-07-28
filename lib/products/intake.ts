/**
 * The product intake session: one pure reducer over every state the journey has.
 *
 * ## Why a reducer rather than a dozen `useState` calls
 *
 * Issue #67 lists eighteen states that must exist and be demonstrated. Held as
 * loose component state they are not states at all, they are combinations of
 * booleans, and "demonstrate the ambiguous state" becomes an argument about
 * which combination counts. Held here they are values: a test constructs one,
 * an evidence run renders one, and a state nobody can reach is a test failure
 * rather than a gap discovered in review.
 *
 * It is also what makes resume across authentication a serialisation problem
 * instead of a redesign. `serialise` and `rehydrate` are eight lines because
 * the whole session is one plain value.
 *
 * ## No database, no Next, no React
 *
 * Same rule as `lib/structure/draft.ts`, and for the same reason: the rules of
 * the journey are testable standalone under tsx, and the component below them
 * only renders.
 */

import type { DocumentExtraction } from "./extract-document";
// From `terms`, not `extract-document`: this module runs in the browser, and
// the extraction reaches the model through `lib/ai.ts`, which reaches Supabase.
import { emptyTerms, TERM_KEYS, TERM_LABELS, type CommercialTerms } from "./terms";
import { productByKey, sectorLabel } from "./catalogue";
import {
  confirmed as confirmedValue,
  resolveFrom,
  type ProductAttribute,
  type ProductCandidate,
  type ResolutionOutcome,
  type ResolvedProduct,
  type SourcedValue,
} from "./model";

/** The two product intents. Language differs; the mechanism does not. */
export type ProductIntent = "offer_product" | "source_product";

/** The three intake methods, in the order the decision record fixes them. */
export type IntakeMethod = "describe" | "upload" | "browse";

export const INTAKE_METHODS: readonly IntakeMethod[] = ["describe", "upload", "browse"];

/**
 * What the member does with a document that named several products.
 *
 * `separate` is the recommendation, because each product has its own buyers,
 * specification, classification and search demand. `programme` exists because a
 * combined supply programme is a real commercial instrument and refusing to
 * express one would be Ponte deciding a commercial question for the member.
 */
export type MultiProductPlan = "separate" | "programme";

export type IntakeStage =
  /** Nothing chosen. Three methods offered, no percentage shown. */
  | { kind: "initial" }
  /** The member is writing. Their words, echoed as given. */
  | { kind: "typing"; wording: string }
  /** Dictation is running. Same field, same words, different input. */
  | { kind: "voice"; wording: string; error: string | null }
  /** Work is happening now. `what` says which work, in the member's words. */
  | { kind: "analysing"; method: IntakeMethod; what: string }
  /** One clear product. */
  | { kind: "resolved"; outcome: Extract<ResolutionOutcome, { kind: "resolved" }> }
  /** Several ranked, with a leader. */
  | { kind: "candidates"; outcome: Extract<ResolutionOutcome, { kind: "candidates" }> }
  /** Several plausible, no leader. A question, never a guess. */
  | { kind: "ambiguous"; outcome: Extract<ResolutionOutcome, { kind: "ambiguous" }> }
  /** Nothing matched. The words and what was tried, never a blank screen. */
  | { kind: "unmatched"; wording: string; tried: readonly string[] }
  /** The HS category drill-down, unchanged from what it always was. */
  | { kind: "browse" }
  /** A document read, one product. */
  | { kind: "extracted"; extraction: DocumentExtraction }
  /** A document read, several products. The member chooses how to proceed. */
  | { kind: "multiProduct"; extraction: DocumentExtraction; plan: MultiProductPlan | null }
  /** The file arrived but could not be read. */
  | { kind: "extractionFailed"; filename: string; reason: string }
  /** The file did not arrive. */
  | { kind: "uploadFailed"; filename: string; reason: string }
  /** A format Ponte cannot read, named. */
  | { kind: "blocked"; filename: string; format: string; reason: string }
  /** The trust boundary. Nothing has been created yet. */
  | { kind: "review"; review: ReviewState }
  /** The member accepted the review. Still nothing published. */
  | { kind: "confirmed"; review: ReviewState }
  /** A draft exists. */
  | { kind: "draftCreated"; review: ReviewState; ref: string }
  /** The journey's end. */
  | { kind: "completed"; ref: string };

/** One product on the review screen. */
export interface ReviewProduct {
  /** Stable within the review. The catalogue key, or an unresolved marker. */
  id: string;
  product: ResolvedProduct;
  /**
   * Attributes the DOCUMENT states, as opposed to the ones on
   * `product.attributes`, which are Ponte's own product record.
   *
   * Two lists rather than one because the review screen's whole job is saying
   * where a fact came from. Merging them printed "Extracted from document"
   * beside a sulphur content that came out of the catalogue, which is a false
   * provenance claim on the one screen that must not make any.
   */
  documentAttributes: readonly ProductAttribute[];
  /** The product's own overriding terms, where a document stated any. */
  terms: CommercialTerms;
  /** True when the member chose to carry this product into a draft. */
  included: boolean;
}

export interface ReviewState {
  products: ReviewProduct[];
  /** Terms that apply across every product. */
  shared: CommercialTerms;
  /** How a multi-product document becomes drafts. Null for a single product. */
  plan: MultiProductPlan | null;
  /** Term keys the member changed. Rendered as confirmed by member. */
  edited: string[];
  /** The document behind this review, by name. Bytes are never carried. */
  document: { filename: string } | null;
}

export interface IntakeSession {
  intent: ProductIntent;
  method: IntakeMethod | null;
  stage: IntakeStage;
  /** Set when authentication interrupted the session. */
  interrupted: boolean;
  /** True when this session was restored from a previous visit. */
  resumed: boolean;
  /** The uploaded document, by name and size. The bytes are never stored. */
  document: { filename: string; bytes: number } | null;
}

export function newSession(intent: ProductIntent): IntakeSession {
  return { intent, method: null, stage: { kind: "initial" }, interrupted: false, resumed: false, document: null };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type IntakeAction =
  | { type: "chooseMethod"; method: IntakeMethod }
  | { type: "type"; wording: string }
  | { type: "voiceStart" }
  | { type: "voiceResult"; wording: string }
  | { type: "voiceError"; reason: string }
  | { type: "analyse"; method: IntakeMethod; what: string }
  | { type: "resolution"; outcome: ResolutionOutcome }
  | { type: "uploadFailed"; filename: string; reason: string }
  | { type: "blocked"; filename: string; format: string; reason: string }
  | { type: "extractionFailed"; filename: string; reason: string }
  | { type: "documentChosen"; filename: string; bytes: number }
  | { type: "extraction"; extraction: DocumentExtraction }
  | { type: "choosePlan"; plan: MultiProductPlan }
  | { type: "chooseCandidate"; productKey: string }
  /** Move an extraction into the review. Separate from choosing a candidate. */
  | { type: "openReview" }
  /** Replace the session wholesale, on resume. */
  | { type: "restore"; session: IntakeSession }
  | { type: "toggleProduct"; id: string }
  | { type: "editTerm"; scope: "shared" | string; key: keyof CommercialTerms; value: string }
  | { type: "confirm" }
  | { type: "draftCreated"; ref: string }
  | { type: "complete" }
  | { type: "interrupt" }
  | { type: "restart" };

/** The wording currently in the description field, whatever stage carries it. */
export function wordingOf(stage: IntakeStage): string {
  if (stage.kind === "typing" || stage.kind === "voice") return stage.wording;
  if (stage.kind === "resolved" || stage.kind === "candidates" || stage.kind === "ambiguous") {
    return stage.outcome.wording;
  }
  if (stage.kind === "unmatched") return stage.wording;
  return "";
}

/** Build the review a single confirmed candidate produces. */
function reviewForCandidate(
  candidate: ProductCandidate,
  wording: string,
  document: { filename: string } | null,
  shared: CommercialTerms,
  productTerms: CommercialTerms,
): ReviewState {
  const resolved = resolveFrom(candidate, wording, sectorLabel(candidate.product.sector));
  return {
    products: [
      { id: candidate.product.key, product: resolved, documentAttributes: [], terms: productTerms, included: true },
    ],
    shared,
    plan: null,
    edited: [],
    document,
  };
}

/** Merge a partial set of product-specific terms onto a full empty set. */
function termsFrom(partial: Partial<CommercialTerms>): CommercialTerms {
  const out = emptyTerms();
  for (const key of TERM_KEYS) {
    const value = partial[key];
    if (value) out[key] = value;
  }
  return out;
}

/** The review an extraction produces, with every product carried separately. */
export function reviewForExtraction(extraction: DocumentExtraction, plan: MultiProductPlan | null): ReviewState {
  const products: ReviewProduct[] = extraction.products.map((entry, index) => {
    const top =
      entry.resolution.kind === "none" ? null : entry.resolution.candidates[0] ?? null;
    const known = top ? top.product : null;
    const id = known ? known.key : `unresolved-${index}`;
    const resolved: ResolvedProduct = known
      ? resolveFrom(top!, entry.wording, sectorLabel(known.sector), "extracted")
      : {
          // A product the catalogue does not hold is still a product the
          // document names. It arrives unresolved rather than being dropped,
          // and the review screen shows it as unresolved so the member decides.
          originalWording: entry.wording,
          normalised: entry.wording,
          productKey: id,
          synonyms: [],
          categoryPath: ["Products"],
          attributes: entry.attributes,
          candidateHs: null,
          searchText: entry.wording,
          searchTerms: entry.wording.toLowerCase().split(/\s+/).filter(Boolean),
          provenance: "extracted",
        };
    return {
      id,
      product: resolved,
      documentAttributes: entry.documentAttributes,
      terms: termsFrom(entry.specificTerms),
      included: true,
    };
  });

  return {
    products,
    shared: extraction.shared,
    plan,
    edited: [],
    document: { filename: extraction.filename },
  };
}

// ---------------------------------------------------------------------------
// The reducer
// ---------------------------------------------------------------------------

export function intakeReducer(session: IntakeSession, action: IntakeAction): IntakeSession {
  switch (action.type) {
    case "chooseMethod":
      return {
        ...session,
        method: action.method,
        stage:
          action.method === "describe"
            ? { kind: "typing", wording: wordingOf(session.stage) }
            : action.method === "browse"
              ? { kind: "browse" }
              : { kind: "initial" },
      };

    case "type":
      return { ...session, method: "describe", stage: { kind: "typing", wording: action.wording } };

    case "voiceStart":
      return { ...session, method: "describe", stage: { kind: "voice", wording: wordingOf(session.stage), error: null } };

    case "voiceResult":
      // Dictation lands in the same field as typing, editable. It is an assist
      // inside the journey, not a separate path, which is the North Star's own
      // distinction in section 5.3.
      return { ...session, method: "describe", stage: { kind: "typing", wording: action.wording } };

    case "voiceError":
      return { ...session, stage: { kind: "voice", wording: wordingOf(session.stage), error: action.reason } };

    case "analyse":
      return { ...session, method: action.method, stage: { kind: "analysing", method: action.method, what: action.what } };

    case "resolution": {
      const o = action.outcome;
      if (o.kind === "none") return { ...session, stage: { kind: "unmatched", wording: o.wording, tried: o.tried } };
      if (o.kind === "resolved") return { ...session, stage: { kind: "resolved", outcome: o } };
      if (o.kind === "candidates") return { ...session, stage: { kind: "candidates", outcome: o } };
      return { ...session, stage: { kind: "ambiguous", outcome: o } };
    }

    case "documentChosen":
      return {
        ...session,
        method: "upload",
        document: { filename: action.filename, bytes: action.bytes },
        stage: { kind: "analysing", method: "upload", what: action.filename },
      };

    case "uploadFailed":
      return { ...session, stage: { kind: "uploadFailed", filename: action.filename, reason: action.reason } };

    case "blocked":
      return {
        ...session,
        stage: { kind: "blocked", filename: action.filename, format: action.format, reason: action.reason },
      };

    case "extractionFailed":
      return { ...session, stage: { kind: "extractionFailed", filename: action.filename, reason: action.reason } };

    case "extraction": {
      const many = action.extraction.products.length > 1;
      if (action.extraction.products.length === 0) {
        // A document Ponte read but recognised nothing in. Not a failure of the
        // upload, and not a blank screen either: it becomes an unmatched state
        // carrying the filename, and the other two methods stay offered.
        return {
          ...session,
          stage: { kind: "unmatched", wording: action.extraction.filename, tried: [] },
        };
      }
      return many
        ? { ...session, stage: { kind: "multiProduct", extraction: action.extraction, plan: null } }
        : { ...session, stage: { kind: "extracted", extraction: action.extraction } };
    }

    case "choosePlan": {
      if (session.stage.kind !== "multiProduct") return session;
      return { ...session, stage: { ...session.stage, plan: action.plan } };
    }

    case "chooseCandidate": {
      const stage = session.stage;
      if (stage.kind === "resolved" || stage.kind === "candidates" || stage.kind === "ambiguous") {
        const candidate = stage.outcome.candidates.find((c) => c.product.key === action.productKey);
        if (!candidate) return session;
        return {
          ...session,
          stage: {
            kind: "review",
            review: reviewForCandidate(candidate, stage.outcome.wording, null, emptyTerms(), emptyTerms()),
          },
        };
      }
      return session;
    }

    case "openReview": {
      const stage = session.stage;
      if (stage.kind === "extracted") {
        return { ...session, stage: { kind: "review", review: reviewForExtraction(stage.extraction, null) } };
      }
      // A multi-product document does not reach review until the member has
      // said how the products become drafts. Ponte recommends; it does not
      // decide, and an unanswered plan is not a default.
      if (stage.kind === "multiProduct" && stage.plan) {
        return { ...session, stage: { kind: "review", review: reviewForExtraction(stage.extraction, stage.plan) } };
      }
      return session;
    }

    case "restore":
      return action.session;

    case "toggleProduct": {
      if (session.stage.kind !== "review") return session;
      const review = session.stage.review;
      return {
        ...session,
        stage: {
          kind: "review",
          review: {
            ...review,
            products: review.products.map((p) => (p.id === action.id ? { ...p, included: !p.included } : p)),
          },
        },
      };
    }

    case "editTerm": {
      if (session.stage.kind !== "review") return session;
      const review = session.stage.review;
      const value: SourcedValue = action.value.trim()
        ? confirmedValue(action.value.trim())
        : { value: null, provenance: "missing", quote: null };
      const marker = `${action.scope}:${action.key}`;
      const edited = review.edited.includes(marker) ? review.edited : [...review.edited, marker];

      if (action.scope === "shared") {
        return {
          ...session,
          stage: { kind: "review", review: { ...review, shared: { ...review.shared, [action.key]: value }, edited } },
        };
      }
      return {
        ...session,
        stage: {
          kind: "review",
          review: {
            ...review,
            products: review.products.map((p) =>
              p.id === action.scope ? { ...p, terms: { ...p.terms, [action.key]: value } } : p,
            ),
            edited,
          },
        },
      };
    }

    case "confirm":
      if (session.stage.kind !== "review") return session;
      return { ...session, stage: { kind: "confirmed", review: session.stage.review } };

    case "draftCreated":
      if (session.stage.kind !== "confirmed") return session;
      return { ...session, stage: { kind: "draftCreated", review: session.stage.review, ref: action.ref } };

    case "complete":
      if (session.stage.kind !== "draftCreated") return session;
      return { ...session, stage: { kind: "completed", ref: session.stage.ref } };

    case "interrupt":
      // The stage is untouched on purpose. Authentication must give the member
      // their work back, not restart it, so the interruption is a flag over the
      // session rather than a state the session moves into.
      return { ...session, interrupted: true };

    case "restart":
      return { ...newSession(session.intent), resumed: session.resumed };
  }
}

// ---------------------------------------------------------------------------
// Resume across authentication
// ---------------------------------------------------------------------------

/** Bumped when the shape changes, so an old session is discarded, not misread. */
export const SESSION_VERSION = 1;

export function sessionKey(intent: ProductIntent): string {
  return `ponte.product-intake.v${SESSION_VERSION}.${intent}`;
}

export function serialise(session: IntakeSession): string {
  return JSON.stringify({ v: SESSION_VERSION, session });
}

/**
 * Restore a serialised session, or null.
 *
 * Returns null rather than throwing on anything unexpected. A member returning
 * from the account gate must never meet an error because a stored value from an
 * older build no longer parses; they meet a fresh intake, which is worse than a
 * resume and far better than a crash.
 */
export function rehydrate(raw: string | null): IntakeSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; session?: IntakeSession };
    if (parsed?.v !== SESSION_VERSION || !parsed.session?.stage?.kind) return null;
    return { ...parsed.session, resumed: true, interrupted: false };
  } catch {
    return null;
  }
}

/** One line naming what a resume restored, so the member is told rather than guessing. */
export function resumeSummary(session: IntakeSession): string {
  const stage = session.stage;
  if (session.document) return `your uploaded document, ${session.document.filename}`;
  if (stage.kind === "review" || stage.kind === "confirmed") {
    const n = stage.review.products.length;
    return n === 1 ? "your product and its terms" : `your ${n} products and their terms`;
  }
  const wording = wordingOf(stage);
  if (wording) return `your description, "${wording}"`;
  return "where you had reached";
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * The weighted steps of the intake, for `lib/ponte/progress.ts`.
 *
 * Deliberately irregular and summing to exactly 100, as Constitution section 9
 * requires. The weights say what the journey believes: naming the product is
 * the largest single act, confirming the review is the second, and creating the
 * draft is the smallest because by then every decision is already made.
 */
export const INTAKE_STEPS = [
  { id: "method", weight: 12 },
  { id: "described", weight: 18 },
  { id: "identified", weight: 31 },
  { id: "reviewed", weight: 24 },
  { id: "confirmed", weight: 9 },
  { id: "drafted", weight: 6 },
] as const;

/** Which steps a session has completed. Pure, and the same for the same stage. */
export function completedSteps(session: IntakeSession): string[] {
  const done: string[] = [];
  if (session.method) done.push("method");
  const stage = session.stage;
  const described =
    wordingOf(stage).length > 0 ||
    stage.kind === "extracted" ||
    stage.kind === "multiProduct" ||
    stage.kind === "review" ||
    stage.kind === "confirmed" ||
    stage.kind === "draftCreated" ||
    stage.kind === "completed";
  if (described) done.push("described");
  if (["resolved", "candidates", "extracted", "multiProduct", "review", "confirmed", "draftCreated", "completed"].includes(stage.kind)) {
    done.push("identified");
  }
  if (["review", "confirmed", "draftCreated", "completed"].includes(stage.kind)) done.push("reviewed");
  if (["confirmed", "draftCreated", "completed"].includes(stage.kind)) done.push("confirmed");
  if (["draftCreated", "completed"].includes(stage.kind)) done.push("drafted");
  return done;
}

/** The terms still unanswered on a review, for the incomplete state. */
export function incompleteTerms(review: ReviewState): { key: keyof CommercialTerms; label: string }[] {
  return TERM_KEYS.filter((key) => review.shared[key].provenance === "missing").map((key) => ({
    key,
    label: TERM_LABELS[key],
  }));
}

/** True when a product resolved but decisive commercial terms are still open. */
export function isIncomplete(review: ReviewState): boolean {
  const decisive: (keyof CommercialTerms)[] = ["quantity", "incoterm", "destination", "origin"];
  return decisive.some((key) => review.shared[key].provenance === "missing");
}

export { productByKey };
