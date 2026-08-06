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
    // Build 1's listing path. The Set 1 and Set 2 patterns are full-screen
    // surfaces with their own frame, their own journey rule and one primary
    // action; the legacy chrome adds a second header, a second navigation and a
    // footer that still names retired destinations. The surface IS the screen.
    path === "/publish" ||
    path.startsWith("/publish/") ||
    path === "/check" ||
    path.startsWith("/check/") ||
    path === "/about" ||
    path === "/privacy" ||
    path === "/terms" ||
    path === "/workspace" ||
    path.startsWith("/workspace/") ||
    // The administration desk. It was built on the retired obsidian
    // marketplace chrome, so an operator arriving from a Desk (cream) surface
    // left the current generation the moment they opened /admin. It now renders
    // its own Desk shell and must not be wrapped by the legacy chrome.
    path === "/admin" ||
    path.startsWith("/admin/") ||
    // The member's account. It was rebuilt on the Desk shell in Stage 1 but was
    // never added here, so it drew its own Desk command bar INSIDE the legacy
    // obsidian chrome: two headers stacked on the one settings surface a member
    // visits deliberately.
    path === "/account" ||
    path.startsWith("/account/") ||
    // Verification is the last step of a deal. It rendered in the obsidian
    // chrome, so a member who reached the final blocker in Start a Deal left
    // the cream product mid-task and arrived in the old one.
    path === "/verify" ||
    path === "/verification" ||
    // Stage 3: the last member-facing routes that were still drawn by the
    // retired obsidian chrome. Fees and Contact are the two commercial pages a
    // member reads before committing, the two Learn articles are the public
    // entrances search brings people to, and /offline is what the service
    // worker shows when the network is gone. Each now renders its own Desk
    // shell, so none of them may be wrapped again here.
    path === "/pricing" ||
    path === "/contact" ||
    path === "/learn/duties" ||
    path === "/learn/trade-data" ||
    path === "/offline" ||
    // The Deal Room. It was built while the slice was concealed behind a flag,
    // so nothing linked to it and nobody ever saw what framed it: every room
    // surface rendered inside the retired obsidian chrome, beneath a MARKETPLACE
    // nav pointing at a board that no longer exists. The entrance now makes
    // "Open a Deal Room" its primary action, which makes this the first thing a
    // member sees after pressing the largest control on the site.
    path === "/deal-rooms" ||
    path.startsWith("/deal-rooms/")
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
