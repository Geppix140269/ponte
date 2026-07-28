/**
 * Stage 3 of the cascade: identifying a product Ponte does not already hold.
 *
 * ## The defect this exists to fix
 *
 * The first build let the model return only keys that already existed in the
 * curated catalogue. The intent was "AI must not invent a product". The effect,
 * found by the owner in review, was that the catalogue became the boundary of
 * everything Ponte could understand: typing `avocado` produced
 *
 *   > Ponte did not recognise that yet.
 *
 * for a fruit traded by the million tonne. A resolver whose ceiling is its own
 * seed data does not satisfy "users describe or upload what they trade; Ponte
 * identifies, structures and classifies it". It satisfies "users describe what
 * Ponte already knew".
 *
 * ## What replaced the ceiling
 *
 * The model may now identify **any** product a member names. The safety
 * property moved from a restriction on the output to a restriction on what the
 * output is allowed to *become*:
 *
 * 1. an identified product arrives with provenance `ai_identified`, which the
 *    review screen renders in words as "Identified by Ponte, not yet
 *    confirmed";
 * 2. it can never reach a draft without the member confirming it;
 * 3. every HS code it proposes is **checked against the real HS catalogue**,
 *    and one that does not exist is dropped. The model may not mint customs
 *    classifications;
 * 4. the Ponte sector is derived from the surviving HS chapter through
 *    `sectorForChapter`, not taken from the model, so the mapping onto Ponte's
 *    canonical taxonomy is deterministic;
 * 5. a correction is surfaced as "Did you mean...?" rather than silently
 *    applied, because a correction the member cannot see is one they cannot
 *    refuse.
 *
 * That is the decision record's rule as written: AI may extract, structure,
 * compare, explain, recommend and draft, and must not silently publish, verify,
 * resolve material ambiguity or commit. Identifying a product the member has
 * just named is recommending. Asserting a commercial term they never gave is
 * inventing, and that rule is enforced separately, in `extract-document.ts`.
 */

import { callAiJson, isAiConfigured, MODEL_FAST } from "@/lib/ai";
import { sectorForChapter } from "@/lib/taxonomy/market";
import { PRODUCT_CATALOGUE, productByKey } from "./catalogue";
import type { IdentifiedProduct, ProductAttribute } from "./model";

/** A candidate customs heading, as the HS catalogue actually holds it. */
export interface HsSuggestion {
  code: string;
  description: string;
}

/**
 * Looks a code up in the real HS catalogue.
 *
 * Injected rather than imported so this module stays pure over its inputs and
 * every branch is testable without a database. The production wiring passes
 * `lib/hs`; a test passes a map.
 */
export type HsLookup = (code: string) => Promise<HsSuggestion | null>;

/** Searches the HS catalogue by words. Also injected, and also optional. */
export type HsSearch = (query: string) => Promise<HsSuggestion[]>;

export interface IdentifyOptions {
  hsLookup?: HsLookup;
  hsSearch?: HsSearch;
  userId?: string | null;
}

/** One product the model identified, before validation. */
type RawIdentified = {
  name?: unknown;
  generic?: unknown;
  correction?: unknown;
  sector?: unknown;
  group?: unknown;
  form?: unknown;
  distinguisher?: unknown;
  synonyms?: unknown;
  attributes?: { label?: unknown; value?: unknown }[];
  hsCandidates?: unknown;
  catalogueKey?: unknown;
  confidence?: unknown;
};

export type RawIdentification = {
  products?: RawIdentified[];
  clarify?: unknown;
  language?: unknown;
  isProduct?: unknown;
};

/** The result of identification, before the cascade ranks it. */
export interface Identification {
  products: { product: IdentifiedProduct; confidence: number; catalogueKey: string | null }[];
  /** Asked only when the product itself is genuinely ambiguous. */
  clarify: string | null;
  /** False when the member typed something that is not a product at all. */
  isProduct: boolean;
}

const SECTOR_LIST = [
  "agri", "food", "min", "chem", "plas", "hide", "wood", "tex",
  "foot", "stone", "metal", "mach", "veh", "inst", "misc",
];

