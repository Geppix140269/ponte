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
  { href: "/category/bundles", label: "Intelligence Bundles" },
  { href: "/category/geopolitical", label: "Geopolitical & Risk" },
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
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <nav className="container-px flex h-16 items-center justify-between">
        <Link href="/" aria-label="Ponte Trade home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-gold-600"
                  : "text-navy/70 hover:text-navy"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="hidden rounded-md p-2 text-navy/70 hover:bg-mist hover:text-navy sm:inline-flex"
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex rounded-md p-2 text-navy hover:bg-mist"
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
            className="inline-flex rounded-md p-2 text-navy hover:bg-mist md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <div className="container-px flex flex-col py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2.5 text-sm font-medium text-navy"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/account" className="py-2.5 text-sm font-medium text-navy">
              Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
