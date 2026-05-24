import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Ponte Trade — Trade intelligence. Delivered.",
    template: "%s — Ponte Trade",
  },
  description:
    "Research-grade market reports and trade analysis. No subscription required — buy the intelligence you need as a one-time purchase.",
  openGraph: {
    title: "Ponte Trade — Trade intelligence. Delivered.",
    description:
      "Research-grade market reports and trade analysis. Buy what you need.",
    url: APP_URL,
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponte Trade — Trade intelligence. Delivered.",
    description:
      "Research-grade market reports and trade analysis. Buy what you need.",
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
    "Research-grade international trade intelligence sold as one-time reports — market analysis, geopolitical risk, and company intelligence.",
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
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
