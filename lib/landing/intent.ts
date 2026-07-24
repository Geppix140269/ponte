/**
 * Safe natural-language intent inference for the public landing.
 *
 * This is a deterministic, client-safe heuristic. It holds no secrets and calls
 * no service, so it is imported straight into the browser bundle and unit
 * tested in isolation. It maps a typed or spoken objective onto one of the four
 * production routes and pulls out only the facts it can read literally.
 *
 * Two honesty rules, from the design brief, are load bearing:
 *   1. When no route is decisive, `route` is null and `needsClarification` is
 *      true. The caller must ask, never guess.
 *   2. A fact is only reported when the text says it. Nothing is invented, and
 *      there is no fabricated confidence score.
 */

export type RouteKey = "find" | "structure" | "check" | "investigate";

export interface ExtractedFacts {
  /** The literal words the user gave, always preserved. */
  raw: string;
  product?: string;
  company?: string;
  origin?: string;
  destination?: string;
  quantity?: string;
}

export interface IntentResult {
  /** The chosen route, or null when the text is ambiguous. */
  route: RouteKey | null;
  /**
   * True when the caller must ask something before continuing: either the
   * route is ambiguous, or the route is decided but a decisive fact is missing
   * (Find with no product).
   */
  needsClarification: boolean;
  /** Present only for the Find route: the product is the decisive fact. */
  missingFact?: "product";
  /** Shipping / freight / container context, routed into Structure. */
  logistics: boolean;
  facts: ExtractedFacts;
}

// Word lists, lower-cased. English carries the weight; a few high-frequency
// Spanish / Italian tokens are added so the most common non-English objectives
// resolve rather than always falling through to clarification.
const CHECK =
  /\bcheck\b|\bverify\b|verifica|verificar|due diligence|legitimat|background on|\bvet\b|counterparty check|company check|is .+ (real|legit)|before (dealing|i deal|trading)/;
const INVESTIGATE =
  /investigat|market signal|\bsignal\b|reported (opportunit|tender|deal)|look into|\brumou?r|\btender\b|saw (a|an|this)|questionable|too good to be true/;
const LOGISTICS =
  /\bship\b|shipping|\bfreight\b|container|logistic|customs clearance|move (goods|cargo|containers)|transport|move .* across borders|\bhaulage\b/;
const STRUCTURE =
  /structur|\bdraft\b|put together|write up|compose|procure|procurement|sourcing|\bsource\b|requirement to (buy|sell)|need to (buy|sell|source)|solicitud|estructurar|comprar|preventivo/;
const FIND =
  /\bfind\b|\bdemand\b|\bbuyers?\b|\bimporters?\b|\bsell\b|selling|\bsupply\b|\bsuppliers?\b|market for|export market|distribution|acquirent|compradores|find (me )?(a )?market/;

// Country-ish token used to read origin / destination. Deliberately shallow: a
// title-cased word after a preposition. It reads what is written and no more.
const PLACE = /\b(?:in|to|into|for|from|at)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/g;

const QUANTITY =
  /\b(\d[\d,.\s]*)\s?(mt|tons?|tonnes?|kg|kgs|kilograms?|containers?|teu|fcl|lcl|units?|pcs|pieces?)\b/i;

// A modest known-product vocabulary, plus a generic "of / for X" reader. The
// vocabulary makes the common commodity words reliable; the reader catches the
// rest without ever asserting a product that is not in the sentence.
const KNOWN_PRODUCTS = [
  "almond",
  "pistachio",
  "cashew",
  "walnut",
  "hazelnut",
  "sugar",
  "wheat",
  "urea",
  "coffee",
  "cocoa",
  "cement",
  "rice",
  "maize",
  "barley",
  "olive oil",
  "aluminium",
  "aluminum",
  "steel",
  "valve",
  "valves",
];

const NON_PRODUCT = new Set([
  "product",
  "products",
  "goods",
  "commodity",
  "commodities",
  "something",
  "it",
  "this",
  "them",
  "supply",
  "demand",
  "buyer",
  "buyers",
  "market",
  "markets",
  "help",
  "me",
  "a",
  "an",
  "the",
  "my",
  "our",
]);

