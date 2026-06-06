import type { Locale } from "./locales";

// Canonical message keys. Add keys here as strings get externalised from components.
export type MessageKey =
  | "nav.discovery" | "nav.verify" | "nav.dealRooms" | "nav.marketIntel"
  | "cta.runVerification" | "cta.startFree" | "cta.goPro" | "cta.contactSales"
  | "verify.title" | "verify.subtitle"
  | "tier.0" | "tier.1" | "tier.2" | "tier.3" | "tier.4"
  | "plan.free" | "plan.starter" | "plan.pro" | "plan.enterprise"
  | "deal.openRoom" | "deal.sendMessage" | "settlement.securedByPonte";

type Dict = Partial<Record<MessageKey, string>>;

// English is complete and is the fallback for every other locale.
const en: Record<MessageKey, string> = {
  "nav.discovery": "Discovery",
  "nav.verify": "Verify",
  "nav.dealRooms": "Deal rooms",
  "nav.marketIntel": "Market intelligence",
  "cta.runVerification": "Run verification",
  "cta.startFree": "Start free",
  "cta.goPro": "Go Pro",
  "cta.contactSales": "Contact sales",
  "verify.title": "Verify any counterparty",
  "verify.subtitle": "Sanctions, registry, customs activity and UBO in one check.",
  "tier.0": "Unverified",
  "tier.1": "Identity",
  "tier.2": "Business",
  "tier.3": "Activity",
  "tier.4": "Institutional",
  "plan.free": "Free",
  "plan.starter": "Starter",
  "plan.pro": "Pro",
  "plan.enterprise": "Enterprise",
  "deal.openRoom": "Open deal room",
  "deal.sendMessage": "Send message",
  "settlement.securedByPonte": "Secured by ponte",
};

// Italian — first real second locale (founder's market). Partial is fine.
const it: Dict = {
  "nav.discovery": "Scopri",
  "nav.verify": "Verifica",
  "nav.dealRooms": "Sale trattativa",
  "nav.marketIntel": "Intelligence di mercato",
  "cta.runVerification": "Avvia verifica",
  "cta.startFree": "Inizia gratis",
  "cta.goPro": "Passa a Pro",
  "cta.contactSales": "Contatta le vendite",
  "verify.title": "Verifica qualsiasi controparte",
  "verify.subtitle": "Sanzioni, registro imprese, attività doganale e titolare effettivo in un solo controllo.",
  "tier.0": "Non verificato",
  "tier.1": "Identità",
  "tier.2": "Impresa",
  "tier.3": "Attività",
  "tier.4": "Istituzionale",
  "plan.free": "Free",
  "plan.starter": "Starter",
  "plan.pro": "Pro",
  "plan.enterprise": "Enterprise",
  "deal.openRoom": "Apri sala trattativa",
  "deal.sendMessage": "Invia messaggio",
  "settlement.securedByPonte": "Garantito da ponte",
};

export const DICTIONARIES: Record<Locale, Record<MessageKey, string> | Dict> = {
  en, it, es: {}, pt: {}, fr: {}, de: {}, zh: {}, ar: {},
};
export const EN = en;
