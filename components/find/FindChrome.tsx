import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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
        <Link className="flockup" href="/" aria-label={t("nav.home")}>
          <span className="flockup__chip">
            <svg width="20" height="20" viewBox="0 0 120 120" aria-hidden="true">
              <path
                d="M22 98 L22 60 C22 35 98 35 98 60 L98 98"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinejoin="miter"
                strokeLinecap="square"
              />
              <line x1="12" y1="98" x2="108" y2="98" stroke="currentColor" strokeWidth="5" />
              <circle className="flockup__dot" cx="60" cy="41" r="10" />
            </svg>
          </span>
          <span className="flockup__word serif">Ponte</span>
          <span className="flockup__tld">.trade</span>
        </Link>
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
          <Link className="fnav__link" href="/marketplace/new">
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
