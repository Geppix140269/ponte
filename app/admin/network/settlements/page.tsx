import Link from "next/link";
import { recentSettlements } from "@/lib/admin/admin-data";

export const dynamic = "force-dynamic";
const money = (c: number, ccy: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD", maximumFractionDigits: 0 }).format(c / 100);

export default async function AdminSettlements() {
  const rows = await recentSettlements();
  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Settlements</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} escrows</p>
      <div className="glass overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-gray-2">
            <th className="p-3 font-medium">Deal</th><th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium text-right">Total</th><th className="p-3 font-medium">Milestones</th><th className="p-3 font-medium">Created</th>
          </tr></thead>
          <tbody>
            {rows.map((s: any) => (
              <tr key={s.id} className="border-t border-rule">
                <td className="p-3"><Link href={`/network/deals/${s.deal_id}`} className="text-gold hover:underline">{s.deal_id.slice(0, 8)}…</Link></td>
                <td className="p-3"><span className="badge">{s.status.replace(/_/g, " ")}</span></td>
                <td className="p-3 text-right">{money(s.total_cents, s.currency)}</td>
                <td className="p-3">{s.released}/{s.milestones} released</td>
                <td className="p-3 text-gray-2">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-2">No settlements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
