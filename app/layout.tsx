import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ponte.trade. The verified trade network.",
    template: "%s | ponte.trade",
  },
  description:
    "The verified network for real buyers, sellers, and trading houses. Verify any counterparty against sanctions, registry, customs activity and beneficial owners, publish offers and requests, and settle securely. Backed by ADAMftd and 7B+ verified trade records.",
  openGraph: {
    title: "ponte.trade. The verified trade network.",
    description:
      "Verify any counterparty, trade directly with verified principals, and settle securely. Backed by ADAMftd and 7B+ verified trade records.",
    url: APP_URL,
    siteName: "Ponte Trade",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "ponte.trade. The verified trade network.",
    description:
      "Verify any counterparty, trade directly with verified principals, and settle securely. Backed by ADAMftd and 7B+ verified trade records.",
  },
};

// Organization-level structured data, emitted on every page so search engines
// understand the Ponte Trade / ICTTM / ADAMftd relationship and can show
// rich results.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ponte Trade",
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  email: "hello@ponte.trade",
  description:
    "The verified trade network for real buyers, sellers, and trading houses: counterparty verification, direct deal rooms, secured settlement, and market intelligence. Backed by ADAMftd and 7B+ verified trade records.",
  parentOrganization: {
    "@type": "Organization",
    name: "International Centre for Trade Transparency Limited (ICTTM)",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Ponte Trade",
  url: APP_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
        <div className="bg-ambient" aria-hidden="true" />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
