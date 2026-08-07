import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import { isRtl } from "@/i18n/routing";
import PonteFooter from "@/components/PonteFooter";
import PonteLockup from "@/components/ponte/brand/PonteLockup";
import { PRIMARY_NAV, signInHref, type PrimaryNavKey } from "@/lib/nav/primary";
import "@/components/find/find.css";

/**
 * The one shell for every public Ponte Trade page below the landing.
 *
 * It exists because of a real failure: the North Star landing shipped linking
 * its market activity band straight into /market-signals/[id], which was still
 * rendering the legacy obsidian application with its own header, its own
 * footer, the lowercase "ponte." lockup, a "vetted marketplace" positioning and
 * a "every listing is reviewed by the desk" claim sitting directly above a
 * record that is explicitly unverified. A visitor one click into the new
 * product landed in the old one, and was told the opposite of the truth.
 *
 * So this is a shared component, not a pattern to copy. Any new public route
 * mounts this and inherits the wordmark, the Brand v5 heritage-light tokens,
 * the type scale, the content measure, the footer and the operator line. There
 * is deliberately no second copy of the header or the footer to drift.
 *
 * The token block and chrome classes live in components/find/find.css under
 * .ponte-find, which is why that scope class is the wrapper here. The name is
 * historical (it arrived with the Find journey); the scope is now the shared
 * public design system and is imported once, here.
 */

export interface PonteShellProps {
  locale: string;
  children: ReactNode;
  /** Which primary entrance to mark as current, if any. */
  current?: PrimaryNavKey;
  /** The route to come back to after signing in. */
  signInReturnTo?: string | null;
  /**
   * Rendered flush, without the shared footer, for a single-action flow such
   * as the composer where a footer would compete with the one thing to do.
   */
  bare?: boolean;
}

export default async function PonteShell({
  locale,
  children,
  current,
  bare,
  signInReturnTo,
}: PonteShellProps) {
  const t = await getTranslations({ locale, namespace: "shell" });

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <header className="fnav">
        <PonteLockup scope="find" label={t("home")} />
        <nav className="fnav__links" aria-label={t("navLabel")}>
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              className={`fnav__link${current === item.key ? " is-current" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          {/* The walkthrough found this shell serving /explore, /verification and
              /verify with NO sign-in control at all, so a member who reached
              them could not authenticate without going back to the entrance. */}
          <Link className="fnav__link" href={signInHref(signInReturnTo)}>
            Sign in
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      {!bare && <PonteFooter />}
    </div>
  );
}