function systemPrompt(): string {
  // The curated catalogue is offered as a shortcut, NOT as a boundary. A model
  // that recognises a curated product should say so, because Ponte knows more
  // about those than it can infer; a model that does not must still answer.
  const known = PRODUCT_CATALOGUE.map((p) => `${p.key}: ${p.name}`).join("\n");

  return `You identify the physical traded product a business person has just named, written in ANY language. You are Ponte's product-identification step. The person has told you what they trade; your job is to work out precisely what it is.

Return a JSON object:

{
  "isProduct": true | false,
  "products": [
    {
      "name": "<the precise commercial product name, in English, corrected and normalised>",
      "generic": "<the generic product this is a form or variety of, or null>",
      "correction": "<the corrected spelling if the input was misspelled, else null>",
      "sector": "<one of: ${SECTOR_LIST.join(", ")}>",
      "group": "<a short readable group inside that sector, e.g. 'Fresh fruit'>",
      "form": "<the physical form or state, e.g. 'fresh', 'frozen', 'refined oil', or null>",
      "distinguisher": "<one sentence: what tells this product apart from near neighbours>",
      "synonyms": ["<other trade names for it>"],
      "attributes": [{"label": "Variety", "value": "Hass"}],
      "hsCandidates": ["080440", "081190"],
      "catalogueKey": "<a key from the catalogue list below if one is genuinely the same product, else null>",
      "confidence": 0.0 to 1.0
    }
  ],
  "clarify": "<one short question, ONLY if the product itself is genuinely ambiguous, else null>",
  "language": "<short tag, e.g. 'en', 'es'>"
}

RULES

1. Identify the product even when it is not in the catalogue below. The catalogue is a shortcut, not a limit. Most traded products are not in it.
2. Return the MATERIALLY DIFFERENT forms as separate entries, best first. "avocado" should return fresh avocado first, and frozen/prepared avocado and avocado oil as further entries: they have different buyers, specifications and customs codes.
3. Do not ask for a grade, standard or technical term merely to identify an ordinary product. "avocado" is enough to identify an avocado. Use "clarify" only when the words genuinely name two unrelated things.
4. Correct obvious misspellings and put the corrected word in "correction". "avogado" -> correction "avocado".
5. "hsCandidates" are six-digit HS 2022 codes, digits only, best first, at most three. Give your best recollection; they are checked against the real catalogue and dropped if wrong. Never invent a code to fill the field. An empty array is fine.
6. If the input names no physical traded product at all, set "isProduct" false and "products" to an empty array.
7. Attributes must come from the words the person used. If they wrote "Hass avocado", Variety is Hass. Do not add specifications they did not give.
8. Never invent a quantity, price, origin, standard or certification.

CATALOGUE (shortcut only):
${known}`;
}

function str(v: unknown, cap = 120): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s ? s.slice(0, cap) : null;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
}

/**
 * Validate and ground one identified product.
 *
 * Exported and pure so the grounding rules are testable without a model: an
 * invented HS code is dropped, and the Ponte sector comes from the surviving
 * code's chapter rather than from the model's own guess.
 */
export async function groundProduct(
  raw: RawIdentified,
  hsLookup: HsLookup | undefined,
  basis: IdentifiedProduct["basis"],
): Promise<{ product: IdentifiedProduct; confidence: number; catalogueKey: string | null } | null> {
  const name = str(raw.name);
  if (!name) return null;

  // Only codes that exist survive. A model may recall a plausible-looking code
  // that is not in HS 2022 at all, and a fabricated customs classification on a
  // real record is exactly the manufactured fact the authorities forbid.
  const proposed = Array.isArray(raw.hsCandidates) ? raw.hsCandidates : [];
  const checked: HsSuggestion[] = [];
  for (const value of proposed.slice(0, 3)) {
    const code = typeof value === "string" ? value.replace(/[^0-9]/g, "") : "";
    if (code.length !== 6) continue;
    if (!hsLookup) continue;
    const found = await hsLookup(code);
    if (found) checked.push(found);
  }

  // The Ponte sector is DERIVED, not trusted. The surviving code's chapter maps
  // onto the canonical taxonomy deterministically; the model's own sector is
  // only a fallback, and only when it names a sector that exists.
  const fromChapter = checked.length > 0 ? sectorForChapter(Number(checked[0].code.slice(0, 2))) : null;
  const claimed = str(raw.sector, 12);
  const sector = fromChapter?.key ?? (claimed && SECTOR_LIST.includes(claimed) ? claimed : "");

  const attributes: ProductAttribute[] = (Array.isArray(raw.attributes) ? raw.attributes : [])
    .map((a) => ({ label: str(a?.label, 60), value: str(a?.value, 120) }))
    .filter((a): a is { label: string; value: string } => Boolean(a.label && a.value))
    .map((a) => ({ key: slug(a.label), label: a.label, value: a.value }));

  const form = str(raw.form, 60);
  if (form && !attributes.some((a) => a.key === "form")) {
    attributes.unshift({ key: "form", label: "Form", value: form });
  }

  const synonyms = (Array.isArray(raw.synonyms) ? raw.synonyms : [])
    .map((s) => str(s, 60))
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase())
    .slice(0, 12);

  const product: IdentifiedProduct = {
    identified: true,
    key: `identified:${slug(name)}`,
    name,
    sector,
    group: str(raw.group, 60) ?? "Identified from your words",
    synonyms,
    standards: [],
    attributes,
    hs: checked[0] ?? null,
    hsCandidates: checked,
    distinguisher:
      str(raw.distinguisher, 200) ??
      "Identified from what you wrote. Confirm it, or add detail and try again.",
    correction: str(raw.correction, 80),
    generic: str(raw.generic, 80),
    basis,
  };

  const key = str(raw.catalogueKey, 60);
  return { product, confidence: num(raw.confidence), catalogueKey: key && productByKey(key) ? key : null };
}

