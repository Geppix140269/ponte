/** @type {import('next').NextConfig} */

// Legacy routes from the shop and Deal Desk eras. These are served as
// permanent redirects at the edge so search engines transfer the ranking
// signal instead of treating each hop as temporary. Page-level redirect()
// stubs remain in place as a fallback, but they only emit 307.
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

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
  webpack: (config) => {
    // pdfjs (react-pdf) optionally requires Node 'canvas'; not needed in-browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
