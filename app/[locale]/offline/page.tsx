import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WifiOff } from "lucide-react";
import OfflineRetry from "@/components/OfflineRetry";
import type { Locale } from "@/i18n/routing";

/*
 * The page the service worker serves when the network is gone. It is a real
 * route rather than a static HTML file in public/ so that it is translated,
 * and so that a reader in Spanish gets a Spanish offline page: the worker
 * stores one of these per language, keyed off the URL prefix.
 *
 * The layout is written with inline styles on purpose. This page is the one
 * page guaranteed to be opened with no network, and if the hashed stylesheet
 * happens not to be in the cache the reader would otherwise get unstyled
 * black on white. Everything structural here survives that.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "pwa" });
  return {
    title: t("offlineTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function OfflinePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pwa");

  return (
    <section
      className="container-px py-24"
      style={{ display: "flex", justifyContent: "center" }}
    >
      <div
        className="glass p-10 text-center"
        style={{ maxWidth: 480, color: "#F5F0E8" }}
      >
        <WifiOff
          className="mx-auto h-9 w-9 text-gold"
          style={{ color: "#C9973A" }}
          aria-hidden="true"
        />

        <h1
          className="serif mt-6"
          style={{ fontSize: 30, fontWeight: 500, color: "#FFFFFF" }}
        >
          {t("offlineTitle")}
        </h1>

        <p
          className="mt-4 text-[15px] leading-relaxed"
          style={{ color: "#9CA3AF" }}
        >
          {t("offlineBody")}
        </p>

        <OfflineRetry label={t("offlineRetry")} />

        <p
          className="mt-6 text-[11px] uppercase"
          style={{ color: "#9CA3AF", letterSpacing: "0.18em" }}
        >
          {t("offlineHint")}
        </p>
      </div>
    </section>
  );
}
