import { getAdminMetrics } from "@/lib/admin/admin-analytics";

export const dynamic = "force-dynamic";

function eur(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function NetworkDashboard() {
  const m = await getAdminMetrics();
  const cards = [
    { label: "Users", value: m.users },
    { label: "Active listings", value: m.activeListings },
    { label: "Active deals", value: m.activeDeals },
    { label: "Completed deals", value: m.completedDeals },
    { label: "Verification rate", value: `${Math.round(m.verificationRate * 100)}%` },
    { label: "MRR", value: eur(m.mrrCents) },
  ];
  return (
    <div>
      <h1 className="serif text-ink mb-7" style={{ fontSize: 32, fontWeight: 500 }}>Network</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="glass p-6">
            <p className="serif text-ink" style={{ fontSize: 30, fontWeight: 500 }}>{c.value}</p>
            <p className="mt-1 mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.18em" }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <div className="glass p-6">
          <p className="mono text-[10px] text-gray-2 uppercase mb-4" style={{ letterSpacing: "0.18em" }}>Trust distribution</p>
          {(["low", "medium", "high", "blocked"] as const).map((k) => (
            <Row key={k} label={k} value={m.trust[k]} total={m.users} />
          ))}
        </div>
        <div className="glass p-6">
          <p className="mono text-[10px] text-gray-2 uppercase mb-4" style={{ letterSpacing: "0.18em" }}>Plan distribution</p>
          {(["free", "starter", "pro", "enterprise"] as const).map((k) => (
            <Row key={k} label={k} value={m.plans[k]} total={m.users} />
          ))}
        </div>
      </div>

      <div className="glass p-6 mt-6">
        <p className="mono text-[10px] text-gray-2 uppercase mb-4" style={{ letterSpacing: "0.18em" }}>Signups by month</p>
        <div className="flex items-end gap-2 h-32">
          {m.growth.map((g) => {
            const max = Math.max(1, ...m.growth.map((x) => x.count));
            return (
              <div key={g.month} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full bg-gold/40 rounded-t" style={{ height: `${(g.count / max) * 100}%` }} />
                <span className="mt-1 text-[9px] text-gray-2">{g.month.slice(2)}</span>
              </div>
            );
          })}
          {m.growth.length === 0 && <p className="text-gray-2 text-[13px]">No signups yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-20 text-[12px] text-gray-2 capitalize">{label}</span>
      <div className="flex-1 h-2 bg-white/8 rounded"><div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} /></div>
      <span className="w-10 text-right text-[12px] text-ink">{value}</span>
    </div>
  );
}
