/**
 * The tap vocabularies for the Structure composer.
 *
 * "Tap, not type" only works if the list is the trade's real list. A short list
 * is not simplicity, it is a wrong answer with no way to say so: five payment
 * terms left a member who settles on documents against acceptance, or on 30%
 * advance and balance against copy documents, with nothing true to tap.
 *
 * So each list here is the working vocabulary of the term it names, grouped so
 * a long list still reads at a glance, and each one ends with an honest escape
 * ("To be agreed") rather than forcing an invention. Values are stored as the
 * strings below: the columns behind them are free text, and the printed listing
 * says exactly what was tapped.
 *
 * These are separated from the component so they can be read, reviewed and
 * corrected as vocabulary, without touching the flow.
 */

export type TapGroup = {
  /** The group heading, or null for an ungrouped run of options. */
  label: string | null;
  options: string[];
};

/** A flat list of every option in a grouped vocabulary. */
export function optionsOf(groups: readonly TapGroup[]): string[] {
  return groups.flatMap((g) => g.options);
}

/**
 * Incoterms 2020, all eleven, grouped as the ICC publishes them: the seven that
 * work for any mode of transport, and the four that are sea and inland waterway
 * only. The previous list carried five and silently omitted FCA, the rule the
 * ICC recommends for containerised cargo, and every D rule but DDP.
 */
