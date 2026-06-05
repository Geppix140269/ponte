import { openReports } from "@/lib/admin/admin-data";
import { AdminActions } from "@/components/admin/AdminActions";

export const dynamic = "force-dynamic";

export default async function ReportsQueue() {
  const rows = await openReports();
  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Reports</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} open</p>
      <div className="space-y-3">
        {rows.map((r: any) => (
          <div key={r.id} className="glass p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-ink capitalize">{r.target_type} report · {r.reason}</p>
              {r.details && <p className="text-[12px] text-gray-2">{r.details}</p>}
            </div>
            <AdminActions kind="report" id={r.id} />
          </div>
        ))}
        {rows.length === 0 && <div className="glass p-10 text-center text-gray-2">No open reports.</div>}
      </div>
    </div>
  );
}
