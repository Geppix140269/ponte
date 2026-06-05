import { flaggedListings } from "@/lib/admin/admin-data";
import { AdminActions } from "@/components/admin/AdminActions";

export const dynamic = "force-dynamic";

export default async function ListingsModeration() {
  const rows = await flaggedListings();
  return (
    <div>
      <h1 className="serif text-ink mb-2" style={{ fontSize: 28, fontWeight: 500 }}>Listing moderation</h1>
      <p className="text-[13px] text-gray-2 mb-6">{rows.length} awaiting review</p>
      <div className="space-y-3">
        {rows.map((l: any) => (
          <div key={l.id} className="glass p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-ink">{l.commodity} <span className="badge ml-2">{l.listing_type}</span> <span className="badge ml-1">{l.moderation_status}</span></p>
              {l.moderation_reasons?.length ? <p className="text-[12px] text-negative">{l.moderation_reasons.join("; ")}</p> : null}
            </div>
            <AdminActions kind="listing" id={l.id} />
          </div>
        ))}
        {rows.length === 0 && <div className="glass p-10 text-center text-gray-2">Nothing awaiting review.</div>}
      </div>
    </div>
  );
}
