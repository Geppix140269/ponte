import Link from "next/link";
import Logo from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="mt-20">
      <div className="container-px">
        <div className="glass p-8 md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5 md:pr-6">
              <Logo reversed size="lg" />
              <p className="mt-5 text-sm leading-relaxed text-gray-2 max-w-md">
                Independent trade brokerage and senior-led intelligence.
                Bring a deal to the desk, join the weekly Deal Sheet, book an
                analyst, or commission a Full Market Report. Success fees and
                engagements, never subscriptions.
              </p>
            </div>

            <div className="md:col-span-3">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                Intelligence
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/brokerage" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    The Deal Desk
                  </Link>
                </li>
                <li>
                  <Link href="/network" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    The Deal Sheet
                  </Link>
                </li>
                <li>
                  <Link href="/advisory" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    The Analyst Desk
                  </Link>
                </li>
                <li>
                  <Link href="/product/full-market-report" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    The Full Market Report
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    Pricing
                  </Link>
                </li>
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
                  <Link href="/about" className="text-sm text-gray-2 hover:text-gold">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/methodology" className="text-sm text-gray-2 hover:text-gold">
                    Methodology
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
                  <Link href="/contact" className="hover:text-gold">
                    Contact us
                  </Link>
                </li>
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
              Independent trade brokerage and advisory, grounded in evidence
              and official sources. Ponte acts as broker and intermediary,
              never as principal. Introductions are made under signed NCNDA
              and fee agreements.
            </p>
            <p className="uppercase" style={{ letterSpacing: "0.18em" }}>
              © {new Date().getFullYear()} Ponte · operated by 1402 Celsius Ltd
              · ponte.trade
            </p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
