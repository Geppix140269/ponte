import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Explore's light chrome: the same cream Brand v5 header and trust footer the
 * Find journey uses, with the two North Star entrances as its only links. It
 * reuses the Find chrome classes rather than inventing a second header, so
 * Explore, Find and the landing stay one world.
 */
export default async function ExploreChrome({ children }: { children: ReactNode }) {
  const t = await getTranslations("explore");

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
          <Link className="fnav__link is-current" href="/explore">
            {t("nav.explore")}
          </Link>
          <Link className="fnav__link" href="/structure">
            {t("nav.deal")}
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="exfoot">{t("trust")}</footer>
    </>
  );
}
