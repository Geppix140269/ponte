// The Ponte Trade route authority. This records the approved end-state and,
// for routes still being retired, whether the runtime cutover is implemented.

export type RouteClassification =
  | "canonical"
  | "redirect"
  | "internal"
  | "feature_gated"
  | "development_only";

export const ROUTE_CLASSIFICATIONS: readonly RouteClassification[] = [
  "canonical",
  "redirect",
  "internal",
  "feature_gated",
  "development_only",
];

export interface RouteEntry {
  path: string;
  classification: RouteClassification;
  subtree?: boolean;
  redirectsTo?: string;
  flag?: string;
  retirementImplemented?: boolean;
  note: string;
}

const CANONICAL: RouteEntry[] = [
  { path: "/", classification: "canonical", note: "Landing / entry." },
  { path: "/explore", classification: "canonical", subtree: true, note: "Explore the market." },
  { path: "/market-signals", classification: "canonical", note: "Public Market Signals board." },
  { path: "/market-signals/[id]", classification: "canonical", note: "Market Signal detail." },
  { path: "/find", classification: "canonical", note: "Public Member Opportunity board." },
  { path: "/find/o/[ref]", classification: "canonical", note: "Public Member Opportunity detail." },
  { path: "/structure", classification: "canonical", note: "The commercial-record creation and edit surface." },
  { path: "/opportunities", classification: "canonical", note: "Member-owned records and operations." },
  { path: "/workspace", classification: "canonical", note: "Inbound requests and actions requiring attention." },
  { path: "/login", classification: "canonical", note: "Sign in; generic fallback is /opportunities." },
  { path: "/account", classification: "canonical", note: "Desk profile, company, member-business status and sign-out." },
  { path: "/verify", classification: "canonical", note: "Business verification form host." },
  { path: "/verification", classification: "canonical", note: "Verification explainer." },
  { path: "/pricing", classification: "canonical", note: "Commercial page." },
  { path: "/about", classification: "canonical", note: "About." },
  { path: "/contact", classification: "canonical", note: "Contact." },
  { path: "/privacy", classification: "canonical", note: "Privacy." },
  { path: "/terms", classification: "canonical", note: "Terms." },
  { path: "/learn/duties", classification: "canonical", note: "Learn: duties." },
  { path: "/learn/trade-data", classification: "canonical", note: "Learn: trade data." },
];

const FEATURE_GATED: RouteEntry[] = [
  {
    path: "/check",
    classification: "feature_gated",
    flag: "NEXT_PUBLIC_CHECK_JOURNEY",
    note: "Counterparty check journey.",
  },
  {
    path: "/deal-rooms",
    classification: "feature_gated",
    subtree: true,
    flag: "NEXT_PUBLIC_DEAL_ROOM",
    note: "Deal Room progression loop.",
  },
];

const INTERNAL: RouteEntry[] = [
  { path: "/account/notifications", classification: "internal", note: "Deferred notification preferences." },
  { path: "/admin", classification: "internal", subtree: true, note: "Administrator operations." },
  { path: "/offline", classification: "internal", note: "PWA offline fallback." },
  { path: "/auth", classification: "internal", subtree: true, note: "Authentication route handlers." },
  { path: "/api", classification: "internal", subtree: true, note: "API namespace; marketplace APIs remain load-bearing." },
];

const DEVELOPMENT_ONLY: RouteEntry[] = [
  { path: "/dev", classification: "development_only", subtree: true, note: "Developer galleries and harnesses." },
];

const CUTOVER_REDIRECTS: RouteEntry[] = [
  {
    path: "/marketplace",
    classification: "redirect",
    redirectsTo: "/find",
    retirementImplemented: false,
    note: "Retire after member operations move in Stage 4.",
  },
  {
    path: "/marketplace/l/[ref]",
    classification: "redirect",
    redirectsTo: "/find/o/[ref]",
    retirementImplemented: false,
    note: "Retire after public-detail capability migration in Stage 3.",
  },
  {
    path: "/marketplace/new",
    classification: "redirect",
    redirectsTo: "/structure",
    retirementImplemented: true,
    note: "Legacy editor is redirect-only.",
  },
  {
    path: "/join",
    classification: "redirect",
    redirectsTo: "/login",
    retirementImplemented: true,
    note: "Stage 1: route handler captures referral attribution and redirects; no page UI remains.",
  },
];

const LEGACY_REDIRECTS: RouteEntry[] = [
  { path: "/catalogue", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Legacy shop." },
  { path: "/cart", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Repoint in Stage 4." },
  { path: "/checkout", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Repoint in Stage 4." },
  { path: "/order-success", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Repoint in Stage 4." },
  { path: "/methodology", classification: "redirect", redirectsTo: "/about", retirementImplemented: true, note: "Legacy." },
  { path: "/why-ponte", classification: "redirect", redirectsTo: "/about", retirementImplemented: true, note: "Legacy." },
  { path: "/brokerage", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Repoint in Stage 4." },
  { path: "/network", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Repoint in Stage 4." },
  { path: "/advisory", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Legacy analyst desk." },
  { path: "/category/[slug]", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Legacy shop category." },
  { path: "/product/[slug]", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Legacy shop product." },
];

export const ROUTE_MANIFEST: readonly RouteEntry[] = [
  ...CANONICAL,
  ...FEATURE_GATED,
  ...INTERNAL,
  ...DEVELOPMENT_ONLY,
  ...CUTOVER_REDIRECTS,
  ...LEGACY_REDIRECTS,
];

export function normalizePath(path: string): string {
  let normalized = path.split(/[?#]/)[0] ?? "";
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  const segments = normalized.split("/");
  if (segments[1] === "en") {
    segments.splice(1, 1);
    normalized = segments.join("/") || "/";
  }
  return normalized === "" ? "/" : normalized;
}

function segmentsMatch(pattern: string[], actual: string[]): boolean {
  if (pattern.length !== actual.length) return false;
  return pattern.every((segment, index) => segment.startsWith("[") || segment === actual[index]);
}

function subtreeMatch(pattern: string[], actual: string[]): boolean {
  if (actual.length < pattern.length) return false;
  return pattern.every((segment, index) => segment.startsWith("[") || segment === actual[index]);
}

export function findRoute(path: string): RouteEntry | undefined {
  const actual = normalizePath(path).split("/");

  for (const entry of ROUTE_MANIFEST) {
    if (entry.subtree) continue;
    if (segmentsMatch(entry.path.split("/"), actual)) return entry;
  }

  let best: RouteEntry | undefined;
  for (const entry of ROUTE_MANIFEST) {
    if (!entry.subtree) continue;
    if (subtreeMatch(entry.path.split("/"), actual)) {
      if (!best || entry.path.length > best.path.length) best = entry;
    }
  }
  return best;
}

export function isClassified(path: string, classification: RouteClassification): boolean {
  return findRoute(path)?.classification === classification;
}

export function routesOf(classification: RouteClassification): RouteEntry[] {
  return ROUTE_MANIFEST.filter((entry) => entry.classification === classification);
}
