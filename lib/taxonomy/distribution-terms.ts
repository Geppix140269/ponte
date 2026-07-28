import type { CategoryOption } from "./services";

/**
 * The commercial vocabulary a Distribution and representation record is built
 * from, downstream of its partner type, relationship and coverage.
 *
 * `distribution.ts` separated the three dimensions that were previously mixed
 * into one flat list: who the counterparty is, how the arrangement is
 * structured, and where it applies. Those are the classification. What was
 * never asked is the commercial substance underneath them: which products or
 * sectors, through which channels, with what capability, on what expectations
 * and on what timing. After classification the record was handed straight to
 * the product journey and asked for a shipped quantity and an Incoterm.
 *
 * A distribution opportunity may REFER to products. It is not a product sale,
 * and an opening-order expectation is a term of a relationship, not a shipment
 * quantity. That distinction is the reason `commercialExpectations` lives here
 * and is labelled as an expectation, rather than being folded into the product
 * quantity field where it would print on the board as goods for sale.
 */

const option = (key: string, label: string, description: string, sort: number): CategoryOption => ({
  key,
  label,
  description,
  icon: null,
  sort,
});

/**
 * How the products reach customers.
 *
 * Channels are not coverage and not a partner type. A national distributor
 * selling into retail and food service is one partner, one territory and two
 * channels, and only a separate field can say so.
 */
export const DISTRIBUTION_CHANNELS: readonly CategoryOption[] = [
  option("retail", "Retail", "Supermarkets, chains and independent retail.", 1),
  option("wholesale", "Wholesale", "Wholesalers, cash and carry, and trade supply.", 2),
  option("horeca", "Hotels, restaurants and catering", "Food service and hospitality.", 3),
  option("specialist", "Specialist stores", "Delicatessens, specialist and premium outlets.", 4),
  option("ecommerce", "E-commerce", "Own online sales and direct-to-customer channels.", 5),
  option("marketplace", "Online marketplaces", "Third-party marketplace platforms.", 6),
  option("pharmacy", "Pharmacy and parapharmacy", "Pharmacy and health retail channels.", 7),
  option("healthcare", "Hospitals and healthcare", "Clinical, hospital and care providers.", 8),
  option("industrial", "Industrial and B2B", "Manufacturers and industrial end users.", 9),
  option("public", "Public procurement", "Government, municipal and institutional tenders.", 10),
  option("dealer", "Dealer or reseller network", "An established network of resellers.", 11),
  option("direct", "Direct sales", "Own sales force selling directly to end customers.", 12),
  option("duty_free", "Duty free and travel retail", "Airport, border and travel retail.", 13),
];

/**
 * What the partner brings, or is required to bring.
 *
 * Deliberately keys rather than prose: this is the field a member on the other
 * side of the market filters on. "Has an import licence" is a searchable fact;
 * a sentence mentioning a licence is not.
 */
export const DISTRIBUTION_CAPABILITIES: readonly CategoryOption[] = [
  option("sales_team", "Sales team", "An existing field or account sales force.", 1),
  option("customer_network", "Customer network", "Established relationships with buyers in the territory.", 2),
  option("warehousing", "Warehousing", "Own or contracted storage in the territory.", 3),
  option("logistics", "Logistics", "Transport and delivery capability.", 4),
  option("import_licence", "Import capability or licence", "Able to act as importer or importer of record.", 5),
  option("regulatory", "Regulatory capability", "Product registration, labelling and market access.", 6),
  option("marketing", "Marketing investment", "Local marketing, promotion and brand building.", 7),
  option("local_office", "Local office", "A registered presence in the territory.", 8),
  option("technical_support", "Technical support", "Pre-sales and application support.", 9),
  option("installation", "Installation", "Installation or commissioning capability.", 10),
  option("after_sales", "After-sales service", "Servicing, spares and warranty handling.", 11),
  option("cold_chain", "Cold chain", "Temperature-controlled handling and storage.", 12),
  option("finance", "Financial capacity", "Able to carry stock and payment terms.", 13),
];

/** When the arrangement would start, or has to be decided by. */
export const DISTRIBUTION_TIMING: readonly CategoryOption[] = [
  option("immediate", "Immediately", "Ready to start now.", 1),
  option("within_quarter", "Within three months", "Partner selection or launch in the coming quarter.", 2),
  option("within_year", "Within a year", "A planned market entry over the coming year.", 3),
  option("exploratory", "Exploratory", "Assessing the market before committing to a date.", 4),
  option("seasonal", "Ahead of a season", "Tied to a season or a trade event.", 5),
  option("long_term", "Long term", "A continuing relationship with no fixed start.", 6),
];

export function distributionChannel(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_CHANNELS.find((c) => c.key === key) ?? null;
}

export function distributionCapability(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_CAPABILITIES.find((c) => c.key === key) ?? null;
}

export function distributionTiming(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_TIMING.find((t) => t.key === key) ?? null;
}
