import { recentUsers } from "@/lib/admin/admin-data";
import { AdminActions } from "@/components/admin/AdminActions";

export const dynamic = "force-dynamic";

export default async function NetworkUsers() {
  const rows = await recentUsers();
  return (
    <div>
      <h1 className="serif text-white mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Users</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} users</p>
      <div className="space-y-3">
        {rows.map((u: any) => (
          <div key={u.id} className="glass p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-white">{u.full_name ?? "—"} {u.company ? `· ${u.company}` : ""} {u.verified_broker ? <span className="badge-gold ml-2">Verified</span> : null}</p>
              <p className="text-[12px] text-gray-2">{u.account_type ?? "no type"} · {u.plan} · trust {u.trust_score} · {u.risk_category}</p>
            </div>
            <AdminActions kind="user" id={u.id} />
          </div>
        ))}
        {rows.length === 0 && <div className="glass p-10 text-center text-gray-2">No users.</div>}
      </div>
    </div>
  );
}
