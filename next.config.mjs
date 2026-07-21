import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Keep in sync with i18n/routing.ts. next.config cannot import TypeScript.
const NON_DEFAULT_LOCALES = ["zh", "es", "ar", "fr", "pt", "ru", "de", "hi", "it"];

// Legacy routes from the shop and Deal Desk eras. These are served as
// permanent redirects at the edge so search engines transfer the ranking
// signal instead of treating each hop as temporary. Page-level redirect()
// stubs remain in place as a fallback.
const LEGACY_REDIRECTS = [
  // Shop era: the report catalogue and its checkout funnel.
  { source: "/catalogue", destination: "/pricing" },
  { source: "/category/:slug", destination: "/pricing" },
  { source: "/product/:slug", destination: "/pricing" },
  { source: "/cart", destination: "/marketplace" },
  { source: "/checkout", destination: "/marketplace" },
  { source: "/order-success", destination: "/marketplace" },
  { source: "/methodology", destination: "/about" },
  { source: "/why-ponte", destination: "/about" },
  // Deal Desk era: one door now, the Marketplace.
  { source: "/brokerage", destination: "/marketplace" },
  { source: "/network", destination: "/marketplace" },
];

// A visitor reading in Spanish who hits a dead shop URL should land on the
// Spanish equivalent, not be thrown back to English.
function withLocaleVariants(rules) {
  return rules.flatMap((rule) => [
    { ...rule, permanent: true },
    ...NON_DEFAULT_LOCALES.map((locale) => ({
      source: `/${locale}${rule.source}`,
      destination: `/${locale}${rule.destination}`,
      permanent: true,
    })),
  ]);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return withLocaleVariants(LEGACY_REDIRECTS);
  },
  webpack: (config) => {
    // pdfjs (react-pdf) optionally requires Node 'canvas'; not needed in-browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
