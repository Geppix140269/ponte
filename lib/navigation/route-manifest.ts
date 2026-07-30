// The Ponte Trade route authority.
//
// One canonical record of every route the application owns, and what each route
// IS: a live product surface, a permanent redirect, internal infrastructure, a
// feature-gated surface, or a development-only page. Navigation builders,
// middleware redirects, sitemap and manifest entries and the route-audit test
// are all checked against this file, so a route's disposition is decided here
// and nowhere else.
//
// This manifest is the authority for the single-generation product cutover
// (docs/plans/active/single-generation-cutover.md). It records the END-STATE
// classification of every route AND, for routes still being retired, whether
// the retirement is implemented yet. It does not itself retire a route, flip a
// flag or move a capability: those are the later cutover PRs. What it does is
// make every one of those changes checkable.
//
// Paths are locale-relative (the next-intl middleware prefixes the active
// locale). Dynamic segments use the Next `[param]` form. A `subtree` entry
// covers itself and every deeper path under it.

export type RouteClassification =
  | "canonical" // a live, approved product surface the product links to
  | "redirect" // a permanent redirect to a canonical surface; renders no UI
  | "internal" // infrastructure: auth handlers, admin, API, PWA fallback
  | "feature_gated" // built, but reachable only when its flag is on
  | "development_only"; // never a production surface

export const ROUTE_CLASSIFICATIONS: readonly RouteClassification[] = [
  "canonical",
  "redirect",
  "internal",
  "feature_gated",
  "development_only",
];

export interface RouteEntry {
  /** Locale-relative path pattern. Dynamic segments use `[param]`. */
  path: string;
  classification: RouteClassification;
  /** True when this entry covers every deeper path under `path`. */
  subtree?: boolean;
  /** For `redirect`: the path this route resolves to. */
  redirectsTo?: string;
  /** For `feature_gated`: the env flag whose "on" value exposes the surface. */
  flag?: string;
  /**
   * For a route on the retirement path: whether the redirect is already live.
   * `false` means the page still renders and its retirement is a later cutover
   * PR. The route-audit test pins these so a retirement cannot regress and so a
   * page that starts redirecting must drop its `false`.
   */
  retirementImplemented?: boolean;
  /** One line: the capability, disposition or authority behind the entry. */
  note: string;
}

// ---------------------------------------------------------------------------
// Canonical product surfaces (the North Star route set).
// ---------------------------------------------------------------------------

const CANONICAL: RouteEntry[] = [
  { path: "/", classification: "canonical", note: "Landing / entry." },
  { path: "/explore", classification: "canonical", subtree: true, note: "Explore the market, migrated into the Desk shell." },
  { path: "/market-signals", classification: "canonical", note: "Public Market Signals entrance: the two sides of the market, then the board." },
  { path: "/market-signals/categories", classification: "canonical", note: "Market Signal category browse, measured from the live inventory." },
  { path: "/market-signals/[id]", classification: "canonical", note: "Market Signal detail." },
  { path: "/find", classification: "canonical", note: "Public opportunity board (Journey 1)." },
  { path: "/find/o/[ref]", classification: "canonical", note: "Public Member Opportunity detail. The one public record surface." },
  { path: "/structure", classification: "canonical", note: "The one commercial-record creation and edit surface (Journey 2)." },
  { path: "/opportunities", classification: "canonical", note: "Member-owned records and operations." },
  { path: "/workspace", classification: "canonical", note: "Inbound requests, decisions, actions requiring attention." },
  { path: "/login", classification: "canonical", note: "Sign in. No valid `next` must land on /opportunities (cutover PR 2)." },
  { path: "/account", classification: "canonical", note: "Profile, company, business status, sign-out. Rebuilt in the Desk shell (cutover PR 2)." },
  { path: "/verify", classification: "canonical", note: "Business verification form host. Credit-free member_business boundary (cutover PR 6)." },
  { path: "/verification", classification: "canonical", note: "Verification explainer." },
  { path: "/pricing", classification: "canonical", note: "Commercial page; accepted current commercial decisions only." },
  { path: "/about", classification: "canonical", note: "About." },
  { path: "/contact", classification: "canonical", note: "Contact." },
  { path: "/privacy", classification: "canonical", note: "Privacy." },
  { path: "/terms", classification: "canonical", note: "Terms." },
  { path: "/learn/duties", classification: "canonical", note: "Learn: duties." },
  { path: "/learn/trade-data", classification: "canonical", note: "Learn: trade data." },
];

// ---------------------------------------------------------------------------
// Feature-gated surfaces: built and safely disabled behind a flag.
// ---------------------------------------------------------------------------

const FEATURE_GATED: RouteEntry[] = [
  {
    path: "/check",
    classification: "feature_gated",
    flag: "NEXT_PUBLIC_CHECK_JOURNEY",
    note: "Counterparty check journey. Feature-gated until independently approved and deployable.",
  },
  {
    path: "/deal-rooms",
    classification: "feature_gated",
    subtree: true,
    flag: "NEXT_PUBLIC_DEAL_ROOM",
    note: "Deal Room progression loop. Feature-gated (also a server-side allowlist) until Gate C completes.",
  },
];

// ---------------------------------------------------------------------------
// Internal infrastructure: not user-facing navigation.
//
// `/api/marketplace/*` is deliberately recorded here and is NOT a retirement
// target: Start a Deal and Find both post to it. Retiring the `/marketplace`
// PAGES must not touch the `/marketplace` API.
// ---------------------------------------------------------------------------

