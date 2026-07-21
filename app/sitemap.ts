import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Legacy shop and Deal Desk routes (/catalogue, /category/*, /product/*,
  // /cart, /checkout, /order-success, /brokerage, /network, /methodology,
  // /why-ponte) are permanent redirects in next.config.mjs. Redirecting URLs
  // are deliberately not listed here.
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    // Marketplace
    { url: `${BASE_URL}/marketplace`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // The desk
    { url: `${BASE_URL}/advisory`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // Company
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // Educational content
    { url: `${BASE_URL}/learn/trade-data`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/learn/duties`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Legal
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
