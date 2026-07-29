/**
 * The governed commercial alias layer.
 *
 * A member searching for `gas oil` and a source that wrote `EN590` are naming
 * the same thing, and a search that cannot join them is not a commercial search.
 * The same is true of `freight forwarder` and `freight forwarding`, of
 * `EVOO` and `extra virgin olive oil`, and of `aceite de oliva` typed by a
 * Spanish-speaking buyer into an English-only interface.
 *
 * ---------------------------------------------------------------------------
 * The ownership boundary, stated rather than assumed
 * ---------------------------------------------------------------------------
 * This file is a **vocabulary**, not a classification. Nothing here decides what
 * a record IS. An alias only ever widens the set of phrases a query is matched
 * against; every record returned still had to genuinely contain one of those
 * phrases in a public column. So an alias can never manufacture a match, and a
 * wrong alias costs precision, never truth.
 *
 * That boundary is what makes this table safe to edit without a migration and
 * without owner sign-off on each row, and it is why it lives here rather than
 * inside a component or a query string:
 *
 *   - one place, so `/find` and `/market-signals` cannot disagree about what
 *     `diesel` means;
 *   - pure data, so every group is asserted in a unit test;
 *   - no database, so adding a synonym is not a production schema change;
 *   - no model call, so the same query returns the same rows every time.
 *
 * What must NOT go in here: anything that asserts a fact about a record.
 * A source category, an HS classification, a country mapping and a taxonomy key
 * are all classifications, and they belong in `lib/taxonomy/` where the family
 * rules apply. Writing `EN590 -> HS 2710.19` here would be Ponte inventing a
 * classification it never made.
 *
 * ---------------------------------------------------------------------------
 * Multilingual input, English-only interface
 * ---------------------------------------------------------------------------
 * The English-only policy (PT-PRODUCT-2026-07-26-02) governs the INTERFACE. It
 * explicitly preserves multilingual *input*. A buyer in Madrid types
 * `aceite de oliva`; every label, heading and result they are shown stays in
 * English. Adding the common trade-language forms of a term to its group is the
 * cheapest possible way to honour both halves of that policy, and it costs one
 * array entry rather than a translation runtime.
 */

/**
 * One commercial vocabulary group.
 *
 * Every term is treated as equivalent to every other for the purpose of finding
 * records. `canonical` is the English form and exists so the interface can name
 * the group truthfully when it explains that a search was widened.
 */
export type AliasGroup = {
  /** Stable identifier. Never rendered; used by tests and by explanations. */
  key: string;
  /** The English term this group is named by. */
  canonical: string;
  /**
   * Every phrase equivalent to the canonical term, already lower-case and
   * unpunctuated so it compares directly against a normalised query.
   *
   * These must be SPECIFIC, in two different senses, and both are enforced by
   * `lib/search/__tests__/signal-search.test.ts`.
   *
   * **Specific as a word.** `oil` does not belong in the gas-oil group: it
   * appears in olive oil, palm oil and sunflower oil, and putting it here would
   * turn a search for cooking oil into a search for middle distillates. A term
   * earns its place only when a member typing it means this group and nothing
   * else.
   *
   * **Specific as a STRING.** Terms are matched with `ilike '%term%'`, which has
   * no notion of a word, so a short term matches inside longer words that have
   * nothing to do with it. This is not hypothetical: `ble`, the French for
   * wheat, matched `available` and `acceptable` and put four unrelated records
   * into every wheat search. `lc` matches `welcome` and `calcium`; `ior`
   * matches `prior`, `interior` and `superior`; `ago` matches `Chicago` and
   * `embargo`; `psi` matches `capsized`. All of them are removed. The test
   * holds a corpus of ordinary trade vocabulary and refuses any term that is a
   * substring of a word it does not mean.
   *
   * The abbreviations that survive do so because they are not English letter
   * sequences: `evoo`, `ulsd`, `fcl`, `lcl`, `sgs`, `en590`, `n46`.
   */
  terms: readonly string[];
  /** Why this group exists, for whoever edits it next. */
  note?: string;
};

/**
 * The seeded vocabulary.
 *
 * Deliberately small. Every group here answers a question a member actually
 * asks of this inventory, and an unused alias is not free: it widens searches,
 * costs precision and has to be maintained. Grow this from observed queries,
 * not from imagination.
 */
