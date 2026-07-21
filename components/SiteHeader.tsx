"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, User } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// One nav, one story: the marketplace, what it costs, how to reach the desk.
//
// inBottomNav marks the links the mobile bottom bar already owns. They stay in
// the desktop header, where there is no bottom bar, and drop out of the mobile
// drawer. Offering the same destination twice on one screen is what makes a
// phone feel like a shrunken desktop, and it also makes the drawer look like
// the real navigation when it is not.
const navLinks = [
  { href: "/marketplace", key: "marketplace", inBottomNav: true },
  { href: "/pricing", key: "fees", inBottomNav: false },
  { href: "/contact", key: "contact", inBottomNav: false },
] as const;

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
              className={`text-[12px] uppercase transition-colors ${
                pathname === link.href
                  ? "text-gold"
                  : "text-gray-2 hover:text-gold"
              }`}
              style={{ letterSpacing: "0.18em" }}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/account"
            className="hidden rounded-full p-2 text-gray-2 hover:bg-white/5 hover:text-gold md:inline-flex"
            aria-label={t("account")}
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex rounded-full p-2 text-cream hover:bg-white/5 md:hidden"
            aria-label={t("menuAriaLabel")}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-[rgba(7,16,27,0.85)] md:hidden">
          <div className="container-px flex flex-col py-3">
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2.5 text-sm uppercase text-cream"
                style={{ letterSpacing: "0.18em" }}
              >
                {t(link.key)}
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
