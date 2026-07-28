/**
 * Document to deal: reading a real trade document into structured, sourced facts.
 *
 * ## The division of labour, and why it is where it is
 *
 * Identifying the products is deterministic (`./scan.ts`). Reading the
 * commercial terms is not: "30 percent payable within 5 banking days of
 * agreement signing, vessel nomination and laycan confirmation" is prose that
 * needs comprehension, and no synonym index reads it. So the model does the
 * terms, the catalogue does the products, and the products the model reports are
 * folded in beside the scan's rather than replacing them.
 *
 * That split is what makes acceptance criterion 7 testable: the fixture yields
 * three products with no network call at all.
 *
 * ## The rule that stops invention
 *
 * Every extracted term must arrive with the verbatim words it came from. A term
 * with no quote is DROPPED by `parseExtraction`, not merely marked
 * low-confidence. The decision record says AI must not "invent missing
 * commercial terms", and a prompt asking it not to is a request; discarding
 * anything it cannot point at in the document is enforcement.
 *
 * A dropped term does not vanish. It becomes `missing`, which the review screen
 * renders as an open gap for the member to fill, which is the correct outcome
 * for a fact the document does not state.
 *
 * ## What this never does
 *
 * It does not publish, does not verify, does not create a draft, and does not
 * choose between products when several are found. Those are the member's, and
 * the review screen is where they happen.
 */

import { callAiJson, isAiConfigured, MODEL_WORK, type UserBlock } from "@/lib/ai";
import type { ReadResult } from "@/lib/documents/read";
import { PRODUCT_CATALOGUE, productByKey } from "./catalogue";
import { missing, type ProductAttribute, type ResolutionOutcome, type SourcedValue } from "./model";
import { resolveProduct } from "./resolve";
import { scanForProducts, type ProductMention } from "./scan";
import { TERM_KEYS, emptyTerms, type CommercialTerms } from "./terms";

/** The commercial intent a document expresses. */
export type DocumentIntent = "offer" | "requirement";

/**
 * The term contract lives in `./terms.ts`, not here.
 *
 * This module imports `lib/ai.ts`, which imports Supabase's admin client to
 * meter every model call. The review screen and the intake session both need
 * the term keys and both run in the browser, so importing them from here would
 * pull the admin client and `adm-zip` into the client bundle. The build says so
 * out loud, which is how the split came to exist.
 *
 * Re-exported so a server-side caller still has one import for the whole
 * extraction contract.
 */
export {
  TERM_KEYS,
  TERM_LABELS,
  emptyTerms,
  openTerms,
  type CommercialTerms,
} from "./terms";

/** One product found in a document, with everything known about it. */
export interface ExtractedProduct {
  /** The document's own words for this product. Never Ponte's. */
  wording: string;
  /** The deterministic scan's evidence, when the scan found it. */
  mention: ProductMention | null;
  /** What the shared resolver makes of the wording. Same resolver as typing. */
  resolution: ResolutionOutcome;
  /** Grade, standard and specification, each sourced. */
  grade: SourcedValue;
  standard: SourcedValue;
  specification: SourcedValue;
  /**
   * Attributes from Ponte's own product record. NOT claims the document makes.
   *
   * Kept apart from `documentAttributes` because collapsing the two put
   * "Extracted from document" beside a sulphur content that came out of the
   * catalogue. That is a false provenance claim on a review screen whose entire
   * job is provenance, and it is exactly what Constitution section 14 forbids.
   */
  attributes: readonly ProductAttribute[];
  /** Attributes the document itself states, each quoted by the parser. */
  documentAttributes: readonly ProductAttribute[];
  /** Terms this product overrides. Everything else comes from `shared`. */
  specificTerms: Partial<CommercialTerms>;
}

export interface DocumentExtraction {
  filename: string;
  /** Offer to supply, or requirement to source. Sourced like everything else. */
  intent: SourcedValue<DocumentIntent>;
  products: ExtractedProduct[];
  /** Terms that apply across every product in the document. */
  shared: CommercialTerms;
  /**
   * Honest limits on this extraction, in plain words, shown on the review
   * screen. For example that a PDF's text was not available to the
   * deterministic scan, or that the model was unavailable.
   */
  notes: readonly string[];
  /** True when a model read the document as well as the catalogue scan. */
  modelRead: boolean;
}

// ---------------------------------------------------------------------------
// Parsing. Pure, so the enforcement rules are unit-testable without a model.
// ---------------------------------------------------------------------------

