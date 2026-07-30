import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PonteLockup from "@/components/ponte/brand/PonteLockup";

/**
 * The Find journey's own light chrome: a cream sticky nav with the bridge
 * lockup and a trust-line footer. It replaces the app's obsidian header/footer
 * (dropped by ChromeGate on these routes) so the journey reads as one Brand v5
 * world with the landing. Each page renders its own <main> inside.
 *
 * `current` underlines the active primary destination.
 */
export default async function FindChrome({
  current,
  children,
}: {
  current?: "opportunities" | "signals";
  children: ReactNode;
}) {
  const t = await getTranslations("find");

  return (
    <>
      <header className="fnav">
        <PonteLockup scope="find" label={t("nav.home")} />
        <nav className="fnav__links">
          <Link
            className={`fnav__link${current === "opportunities" ? " is-current" : ""}`}
            href="/find"
          >
            {t("nav.opportunities")}
          </Link>
          <Link className="fnav__link" href="/market-signals">
            {t("nav.signals")}
          </Link>
          <Link className="fnav__link" href="/structure">
            {t("nav.submit")}
          </Link>
          <Link className="fnav__link" href="/verify">
            {t("nav.verify")}
          </Link>
        </nav>
      </header>

      <main className="fmain">{children}</main>

      <footer className="ffoot">{t("trust")}</footer>
    </>
  );
}
