import { pendingVerifications } from "@/lib/admin/admin-data";
import { AdminActions } from "@/components/admin/AdminActions";

export const dynamic = "force-dynamic";

export default async function VerificationsQueue() {
  const rows = await pendingVerifications();
  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Verification queue</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} pending</p>
      <div className="space-y-3">
        {rows.map((v: any) => (
          <div key={v.id} className="glass p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-ink">{v.profile?.full_name ?? "—"} {v.profile?.company ? `· ${v.profile.company}` : ""}</p>
              <p className="text-[12px] text-gray-2">requesting <span className="text-gold">{v.level}</span> verification · {(v.document_paths?.length ?? 0)} docs</p>
            </div>
            <AdminActions kind="verification" id={v.id} />
          </div>
        ))}
        {rows.length === 0 && <div className="glass p-10 text-center text-gray-2">Queue is clear.</div>}
      </div>
    </div>
  );
}
