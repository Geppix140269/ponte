import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Trade Data Search | Ponte Trade",
  description:
    "Search 7B+ verified trade records. Find real importers, exporters, shipment volumes, unit prices, and trade routes — the same transaction-level customs data that powers our analyst reports.",
  alternates: { canonical: "/tools/search" },
  openGraph: {
    title: "Trade Data Search | Ponte Trade",
    description:
      "Search 7B+ verified trade records. Real shipments, real companies, real prices.",
    url: "/tools/search",
    siteName: "Ponte Trade",
    type: "website",
  },
};

export default async function TradeSearchPage() {
  const user = await getUser();

  return (
    <main>
      {/* ── Hero ── */}
      <section className="container-px pt-14 pb-10 md:pt-20 md:pb-12">
        <span className="pill">Trade Data Search</span>
        <h1
          className="serif text-white mt-6 mb-5"
          style={{
            fontWeight: 400,
            fontSize: "clamp(36px, 5.5vw, 68px)",
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
          }}
        >
          Real shipments.{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            Real companies.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl mb-3">
          Search 7B+ verified customs declarations and bills of lading. Find
          importers, exporters, unit prices, and trade corridors — the same
          transaction-level data that powers our analyst reports.
        </p>
        <div className="flex flex-wrap gap-5 text-[12px] text-gray-2 mt-4" style={{ letterSpacing: "0.08em" }}>
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-positive" />
            Strong coverage: US, LatAm, India, Vietnam, Africa
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#C9973A" }} />
            Partial: intra-EU, Japan, South Korea
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-2" />
            Extrapolated: China exports, Australia
          </span>
        </div>
      </section>

      {/* ── Interactive search ── */}
      <section className="container-px pb-24">
        <SearchClient isAuthenticated={!!user} userEmail={user?.email ?? null} />
      </section>
    </main>
  );
}
