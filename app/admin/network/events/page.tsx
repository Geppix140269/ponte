import { createAdminClient } from "@/lib/supabase/server";
import { ALL_EVENTS } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export default async function AdminEvents() {
  const sb = createAdminClient();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const counts: { event: string; n: number }[] = [];
  for (const ev of ALL_EVENTS) {
    const { count } = await sb.from("analytics_events").select("id", { count: "exact", head: true }).eq("event", ev).gte("created_at", since);
    if ((count ?? 0) > 0) counts.push({ event: ev, n: count ?? 0 });
  }
  counts.sort((a, b) => b.n - a.n);
  const { data: recent } = await sb.from("analytics_events").select("event, props, created_at").order("created_at", { ascending: false }).limit(50);

  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Analytics events</h1>
      <p className="text-[13px] text-gray-2 mb-6">Last 7 days</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        {counts.map((c) => (
          <div key={c.event} className="glass p-4">
            <p className="serif text-ink" style={{ fontSize: 24, fontWeight: 500 }}>{c.n}</p>
            <p className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.14em" }}>{c.event.replace(/_/g, " ")}</p>
          </div>
        ))}
        {counts.length === 0 && <p className="text-gray-2 text-[13px]">No events captured yet.</p>}
      </div>
      <div className="glass overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-gray-2"><th className="p-3 font-medium">Event</th><th className="p-3 font-medium">Props</th><th className="p-3 font-medium">When</th></tr></thead>
          <tbody>
            {(recent ?? []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-rule">
                <td className="p-3 mono">{r.event}</td>
                <td className="p-3 text-gray-2 truncate max-w-xs">{r.props ? JSON.stringify(r.props) : ""}</td>
                <td className="p-3 text-gray-2">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
