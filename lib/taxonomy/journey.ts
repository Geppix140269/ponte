import type { MarketFamily, MarketIntent } from "./market";
import { isIntentForFamily } from "./market";

/**
 * The ordered classification a family and intent asks for, before any prose.
 *
 * This is the rule the owner requirement states in one sentence: Ponte asks the
 * user to choose what the opportunity is before asking them to describe its
 * details. Encoding the order here rather than in the composer means Find, the
 * composer, Explore and any later surface ask the same questions in the same
 * order, and a test can assert that none of them opens on free text.
 *
 * `required` is what the record cannot be stored without. Everything else is
 * offered and skippable, exactly as the existing completion queue treats a
 * fact the member did not give: absent, not invented.
 */

export type ClassificationStep =
  | "product_sector"
  | "product_classification"
  | "service_category"
  | "service_subcategory"
  | "distribution_partner_type"
  | "distribution_relationship"
  | "distribution_coverage"
  | "details";

export interface ClassificationJourney {
  family: MarketFamily;
  intent: MarketIntent;
  /** The first substantive question. Never free text, for any family. */
  first: ClassificationStep;
  steps: readonly ClassificationStep[];
  required: readonly ClassificationStep[];
  /** The heading, in the member's own commercial direction. */
  heading: string;
}

/**
 * Every intent, with its own heading and its own ordered steps.
 *
 * The three distribution intents genuinely differ, which is why they are listed
 * separately rather than sharing one shape. A member offering coverage is
 * describing capability they already have; a member seeking brands to represent
 * starts from the product sectors they want, because that is what they are
 * actually choosing between.
 */
export const CLASSIFICATION_JOURNEYS: readonly ClassificationJourney[] = [
  {
    family: "products",
    intent: "source_product",
    first: "product_sector",
    steps: ["product_sector", "product_classification", "details"],
    required: ["product_classification"],
    heading: "What product do you need?",
  },
  {
    family: "products",
    intent: "offer_product",
    first: "product_sector",
    steps: ["product_sector", "product_classification", "details"],
    required: ["product_classification"],
    heading: "What product do you offer?",
  },
  {
    family: "services",
    intent: "seek_trade_service",
    first: "service_category",
    steps: ["service_category", "service_subcategory", "details"],
    required: ["service_category", "service_subcategory"],
    heading: "What trade service do you need?",
  },
  {
    family: "services",
    intent: "offer_trade_service",
    first: "service_category",
    steps: ["service_category", "service_subcategory", "details"],
    required: ["service_category", "service_subcategory"],
    heading: "Which trade service do you provide?",
  },
  {
    family: "distribution",
    intent: "seek_distribution_partner",
    first: "distribution_partner_type",
    steps: [
      "distribution_partner_type",
      "product_sector",
      "distribution_coverage",
      "distribution_relationship",
      "details",
    ],
    required: ["distribution_partner_type"],
    heading: "What type of distribution partner are you looking for?",
  },
  {
    family: "distribution",
    intent: "offer_distribution_or_representation",
    first: "distribution_partner_type",
    steps: [
      "distribution_partner_type",
      "product_sector",
      "distribution_coverage",
      "distribution_relationship",
      "details",
    ],
    required: ["distribution_partner_type"],
    heading: "What distribution or representation capability do you offer?",
  },
  {
    family: "distribution",
    intent: "seek_brands_or_products_to_represent",
    first: "product_sector",
    steps: [
      "product_sector",
      "distribution_partner_type",
      "distribution_coverage",
      "distribution_relationship",
      "details",
    ],
    required: ["product_sector", "distribution_partner_type"],
    heading: "What type of products or brands do you want to take to market?",
  },
];

export function journeyFor(
  family: MarketFamily | null | undefined,
  intent: MarketIntent | string | null | undefined,
): ClassificationJourney | null {
  if (!family || !intent) return null;
  if (!isIntentForFamily(family, intent)) return null;
  return CLASSIFICATION_JOURNEYS.find((j) => j.family === family && j.intent === intent) ?? null;
}

/**
 * The step a journey opens on. Exported separately because the assertion that
 * matters most is about this one value: it is never `details`, for any family
 * or intent, which is the whole of the owner requirement in one test.
 */
export function firstStepFor(
  family: MarketFamily | null | undefined,
  intent: MarketIntent | string | null | undefined,
): ClassificationStep | null {
  return journeyFor(family, intent)?.first ?? null;
}
