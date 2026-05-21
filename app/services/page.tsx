import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Services",
  description:
    "End-to-end international trade services — brokering, sourcing, expansion, market intelligence, supply chain, sustainability, and agricultural advisory.",
};

const services = [
  {
    number: "01",
    title: "Brokering Services",
    tagline: "Connect, Trade, and Profit",
    description:
      "Facilitating seamless connections between suppliers and buyers.",
  },
  {
    number: "02",
    title: "Sourcing Expertise",
    tagline: "Reliable Suppliers, Quality Products",
    description: "Identifying and vetting high-quality suppliers.",
  },
  {
    number: "03",
    title: "International Expansion",
    tagline: "Grow Beyond Borders",
    description:
      "Strategic market entry support from research to operational setup.",
  },
  {
    number: "04",
    title: "Cross-Cultural Communication",
    tagline: "Bridge the Gap",
    description:
      "Multilingual support and cultural consultation across 15+ countries.",
  },
  {
    number: "05",
    title: "Agricultural Financing & Investment Advisory",
    tagline: "Secure Funding, Grow Your Business",
    description:
      "Expert guidance on securing financing for agricultural projects.",
  },
  {
    number: "06",
    title: "Sustainability & Environmental Consultancy",
    tagline: "Build a Sustainable Future",
    description: "Sustainability consulting for eco-friendly practices.",
  },
  {
    number: "07",
    title: "Market Intelligence & Research",
    tagline: "Stay Informed, Stay Ahead",
    description: "Market analysis and competitive intelligence.",
  },
  {
    number: "08",
    title: "Supply Chain & Logistics Management",
    tagline: "Optimise Your Operations",
    description: "End-to-end supply chain optimisation.",
  },
  {
    number: "09",
    title: "Agricultural Project Management",
    tagline: "Turn Ideas into Reality",
    description: "Project management for agricultural ventures.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        label="What We Offer"
        title="Services built for global trade"
        subtitle="From first connection to operational scale — a complete suite of international trade and procurement services."
      />

      <section className="section bg-white">
        <div className="container-px">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.number}
                className="flex flex-col bg-white p-8"
              >
                <span className="font-serif text-3xl text-gold">
                  {service.number}
                </span>
                <h3 className="mt-5 text-xl">{service.title}</h3>
                <p className="mt-2 text-sm font-medium italic text-gold">
                  {service.tagline}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-gray">
                  {service.description}
                </p>
                <Link
                  href="/contact"
                  className="link-gold mt-6"
                >
                  Enquire <span aria-hidden>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-navy">
        <div className="container-px py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-2xl text-3xl text-white sm:text-4xl">
            Not sure which service fits?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            Tell us about your goals and we&apos;ll point you to the right
            starting place.
          </p>
          <div className="mt-10">
            <Link href="/contact" className="btn-gold">
              Book a Free Call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
