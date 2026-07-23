"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SIGNALS_NAV_LABEL } from "@/lib/market-signals/copy";

// One nav, one story: the marketplace, what it costs, how to reach the desk.
//
// inBottomNav marks the links the mobile bottom bar already owns. They stay in
// the desktop header, where there is no bottom bar, and drop out of the mobile
// drawer. Offering the same destination twice on one screen is what makes a
// phone feel like a shrunken desktop, and it also makes the drawer look like
// the real navigation when it is not.
// `label` overrides the i18n key when set: the Market Signals link ships in
// English for Block A rather than wait on the locale rebuild that Block E owns.
// Block E folds it into the "nav" namespace with the rest of the Opportunities
// hub, and this override goes away.
type NavLink = { href: string; key: string; label?: string; inBottomNav: boolean };
const navLinks: NavLink[] = [
  { href: "/marketplace", key: "marketplace", inBottomNav: true },
  { href: "/market-signals", key: "signals", label: SIGNALS_NAV_LABEL, inBottomNav: false },
  { href: "/pricing", key: "fees", inBottomNav: false },
  { href: "/contact", key: "contact", inBottomNav: false },
];

const drawerLinks = navLinks.filter((link) => !link.inBottomNav);

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <nav className="container-px flex h-16 items-center justify-between">
        <Link href="/" aria-label={t("homeAriaLabel")}>
          <Logo reversed />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] font-semibold uppercase tracking-label transition-colors ${
                pathname === link.href ? "text-lime" : "text-muted hover:text-ink"
              }`}
            >
              {link.label ?? t(link.key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/account"
            className="hidden rounded-full p-2 text-muted hover:bg-white/5 hover:text-ink md:inline-flex"
            aria-label={t("account")}
          >
            <Icon name="user" size={20} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex rounded-full p-2 text-ink hover:bg-white/5 md:hidden"
            aria-label={t("menuAriaLabel")}
            aria-expanded={open}
          >
            <Icon name={open ? "close" : "menu"} size={20} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-hairline-soft bg-[rgba(10,12,17,0.92)] md:hidden">
          <div className="container-px flex flex-col py-3">
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2.5 text-[12px] font-semibold uppercase tracking-label text-ink"
              >
                {link.label ?? t(link.key)}
              </Link>
            ))}
            <div className="py-2.5">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
