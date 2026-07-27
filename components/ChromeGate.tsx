"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The shared site chrome (header, footer, mobile bottom bar, install prompt)
 * wraps every page except the public landing.
 *
 * The landing is the cream/gold editorial entrance from the v1.1 design
 * handoff: a full-bleed page with its own header and trust-line footer. It must
 * not sit inside the app's obsidian chrome. next-intl's usePathname returns the
 * locale-stripped path, so "/" identifies the landing in every locale.
 *
 * The Find journey (/find, /find/..., /workspace) is the same Brand v5 cream
 * world extended inward: it too renders full-bleed with its own light chrome and
 * its own <main>, so it is bared for the same reason the landing is. Explore
 * (/explore) and the Market Signal surfaces (/market-signals) mount the shared
 * PonteShell, which supplies that same chrome and its own <main>, so they are
 * bared with them. A public route that renders inside this obsidian chrome is
 * now the exception and should be treated as a migration still outstanding.
 *
 * The public legal pages (/about, /privacy, /terms) are the same light Brand v5
 * treatment with their own PonteFooter, so they are bared too; otherwise the
 * app's obsidian header and legacy boxed footer would render underneath them.
 *
 * On a bared route the shared <main> wrapper is also dropped, because the page
 * supplies its own <main> landmark; a wrapper here would nest two mains.
 */

/** Locale-stripped path prefixes that render their own Brand v5 chrome. */
function rendersOwnChrome(path: string): boolean {
  return (
    path === "/" ||
    path === "/explore" ||
    path.startsWith("/explore/") ||
    path === "/market-signals" ||
    path === "/opportunities" ||
    // The sign-in door. It rendered in the legacy obsidian application, which
    // meant the Desk's own Sign in control led one click out of the Desk.
    path === "/login" ||
    path.startsWith("/market-signals/") ||
    // The design-system specimen sheets, which exist to be looked at against
    // the handoff and should not be framed by the chrome they are replacing.
    path.startsWith("/dev/") ||
    path === "/find" ||
    path.startsWith("/find/") ||
    path === "/structure" ||
    path.startsWith("/structure/") ||
    path === "/check" ||
    path.startsWith("/check/") ||
    path === "/about" ||
    path === "/privacy" ||
    path === "/terms" ||
    path === "/workspace" ||
    path.startsWith("/workspace/")
  );
}
export default function ChromeGate({
  header,
  footer,
  bottomNav,
  extras,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  bottomNav: ReactNode;
  extras?: ReactNode;
  children: ReactNode;
}) {
  const bare = rendersOwnChrome(usePathname());

  if (bare) return <>{children}</>;

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      {bottomNav}
      {extras}
    </>
  );
}