/** Parse and ground a whole model answer. Pure over its inputs. */
export async function groundIdentification(
  raw: RawIdentification,
  hsLookup?: HsLookup,
  basis: IdentifiedProduct["basis"] = "model",
): Promise<Identification> {
  const products: Identification["products"] = [];
  for (const entry of Array.isArray(raw.products) ? raw.products : []) {
    const grounded = await groundProduct(entry, hsLookup, basis);
    if (grounded) products.push(grounded);
    if (products.length === 4) break;
  }
  return {
    products,
    clarify: str(raw.clarify, 200),
    // Only an explicit false counts. A model that omitted the field named
    // products or it did not, and the array already says which.
    isProduct: raw.isProduct === false ? false : products.length > 0,
  };
}

/**
 * Identify a product from the member's own words.
 *
 * Returns null when the model is unconfigured, fails or times out, so the
 * cascade can fall back to the customs catalogue rather than showing an error
 * for something that is only an outage.
 */
export async function identifyProduct(
  raw: string,
  options: IdentifyOptions = {},
): Promise<Identification | null> {
  if (!isAiConfigured()) return null;
  const text = raw.trim().slice(0, 600);
  if (text.length < 2) return null;

  try {
    const { data } = await callAiJson<RawIdentification>({
      feature: "product_identify",
      model: MODEL_FAST,
      maxTokens: 900,
      temperature: 0,
      userId: options.userId ?? null,
      system: systemPrompt(),
      user: text,
      timeoutMs: 12_000,
    });
    return await groundIdentification(data, options.hsLookup, "model");
  } catch {
    // Already recorded as a failed row inside callAi. Degrade, never block.
    return null;
  }
}

/**
 * The deterministic fallback: identify from the customs catalogue alone.
 *
 * Used when the model is unavailable. It is genuinely weaker, and the cascade
 * says so on the surface rather than presenting a nomenclature description as
 * though a trader had written it: HS descriptions read "Fruit, edible;
 * avocados, fresh or dried", which is correct, useful and not how anybody
 * offers avocados.
 *
 * It is still far better than the alternative, which is telling a member Ponte
 * has never heard of avocados.
 */
export async function identifyFromCustomsCatalogue(
  raw: string,
  hsSearch: HsSearch,
): Promise<Identification> {
  const text = raw.trim();
  let hits: HsSuggestion[] = [];
  try {
    hits = (await hsSearch(text)).slice(0, 3);
  } catch {
    hits = [];
  }
  if (hits.length === 0) return { products: [], clarify: null, isProduct: false };

  const products = hits.map((hit) => {
    const chapter = sectorForChapter(Number(hit.code.slice(0, 2)));
    const product: IdentifiedProduct = {
      identified: true,
      key: `identified:hs-${hit.code}`,
      // The member's own words lead. The nomenclature wording is the
      // distinguisher underneath, where it belongs.
      name: text,
      sector: chapter?.key ?? "",
      group: chapter?.label ?? "Identified from the customs catalogue",
      synonyms: [],
      standards: [],
      attributes: [],
      hs: hit,
      hsCandidates: [hit],
      distinguisher: `Matched to the customs nomenclature entry "${hit.description}".`,
      correction: null,
      generic: null,
      basis: "customs_catalogue",
    };
    return { product, confidence: 0.42, catalogueKey: null };
  });

  return { products, clarify: null, isProduct: true };
}