type RawTerm = { value?: unknown; quote?: unknown };
type RawProduct = {
  wording?: unknown;
  catalogueKey?: unknown;
  grade?: RawTerm;
  standard?: RawTerm;
  specification?: RawTerm;
  attributes?: { label?: unknown; value?: unknown }[];
  terms?: Record<string, RawTerm>;
};
export type RawExtraction = {
  intent?: RawTerm;
  products?: RawProduct[];
  terms?: Record<string, RawTerm>;
};

function str(v: unknown, cap = 400): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s ? s.slice(0, cap) : null;
}

/**
 * A term survives only if it carries both a value and the words it came from.
 *
 * This is the whole enforcement of "do not invent". A model that answers
 * `{"value": "CIF Houston"}` with no quote has told Ponte something it cannot
 * show the member, and Ponte does not repeat it.
 */
function sourced(raw: RawTerm | undefined): SourcedValue {
  const value = str(raw?.value);
  const quote = str(raw?.quote, 300);
  if (!value || !quote) return missing<string>();
  return { value, provenance: "extracted", quote };
}

function sourcedTerms(raw: Record<string, RawTerm> | undefined): Partial<CommercialTerms> {
  const out: Partial<CommercialTerms> = {};
  if (!raw) return out;
  for (const key of TERM_KEYS) {
    const value = sourced(raw[key]);
    if (value.provenance === "extracted") out[key] = value;
  }
  return out;
}

function intentOf(raw: RawTerm | undefined): SourcedValue<DocumentIntent> {
  const value = str(raw?.value)?.toLowerCase();
  const quote = str(raw?.quote, 300);
  if (!quote) return missing<DocumentIntent>();
  if (value === "offer" || value === "requirement") {
    return { value, provenance: "extracted", quote };
  }
  return missing<DocumentIntent>();
}

/**
 * Fold a model answer and a deterministic scan into one extraction.
 *
 * The scan is the floor: every product it found appears, whatever the model
 * said. The model may add a product the scan missed only by naming a catalogue
 * key that exists, and may enrich a scanned product with a grade, a standard or
 * a specification. It cannot remove one, because a document that says "D6" says
 * D6 whether or not a model noticed.
 */
export function parseExtraction(
  raw: RawExtraction,
  input: { filename: string; scanned: readonly ProductMention[]; notes?: string[]; modelRead: boolean },
): DocumentExtraction {
  const byKey = new Map<string, ExtractedProduct>();

  for (const mention of input.scanned) {
    byKey.set(mention.product.key, {
      wording: mention.label,
      mention,
      resolution: resolveProduct(mention.label),
      grade: missing<string>(),
      standard: missing<string>(),
      specification: missing<string>(),
      attributes: mention.product.attributes,
      documentAttributes: [],
      specificTerms: {},
    });
  }

  for (const rawProduct of Array.isArray(raw.products) ? raw.products : []) {
    const key = typeof rawProduct?.catalogueKey === "string" ? rawProduct.catalogueKey : "";
    const wording = str(rawProduct?.wording, 160);
    const known = productByKey(key);

    // An unrecognised key with no wording is nothing at all. An unrecognised
    // key WITH wording is still a product the document names, so it survives
    // as an unresolved candidate rather than being discarded: a document that
    // offers something outside the catalogue has not become a document that
    // offers nothing.
    if (!known && !wording) continue;

    const target = known ? byKey.get(known.key) : undefined;
    const attributes = (Array.isArray(rawProduct.attributes) ? rawProduct.attributes : [])
      .map((a) => ({ label: str(a?.label, 60), value: str(a?.value, 120) }))
      .filter((a): a is { label: string; value: string } => Boolean(a.label && a.value))
      .map((a) => ({ key: a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: a.label, value: a.value }));

    if (target) {
      target.grade = sourced(rawProduct.grade);
      target.standard = sourced(rawProduct.standard);
      target.specification = sourced(rawProduct.specification);
      target.specificTerms = sourcedTerms(rawProduct.terms);
      if (wording) target.wording = wording;
      if (attributes.length > 0) target.documentAttributes = attributes;
      continue;
    }

    const words = wording ?? known!.name;
    const entry: ExtractedProduct = {
      wording: words,
      mention: null,
      resolution: resolveProduct(words),
      grade: sourced(rawProduct.grade),
      standard: sourced(rawProduct.standard),
      specification: sourced(rawProduct.specification),
      attributes: known ? known.attributes : [],
      documentAttributes: attributes,
      specificTerms: sourcedTerms(rawProduct.terms),
    };
    byKey.set(known ? known.key : `unresolved:${words.toLowerCase()}`, entry);
  }

  const shared = emptyTerms();
  for (const [key, value] of Object.entries(sourcedTerms(raw.terms))) {
    shared[key as keyof CommercialTerms] = value as SourcedValue;
  }

  return {
    filename: input.filename,
    intent: intentOf(raw.intent),
    products: Array.from(byKey.values()),
    shared,
    notes: input.notes ?? [],
    modelRead: input.modelRead,
  };
}

