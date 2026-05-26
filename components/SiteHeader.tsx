"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, Menu, X, User } from "lucide-react";
import Logo from "@/components/Logo";
import { useCart } from "@/lib/cart-store";

// Labels match lib/catalogue.ts CATEGORIES names so naming stays consistent
// across the header, homepage tiles and footer.
const navLinks = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/category/bundles", label: "Bundles" },
  { href: "/why-ponte", label: "Why Ponte" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.items.length);

  useEffect(() => setMounted(true), []);
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
          <Link
            href="/cart"
            className="relative inline-flex rounded-full p-2 text-cream hover:bg-white/5 hover:text-gold"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">
                {count}
              </span>
            )}
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
