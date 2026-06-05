"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";

const links = [
  { href: "/network/listings", label: "Listings" },
  { href: "/network/verify", label: "Verify" },
  { href: "/network/deals", label: "Deal Rooms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/catalogue", label: "Market Intelligence" },
];

export function NetworkHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <nav className="container-px flex h-16 items-center justify-between">
        <Link href="/network" aria-label="ponte.trade" className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <span className="serif text-white text-lg" style={{ fontWeight: 600, letterSpacing: "0.01em" }}>ponte<span className="text-gold">.trade</span></span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/catalogue" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href}
                className={`text-[12px] uppercase transition-colors ${active ? "text-gold" : "text-gray-2 hover:text-gold"}`}
                style={{ letterSpacing: "0.16em" }}>{l.label}</Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-[12px] uppercase text-gray-2 hover:text-gold" style={{ letterSpacing: "0.16em" }}>Sign in</Link>
          <Link href="/pricing" className="btn-gold px-4 py-2 text-[12px]">Get started</Link>
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex rounded-full p-2 text-cream hover:bg-white/5 md:hidden" aria-label="Menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-[rgba(7,16,27,0.92)] md:hidden">
          <div className="container-px flex flex-col py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-2.5 text-sm uppercase text-cream" style={{ letterSpacing: "0.16em" }}>{l.label}</Link>
            ))}
            <Link href="/login" className="py-2.5 text-sm uppercase text-cream" style={{ letterSpacing: "0.16em" }}>Sign in</Link>
            <Link href="/pricing" className="btn-gold mt-2 text-center">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
