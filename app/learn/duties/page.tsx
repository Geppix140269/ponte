import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Import Duties and Tariffs Explained — HS Codes, MFN Rates, FTAs",
  description:
    "A complete guide to import duties: how they are calculated, the six duty types (ad valorem, specific, compound, ADD, CVD, safeguard), MFN rates, FTA preferences, and how to minimise your landed cost legally.",
  alternates: { canonical: "/learn/duties" },
  openGraph: {
    title: "Import Duties and Tariffs Explained | Ponte Trade",
    description:
      "HS codes, MFN rates, anti-dumping duties, FTAs and landed cost — explained from first principles with worked examples.",
    url: "/learn/duties",
    siteName: "Ponte Trade",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Import Duties and Tariffs Explained — HS Codes, MFN Rates, FTAs",
    description:
      "Complete guide to import duties: how they work, the six types, FTA preferences, and legal cost reduction strategies.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is an import duty calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An import duty is calculated from three inputs: (1) the HS code, which determines the applicable duty rate; (2) the customs value, which is typically the CIF value of the goods (cost + insurance + freight to the port of destination); and (3) the duty rate itself, expressed as a percentage of the customs value (ad valorem) or as a fixed amount per unit. The duty payable equals the customs value multiplied by the ad valorem rate, plus any specific duty per unit where applicable.",
      },
    },
    {
      "@type": "Question",
      name: "What is an MFN tariff rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MFN stands for Most Favoured Nation. The MFN rate is the standard import duty rate that WTO member countries apply to goods from all other WTO members unless a preferential trade agreement (FTA) provides a lower rate. With 164 WTO members, MFN rates apply to the vast majority of world trade. The MFN rate is the baseline — the starting point before FTA preferences or additional duties (anti-dumping, safeguards) are applied.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between ad valorem and specific duties?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ad valorem duties are expressed as a percentage of the customs value of the goods — for example, 5% of the CIF value. They rise and fall with the price of the goods. Specific duties are expressed as a fixed monetary amount per unit of quantity — for example, $0.68 per kilogram of sugar. Specific duties do not change with the price of the goods. Compound duties combine both: a percentage rate plus a fixed amount per unit.",
      },
    },
    {
      "@type": "Question",
      name: "What is an anti-dumping duty?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An anti-dumping duty (ADD) is an additional import tariff imposed on specific goods from specific countries where those goods are found to be exported at prices below their normal value (i.e., below the domestic price in the exporting country or below the cost of production). ADDs are on top of the standard MFN rate and can be very high — commonly 20-200%. They are product- and origin-specific: the same HS code imported from a different country will not be subject to the ADD.",
      },
    },
    {
      "@type": "Question",
      name: "How do free trade agreements reduce import duties?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free trade agreements (FTAs) create preferential tariff rates between member countries — typically 0% for qualifying goods. To benefit from an FTA rate, the goods must meet the 'rules of origin' requirements specified in the agreement. Rules of origin define how much of the product's content or transformation must occur within an FTA member country to qualify. Documentation requirements (typically a certificate of origin or exporter's declaration) must also be met at the time of import.",
      },
    },
    {
      "@type": "Question",
      name: "What is a landed cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The landed cost is the total cost of getting a product to its destination country, including: the cost of the goods (ex-works or FOB), international freight and insurance, import duty, VAT or GST applied on import, customs processing fees, and any other import-related charges (e.g., the US Harbor Maintenance Fee). Landed cost is the correct denominator for margin calculations — not just the purchase price of the goods.",
      },
    },
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ponte.trade" },
    { "@type": "ListItem", position: 2, name: "Learn", item: "https://ponte.trade/learn" },
    { "@type": "ListItem", position: 3, name: "Import Duties Explained", item: "https://ponte.trade/learn/duties" },
  ],
};

const DUTY_TYPES = [
  {
    type: "Ad valorem",
    definition: "A percentage of the customs value of the goods.",
    example: "TV worth $500, 5% rate → $25 duty",
    where: "Most goods in most countries",
  },
  {
    type: "Specific",
    definition: "A fixed monetary amount per unit of quantity (weight, volume, number of items).",
    example: "$0.68/kg of sugar regardless of price",
    where: "Agricultural goods, alcoholic beverages, tobacco",
  },
  {
    type: "Compound",
    definition: "A combination of ad valorem and specific duties applied simultaneously.",
    example: "Footwear: 20% of value + $0.90/pair",
    where: "Footwear, certain textiles and agricultural products",
  },
  {
    type: "Anti-dumping (ADD)",
    definition: "An additional duty on goods exported below normal value (dumping). Applied on top of MFN rate.",
    example: "Chinese steel: MFN 3% + ADD 62.5% = 65.5% total",
    where: "Steel, aluminium, chemicals, consumer goods — varies by country and product",
  },
  {
    type: "Countervailing (CVD)",
    definition: "A duty to offset government subsidies in the exporting country. Applied on top of MFN rate.",
    example: "Subsidised solar panels: MFN 2.5% + CVD 15% = 17.5%",
    where: "Any product where foreign subsidy is proven — commonly solar, steel, agriculture",
  },
  {
    type: "Safeguard",
    definition: "A temporary duty imposed when a surge in imports threatens domestic industry.",
    example: "US washing machines: 20% safeguard duty for 3 years",
    where: "Typically short-term, any sector facing import surge — politically driven",
  },
];

