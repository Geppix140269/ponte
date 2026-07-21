import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
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

// viewportFit "cover" is what lets the page run edge to edge under a notch and
// a home indicator once installed. It is only safe because every fixed element
// pads itself with env(safe-area-inset-*): see the bottom bar rules in
// globals.css. themeColor paints the Android status bar and the iOS splash to
// match the page, so an installed launch has no white flash.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07101B",
  colorScheme: "dark",
};

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
    manifest: "/manifest.webmanifest",
    // Installed on iOS: no Safari chrome, and the status bar runs over the
    // page. The header reserves that strip through a display-mode rule in
    // globals.css.
    appleWebApp: {
      capable: true,
      title: "Ponte",
      statusBarStyle: "black-translucent",
    },
    // No icons block here on purpose. app/icon.png and app/apple-icon.png
    // already drive the link tags through Next's file convention, and the
    // apple icon is the 180x180 iOS wants. Declaring icons in metadata would
    // override that convention rather than add to it.
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
          {/* Mobile only. The room they need at the foot of the page is
              reserved by a body rule in globals.css, not by a spacer here. */}
          <BottomNav />
          <InstallPrompt />
        </NextIntlClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