const INTERNAL: RouteEntry[] = [
  { path: "/account/notifications", classification: "internal", note: "Deferred notification-preferences surface (PL-025); no route serves it yet." },
  { path: "/admin", classification: "internal", subtree: true, note: "Administrator operations." },
  { path: "/offline", classification: "internal", note: "PWA offline fallback." },
  { path: "/auth", classification: "internal", subtree: true, note: "Auth route handlers (callback, confirm, signout). Not locale-routed." },
  { path: "/api", classification: "internal", subtree: true, note: "API namespace. /api/marketplace/* is load-bearing infra, not a retirement target." },
];

// ---------------------------------------------------------------------------
// Development-only pages: never a production surface.
// ---------------------------------------------------------------------------

const DEVELOPMENT_ONLY: RouteEntry[] = [
  { path: "/dev", classification: "development_only", subtree: true, note: "Developer galleries and harnesses." },
];

// ---------------------------------------------------------------------------
// Redirects on the cutover path (page routes being retired).
//
// `/marketplace/new` already redirects (LB-013). The other three still render
// and their retirement is a later cutover PR, marked `retirementImplemented:
// false`. The capability migration each one owns is recorded in the ExecPlan.
// ---------------------------------------------------------------------------

const CUTOVER_REDIRECTS: RouteEntry[] = [
  {
    path: "/marketplace",
    classification: "redirect",
    redirectsTo: "/find",
    retirementImplemented: false,
    note: "Board -> /find. Owner-side introduction decisions and reconfirmation -> /opportunities + /workspace; account brief -> /account. Retire only after those move (cutover PR 5).",
  },
  {
    path: "/marketplace/l/[ref]",
    classification: "redirect",
    redirectsTo: "/find/o/[ref]",
    retirementImplemented: false,
    note: "Public listing detail -> /find/o/[ref] (cutover PR 4).",
  },
  {
    path: "/marketplace/new",
    classification: "redirect",
    redirectsTo: "/structure",
    retirementImplemented: true,
    note: "Legacy listing editor. Already quarantined to a redirect via lib/marketplace/legacy-redirect.ts (LB-013).",
  },
  {
    path: "/join",
    classification: "redirect",
    redirectsTo: "/login",
    retirementImplemented: true,
    note: "Referral capture then /login, implemented in middleware.ts (cutover PR 2). Renders no UI.",
  },
];

// ---------------------------------------------------------------------------
// Legacy shop / Deal Desk redirects. These are implemented in middleware.ts,
// which is the runtime authority; they are mirrored here so the manifest is a
// complete map and the audit can check for redirect chains.
// ---------------------------------------------------------------------------

const LEGACY_REDIRECTS: RouteEntry[] = [
  { path: "/catalogue", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Legacy shop." },
  { path: "/cart", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Legacy shop. Repoint to /find when /marketplace retires." },
  { path: "/checkout", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Legacy shop. Repoint to /find when /marketplace retires." },
  { path: "/order-success", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Legacy shop. Repoint to /find when /marketplace retires." },
  { path: "/methodology", classification: "redirect", redirectsTo: "/about", retirementImplemented: true, note: "Legacy." },
  { path: "/why-ponte", classification: "redirect", redirectsTo: "/about", retirementImplemented: true, note: "Legacy." },
  { path: "/brokerage", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Legacy. Repoint to /find when /marketplace retires." },
  { path: "/network", classification: "redirect", redirectsTo: "/marketplace", retirementImplemented: true, note: "Legacy. Repoint to /find when /marketplace retires." },
  { path: "/advisory", classification: "redirect", redirectsTo: "/pricing", retirementImplemented: true, note: "Analyst Desk generation -> the success-fee option on /pricing." },
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

// ---------------------------------------------------------------------------
// Resolution.
// ---------------------------------------------------------------------------

/** Strip query/hash, a trailing slash, and a leading locale segment. */
export function normalizePath(path: string): string {
  let p = path.split(/[?#]/)[0] ?? "";
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  const segs = p.split("/");
  // Only English ships today, but strip any locale-looking first segment
  // defensively so /en/find resolves the same as /find.
  if (segs[1] === "en") {
    segs.splice(1, 1);
    p = segs.join("/") || "/";
  }
  return p === "" ? "/" : p;
}

function segmentsMatch(pattern: string[], actual: string[]): boolean {
  if (pattern.length !== actual.length) return false;
  return pattern.every((seg, i) => seg.startsWith("[") || seg === actual[i]);
}

function subtreeMatch(pattern: string[], actual: string[]): boolean {
  if (actual.length < pattern.length) return false;
  return pattern.every((seg, i) => seg.startsWith("[") || seg === actual[i]);
}

/**
 * The manifest entry that owns a path, or undefined if the path is not a known
 * route. Exact and dynamic matches win over subtree matches; among subtree
 * matches the longest (most specific) prefix wins.
 */
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

/** True when a path resolves to a route classified `classification`. */
export function isClassified(path: string, classification: RouteClassification): boolean {
  return findRoute(path)?.classification === classification;
}

/** Every entry with a given classification. */
export function routesOf(classification: RouteClassification): RouteEntry[] {
  return ROUTE_MANIFEST.filter((entry) => entry.classification === classification);
}
