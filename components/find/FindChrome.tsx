import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PRIMARY_NAV, signInHref } from "@/lib/nav/primary";
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
  signInReturnTo,
}: {
  current?: "opportunities" | "signals";
  children: ReactNode;
  /** The route to come back to after signing in. */
  signInReturnTo?: string | null;
}) {
  const t = await getTranslations("find");

  return (
    <>
      <header className="fnav">
        <PonteLockup scope="find" label={t("nav.home")} />
        {/* One declaration for every shell. This bar previously named its own
            four destinations, including "/structure" for submitting, so the
            Find surfaces disagreed with the Desk bar and with the entrance
            about what the product's places are called. */}
        <nav className="fnav__links">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              className={`fnav__link${
                current === item.key || (current === "opportunities" && item.key === "explore")
                  ? " is-current"
                  : ""
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link className="fnav__link" href={signInHref(signInReturnTo)}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className="fmain">{children}</main>

      <footer className="ffoot">{t("trust")}</footer>
    </>
  );
}
