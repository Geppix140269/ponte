import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "About",
  description:
    "Built on 30 years of global trade expertise. Meet founder Giuseppe Funaro and learn how Ponte bridges suppliers and buyers worldwide.",
};

const accreditations = [
  {
    name: "International Trade Council",
    detail: "Accredited Member",
  },
  {
    name: "Capitalimprese®",
    detail:
      "Member Organisation — Associazione Italiana Industriali Piccole e Medie Imprese",
  },
  {
    name: "Business Council for Artificial Intelligence",
    detail: "Member",
  },
];

const methodology = [
  {
    number: "01",
    title: "Vision It",
    description:
      "Understand goals, challenges, and market landscape. Strategic planning forms the foundation.",
  },
  {
    number: "02",
    title: "Build It",
    description:
      "Execute strategies, forge partnerships, and establish infrastructure for sustainable growth.",
  },
  {
    number: "03",
    title: "Sustain It",
    description:
      "Long-term success through continuous optimisation and adaptive strategies.",
  },
];

const projects = [
  {
    number: "01",
    title: "Expansion of Ponte",
    role: null,
    description:
      "UK and Bulgaria dual operations, agricultural commodities, EU market entry for Ukrainian products, Eastern European supply chain partnerships.",
  },
  {
    number: "02",
    title: "Market Entry",
    role: "Bluemar Ferries SL — Chief Operating Officer",
    description:
      "Led market entry strategy for ferry operations across Mediterranean markets.",
  },
  {
    number: "03",
    title: "Business Model Reshaping",
    role: "Sitges Media Factory SL",
    description:
      "Restructured business model, 30% revenue increase within 9 months.",
  },
  {
    number: "04",
    title: "Telecommunications Leadership",
    role: "CCC Alpha",
    description:
      "Scaled €70M to €120M annual revenue, EBITDA from breakeven to €5M.",
  },
  {
    number: "05",
    title: "Strategic Partnerships",
    role: "Dynegy Europe Communication",
    description: "Fibre optics expansion across Italy and Germany.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        label="About Ponte"
        title="Built on 30 years of global trade expertise"
      />

      {/* Founder */}
      <section className="section bg-white">
        <div className="container-px grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="section-label">The Founder</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">Giuseppe Funaro</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-gray">
              <p>
                Over 30 years in international business, trading, and
                procurement, with a career spanning telecommunications, media,
                and agriculture.
              </p>
              <p>
                Giuseppe has consistently delivered results for organisations of
                every size — from early-stage startups to multi-million euro
                enterprises — building operations and partnerships that endure.
              </p>
              <p>
                His vision for Ponte is grounded in trusted partnerships,
                cultural understanding, and an unwavering commitment to mutual
                success.
              </p>
            </div>
          </div>

          <div className="bg-cream p-8 lg:p-10">
            <p className="section-label">Accreditations</p>
            <ul className="mt-6 space-y-6">
              {accreditations.map((item) => (
                <li
                  key={item.name}
                  className="border-l-2 border-gold pl-5"
                >
                  <p className="font-serif text-lg text-navy">{item.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="section bg-cream">
        <div className="container-px max-w-3xl">
          <p className="section-label">Who We Are</p>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            A bridge between suppliers and buyers worldwide
          </h2>
          <p className="mt-6 text-base leading-relaxed text-gray">
            Ponte is an international procurement and sales company with offices
            in the United Kingdom and Bulgaria. We act as the bridge between
            suppliers and buyers worldwide — connecting markets, simplifying
            cross-border trade, and helping businesses grow beyond their borders.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section className="section bg-white">
        <div className="container-px">
          <div className="max-w-2xl">
            <p className="section-label">How We Work</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">Our methodology</h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3">
            {methodology.map((step) => (
              <div key={step.number}>
                <span className="serif-number">{step.number}</span>
                <h3 className="mt-5 text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Projects */}
      <section className="section bg-navy">
        <div className="container-px">
          <div className="max-w-2xl">
            <p className="section-label">Track Record</p>
            <h2 className="mt-4 text-3xl text-white sm:text-4xl">
              Key projects
            </h2>
          </div>
          <div className="mt-14 divide-y divide-white/10 border-t border-white/10">
            {projects.map((project) => (
              <div
                key={project.number}
                className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12 md:gap-8"
              >
                <div className="md:col-span-1">
                  <span className="font-serif text-3xl text-gold">
                    {project.number}
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-xl text-white">{project.title}</h3>
                  {project.role && (
                    <p className="mt-2 text-sm font-medium text-gold">
                      {project.role}
                    </p>
                  )}
                </div>
                <div className="md:col-span-7">
                  <p className="text-sm leading-relaxed text-white/70">
                    {project.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <Link href="/case-studies" className="btn-outline-light">
              View Case Studies
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
