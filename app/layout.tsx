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
    default: "Ponte Trade. Senior-led trade intelligence and advisory.",
    template: "%s | Ponte Trade",
  },
  description:
    "Senior-led trade intelligence and advisory for exporters, importers and trade bodies. Book an analyst, commission a Full Market Report, or retain a standing desk. Grounded in transaction-level trade evidence and official sources. Priced by the engagement, no subscription.",
  openGraph: {
    title: "Ponte Trade. Senior-led trade intelligence and advisory.",
    description:
      "Talk to the analyst, not the algorithm. Book an analyst call, commission a Full Market Report, or retain a standing desk.",
    url: APP_URL,
    siteName: "Ponte Trade",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponte Trade. Senior-led trade intelligence and advisory.",
    description:
      "Talk to the analyst, not the algorithm. Senior-led trade intelligence and advisory.",
  },
};

// Organization-level structured data, emitted on every page for rich results.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ponte Trade",
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  email: "hello@ponte.trade",
  description:
    "Senior-led trade intelligence and advisory: analyst access, market reports, and standing advisory engagements, grounded in transaction-level trade evidence and official sources.",
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
