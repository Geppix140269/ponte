import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { localeAlternates, localeUrl } from "@/lib/seo";

// Paths worth indexing, with their crawl hints. Legacy shop and Deal Desk
// routes (catalogue, category, product, cart, checkout, order-success,
// brokerage, network, methodology, why-ponte) are permanent redirects in
// next.config.mjs, so they are deliberately not listed.
const PATHS: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  // Marketplace
  { path: "/marketplace", changeFrequency: "weekly", priority: 0.9 },
  // The desk
  { path: "/advisory", changeFrequency: "monthly", priority: 0.8 },
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Every path is emitted once per language, each entry carrying the full
  // hreflang set so crawlers can pair the translations.
  return PATHS.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: localeUrl(path, locale),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: localeAlternates(path) },
    })),
  );
}
