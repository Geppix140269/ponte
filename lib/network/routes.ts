// The site IS the marketplace. The report store is one feature inside it, so the
// marketplace (network) chrome is the DEFAULT everywhere — including the homepage.
//
// Only the report shopping funnel keeps the store chrome (cart icon + Catalogue/
// Bundles nav), because that is where a buyer actually needs them. Everything
// else — landing, listings, verify, deal rooms, pricing, admin, company pages —
// wears the marketplace chrome.
const STORE_ROUTES = new Set<string>([
  "/catalogue",
  "/cart",
  "/checkout",
  "/order-success",
]);

const STORE_PREFIXES = ["/category/", "/product/"];

// True only for the report shopping funnel — these keep the store header/footer.
export function isStoreRoute(pathname: string): boolean {
  if (STORE_ROUTES.has(pathname)) return true;
  return STORE_PREFIXES.some((p) => pathname.startsWith(p));
}

// True for everything that should wear the marketplace (network) chrome — i.e.
// the whole site except the report shopping funnel.
export function isPlatformRoute(pathname: string): boolean {
  return !isStoreRoute(pathname);
}
