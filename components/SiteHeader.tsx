"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, User } from "lucide-react";
import Logo from "@/components/Logo";

// One nav, one story: the marketplace, what it costs, how to reach the desk.
const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pricing", label: "Fees" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <nav className="container-px flex h-16 items-center justify-between">
        <Link href="/" aria-label="Ponte Trade home">
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
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="hidden rounded-full p-2 text-gray-2 hover:bg-white/5 hover:text-gold sm:inline-flex"
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex rounded-full p-2 text-cream hover:bg-white/5 md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-[rgba(7,16,27,0.85)] md:hidden">
          <div className="container-px flex flex-col py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2.5 text-sm uppercase text-cream"
                style={{ letterSpacing: "0.18em" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/account"
              className="py-2.5 text-sm uppercase text-cream"
              style={{ letterSpacing: "0.18em" }}
            >
              Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
