import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OfflineRetry from "@/components/OfflineRetry";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { Locale } from "@/i18n/routing";
import "@/components/desk/desk.css";

/*
 * The page the service worker serves when the network is gone. It is a real
 * route rather than a static HTML file in public/ so that it is translated,
 * and so that a reader in Spanish gets a Spanish offline page: the worker
 * stores one of these per language, keyed off the URL prefix.
 *
 * It now renders the Desk shell, so the last thing a reader sees when the
 * connection drops is the product they were already in rather than the retired
 * obsidian chrome (Issue #130 Stage 3). The shell is rendered on the SERVER, at
 * the moment the worker fetches this page while the reader is still online, and
 * what the worker stores is that finished HTML. Nothing on this page fetches
 * anything of its own, and the one control is a reload.
 *
 * The structural layout is still written inline on purpose. This is the one page
 * guaranteed to be opened with no network, and if the hashed stylesheet is not
 * in the cache the box, the spacing and the reading measure all survive without
 * it. Colour is left to the Desk tokens rather than repeated as literals: with
 * the stylesheet absent the page falls back to the browser's own text colours,
 * which is legible, honest and does not fork the palette.
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

const WRAP: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: 40,
  paddingBottom: 64,
};

const BOX: CSSProperties = { maxWidth: 560, width: "100%" };

const TITLE: CSSProperties = {
  fontSize: 27,
  fontWeight: 500,
  letterSpacing: "-0.018em",
  lineHeight: 1.14,
  marginBottom: 8,
};

const HINT: CSSProperties = {
  marginTop: 16,
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

export default async function OfflinePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pwa");

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        <section className="sec" style={WRAP}>
          <div className="empty" style={BOX}>
            <PonteIcon name="participation.commsoff" size={24} />
            <div>
              <h1 className="serif" style={TITLE}>
                {t("offlineTitle")}
              </h1>
              <p>{t("offlineBody")}</p>
              <div className="empty__a">
                <OfflineRetry label={t("offlineRetry")} />
              </div>
              <p className="mono" style={HINT}>
                {t("offlineHint")}
              </p>
            </div>
          </div>
        </section>
      </DeskShell>
    </div>
  );
}
