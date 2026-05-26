import Link from "next/link";
import Logo from "@/components/Logo";
import { CATEGORIES } from "@/lib/catalogue";

export default function SiteFooter() {
  return (
    <footer className="mt-20">
      <div className="container-px">
        <div className="glass p-8 md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5 md:pr-6">
              <Logo reversed size="lg" />
              <p className="mt-5 text-sm leading-relaxed text-gray-2 max-w-md">
                Trade intelligence, delivered. Research-grade market reports
                and risk analysis built on a grounded-AI engine and 7B+
                verified trade records. Buy what you need, no subscription
                required.
              </p>
            </div>

            <div className="md:col-span-3">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                Catalogue
              </h4>
              <ul className="space-y-2.5">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/category/${c.slug}`}
                      className="text-sm text-gray-2 transition-colors hover:text-gold"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                Company
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/catalogue" className="text-sm text-gray-2 hover:text-gold">
                    Full catalogue
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-gray-2 hover:text-gold">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-2 hover:text-gold">
                    Terms of sale
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-2 hover:text-gold">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                Contact
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-2">
                <li>
                  <a href="mailto:hello@ponte.trade" className="hover:text-gold">
                    hello@ponte.trade
                  </a>
                </li>
                <li>Secure payment via Stripe</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 space-y-2 border-t border-white/10 pt-6 text-[11px] text-gray-2">
            <p>
              Ponte Trade is an ICTTM company. Research-grade trade intelligence,
              backed by 7 billion+ verified trade records.
            </p>
            <p
              className="uppercase"
              style={{ letterSpacing: "0.18em" }}
            >
              © {new Date().getFullYear()} Ponte Trade / ICTTM · London · ponte.trade
            </p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
