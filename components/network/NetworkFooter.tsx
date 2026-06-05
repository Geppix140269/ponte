import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Platform", links: [
    { href: "/network/listings", label: "Browse listings" },
    { href: "/network/listings/new", label: "Post a listing" },
    { href: "/network/verify", label: "Verify a counterparty" },
    { href: "/network/deals", label: "Deal rooms" },
    { href: "/pricing", label: "Pricing" },
  ]},
  { title: "Trust", links: [
    { href: "/network/verify", label: "ADAMftd verification" },
    { href: "/pricing", label: "Verified Trader badge" },
    { href: "/network", label: "Trust scores" },
    { href: "/network", label: "Sanctions screening" },
  ]},
  { title: "Market Intelligence", links: [
    { href: "/catalogue", label: "Reports catalogue" },
    { href: "/category/geopolitical", label: "Geopolitical & risk" },
    { href: "/category/company-supplier", label: "Company intelligence" },
  ]},
  { title: "Company", links: [
    { href: "/about", label: "About" },
    { href: "/methodology", label: "Methodology" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ]},
];

const TRUST = ["7B+ verified trade records", "199 country profiles", "OFAC · EU · UN · UK screening", "Backed by ICTTM"];

export function NetworkFooter() {
  return (
    <footer className="mt-20">
      <div className="container-px">
        {/* trust band */}
        <div className="glass-tight px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
          {TRUST.map((t) => (
            <span key={t} className="mono text-[11px] text-gray-2 uppercase" style={{ letterSpacing: "0.16em" }}>{t}</span>
          ))}
        </div>

        <div className="glass p-8 md:p-12 mt-4">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4 md:pr-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-gold" />
                <span className="serif text-ink text-lg" style={{ fontWeight: 600 }}>ponte<span className="text-gold">.trade</span></span>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-gray-2 max-w-md">
                The verified network for real buyers, sellers, and trading houses. Build trust,
                publish opportunities, and trade directly with verified principals,
                powered by ADAMftd grounded trade intelligence.
              </p>
            </div>
            {COLUMNS.map((col) => (
              <div key={col.title} className="md:col-span-2">
                <h4 className="text-[10px] uppercase text-gold mb-4 font-medium" style={{ letterSpacing: "0.22em" }}>{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}><Link href={l.href} className="text-sm text-gray-2 transition-colors hover:text-gold">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 space-y-2 border-t border-rule pt-6 text-[11px] text-gray-2">
            <p>ponte.trade is an ICTTM company. Trade facilitation backed by ADAMftd and 7 billion+ verified trade records. ADAMftd verification provides grounded intelligence signals, not a certification of legitimacy.</p>
            <p className="uppercase" style={{ letterSpacing: "0.18em" }}>© {new Date().getFullYear()} Ponte Trade / ICTTM · London · ponte.trade</p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
