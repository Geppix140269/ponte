/**
 * The Desk commercial-fact authority.
 *
 * ONE rule governs this file: `factsFor` decides which commercial facts a
 * record shows, at every width, in every context. A mobile row, a desktop
 * register, a landing card and a detail grid differ in COUNT ONLY. They never
 * differ in which facts, and never in their order. A caller that wants
 * different facts is a caller that is wrong.
 *
 * Two consequences follow, and both are asserted by the unit test rather than
 * trusted:
 *
 *   1. Every context is a strict PREFIX of every longer context. Two facts on a
 *      390px row are the first two of the three on a desktop register row. A
 *      member who scans on a phone and then opens the same record on a laptop
 *      reads the same facts in the same order, with more of them.
 *   2. There is no arbitrary fallback. `order` is the complete, documented,
 *      semantic priority for a classification. A key absent from that list is
 *      never shown, whatever the record happens to carry, and object-key order
 *      is never read. An unknown classification shows nothing rather than
 *      guessing.
 *
 * "Not stated" is record-sensitive, never classification-sensitive. A key in
 * `notStated` is one whose ABSENCE is itself commercially meaningful, so its
 * absence is printed rather than hidden. It is printed only when the record
 * genuinely lacks the value: a populated source field always wins over the
 * list. Every other absent key is skipped silently, because a blank a reader
 * cannot act on is noise, not honesty.
 *
 * Pure. No database, no Next, no React, no server imports, so the whole file is
 * unit-tested standalone under tsx.
 */

/** Every commercial fact the Desk can name. A key not here does not exist. */
export type FactKey =
  | "deadline"
  | "destination"
  | "origin"
  | "quantity"
  | "delivery"
  | "timing"
  | "product"
  | "validity"
  | "volume"
  | "published"
  | "holders"
  | "conditions"
  | "corridor"
  | "signalDate"
  | "cadence"
  | "operator"
  | "transit"
  | "territory"
  | "arrangement"
  | "categories"
  | "from"
  | "exclusivity"
  | "minimumCommitment"
  | "contactRoute"
  | "service"
  | "duration"
  | "scope"
  | "basis"
  | "value"
  | "measure"
  | "rate"
  | "effectFrom"
  | "review"
  | "scopeOfGoods"
  | "grade"
  | "movement"
  | "index"
  | "packing"
  | "priceBasis"
  | "paymentInstrument"
  | "bidBond"
  | "agentRequirement";

/**
 * Every record classification the Desk can present.
 *
 * Only `requirement` and `offer` are reachable from production data today:
 * `desk_radar.side` is the sole classification source and yields exactly those
 * two. The other ten are the documented authority for classifications the
 * signal set is expected to carry, and they are kept here rather than deleted
 * so that adding one is a data change, not a redesign. None of them is
 * synthesised, inferred from product text, or shown against a record that does
 * not genuinely carry it.
 */
export type DeskClassification =
  | "tender"
  | "requirement"
  | "offer"
  | "licence"
  | "shipment"
  | "distribution"
  | "service"
  | "opportunity"
  | "regulatory"
  | "capacity"
  | "announcement"
  | "price";

interface PriorityRule {
  /** The complete semantic priority. The only list any surface may read. */
  readonly order: readonly FactKey[];
  /** Keys whose absence is itself commercially meaningful. */
  readonly notStated: readonly FactKey[];
}

export const FACT_PRIORITY: Readonly<Record<DeskClassification, PriorityRule>> = {
  tender: {
    order: [
      "deadline", "destination", "quantity", "delivery", "packing",
      "priceBasis", "paymentInstrument", "bidBond", "agentRequirement",
    ],
    notStated: ["deadline", "priceBasis", "paymentInstrument", "bidBond", "agentRequirement"],
  },
  requirement: {
    order: ["quantity", "destination", "delivery", "timing", "priceBasis", "paymentInstrument", "value"],
    notStated: ["quantity", "priceBasis", "paymentInstrument"],
  },
  offer: {
    order: ["quantity", "origin", "delivery", "timing", "priceBasis", "paymentInstrument"],
    notStated: ["quantity", "priceBasis", "paymentInstrument"],
  },
  licence: {
    order: ["product", "validity", "volume", "published", "holders", "conditions"],
    notStated: ["validity", "conditions"],
  },
  shipment: {
    order: ["corridor", "signalDate", "cadence", "operator", "volume"],
    notStated: ["operator"],
  },
  distribution: {
    order: ["territory", "arrangement", "categories", "from", "exclusivity", "minimumCommitment"],
    notStated: ["arrangement", "exclusivity", "minimumCommitment"],
  },
  service: {
    order: ["service", "timing", "corridor", "duration", "scope", "basis"],
    notStated: ["timing", "basis"],
  },
  opportunity: {
    order: ["value", "quantity", "deadline", "delivery", "destination", "origin"],
    notStated: ["deadline"],
  },
  regulatory: {
    order: ["measure", "effectFrom", "rate", "review", "scopeOfGoods"],
    notStated: ["effectFrom", "review"],
  },
  capacity: {
    order: ["corridor", "cadence", "transit", "operator", "effectFrom"],
    notStated: ["cadence", "operator"],
  },
  announcement: {
    order: ["arrangement", "territory", "categories", "from", "contactRoute"],
    notStated: ["arrangement", "from"],
  },
  price: {
    order: ["grade", "movement", "index", "signalDate", "basis"],
    notStated: ["movement", "basis"],
  },
};

