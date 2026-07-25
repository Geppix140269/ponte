import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PonteShell from "@/components/shell/PonteShell";
import { defaultLocale } from "@/i18n/routing";
import "@/components/explore/explore.css";
import "@/components/signals/signal.css";

/**
 * No such Market Signal.
 *
 * A segment-scoped not-found, because the application's global 404 is still
 * the legacy obsidian page: gold on obsidian, a `btn-gold`, and a link to the
 * old Catalogue. Reached from a mistyped or stale signal link, that dropped a
 * visitor straight out of the new product and into the old one, which is the
 * exact leak this route was migrated to close. Found on the PR 38 deploy
 * preview: a well-formed but unknown id and a malformed id both 404'd into the
 * legacy shell.
 *
 * This is deliberately scoped to the market-signal segment rather than a
 * rewrite of the global 404. Migrating that page affects every legacy route
 * still using it and belongs in its own change.
 *
 * Three cases arrive here, and the copy is written so it is honest for all
 * three: no such signal, an id that was never valid, and a read that failed.
 * The page does not guess which, and does not claim the signal "expired" when
 * it may simply never have existed.
 */

export default async function MarketSignalNotFound() {
  // A not-found boundary renders outside the route's params, so there is no
  // locale to read. Ponte is English-only, so the default is the only locale.
  const t = await getTranslations({ locale: defaultLocale, namespace: "marketSignals" });
  const te = await getTranslations({ locale: defaultLocale, namespace: "explore" });

  return (
    <PonteShell locale={defaultLocale} current="explore">
      <nav className="excrumb" aria-label={te("crumb.label")}>
        <Link href="/">{te("crumb.home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/explore">{te("crumb.explore")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("label")}</span>
      </nav>

      <header className="exhead">
        <div className="exhead__eb">
          <span className="exhead__rule" aria-hidden="true" />
          <span className="sigkind">{t("label")}</span>
        </div>
        <h1 className="exhead__h serif">{t("detail.missingTitle")}</h1>
        <p className="exhead__d">{t("detail.missingBody")}</p>
        <p style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="fbtn" href="/market-signals">
            {t("label")}
          </Link>
          <Link className="fbtn fbtn--secondary" href="/explore">
            {te("nav.explore")}
          </Link>
        </p>
      </header>
    </PonteShell>
  );
}
