/**
 * The Ponte trade glossary contract (LB-009).
 *
 * Controlled trade terminology is preserved across languages rather than
 * creatively translated (ADR-0016 section 5, LANGUAGES.md writing rules): Ponte
 * and Ponte AI, NCNDA, Incoterms, unit and container codes, currency codes,
 * listing references, HS codes and company names. A translation that alters one
 * of these has changed a commercial fact, not translated a sentence.
 *
 * This module provides the preserved-term vocabulary, deterministic detectors
 * for the coded identifiers, and a glossary version that participates in the
 * translation cache key so a glossary change invalidates cached translations.
 *
 * ## Native review is outstanding
 *
 * The per-language term choices below are machine-prepared starting fixtures.
 * ADR-0016 and the ExecPlan require native commercial review of launch-critical
 * wording before activation. This content has NOT received that review and must
 * not be described as native-approved. See `GLOSSARY_REVIEW_STATUS`.
 */

import { DEAL_ROOM_LANGUAGES, type DealRoomLanguage } from "./language";

/**
 * The glossary version. Bump on any change to preserved terms or per-language
 * entries. It is part of the translation cache identity, so a bump invalidates
 * cached translations rather than mutating them.
 */
export const GLOSSARY_VERSION = "v0-2026-07-30";

/**
 * Truthfully recorded review state. Machine-prepared, not yet reviewed by a
 * native commercial reader. Launch acceptance requires this to become reviewed.
 */
export const GLOSSARY_REVIEW_STATUS = "machine_prepared_pending_native_review" as const;

/**
 * Exact strings preserved verbatim in every language. Brand and legal-instrument
 * names and fixed Incoterm and unit/container codes.
 */
export const PRESERVED_TRADE_TERMS = [
  "Ponte",
  "Ponte AI",
  "NCNDA",
  // Incoterms (the four ADR-0016 names, plus the common set).
  "FOB",
  "CIF",
  "EXW",
  "DAP",
  "CFR",
  "FCA",
  "CPT",
  "CIP",
  "DPU",
  "DDP",
  // Unit and container codes.
  "MT",
  "KG",
  "FCL",
  "LCL",
  "TEU",
  "FEU",
] as const;

/**
 * Detectors for coded identifiers that must survive translation unchanged. Each
 * is anchored so it matches the identifier form, not ordinary prose.
 */
export const TRADE_IDENTIFIER_PATTERNS: Readonly<Record<string, RegExp>> = {
  // HS code: 6 to 10 digits, optionally dotted (e.g. 2710.19, 271019, 8471.30.00).
  hsCode: /\b\d{4}(?:\.?\d{2}){1,3}\b/,
  // Incoterm token.
  incoterm: /\b(?:FOB|CIF|EXW|DAP|CFR|FCA|CPT|CIP|DPU|DDP|FAS|FAS)\b/,
  // ISO 4217 currency codes used with an amount (e.g. USD 1,200, EUR 950.00).
  currencyAmount: /\b(?:USD|EUR|GBP|CNY|RUB|AED|CHF|JPY)\s?\d[\d,]*(?:\.\d+)?\b/,
  // Listing reference such as PT-1234.
  listingRef: /\bPT-\d{3,}\b/,
  // Container/unit code with a quantity (e.g. 25 MT, 2 FCL, 500 KG).
  unitQuantity: /\b\d[\d,]*(?:\.\d+)?\s?(?:MT|KG|FCL|LCL|TEU|FEU)\b/,
};

/**
 * Every preserved token or coded identifier found in a text, in order of first
 * appearance and de-duplicated. Used to prove a translation preserved them.
 */
export function preservedTermsIn(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (token: string) => {
    if (!seen.has(token)) {
      seen.add(token);
      found.push(token);
    }
  };

  for (const term of PRESERVED_TRADE_TERMS) {
    const pattern = new RegExp(`(?:^|[^\\w])(${escapeRegExp(term)})(?:$|[^\\w])`);
    if (pattern.test(text)) push(term);
  }
  for (const pattern of Object.values(TRADE_IDENTIFIER_PATTERNS)) {
    const global = new RegExp(pattern.source, "g");
    for (const match of Array.from(text.matchAll(global))) push(match[0].trim());
  }
  return found;
}

/**
 * Whether every preserved term and coded identifier in the source also appears,
 * unchanged, in the candidate translation. This is the glossary-preservation
 * check the translation tests assert.
 */
export function preservesTradeTerms(source: string, translation: string): boolean {
  return preservedTermsIn(source).every((term) => translation.includes(term));
}

/**
 * Per-language starting fixtures for a handful of launch-relevant trade phrases.
 * Machine-prepared, pending native review. Keys are stable English concept keys;
 * values are the phrase in each supported language. This is a fixture, not an
 * authority: it exists to seed tests and to give native reviewers a target.
 */
export const TRADE_GLOSSARY_FIXTURES: Readonly<
  Record<string, Record<DealRoomLanguage, string>>
> = {
  delivery_terms: {
    en: "delivery terms",
    es: "condiciones de entrega",
    ru: "условия поставки",
    "zh-CN": "交货条款",
    ar: "شروط التسليم",
  },
  quantity: {
    en: "quantity",
    es: "cantidad",
    ru: "количество",
    "zh-CN": "数量",
    ar: "الكمية",
  },
  payment_condition: {
    en: "payment condition",
    es: "condición de pago",
    ru: "условие оплаты",
    "zh-CN": "付款条件",
    ar: "شرط الدفع",
  },
  port_of_loading: {
    en: "port of loading",
    es: "puerto de carga",
    ru: "порт погрузки",
    "zh-CN": "装货港",
    ar: "ميناء الشحن",
  },
};

/** Assert the fixtures cover every supported language (a fixture completeness guard). */
export function glossaryFixturesCoverAllLanguages(): boolean {
  return Object.values(TRADE_GLOSSARY_FIXTURES).every((entry) =>
    DEAL_ROOM_LANGUAGES.every((language) => typeof entry[language] === "string" && entry[language].length > 0),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
