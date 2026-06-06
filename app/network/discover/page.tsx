import type { Metadata } from "next";
import Link from "next/link";
import { getDiscoveryProvider } from "@/lib/network/discovery";
import { parseDiscoveryQuery } from "@/lib/network/discovery-query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discover counterparties", robots: { index: false } };

export default async function DiscoverPage({
  searchParams,
}: { searchParams: Record<string, string | undefined> }) {
  const q = parseDiscoveryQuery(searchParams);
  const { total, results } = await getDiscoveryProvider().discover(q);

  return (
    <section className="container-px py-12 max-w-container mx-auto">
      <p className="eyebrow text-gold">Discovery</p>
      <h1 className="serif text-ink mt-2" style={{ fontSize: 30, fontWeight: 500 }}>Real suppliers and buyers, from customs data</h1>
      <p className="mt-2 text-[14px] text-gray-2 max-w-2xl">Search 7B+ shipment records across 199 countries. Counterparties exist before they list, find them anyway.</p>

      <form method="GET" className="glass p-5 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select name="role" defaultValue={q.role} className="field">
          <option value="suppliers">Suppliers (I am buying)</option>
          <option value="buyers">Buyers (I am selling)</option>
        </select>
        <input name="commodity" defaultValue={searchParams.commodity ?? ""} placeholder="Commodity" className="field" />
        <input name="hsCode" defaultValue={searchParams.hsCode ?? ""} placeholder="HS code" className="field" />
        <input name="country" defaultValue={searchParams.country ?? ""} placeholder="Country" className="field" />
        <button type="submit" className="btn-gold">Search</button>
      </form>

      <div className="flex items-center justify-between mt-6 mb-2">
        <p className="text-[13px] text-gray-2">Showing {results.length} of {total.toLocaleString()} matches</p>
        <p className="mono text-[11px] text-gray-2">Source · ADAMftd customs intelligence</p>
      </div>

      <div className="glass overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-gray-2 text-left">
              <th className="p-3 font-medium">Counterparty</th>
              <th className="p-3 font-medium">Country</th>
              <th className="p-3 font-medium">HS</th>
              <th className="p-3 font-medium text-right">Shipments · 12mo</th>
              <th className="p-3 font-medium">Last seen</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((c) => (
              <tr key={c.id} className="border-t border-rule">
                <td className="p-3 font-medium text-ink">{c.name}</td>
                <td className="p-3">{c.country}</td>
                <td className="p-3 mono">{c.hsCodes.join(", ")}</td>
                <td className="p-3 text-right">{c.shipments12mo.toLocaleString()}</td>
                <td className="p-3 text-gray-2">{c.lastSeen}</td>
                <td className="p-3">{c.verified ? <span className="text-positive font-medium">Verified · {c.trust}</span> : <span className="text-gray-2">Unverified</span>}</td>
                <td className="p-3 text-right">
                  <Link href={`/network/verify?company=${encodeURIComponent(c.name)}`} className="text-gold hover:underline">Verify →</Link>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-2">No matches. Broaden your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