function detectRoute(t: string): { route: RouteKey | null; logistics: boolean } {
  // Order matters: the more specific verbs win over the broad commercial ones.
  if (CHECK.test(t)) return { route: "check", logistics: false };
  if (INVESTIGATE.test(t)) return { route: "investigate", logistics: false };
  if (LOGISTICS.test(t)) return { route: "structure", logistics: true };
  if (STRUCTURE.test(t)) return { route: "structure", logistics: false };
  if (FIND.test(t)) return { route: "find", logistics: false };
  return { route: null, logistics: false };
}

/** Reads a product from the text, or returns undefined. Never invents one. */
export function readProduct(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const p of KNOWN_PRODUCTS) {
    // Widen the known stem to the whole word so the user's own wording is
    // returned ("almonds", not "almond"), never a normalised stem.
    const m = t.match(new RegExp(`${p.replace(/ /g, "\\s+")}[a-z]*`));
    if (m) return m[0];
  }
  const m = t.match(
    /(?:of|for)\s+([a-z][a-z\- ]{2,28}?)(?:\s+(?:into|in|to|from|at|and|by)\b|[,.]|$)/,
  );
  if (m) {
    const word = m[1].replace(/^(my|our|your|a|an|the)\s+/, "").trim();
    const head = word.split(/\s+/)[0];
    if (!NON_PRODUCT.has(word) && !NON_PRODUCT.has(head)) return word;
  }
  return undefined;
}

function readCompany(raw: string): string | undefined {
  // A quoted name, or a capitalised run after a check verb. Company reads are
  // best-effort and only used to carry context forward, never to assert a
  // verified entity.
  const quoted = raw.match(/["'“”‘’]([^"'“”‘’]{2,60})["'“”‘’]/);
  if (quoted) return quoted[1].trim();
  const after = raw.match(
    /(?:check|verify|on|about|is)\s+([A-Z][\w&.\- ]{2,40}?)(?:\s+(?:before|legit|real|company|ltd|llc|gmbh|inc)\b|[,.?]|$)/,
  );
  if (after) return after[1].trim();
  return undefined;
}

function readPlaces(raw: string): { origin?: string; destination?: string } {
  const hits: { prep: string; place: string }[] = [];
  for (const m of Array.from(raw.matchAll(PLACE))) {
    hits.push({ prep: m[0].trim().split(/\s+/)[0].toLowerCase(), place: m[1] });
  }
  let origin: string | undefined;
  let destination: string | undefined;
  for (const h of hits) {
    if (h.prep === "from" && !origin) origin = h.place;
    else if ((h.prep === "to" || h.prep === "into" || h.prep === "in") && !destination)
      destination = h.place;
  }
  return { origin, destination };
}

function extractFacts(raw: string): ExtractedFacts {
  const facts: ExtractedFacts = { raw };
  const product = readProduct(raw);
  if (product) facts.product = product;
  const company = readCompany(raw);
  if (company) facts.company = company;
  const q = raw.match(QUANTITY);
  if (q) facts.quantity = q[0].trim();
  const places = readPlaces(raw);
  if (places.origin) facts.origin = places.origin;
  if (places.destination) facts.destination = places.destination;
  return facts;
}

/**
 * Infer a route and facts from free text. When `assumeRoute` is passed (the
 * user has already chosen a route on the bridge), the route is respected and
 * only the decisive-fact check and extraction run.
 */
export function inferIntent(text: string, assumeRoute?: RouteKey): IntentResult {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const facts = extractFacts(raw);

  const detected = assumeRoute
    ? { route: assumeRoute, logistics: LOGISTICS.test(lower) }
    : detectRoute(lower);

  if (!detected.route) {
    return {
      route: null,
      needsClarification: true,
      logistics: false,
      facts,
    };
  }

  // Find is the only route with a decisive fact: without a product, Ponte must
  // ask rather than assume one.
  if (detected.route === "find" && !facts.product) {
    return {
      route: "find",
      needsClarification: true,
      missingFact: "product",
      logistics: detected.logistics,
      facts,
    };
  }

  return {
    route: detected.route,
    needsClarification: false,
    logistics: detected.logistics,
    facts,
  };
}