/** The visible name of each fact. The word is the label; an icon never is. */
export const FACT_LABEL: Readonly<Record<FactKey, string>> = {
  deadline: "Response deadline",
  destination: "Destination",
  origin: "Origin",
  quantity: "Quantity",
  delivery: "Delivery",
  timing: "Timing",
  product: "Product / HS",
  validity: "Validity",
  volume: "Volume licensed",
  published: "Published",
  holders: "Licence holders",
  conditions: "Conditions attached",
  corridor: "Corridor",
  signalDate: "Signal date",
  cadence: "Cadence",
  operator: "Operator",
  transit: "Transit",
  territory: "Territory",
  arrangement: "Arrangement",
  categories: "Categories",
  from: "Stated from",
  exclusivity: "Exclusivity",
  minimumCommitment: "Minimum commitment",
  contactRoute: "Contact route",
  service: "Service",
  duration: "Duration",
  scope: "Scope",
  basis: "Basis",
  value: "Commercial value",
  measure: "Measure",
  rate: "Rate as notified",
  effectFrom: "Effect from",
  review: "Review period",
  scopeOfGoods: "Goods in scope",
  grade: "Grade",
  movement: "Movement",
  index: "Index",
  packing: "Packing",
  priceBasis: "Price basis",
  paymentInstrument: "Payment instrument",
  bidBond: "Bid bond",
  agentRequirement: "Agent requirement",
};

/**
 * How many facts each surface asks for. Contexts differ in COUNT ONLY.
 *
 * The register renders the desktop count and hides the tail below the register
 * breakpoint, so the 390px row is literally the first two cells of the same
 * markup rather than a second, drifting list.
 */
export const FACT_CONTEXT = {
  "mobile-row": 2,
  "desktop-register": 3,
  "landing-card": 4,
  "detail-grid": 8,
} as const;

export type FactContext = keyof typeof FACT_CONTEXT;

/** One resolved fact, ready to render. */
export interface DeskFact {
  key: FactKey;
  label: string;
  value: string;
  /** True when the record does not state it and the absence is meaningful. */
  missing: boolean;
}

/** The value carried for each fact. A key absent here is a fact not stated. */
export type FactBag = Partial<Record<FactKey, string | null | undefined>>;

/** Anything `factsFor` can read. Deliberately minimal: a class and a bag. */
export interface FactBearing {
  cls: DeskClassification | string;
  facts: FactBag;
}

/** The words printed when a commercially meaningful fact is absent. */
export const NOT_STATED = "Not stated";

function isPresent(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function isClassification(v: string): v is DeskClassification {
  return Object.prototype.hasOwnProperty.call(FACT_PRIORITY, v);
}

/**
 * The single authority for which commercial facts a record shows.
 *
 * Returns at most `count` facts, and may return fewer by design when the
 * documented order runs out. Never returns a fact outside the classification's
 * `order`, and never reads object-key order.
 */
export function factsFor(
  record: FactBearing,
  opts: { count?: number; context?: FactContext } = {},
): DeskFact[] {
  const count = opts.count ?? (opts.context ? FACT_CONTEXT[opts.context] : 2);
  if (!isClassification(record.cls)) return [];

  const rule = FACT_PRIORITY[record.cls];
  const bag = record.facts ?? {};
  const out: DeskFact[] = [];

  for (let i = 0; i < rule.order.length && out.length < count; i++) {
    const key = rule.order[i];
    const value = bag[key];

    if (isPresent(value)) {
      // A populated source value always wins. `notStated` never overrides a
      // fact the record actually carries.
      out.push({ key, label: FACT_LABEL[key], value: value.trim(), missing: false });
    } else if (rule.notStated.includes(key)) {
      out.push({ key, label: FACT_LABEL[key], value: NOT_STATED, missing: true });
    }
    // Otherwise: absent and not commercially meaningful. Skipped, never
    // substituted with whatever else the record happens to hold.
  }

  return out;
}
