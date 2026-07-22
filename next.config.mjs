import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Legacy shop and Deal Desk redirects are handled in middleware.ts, not here.
// Middleware runs at the edge, ahead of the origin, on Vercel as it did on
// Netlify, so a redirect declared here never sees an unprefixed path: the
// locale middleware has already rewritten it. Keeping one authority avoids the
// two of them disagreeing, which is how the same URL answered 307 in English
// and 308 in Spanish.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs (react-pdf) optionally requires Node 'canvas'; not needed in-browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
