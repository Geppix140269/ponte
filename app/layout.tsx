import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import StructuredData from "@/components/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ponte.trade"),
  title: {
    default: "Ponte — International Trade & Procurement",
    template: "%s — Ponte",
  },
  description:
    "Ponte connects suppliers with buyers globally — empowering businesses to expand internationally through strategic partnerships and expert procurement.",
  openGraph: {
    title: "Ponte — International Trade & Procurement",
    description:
      "Where markets meet and trade flows. International trade, procurement, and market entry services.",
    url: "https://ponte.trade",
    siteName: "Ponte",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponte — International Trade & Procurement",
    description:
      "Where markets meet and trade flows. International trade, procurement, and market entry services.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-screen flex-col">
        <StructuredData />
        <Navbar />
        <main className="flex-1 pt-20">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