// ---------------------------------------------------------------------------
// The model call.
// ---------------------------------------------------------------------------

const SYSTEM = `You read one international trade document and return the commercial facts it STATES. The document may be a soft corporate offer, an ICPO, an SCO, an FCO, a letter of intent, a specification sheet, a proforma invoice or an email.

Return a JSON object:

{
  "intent": {"value": "offer" | "requirement", "quote": "<verbatim words showing which>"},
  "products": [
    {
      "wording": "<the document's own words for this product>",
      "catalogueKey": "<a key from the catalogue list, or null>",
      "grade": {"value": "...", "quote": "..."},
      "standard": {"value": "...", "quote": "..."},
      "specification": {"value": "...", "quote": "..."},
      "attributes": [{"label": "Sulphur content", "value": "10 ppm maximum"}],
      "terms": { "<term key>": {"value": "...", "quote": "..."} }
    }
  ],
  "terms": { "<term key>": {"value": "...", "quote": "..."} }
}

Term keys, all optional: quantity, unit, recurrence, origin, destination, incoterm, pricingBasis, paymentStructure, contractTerm, availability, validity, counterparties, signatories.

Put a term under the top-level "terms" when it applies to the whole document, and under a product's own "terms" only when that product overrides it.

ABSOLUTE RULES

1. Every value MUST carry a "quote" containing the document's verbatim words. If you cannot quote it, OMIT the field entirely. A value without a quote is discarded.
2. Never infer, complete, average or standardise a term the document does not state. A missing term is correct and expected.
3. List EVERY distinct product separately. A document offering three products must return three entries. Never merge them into one general entry.
4. "catalogueKey" must be a key from the catalogue list you are given, or null. Never invent one.
5. Do not summarise, advise, recommend or comment. Return the object only.`;

function catalogueBlock(): string {
  return `Catalogue keys:\n${PRODUCT_CATALOGUE.map((p) => `- ${p.key}: ${p.name}`).join("\n")}`;
}

/**
 * Extract a document.
 *
 * Never throws for a member-facing reason. A model outage degrades to the
 * deterministic scan plus a stated note, which is an incomplete extraction and
 * says so, rather than an error page over a document that was read fine.
 */
export async function extractFromDocument(
  read: Extract<ReadResult, { kind: "readable" }>,
  opts?: { userId?: string | null },
): Promise<DocumentExtraction> {
  const scanned = read.textAvailable ? scanForProducts(read.text) : [];
  const notes: string[] = [];

  if (!read.textAvailable) {
    notes.push(
      "Ponte did not extract the text of this file directly, so the products below were identified by reading the document rather than by matching Ponte's catalogue.",
    );
  }

  if (!isAiConfigured()) {
    notes.push("Ponte read the document against its own product catalogue only. Commercial terms were not extracted.");
    return parseExtraction({}, { filename: read.filename, scanned, notes, modelRead: false });
  }

  const user: UserBlock[] = [
    ...read.blocks,
    { type: "text", text: catalogueBlock() },
    { type: "text", text: "Extract this document now. Return the JSON object only." },
  ];

  try {
    const { data } = await callAiJson<RawExtraction>({
      feature: "product_document_extract",
      model: MODEL_WORK,
      maxTokens: 3000,
      temperature: 0,
      userId: opts?.userId ?? null,
      system: SYSTEM,
      user,
      timeoutMs: 60_000,
    });
    return parseExtraction(data, { filename: read.filename, scanned, notes, modelRead: true });
  } catch {
    notes.push(
      "Ponte could not complete the reading of this document. The products below come from matching its text against Ponte's catalogue; the commercial terms were not extracted.",
    );
    return parseExtraction({}, { filename: read.filename, scanned, notes, modelRead: false });
  }
}

/** True when the document named more than one product. */
export function isMultiProduct(extraction: DocumentExtraction): boolean {
  return extraction.products.length > 1;
}