export const ALIAS_GROUPS: readonly AliasGroup[] = [
  {
    key: "gasoil",
    canonical: "gas oil",
    note: "Middle distillate. The single most aliased product in the inventory: the same cargo is offered as gas oil, gasoil, diesel and by its European standard number.",
    terms: [
      "gas oil",
      "gasoil",
      "diesel",
      "en590",
      "en 590",
      "automotive gas oil",
      "ulsd",
      "gasoleo",
      "gasolio",
      "dieselkraftstoff",
    ],
  },
  {
    key: "jet-fuel",
    canonical: "jet fuel",
    // "jet a 1" rather than "jet a-1": every term is stored in the form the
    // normaliser produces, because that is the only form a query can ever be
    // compared in. A hyphen here would be a term nothing could match.
    terms: ["jet fuel", "jet a 1", "jeta1", "aviation turbine fuel", "kerosene", "kerosine"],
  },
  {
    key: "olive-oil",
    canonical: "olive oil",
    note: "EVOO is the trade abbreviation and appears in source listings far more often than the full phrase.",
    terms: [
      "olive oil",
      "extra virgin olive oil",
      "evoo",
      "virgin olive oil",
      "aceite de oliva",
      "olio di oliva",
      "huile d olive",
      "olivenol",
    ],
  },
  {
    key: "sunflower-oil",
    canonical: "sunflower oil",
    terms: ["sunflower oil", "sunflowerseed oil", "sunflower seed oil", "aceite de girasol", "olio di girasole"],
  },
  {
    key: "wheat",
    canonical: "wheat",
    terms: ["wheat", "milling wheat", "durum", "durum wheat", "trigo", "grano", "weizen", ],
  },
  {
    key: "sugar",
    canonical: "sugar",
    note: "ICUMSA 45 is the specification a refined-white-sugar buyer actually types.",
    terms: ["sugar", "icumsa", "icumsa 45", "refined white sugar", "azucar", "zucchero", "zucker"],
  },
  {
    key: "urea",
    canonical: "urea",
    terms: ["urea", "urea 46", "prilled urea", "granular urea", "n46"],
  },
  {
    key: "freight-forwarding",
    canonical: "freight forwarding",
    note: "Service, not product. The agent and the activity share one vocabulary in the market.",
    terms: [
      "freight forwarding",
      "freight forwarder",
      "forwarding agent",
      "freight agent",
      "transitario",
      "spedizioniere",
      "transitaire",
      "spediteur",
    ],
  },
  {
    key: "customs-clearance",
    canonical: "customs clearance",
    terms: ["customs clearance", "customs broker", "customs brokerage", "customs agent", "despacho de aduanas", "sdoganamento"],
  },
  {
    key: "cold-chain",
    canonical: "cold chain",
    terms: ["cold chain", "cold storage", "reefer", "refrigerated", "temperature controlled"],
  },
  {
    key: "ocean-freight",
    canonical: "ocean freight",
    note: "The reason a stored classification is worth more than prose: the same demand is written four ways.",
    terms: ["ocean freight", "sea freight", "sea shipping", "maritime transport", "container shipping", "fcl", "lcl"],
  },
  {
    key: "inspection",
    canonical: "pre-shipment inspection",
    terms: ["pre shipment inspection", "cargo survey", "quality inspection", "sgs"],
  },
  {
    key: "distributor",
    canonical: "distributor",
    note: "Distribution family. Partner identity, not a relationship term: exclusivity is a separate axis and is deliberately absent here.",
    terms: ["distributor", "distribution partner", "distributorship", "distribuidor", "distributore", "distributeur"],
  },
  {
    key: "commercial-agent",
    canonical: "commercial agent",
    terms: [
      "commercial agent",
      "sales agent",
      "sales representative",
      "commercial representative",
      "representative",
      "agente comercial",
      "agente di commercio",
    ],
  },
  {
    key: "importer",
    canonical: "importer",
    terms: ["importer", "importer of record", "importador", "importatore"],
  },
  {
    key: "wholesaler",
    canonical: "wholesaler",
    terms: ["wholesaler", "wholesale", "reseller", "mayorista", "grossista"],
  },
  {
    key: "letter-of-credit",
    canonical: "letter of credit",
    terms: ["letter of credit", "letters of credit", "documentary credit", "dlc", "sblc", "standby letter of credit"],
  },
  {
    key: "trade-finance",
    canonical: "trade finance",
    terms: ["trade finance", "supply chain finance", "invoice finance", "factoring", "purchase order finance"],
  },
];

/** Normalised term -> the group that owns it. Built once. */
const BY_TERM = new Map<string, AliasGroup>();
const ALL_TERMS: string[] = [];
for (const group of ALIAS_GROUPS) {
  for (const term of group.terms) {
    BY_TERM.set(term, group);
    if (ALL_TERMS.indexOf(term) < 0) ALL_TERMS.push(term);
  }
}

/** The group a normalised phrase belongs to, or null. Exact phrase match only. */
export function aliasGroupFor(phrase: string): AliasGroup | null {
  return BY_TERM.get(phrase) ?? null;
}

/** Every distinct term across the whole vocabulary. Used by the tests. */
export function allAliasTerms(): readonly string[] {
  return ALL_TERMS;
}
