import type { Metadata } from "next";
import EmailSignup from "@/components/EmailSignup";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Intelligence for global trade — practical guides on EU market entry, cross-border sourcing, and cross-cultural negotiation.",
};

const articles = [
  {
    title: "A Practical Guide to EU Market Entry for Non-EU Businesses",
    date: "May 2026",
    category: "Market Entry",
    excerpt:
      "Navigating EU regulations, customs, and partner selection.",
  },
  {
    title: "How to Source Agricultural Commodities Safely Across Borders",
    date: "April 2026",
    category: "Procurement",
    excerpt:
      "Key steps to vet suppliers and manage quality risk in Eastern Europe.",
  },
  {
    title: "Cross-Cultural Negotiation: What Western Businesses Get Wrong",
    date: "March 2026",
    category: "Strategy",
    excerpt:
      "Common mistakes in international negotiations and building trust.",
  },
];

export default function InsightsPage() {
  return (
    <>
      <PageHero
        label="Insights"
        title="Intelligence for global trade"
        subtitle="Perspectives and practical guidance on international trade, procurement, and market expansion."
      />

      <section className="section bg-white">
        <div className="container-px">
          <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.title}
                className="flex flex-col bg-white p-8"
              >
                <div className="flex items-center gap-3 text-xs uppercase tracking-wider">
                  <span className="font-semibold text-gold">
                    {article.category}
                  </span>
                  <span className="text-gray">{article.date}</span>
                </div>
                <h2 className="mt-4 text-xl leading-snug">{article.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-gray">
                  {article.excerpt}
                </p>
                <span className="link-gold mt-6 cursor-default">
                  Coming soon
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-cream">
        <div className="container-px py-20 sm:py-24">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="section-label">Newsletter</p>
              <h2 className="mt-4 text-3xl sm:text-4xl">Stay in the Loop</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-gray">
                Get our latest insights on international trade and market entry
                delivered to your inbox.
              </p>
            </div>
            <div className="lg:flex lg:justify-end">
              <EmailSignup
                formName="newsletter"
                buttonLabel="Subscribe"
                variant="light"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
