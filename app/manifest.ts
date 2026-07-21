import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. The middleware matcher excludes that path,
// because the locale middleware would otherwise redirect it to /en/... and the
// install prompt would never appear.
//
// One manifest, in English, for all ten locales. The name is a proper noun and
// the description is read by the install dialog rather than by the page. A
// manifest per locale would need its own link tag per locale and a separate
// route, and would buy a translated string that most members never see.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ponte Trade",
    short_name: "Ponte",
    description:
      "The vetted marketplace for physical trade. Counterparties checked against company registries and sanctions lists, members connect directly, no commission.",
    // The query is how the analytics tell an installed launch from a browser
    // visit. It is harmless if it survives into a shared URL.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    // Deliberately not locked. A board of dense trade rows is genuinely easier
    // to read in landscape, and fighting the device is not a courtesy.
    orientation: "any",
    background_color: "#07101B",
    theme_color: "#07101B",
    categories: ["business", "productivity", "finance"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/brand/favicons/android-chrome-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/favicons/android-chrome-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/favicons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    // Long press the installed icon. Three verbs, matching the bottom bar.
    shortcuts: [
      {
        name: "Open the board",
        short_name: "Board",
        url: "/marketplace?source=pwa",
      },
      {
        name: "Post a listing",
        short_name: "Post",
        url: "/marketplace/new?source=pwa",
      },
      {
        name: "Verify a company",
        short_name: "Verify",
        url: "/verify?source=pwa",
      },
    ],
  };
}
