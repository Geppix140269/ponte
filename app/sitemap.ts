import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/routing";
import { localeAlternates, localeUrl } from "@/lib/seo";
import { listIndexableSignals } from "@/lib/board/indexable-signals";

// Paths worth indexing, with their crawl hints. Legacy shop and Deal Desk
// routes (catalogue, category, product, cart, checkout, order-success,
// brokerage, network, methodology, why-ponte, advisory) are permanent
// redirects in middleware.ts, so they are deliberately not listed.
const PATHS: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  // The public opportunity board. The obsidian marketplace path held this slot
  // until cutover PR 5 retired it; it is a permanent redirect to this path now,
  // so listing it here as well would advertise a redirect to a crawler.
  { path: "/find", changeFrequency: "weekly", priority: 0.9 },
  // Market Signals. The entrance and the market browse are the two crawlable
  // hubs: every indexable signal is reachable from the second, which is what
  // stops the individual signal URLs below being orphans in the sitemap.
  { path: "/market-signals", changeFrequency: "daily", priority: 0.9 },
  { path: "/market-signals/categories", changeFrequency: "daily", priority: 0.8 },
  // Verification. Answers "how do I verify a trade counterparty", so it is
  // crawled at the same weight as the board itself.
  { path: "/verification", changeFrequency: "monthly", priority: 0.9 },
  // Fees
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  // Company
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  // Educational content
  { path: "/learn/trade-data", changeFrequency: "monthly", priority: 0.7 },
  { path: "/learn/duties", changeFrequency: "monthly", priority: 0.7 },
  // Legal. Originals are English, but the URLs still exist per locale.
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * The largest number of signal URLs this sitemap will carry.
 *
 * The protocol's own ceiling is 50,000 per file. This sits well under it and is
 * a deliberate bound rather than a guess about the inventory: the read is
 * ordered newest-first, so if the inventory ever outgrows this the sitemap
 * carries the most recent signals and drops the oldest, which is the right way
 * round. Growing past it is a signal to split the file with `generateSitemaps`,
 * not to raise the number silently.
 */
const SIGNAL_URL_LIMIT = 20_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Every path is emitted once per language, each entry carrying the full
  // hreflang set so crawlers can pair the translations.
  const staticPaths = PATHS.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: localeUrl(path, locale),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: localeAlternates(path) },
    })),
  );

  /*
   * The individual signals.
   *
   * Only the ones a crawler is actually allowed to have: the read applies the
   * same approved / in-window / indexable predicates the detail page's `robots`
   * directive applies, so the sitemap can never advertise a URL that then tells
   * the crawler to go away. A sitemap disagreeing with a page's own directive is
   * a crawl-budget leak and, worse, a claim that something is public when it is
   * not.
   *
   * Emitted in the DEFAULT LOCALE only. A signal's facts are stored in one
   * language and are not translated, so listing the same record under every
   * hreflang would offer a crawler several URLs for one untranslated page.
   *
   * A failed read yields the static paths alone. A sitemap that 500s teaches a
   * crawler to stop asking; a shorter one costs a crawl cycle.
   */
  const signals = await listIndexableSignals(SIGNAL_URL_LIMIT);
  const signalPaths = signals.map((signal) => ({
    url: localeUrl(`/market-signals/${signal.id}`, defaultLocale),
    lastModified: signal.lastModified ? new Date(signal.lastModified) : now,
    changeFrequency: "monthly" as const,
    // Below the hubs on purpose: an individual dated indication is not as
    // valuable a landing page as the market it sits in.
    priority: 0.5,
  }));

  return [...staticPaths, ...signalPaths];
}
