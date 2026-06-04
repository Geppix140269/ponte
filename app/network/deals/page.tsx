import type { Metadata } from "next";
import Link from "next/link";
import { listMyDeals } from "@/lib/network/deal-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deals", robots: { index: false } };

const STAGE_LABEL: Record<string, string> = {
  enquiry: "Enquiry", offer: "Offer", negotiation: "Negotiation", closed: "Closed", cancelled: "Cancelled",
};

export default async function DealsPage() {
  const deals = await listMyDeals();
  return (
    <section className="container-px py-12 max-w-container mx-auto">
      <h1 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>Deal rooms</h1>
      <div className="mt-6 space-y-3">
        {deals.map((d: { id: string; title: string | null; stage: string }) => (
          <Link key={d.id} href={`/network/deals/${d.id}`} className="card p-5 flex items-center justify-between">
            <span className="text-white">{d.title ?? "Deal"}</span>
            <span className="badge">{STAGE_LABEL[d.stage] ?? d.stage}</span>
          </Link>
        ))}
        {deals.length === 0 && <div className="glass p-12 text-center text-gray-2">No deals yet. Open one from a listing.</div>}
      </div>
    </section>
  );
}
