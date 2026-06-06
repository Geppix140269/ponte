"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { CATEGORIES } from "@/lib/catalogue";
import { isPlatformRoute, isOwnChromeRoute } from "@/lib/network/routes";
import { NetworkFooter } from "@/components/network/NetworkFooter";

export default function SiteFooter() {
  const pathname = usePathname();
  // The landing ("/") renders its own footer — suppress the global one.
  if (isOwnChromeRoute(pathname)) return null;
  if (isPlatformRoute(pathname)) return <NetworkFooter />;

  return (
    <footer className="mt-20">
      <div className="container-px">
        <div className="glass p-8 md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5 md:pr-6">
              <Logo reversed size="lg" />
              <p className="mt-5 text-sm leading-relaxed text-gray-2 max-w-md">
                The verified network for real buyers, sellers, and trading houses. Verify any
                counterparty, trade directly with verified principals, and settle securely. Backed
                by ADAMftd and 7B+ verified trade records.
              </p>
            </div>
            <div className="md:col-span-3">
              <h4 className="text-[10px] uppercase text-gold mb-4 font-medium" style={{ letterSpacing: "0.22em" }}>Catalogue</h4>
              <ul className="space-y-2.5">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <li key={c.slug}><Link href={`/category/${c.slug}`} className="text-sm text-gray-2 transition-colors hover:text-gold">{c.name}</Link></li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-[10px] uppercase text-gold mb-4 font-medium" style={{ letterSpacing: "0.22em" }}>Company</h4>
              <ul className="space-y-2.5">
                <li><Link href="/catalogue" className="text-sm text-gray-2 hover:text-gold">Full catalogue</Link></li>
                <li><Link href="/about" className="text-sm text-gray-2 hover:text-gold">About</Link></li>
                <li><Link href="/why-ponte" className="text-sm text-gray-2 hover:text-gold">Why Ponte</Link></li>
                <li><Link href="/methodology" className="text-sm text-gray-2 hover:text-gold">Methodology</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-2 hover:text-gold">Terms of sale</Link></li>
                <li><Link href="/privacy" className="text-sm text-gray-2 hover:text-gold">Privacy</Link></li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-[10px] uppercase text-gold mb-4 font-medium" style={{ letterSpacing: "0.22em" }}>Contact</h4>
              <ul className="space-y-2.5 text-sm text-gray-2">
                <li><a href="mailto:hello@ponte.trade" className="hover:text-gold">hello@ponte.trade</a></li>
                <li>Secure payment via Stripe</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 space-y-2 border-t border-rule pt-6 text-[11px] text-gray-2">
            <p>ponte.trade is an ICTTM company. Trade facilitation backed by ADAMftd and 7 billion+ verified trade records. Market intelligence available as licensed reports.</p>
            <p className="uppercase" style={{ letterSpacing: "0.18em" }}>© {new Date().getFullYear()} Ponte Trade / ICTTM · London · ponte.trade</p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
