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
    default: "Ponte. The bridge between buyer and seller.",
    template: "%s | Ponte Trade",
  },
  description:
    "The free, vetted marketplace for physical trade. Post what you sell or what you need; AI and the desk verify every listing; connect directly, anonymous until both sides agree, at no cost. The Ponte desk manages deals end to end only on request, on a success fee or retainer. Operated by 1402 Celsius Ltd.",
  openGraph: {
    title: "Ponte. The bridge between buyer and seller.",
    description:
      "Every listing vetted. Every connection free. Post an offer or a requirement in three steps; bring in the desk only when you want the deal managed.",
    url: APP_URL,
    siteName: "Ponte",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponte. The bridge between buyer and seller.",
    description:
      "The free, vetted marketplace for physical trade. Desk-managed deals optional, on success fee or retainer.",
  },
};

// Organization-level structured data, emitted on every page for rich results.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ponte",
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  email: "hello@ponte.trade",
  description:
    "Ponte is the free, vetted marketplace for physical goods and trade services, operated by 1402 Celsius Ltd. Every listing is verified by AI and a human desk before circulation; members connect directly at no cost, anonymous until both sides agree. The Ponte desk manages deals end to end on request, on a success fee or retainer.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Ponte",
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
