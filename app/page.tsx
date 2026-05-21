import Link from "next/link";
import ArchPattern from "@/components/ArchPattern";

const services = [
  {
    title: "Market Entry & Expansion",
    description:
      "Navigate international markets with expert guidance on regulatory compliance and strategic partnerships.",
  },
  {
    title: "Procurement & Supply Chain",
    description:
      "Optimize supply chains with comprehensive procurement services ensuring quality and cost-effectiveness.",
  },
  {
    title: "Brokering Services",
    description:
      "Facilitating seamless connections between suppliers and buyers across international markets.",
  },
  {
    title: "Cross-Cultural Communication",
    description:
      "Multilingual support and cultural consultation across 15+ countries.",
  },
  {
    title: "Market Intelligence",
    description:
      "In-depth market analysis and competitive intelligence.",
  },
  {
    title: "Trade Compliance",
    description:
      "Navigate complex trade regulations and documentation.",
  },
];

const stats = [
  { value: "30+", label: "Years Experience" },
  { value: "15+", label: "Countries Covered" },
  { value: "€120M+", label: "Revenue Scaled" },
  { value: "50+", label: "Projects Delivered" },
];

const pillars = [
  {
    number: "01",
    title: "Tailored Solutions",
    description:
      "Every business is unique. We develop customised strategies aligned with your specific goals and market conditions.",
  },
  {
    number: "02",
    title: "Global Expertise",
    description:
      "Over 30 years of international business experience with operations across Europe and beyond.",
  },
  {
    number: "03",
    title: "Reliable Partnership",
    description:
      "Lasting relationships built on trust, transparency, and mutual success. Your growth is our commitment.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-navy">
        <ArchPattern className="opacity-[0.04]" />
        <div className="container-px relative py-20">
          <p className="tag-rule">International Trade &amp; Procurement</p>
          <h1 className="mt-6 max-w-4xl text-5xl leading-[1.1] text-white sm:text-6xl lg:text-7xl">
            Where Markets Meet &amp;{" "}
            <span className="italic text-gold">Trade Flows</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/70">
            Ponte connects suppliers with buyers globally — empowering
            businesses to expand internationally through strategic partnerships
            and expert procurement.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/contact" className="btn-gold">
              Book a Consultation
            </Link>
            <Link href="/services" className="btn-outline-light">
              Our Services
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section bg-white">
        <div className="container-px">
          <div className="max-w-2xl">
            <p className="section-label">What We Offer</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">
              End-to-end international trade services
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group border-t-2 border-gold bg-white p-8"
              >
                <h3 className="text-xl">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link href="/services" className="link-gold">
              View All Services <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="bg-cream py-16">
        <div className="container-px">
          <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-serif text-4xl text-navy sm:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Ponte */}
      <section className="section bg-white">
        <div className="container-px">
          <div className="max-w-2xl">
            <p className="section-label">Why Choose Us</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">The Ponte difference</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.number}>
                <span className="serif-number">{pillar.number}</span>
                <h3 className="mt-5 text-xl">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy">
        <div className="container-px py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-3xl text-3xl text-white sm:text-4xl">
            Let&apos;s build your international presence together
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            Book a free consultation and discover how Ponte can open new markets
            for your business.
          </p>
          <div className="mt-10">
            <Link href="/contact" className="btn-gold">
              Book a Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
