import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { isRtl, locales, type Locale } from "@/i18n/routing";
import { alternatesFor, APP_URL } from "@/lib/seo";

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

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "meta" });

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: t("siteTitle"),
      template: "%s | Ponte Trade",
    },
    description: t("siteDescription"),
    alternates: alternatesFor("/", params.locale),
    openGraph: {
      title: t("siteTitle"),
      description: t("ogDescription"),
      url: APP_URL,
      siteName: "Ponte",
      type: "website",
      locale: params.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("siteTitle"),
      description: t("twitterDescription"),
    },
  };
}

// Structured data stays in English on every locale: it is read by machines,
// and the entity names are proper nouns.
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!locales.includes(locale as Locale)) notFound();

  // Required for static rendering of the locale segment.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
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
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
