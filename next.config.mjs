import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Legacy shop and Deal Desk redirects are handled in middleware.ts, not here.
// On Netlify the middleware runs at the edge, ahead of the origin, so a
// redirect declared here never sees an unprefixed path: the locale middleware
// has already rewritten it. Keeping one authority avoids the two of them
// disagreeing, which is how the same URL answered 307 in English and 308 in
// Spanish.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Normally `.next`, and it must stay `.next` everywhere real.
   *
   * The one caller that overrides it is the visual-evidence run. It needs the
   * production build on one port (that is what the landing evidence is captured
   * against) and a development server on another, because the product intake
   * state gallery 404s in production exactly like the Ponte Flow specimen sheet.
   * Both servers write to the build directory, so sharing one meant `next dev`
   * cleared the production build out from under `next start` and the whole
   * suite failed on a missing build id.
   *
   * Set only by `playwright.config.ts`. Nothing in development, CI or
   * deployment sets it, so the default is the only value that ever ships.
   */
  distDir: process.env.PONTE_DIST_DIR || ".next",
  webpack: (config) => {
    // pdfjs (react-pdf) optionally requires Node 'canvas'; not needed in-browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
