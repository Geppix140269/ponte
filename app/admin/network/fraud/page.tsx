import { openFraudFlags } from "@/lib/admin/admin-data";
import { AdminActions } from "@/components/admin/AdminActions";

export const dynamic = "force-dynamic";

export default async function FraudQueue() {
  const rows = await openFraudFlags();
  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Fraud queue</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} open flags</p>
      <div className="space-y-3">
        {rows.map((f: any) => (
          <div key={f.id} className="glass p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-ink">{f.flag_type.replace(/_/g, " ")} <span className="badge ml-2">{f.severity}</span></p>
              {f.detail && <p className="text-[12px] text-gray-2">{f.detail}</p>}
            </div>
            <AdminActions kind="fraud" id={f.id} />
          </div>
        ))}
        {rows.length === 0 && <div className="glass p-10 text-center text-gray-2">No open flags.</div>}
      </div>
    </div>
  );
}
