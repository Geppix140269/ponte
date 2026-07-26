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
 * The role the member holds in the transaction. The old five could not describe
 * a trader on own account, a freight forwarder, or either kind of agent, and a
 * declared role is the one thing the chain rule rests on: it has to be possible
 * to declare the true one.
 */
export const ROLE_GROUPS: readonly TapGroup[] = [
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
  {
    label: "Service side",
    options: [
      "Freight forwarder",
      "Customs broker",
      "Inspection company",
      "Warehouse or terminal operator",
      "Trade finance provider",
    ],
  },
];

export const UNITS: readonly string[] = ["MT", "kg", "litres", "m3", "containers", "TEU", "pieces"];

export const FREQUENCIES: readonly string[] = [
  "Spot",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annual contract",
];
