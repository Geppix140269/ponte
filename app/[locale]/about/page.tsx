import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { BridgeMark } from "@/components/Logo";

const ABOUT_DESC =
  "Ponte is an independent trade brokerage operated by 1402 Celsius Ltd. Deals brokered on evidence, introductions papered, success fee only.";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESC,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Ponte",
    description: ABOUT_DESC,
    url: "/about",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Ponte",
    description: ABOUT_DESC,
  },
};

const principles = [
  {
    n: "i.",
    title: "Papered, always",
    body: "No introduction happens before both sides have signed a non-circumvention and non-disclosure agreement and written fee terms. It protects the counterparties as much as it protects us.",
  },
  {
    n: "ii.",
    title: "Evidence over opinion",
    body: "Counterparties are vetted before they are circulated. Claims are checked against documents and official sources. If we cannot verify it, we say so, or we do not circulate it.",
  },
  {
    n: "iii.",
    title: "Paid on results",
    body: "The brokerage earns a success fee when a deal closes, nothing before. Intelligence work is priced by the engagement. Nothing on this site is a subscription.",
  },
];

const offer = [
  {
    title: "The Marketplace",
    body: "Offers and requirements, physical goods and trade services, brokered end to end.",
    href: "/marketplace",
    cta: "Bring us a deal",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">About Ponte</span>
        <h1
          className="serif text-white mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          A broker&rsquo;s word,{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            in writing.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Ponte (Italian for &ldquo;bridge&rdquo;) is an independent trade
          brokerage. It connects vetted buyers, sellers and trade service
          providers, papers every introduction, and backs deals with
          senior-led market intelligence.
        </p>
      </header>

      {/* The desk */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline">
          <div className="num-italic">â€” 01 / The desk</div>
          <div className="max-w-2xl">
            <p className="text-[16px] leading-relaxed text-gray-2">
              Behind Ponte sit three decades in international trade: running
              trading operations, leading trade intelligence organisations,
              and sitting between buyers and sellers on deals across four
              continents. That experience now works for your deal, with a
              network built over thirty years and a simple rule: the
              paperwork comes before the introduction.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-gold">
                Talk to the desk <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-10">
          <div className="num-italic">â€” 02 / Principles</div>
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            How the desk runs.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.n} className="glass p-7">
              <p className="num-italic mb-4">{p.n}</p>
              <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-10">
          <div className="num-italic">â€” 03 / The desk</div>
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            One door. One process.
          </h2>
        </div>
        <div className="grid gap-5 max-w-xl">
          {offer.map((o) => (
            <Link key={o.title} href={o.href} className="card group p-7">
              <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{o.title}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-2">{o.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold group-hover:text-cream" style={{ letterSpacing: "0.18em" }}>
                {o.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Company */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline">
          <div className="num-italic">â€” 04 / The company</div>
          <div className="max-w-2xl">
            <p className="text-[15px] leading-relaxed text-gray-2">
              Ponte is a trading name of 1402 Celsius Ltd, a company
              incorporated in Bulgaria (Reg. 207314767, VAT BG207314767, 1A
              Aton Street, Building 6, Plovdiv 4002), part of the same group
              as 1402 Celsius Ltd, United Kingdom (Reg. 12475013, VAT GB 343
              1702 32, 20-22 Wenlock Road, London N1 7GU). The Broker acts as
              intermediary only, never as principal, and is remunerated by
              success fee on closed deals and by fixed engagement fees for
              intelligence work. Payments are processed by Stripe.
              Correspondence:{" "}
              <a href="mailto:hello@ponte.trade" className="text-gold hover:text-cream">hello@ponte.trade</a>{" "}
              Â· +44 7988 540104.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-px py-16">
        <div className="glass p-10 md:p-12 text-center">
          <div className="mx-auto flex justify-center"><BridgeMark className="h-12 w-12" /></div>
          <h2 className="serif text-white mt-4" style={{ fontSize: 32, fontWeight: 500 }}>
            Have a deal in mind?
          </h2>
          <p className="mt-3 text-[15px] text-gray-2 max-w-xl mx-auto">
            Bring it to the desk, or join the Deal Sheet and watch what moves.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/marketplace" className="btn-gold">
              Submit a deal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