export const INCOTERM_GROUPS: readonly TapGroup[] = [
  { label: "Any mode", options: ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP"] },
  { label: "Sea and inland waterway", options: ["FAS", "FOB", "CFR", "CIF"] },
];

/** The full rule name, shown under the code so the letters are not a quiz. */
export const INCOTERM_MEANING: Record<string, string> = {
  EXW: "Ex Works",
  FCA: "Free Carrier",
  CPT: "Carriage Paid To",
  CIP: "Carriage and Insurance Paid To",
  DAP: "Delivered at Place",
  DPU: "Delivered at Place Unloaded",
  DDP: "Delivered Duty Paid",
  FAS: "Free Alongside Ship",
  FOB: "Free on Board",
  CFR: "Cost and Freight",
  CIF: "Cost, Insurance and Freight",
};

/**
 * Payment terms, grouped by who carries the risk while the money moves. Long
 * on purpose: these are the terms deals actually close on, and a member who
 * cannot find theirs has been asked a question with no true answer.
 */
export const PAYMENT_GROUPS: readonly TapGroup[] = [
  {
    label: "Paid up front",
    options: [
      "TT in advance, 100%",
      "TT in advance, 50%",
      "TT in advance, 30%, balance against documents",
      "TT in advance, 20%, balance against documents",
      "Deposit, balance before shipment",
    ],
  },
  {
    label: "Letter of credit",
    options: [
      "Irrevocable LC at sight",
      "Irrevocable LC, 30 days",
      "Irrevocable LC, 60 days",
      "Irrevocable LC, 90 days",
      "Confirmed irrevocable LC at sight",
      "Transferable LC",
      "Revolving LC",
      "Standby LC",
    ],
  },
  {
    label: "Against documents",
    options: [
      "CAD (cash against documents)",
      "D/P (documents against payment)",
      "D/A (documents against acceptance), 30 days",
      "D/A (documents against acceptance), 60 days",
      "D/A (documents against acceptance), 90 days",
    ],
  },
  {
    label: "On credit",
    options: [
      "Open account, 30 days",
      "Open account, 60 days",
      "Open account, 90 days",
      "Open account, 120 days",
      "Payment on arrival",
      "Consignment",
    ],
  },
  {
    label: "Secured by a third party",
    options: [
      "Bank guarantee",
      "Escrow",
      "Trade finance facility",
      "Documentary collection through banks",
      "Credit insurance in place",
    ],
  },
  { label: null, options: ["To be agreed"] },
];

/**
 * How long the offer or requirement stays open. Values are day counts, plus
 * "standing" for one with no end date, which the listings table already models
 * (validity_type 'standing', no valid_until). "How long is this valid?" was
 * ambiguous about WHAT was valid; the copy now names it, and the options no
 * longer stop at 90 days as though nothing stays open longer.
 */
export const VALIDITY_DAYS: readonly number[] = [7, 14, 30, 60, 90, 180];

/**
 * The role the member holds, by the family of record they are creating.
 *
 * One list for every family was wrong in the way a member notices immediately.
 * A freight forwarder listing road freight was asked "What is your role?" and
 * shown "Principal to the deal", "Acting for a principal" and "Service side" in
 * one column: producer, grower, end buyer, exclusive distributor and customs
 * broker offered as answers to the same question. Two thirds of that list
 * cannot be true of the record being created, and a list mostly made of
 * impossible answers reads as a question the member has misunderstood.
 *
 * A declared role is also the one thing the chain rule rests on, so the list
 * has to make the TRUE answer easy to find, not merely present.
 *
 * `roleGroupsFor` in `procedures/registry.ts` chooses between these. Values are
 * stored as the strings below, exactly as they always were: a record that
 * already holds "Freight forwarder" keeps it.
 */

/** Buying or selling goods: the member is on one side of a shipment. */
export const PRODUCT_ROLE_GROUPS: readonly TapGroup[] = [
  {
    label: "Principal to the deal",
    options: [
      "Producer / manufacturer",
      "Grower / farmer",
      "Processor",
      "Principal (own account)",
      "Trader (own account)",
      "End buyer",
    ],
  },
  {
    label: "Acting for a principal",
    options: [
      "Mandated seller's agent",
      "Mandated buyer's agent",
      "Exclusive distributor",
      "Distributor",
      "Broker",
      "Intermediary",
    ],
  },
];

/**
 * Offering a trade service: the member is the service side, and the only real
 * question is whether they perform the work or arrange it.
 *
 * A producer, a grower and an end buyer are not roles anybody can hold on a
 * record offering freight, customs clearance or inspection.
 */
export const SERVICE_PROVIDER_ROLE_GROUPS: readonly TapGroup[] = [
  {
    label: "Performing the service",
    options: [
      "Service provider (own account)",
      "Carrier or asset operator",
      "Freight forwarder",
      "Customs broker",
      "Inspection company",
      "Warehouse or terminal operator",
      "Trade finance provider",
      "Insurance intermediary",
      "Certification or testing body",
      "Trade adviser or consultant",
    ],
  },
  {
    label: "Arranging it for others",
    options: [
      "Agent for a service provider",
      "Broker",
      "Intermediary",
    ],
  },
];

/**
 * Seeking a trade service: the member is the CUSTOMER for it, so their role is
 * their position in the trade the service serves, not the service itself.
 *
 * The third group is not a contradiction. A forwarder buying line-haul capacity
 * and a customs broker subcontracting an inspection are both real, and both are
 * a service business buying a service.
 */
export const SERVICE_SEEKER_ROLE_GROUPS: readonly TapGroup[] = [
  {
    label: "Principal to the underlying trade",
    options: [
      "Producer / manufacturer",
      "Processor",
      "Trader (own account)",
      "Exporter / shipper",
      "Importer / consignee",
      "End buyer",
    ],
  },
  {
    label: "Acting for a principal",
    options: [
      "Mandated seller's agent",
      "Mandated buyer's agent",
      "Distributor",
      "Broker",
      "Intermediary",
    ],
  },
  {
    label: "Buying capacity for my own service business",
    options: [
      "Freight forwarder",
      "Customs broker",
      "Warehouse or terminal operator",
      "Other service provider",
    ],
  },
];

/**
 * Distribution and representation: the member is on the brand side or the
 * channel side of an arrangement, never on the service side of a shipment.
 *
 * Both sides are offered whichever intent the member entered through, because
 * a manufacturer seeking a distributor and a distributor seeking brands are the
 * two ends of the same conversation and a member may genuinely be either. The
 * ORDER changes with the intent, so the likely side reads first.
 */
export const DISTRIBUTION_BRAND_SIDE: TapGroup = {
  label: "Brand or supply side",
  options: [
    "Producer / manufacturer",
    "Brand owner",
    "Processor",
    "Exporter (own account)",
    "Trader (own account)",
  ],
};

export const DISTRIBUTION_CHANNEL_SIDE: TapGroup = {
  label: "Channel or market side",
  options: [
    "Exclusive distributor",
    "Distributor",
    "Importer",
    "Wholesaler",
    "Retailer",
    "Sales agent",
    "Commercial representative",
    "Reseller",
  ],
};

export const DISTRIBUTION_ADVISORY_SIDE: TapGroup = {
  label: "Acting for a principal",
  options: [
    "Mandated seller's agent",
    "Mandated buyer's agent",
    "Broker",
    "Intermediary",
    "Market-entry consultant",
  ],
};

/**
 * The legacy combined list.
 *
 * Kept only so a caller that has no family to reason from still has every role
 * available. Nothing in the composer reads it: the composer always knows its
 * family, and `roleGroupsFor` is what it asks.
 */
export const ROLE_GROUPS: readonly TapGroup[] = [
  ...PRODUCT_ROLE_GROUPS,
  { label: "Service side", options: SERVICE_PROVIDER_ROLE_GROUPS[0].options },
];

export const UNITS: readonly string[] = ["MT", "kg", "litres", "m3", "containers", "TEU", "pieces"];

export const FREQUENCIES: readonly string[] = [
  "Spot",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annual contract",
];
