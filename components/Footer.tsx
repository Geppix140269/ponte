import Link from "next/link";
import Logo from "@/components/Logo";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/insights", label: "Insights" },
  { href: "/contact", label: "Contact" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/partners", label: "Partners" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="container-px py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand / tagline */}
          <div className="lg:pr-6">
            <Link href="/" aria-label="Ponte home">
              <Logo reversed />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Where markets meet and trade flows. We connect suppliers with
              buyers globally through strategic partnerships and expert
              procurement.
            </p>
            <p className="mt-4 font-serif text-base italic text-gold">
              Empowering Connections.
            </p>
          </div>

          {/* Company links */}
          <div>
            <h4 className="section-label text-white/50">Company</h4>
            <ul className="mt-5 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* UK office */}
          <div>
            <h4 className="section-label text-white/50">United Kingdom</h4>
            <address className="mt-5 text-sm not-italic leading-relaxed text-white/60">
              Ponte (1402 Celsius Ltd)
              <br />
              20–22 Wenlock Road
              <br />
              London, N1 7GU
              <br />
              <span className="mt-2 block text-white/40">
                Reg. No: 12475013
                <br />
                VAT: GB 343 1702 32
              </span>
            </address>
          </div>

          {/* Bulgaria office */}
          <div>
            <h4 className="section-label text-white/50">Bulgaria</h4>
            <address className="mt-5 text-sm not-italic leading-relaxed text-white/60">
              Ponte (1402 Celsius Ltd)
              <br />
              1A Aton Street, Building 6
              <br />
              Plovdiv, 4002
              <br />
              <span className="mt-2 block text-white/40">
                Reg. No: 207314767
                <br />
                VAT: BG 207314767
              </span>
            </address>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Ponte (1402 Celsius Ltd). All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-gold">
              Privacy
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/cookies" className="transition-colors hover:text-gold">
              Cookies
            </Link>
            <span className="text-white/20">|</span>
            <a
              href="mailto:info@ponte.trade"
              className="transition-colors hover:text-gold"
            >
              info@ponte.trade
            </a>
            <span className="text-white/20">|</span>
            <a
              href="tel:+442081231402"
              className="transition-colors hover:text-gold"
            >
              +44 208 123 1402
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
