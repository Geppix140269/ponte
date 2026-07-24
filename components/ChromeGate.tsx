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
 * its own <main>, so it is bared for the same reason the landing is.
 *
 * On a bared route the shared <main> wrapper is also dropped, because the page
 * supplies its own <main> landmark; a wrapper here would nest two mains.
 */

/** Locale-stripped path prefixes that render their own Brand v5 chrome. */
function rendersOwnChrome(path: string): boolean {
  return (
    path === "/" ||
    path === "/find" ||
    path.startsWith("/find/") ||
    path === "/structure" ||
    path.startsWith("/structure/") ||
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
