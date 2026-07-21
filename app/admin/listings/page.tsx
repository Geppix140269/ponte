import { createAdminClient } from "@/lib/supabase/server";
import { decideListingAction, runAiVetAction } from "./actions";
import { vetListing, isAiConfigured, type AiReview } from "@/lib/ai-vet";

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
  submitter_role: string | null;
  chain_depth: string | null;
  details: string;
  status: string;
  admin_notes: string | null;
  decision_note: string | null;
  created_at: string;
  ai_review: AiReview | null;
  ai_reviewed_at: string | null;
};

type Doc = { id: string; listing_id: string; filename: string; path: string };
type Media = { id: string; listing_id: string; path: string; kind: string };

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

export default async function AdminListingsPage() {
  const adminSb = createAdminClient();

  const [{ data: listings }, { data: docs }, { data: mediaRows }] = await Promise.all([
    adminSb
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    adminSb.from("listing_documents").select("id, listing_id, filename, path"),
    adminSb.from("listing_media").select("id, listing_id, path, kind"),
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

  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mediaByListing = new Map<string, Media[]>();
  for (const m of (mediaRows ?? []) as Media[]) {
    const arr = mediaByListing.get(m.listing_id) ?? [];
    arr.push(m);
    mediaByListing.set(m.listing_id, arr);
  }

  const pending = all.filter((l) => l.status === "submitted");
  const rest = all.filter((l) => l.status !== "submitted");

  // AI co-pilot: vet up to 2 unreviewed pending listings per page load so
  // the queue self-prepares without blocking too long.
  if (isAiConfigured()) {
    const unvetted = pending.filter((l) => !l.ai_review).slice(0, 2);
    for (const l of unvetted) {
      const review = await vetListing({
        ref: l.ref, type: l.type, product: l.product, details: l.details,
        origin: l.origin, destination: l.destination, volume: l.volume,
        incoterm: l.incoterm, indicative_value_usd: l.indicative_value_usd,
        submitter_role: l.submitter_role, chain_depth: l.chain_depth,
        media_count: (mediaByListing.get(l.id) ?? []).length,
        doc_count: (docsByListing.get(l.id) ?? []).length,
      });
      if (review) {
        await adminSb.from("listings").update({
          ai_review: review,
          ai_reviewed_at: new Date().toISOString(),
        }).eq("id", l.id);
        l.ai_review = review;
      }
    }
  }

  function Card({ l }: { l: Listing }) {
    const ldocs = docsByListing.get(l.id) ?? [];
    const lmedia = mediaByListing.get(l.id) ?? [];
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
          {l.submitter_role && (
            <span className="text-gold">
              {l.submitter_role}
              {l.chain_depth ? ` · ${l.chain_depth}` : ""}
            </span>
          )}
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

        {lmedia.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lmedia.map((m) =>
              m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={m.id} href={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`}
                    alt="listing media"
                    className="h-20 w-28 rounded-md object-cover"
                  />
                </a>
              ) : (
                <a
                  key={m.id}
                  href={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge-gold text-[11px] hover:opacity-80"
                >
                  ▶ video
                </a>
              ),
            )}
          </div>
        )}

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

        {l.ai_review && (
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase text-gold" style={{ letterSpacing: "0.18em" }}>
                AI co-pilot
              </span>
              <span className={`text-[12px] font-bold ${
                l.ai_review.verdict === "looks_solid" ? "text-positive"
                : l.ai_review.verdict === "caution" ? "text-red-400" : "text-gold"
              }`}>
                {l.ai_review.verdict.replace("_", " ")} · {l.ai_review.score}/100
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-cream">{l.ai_review.summary}</p>
            {l.ai_review.red_flags?.length > 0 && (
              <p className="mt-2 text-[12px] text-red-400">Flags: {l.ai_review.red_flags.join(" · ")}</p>
            )}
            {l.ai_review.compliance_notes?.length > 0 && (
              <p className="mt-1 text-[12px] text-red-400">Compliance: {l.ai_review.compliance_notes.join(" · ")}</p>
            )}
            {l.ai_review.missing_info?.length > 0 && (
              <p className="mt-1 text-[12px] text-gray-2">Missing: {l.ai_review.missing_info.join(" · ")}</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] uppercase text-gold" style={{ letterSpacing: "0.14em" }}>
                Drafts (questions email · decision note)
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-[12px] text-gray-2">{l.ai_review.questions_email_draft}</p>
              <p className="mt-2 whitespace-pre-wrap border-t border-white/10 pt-2 text-[12px] text-gray-2">{l.ai_review.decision_note_draft}</p>
            </details>
          </div>
        )}
        <form action={runAiVetAction} className="mt-3">
          <input type="hidden" name="id" value={l.id} />
          <button className="text-[11px] uppercase text-gold hover:text-cream" style={{ letterSpacing: "0.14em" }}>
            {l.ai_review ? "Re-run AI vetting" : "Run AI vetting"}
          </button>
        </form>

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
