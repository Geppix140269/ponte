import Link from "next/link";
import Logo from "@/components/Logo";
import { CATEGORIES } from "@/lib/catalogue";

export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-700 bg-navy text-white/70">
      <div className="container-px py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:pr-6">
            <Logo reversed />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Trade intelligence. Delivered. Research-grade market reports and
              analysis — buy what you need, no subscription required.
            </p>
          </div>

          <div>
            <h4 className="eyebrow text-white/50">Catalogue</h4>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="text-sm text-white/70 transition-colors hover:text-gold"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="eyebrow text-white/50">Company</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/catalogue" className="text-sm text-white/70 hover:text-gold">
                  Full catalogue
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-white/70 hover:text-gold">
                  About
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/70 hover:text-gold">
                  Terms of sale
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/70 hover:text-gold">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="eyebrow text-white/50">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li>
                <a href="mailto:hello@pontetrade.com" className="hover:text-gold">
                  hello@pontetrade.com
                </a>
              </li>
              <li>Secure payment via Stripe</li>
              <li>Watermarked PDF delivery</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} Ponte Trade. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
