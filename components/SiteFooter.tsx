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
                Senior-led trade intelligence and advisory. Book an analyst,
                commission a Full Market Report, or retain a standing desk.
                Priced by the engagement, never by subscription.
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
              Senior-led trade intelligence and advisory, grounded in
              transaction-level trade evidence and official sources.
            </p>
            <p className="uppercase" style={{ letterSpacing: "0.18em" }}>
              © {new Date().getFullYear()} Ponte Trade · London · ponte.trade
            </p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