const FTAS = [
  { name: "USMCA", members: "US, Canada, Mexico", note: "Replaces NAFTA. Duty-free for qualifying goods. Automotive rules of origin require 75% regional value." },
  { name: "EU Single Market", members: "27 EU member states", note: "Zero duties on all intra-EU trade. Common External Tariff (CET) applies to imports from outside the EU." },
  { name: "RCEP", members: "15 Asia-Pacific nations incl. China, Japan, ASEAN", note: "World's largest FTA by trade volume. Gradual tariff elimination over 10-20 years depending on product." },
  { name: "CPTPP", members: "11 Pacific nations incl. Japan, Canada, Australia, Vietnam", note: "High-standard agreement. Eliminates tariffs on 95%+ of goods. UK acceded in 2023." },
  { name: "AfCFTA", members: "54 African Union member states", note: "Aims to eliminate 97% of tariff lines. Phased implementation — check current schedules by member state." },
  { name: "UK-EU TCA", members: "UK and EU", note: "Zero tariffs on qualifying goods with UK or EU origin. Rules of origin require substantial transformation within the TCA area." },
];

export default function LearnDutiesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />
      <main className="pb-24">
        {/* Hero */}
        <section className="container-px pt-16 pb-12">
          <nav className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
            <Link href="/" className="hover:text-gold transition-colors">Home</Link>
            <span className="text-white/20">/</span>
            <span>Learn</span>
            <span className="text-white/20">/</span>
            <span className="text-cream">Import Duties Explained</span>
          </nav>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-gold">
            Trade intelligence fundamentals
          </p>
          <h1 className="heading-xl mb-6 max-w-3xl">
            Import duties and tariffs explained — from HS codes to landed cost.
          </h1>
          <p className="body-lg max-w-2xl text-muted">
            Every import is subject to duty. Understanding how that duty is calculated —
            and how to legally minimise it — can determine whether a trade corridor is
            profitable. This guide covers everything from the basics to FTA optimisation.
          </p>
        </section>

        {/* The calculation */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">How import duty is calculated</h2>
          <p className="body-md text-muted max-w-2xl mb-8">
            Every import duty calculation requires exactly three inputs:
            the HS code, the customs value, and the applicable rate.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mb-10">
            {[
              { n: "01", label: "HS Code", body: "The Harmonised System code classifies your product and determines which duty rate applies. An incorrect classification can mean paying the wrong rate — higher or lower than the legal obligation." },
              { n: "02", label: "Customs value", body: "Usually the CIF value — cost of goods plus insurance plus freight to the port of destination. If you trade on FOB terms, the importer adds insurance and freight to derive CIF." },
              { n: "03", label: "Duty rate", body: "The applicable rate from the destination country's tariff schedule. May be MFN (standard), preferential (FTA), or a combination with ADD, CVD or safeguard duties on top." },
            ].map((item) => (
              <div key={item.n} className="rounded-xl border border-white/10 bg-navy/40 p-5 space-y-2">
                <span className="font-mono text-2xl font-bold text-gold/40">{item.n}</span>
                <h3 className="text-sm font-semibold text-cream">{item.label}</h3>
                <p className="text-xs leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Worked example */}
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 max-w-3xl">
            <p className="text-[11px] uppercase tracking-widest text-gold mb-3">Worked example</p>
            <p className="text-cream text-lg font-medium leading-snug mb-4">
              Laptop (HS 8471.30), customs value $1,000, imported China → US
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted">MFN duty rate</span>
                <span className="text-cream">0% (laptops are duty-free under ITA)</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted">Section 301 tariff (China-specific)</span>
                <span className="text-cream">25% → $250</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted">Merchandise Processing Fee</span>
                <span className="text-cream">0.3464% → $3.46</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-semibold text-cream">Total duty + fees on $1,000 shipment</span>
                <span className="font-semibold text-gold">$253.46</span>
              </div>
            </div>
          </div>
        </section>

        {/* MFN */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">MFN rates: the WTO baseline</h2>
          <p className="body-md text-muted max-w-2xl">
            The Most Favoured Nation (MFN) rate is the standard duty applied to imports
            from any WTO member country in the absence of a preferential trade agreement.
            With 164 WTO members, MFN rates cover the vast majority of global trade.
            Every country&apos;s MFN schedule is published and legally binding —
            you can look up any rate for any HS code in any country. MFN is the
            starting point. Everything else — FTA preferences, anti-dumping, safeguards —
            is a modification of the MFN baseline.
          </p>
        </section>

        {/* Six duty types */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">The six types of import duty</h2>
          <p className="body-md text-muted max-w-2xl mb-8">
            Not all duties work the same way. The type of duty determines how it
            is calculated and what triggers it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
            {DUTY_TYPES.map((dt) => (
              <div key={dt.type} className="rounded-xl border border-white/10 bg-navy/40 p-5 space-y-2">
                <h3 className="text-sm font-semibold text-cream">{dt.type}</h3>
                <p className="text-xs text-muted leading-relaxed">{dt.definition}</p>
                <div className="rounded bg-white/5 px-3 py-2">
                  <p className="text-xs font-mono text-gold">{dt.example}</p>
                </div>
                <p className="text-[11px] text-muted">
                  <span className="text-cream/60">Common on: </span>{dt.where}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FTAs */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">Free trade agreements and preferential rates</h2>
          <p className="body-md text-muted max-w-2xl mb-4">
            An FTA creates a preferential tariff rate — often 0% — between member countries.
            To benefit, your goods must satisfy the &ldquo;rules of origin&rdquo; requirement:
            a minimum level of production or transformation must occur within an FTA member country.
          </p>
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 max-w-3xl mb-8">
            <p className="text-[11px] uppercase tracking-widest text-gold mb-2">FTA in practice</p>
            <p className="text-cream text-sm font-medium mb-1">
              Brake pads (HS 8708.30) imported into the US
            </p>
            <div className="flex gap-8 text-sm mt-3">
              <div>
                <p className="text-muted text-xs mb-1">From Mexico (USMCA qualifying)</p>
                <p className="text-cream font-semibold text-xl">0%</p>
              </div>
              <div>
                <p className="text-muted text-xs mb-1">From China (MFN)</p>
                <p className="text-cream font-semibold text-xl">2.5%</p>
              </div>
              <div>
                <p className="text-muted text-xs mb-1">From China (+ Section 301)</p>
                <p className="text-gold font-semibold text-xl">27.5%</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto max-w-4xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-[11px] uppercase tracking-wider text-muted font-medium">Agreement</th>
                  <th className="text-left py-3 pr-6 text-[11px] uppercase tracking-wider text-muted font-medium">Members</th>
                  <th className="text-left py-3 text-[11px] uppercase tracking-wider text-muted font-medium">Key notes</th>
                </tr>
              </thead>
              <tbody>
                {FTAS.map((fta) => (
                  <tr key={fta.name} className="border-b border-white/[0.06]">
                    <td className="py-3 pr-6 text-cream font-semibold">{fta.name}</td>
                    <td className="py-3 pr-6 text-muted text-xs">{fta.members}</td>
                    <td className="py-3 text-muted text-xs leading-relaxed">{fta.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Beyond duties */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">Beyond duties: the full landed cost</h2>
          <p className="body-md text-muted max-w-2xl mb-6">
            Import duty is only part of the landed cost. A complete landed cost calculation
            must also include:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
            {[
              { label: "VAT / GST on import", body: "Applied on the duty-inclusive customs value. UK: 20%. EU standard: varies 17-27%. Australia: 10% GST. US: no federal VAT." },
              { label: "Customs processing fee", body: "US: Merchandise Processing Fee (MPF) — 0.3464% of value, min $31.67. EU: no equivalent but broker fees apply." },
              { label: "Harbor Maintenance Fee (US)", body: "0.125% of cargo value on sea freight imports into US. Paid by importer." },
              { label: "Excise duties", body: "Additional consumption taxes on alcohol, tobacco, fuel, and certain goods. Applied at import by many countries." },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <h3 className="text-sm font-semibold text-cream">{item.label}</h3>
                <p className="text-xs leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-8 max-w-2xl">Frequently asked questions</h2>
          <div className="max-w-3xl space-y-8">
            {faqJsonLd.mainEntity.map((item) => (
              <div key={item.name} className="space-y-2">
                <h3 className="text-sm font-semibold text-cream">{item.name}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-px py-12 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-3">Ready to calculate</p>
          <h2 className="heading-lg mb-4 max-w-xl">
            Get your landed cost in seconds.
          </h2>
          <p className="text-sm text-muted max-w-lg mb-6">
            Free interactive calculator. Enter your HS code, origin, destination and customs value
            — get MFN rate, FTA rate, ADD/CVD exposure, VAT and total landed cost instantly.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/tools/duties" className="btn-primary">
              Open duty calculator
            </Link>
            <Link href="/product/tariff-landed-cost-analysis" className="btn-ghost text-sm">
              Get a full analyst brief — CT-002, $299
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
