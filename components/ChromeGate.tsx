"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Temporary compatibility gate while the remaining legacy shell is retired.
 * Every route listed here owns its own current-generation chrome.
 */

function rendersOwnChrome(path: string): boolean {
  return (
    path === "/" ||
    path === "/explore" ||
    path.startsWith("/explore/") ||
    path === "/market-signals" ||
    path.startsWith("/market-signals/") ||
    path === "/opportunities" ||
    path === "/login" ||
    path === "/account" ||
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
    path.startsWith("/workspace/") ||
    path === "/verify" ||
    path === "/verification"
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
