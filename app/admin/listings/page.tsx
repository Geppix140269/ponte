import { createAdminClient } from "@/lib/supabase/server";
import { decideListingAction } from "./actions";

export const dynamic = "force-dynamic";

type Listing = {
  id: string;
  ref: string;
  user_id: string;
  type: string;
  product: string;
  hs_code: string | null;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  incoterm: string | null;
  indicative_value_usd: number | null;
  details: string;
  status: string;
  admin_notes: string | null;
  decision_note: string | null;
  created_at: string;
};

type Doc = { id: string; listing_id: string; filename: string; path: string };

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

export default async function AdminListingsPage() {
  const adminSb = createAdminClient();

  const [{ data: listings }, { data: docs }] = await Promise.all([
    adminSb
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    adminSb.from("listing_documents").select("id, listing_id, filename, path"),
  ]);

  const all = (listings ?? []) as Listing[];
  const docsByListing = new Map<string, Doc[]>();
  for (const d of (docs ?? []) as Doc[]) {
    const arr = docsByListing.get(d.listing_id) ?? [];
    arr.push(d);
    docsByListing.set(d.listing_id, arr);
  }

  // Emails for display
  const emailById = new Map<string, string>();
  for (const uid of Array.from(new Set(all.map((l) => l.user_id)))) {
    const { data } = await adminSb.auth.admin.getUserById(uid);
    if (data?.user?.email) emailById.set(uid, data.user.email);
  }

  // Signed URLs for documents (1 hour)
  const signedByDocId = new Map<string, string>();
  for (const d of (docs ?? []) as Doc[]) {
    const { data } = await adminSb.storage
      .from("listing-docs")
      .createSignedUrl(d.path, 3600);
    if (data?.signedUrl) signedByDocId.set(d.id, data.signedUrl);
  }

  const pending = all.filter((l) => l.status === "submitted");
  const rest = all.filter((l) => l.status !== "submitted");

  function Card({ l }: { l: Listing }) {
    const ldocs = docsByListing.get(l.id) ?? [];
    return (
      <div className="glass p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="mono text-[12px] text-gold">{l.ref}</span>
          <span className="badge uppercase">{l.type}</span>
          <span className="flex-1 text-[15px] text-cream">{l.product}</span>
          <span className="text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.14em" }}>
            {l.status} · {new Date(l.created_at).toLocaleDateString("en-GB")}
          </span>
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-1 text-[13px] text-gray-2 sm:grid-cols-2 md:grid-cols-3">
          <span>From: {emailById.get(l.user_id) ?? l.user_id.slice(0, 8)}</span>
          {l.hs_code && <span>HS: {l.hs_code}</span>}
          {l.origin && <span>Origin: {l.origin}</span>}
          {l.destination && <span>Destination: {l.destination}</span>}
          {l.volume && <span>Volume: {l.volume}</span>}
          {l.incoterm && <span>Incoterm: {l.incoterm}</span>}
          {l.indicative_value_usd && (
            <span>Value: ${Number(l.indicative_value_usd).toLocaleString("en-US")}</span>
          )}
        </div>

        <p className="mt-3 whitespace-pre-wrap border-l-2 border-white/10 pl-3 text-[13px] leading-relaxed text-gray-2">
          {l.details}
        </p>

        {ldocs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ldocs.map((d) => (
              <a
                key={d.id}
                href={signedByDocId.get(d.id) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="badge-gold text-[11px] hover:opacity-80"
              >
                {d.filename}
              </a>
            ))}
          </div>
        )}

        <form action={decideListingAction} className="mt-5 grid gap-3">
          <input type="hidden" name="id" value={l.id} />
          <textarea
            name="decisionNote"
            rows={2}
            maxLength={1500}
            defaultValue={l.decision_note ?? ""}
            placeholder="Note to the member (sent with the decision email)"
            className={FIELD}
          />
          <textarea
            name="adminNotes"
            rows={2}
            maxLength={2000}
            defaultValue={l.admin_notes ?? ""}
            placeholder="Internal notes (never shown to the member)"
            className={FIELD}
          />
          <div className="flex flex-wrap gap-3">
            <button name="decision" value="approved" className="btn-gold">
              Approve
            </button>
            <button name="decision" value="rejected" className="btn-ghost-light">
              Reject
            </button>
            {l.status === "approved" && (
              <button name="decision" value="closed" className="btn-ghost-light">
                Close
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
        Listings
      </h1>
      <p className="mt-2 text-[14px] text-gray-2">
        {pending.length} awaiting vetting · {all.length} total
      </p>

      <h2 className="serif text-white mt-8 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
        Awaiting vetting
      </h2>
      {pending.length === 0 ? (
        <div className="glass p-6 text-[14px] text-gray-2">Queue is clear.</div>
      ) : (
        <div className="space-y-4">{pending.map((l) => <Card key={l.id} l={l} />)}</div>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="serif text-white mt-10 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
            Decided
          </h2>
          <div className="space-y-4">{rest.map((l) => <Card key={l.id} l={l} />)}</div>
        </>
      )}
    </div>
  );
}
