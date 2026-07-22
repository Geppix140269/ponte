import { createAdminClient } from "@/lib/supabase/server";
import { decideListingAction, runAiVetAction, saveListingNotesAction } from "./actions";
import { vetListing, isAiConfigured, type AiReview } from "@/lib/ai-vet";
import { draftListingNotes } from "@/lib/listings/decision-notes";

export const dynamic = "force-dynamic";

/* What the last click did. See the same map on the verifications queue. */
const OUTCOME: Record<string, { tone: "good" | "bad"; text: string }> = {
  approved: { tone: "good", text: "Approved. The member has been emailed and the listing is on the board." },
  rejected: { tone: "good", text: "Rejected. The member has been emailed." },
  closed: { tone: "good", text: "Closed. No email was sent, which is what closing means." },
  note_saved: { tone: "good", text: "Internal note saved. Nothing was sent and no status changed." },
  ai_done: { tone: "good", text: "AI vetting finished." },
  ai_failed: { tone: "bad", text: "AI vetting returned nothing. The listing is untouched." },
  ai_off: { tone: "bad", text: "AI vetting is not configured, so nothing ran." },
  not_admin: { tone: "bad", text: "Nothing was written: your session is not signed in as an admin." },
  no_id: { tone: "bad", text: "Nothing was written: the form arrived without a listing id." },
  no_decision: { tone: "bad", text: "Nothing was written: the form arrived without a valid decision." },
  no_listing: { tone: "bad", text: "Nothing was written: that listing no longer exists." },
  db_error: { tone: "bad", text: "The database refused the write, so nothing was decided." },
};

const DETAIL: Record<string, string> = {
  no_address: "The decision is saved, but the member has no email address on file, so they have NOT been told.",
  send_failed: "The decision is saved, but the email did not send. Tell the member another way.",
};

function OutcomeBanner({ r, m }: { r?: string; m?: string }) {
  if (!r) return null;
  const known = OUTCOME[r];
  const tone = known?.tone ?? "bad";
  const detail = m ? (DETAIL[m] ?? m) : null;
  return (
    <div
      className={`mb-6 rounded-xl border p-4 text-[13px] leading-relaxed ${
        tone === "good"
          ? "border-positive/40 bg-positive/10 text-cream"
          : "border-negative/40 bg-negative/10 text-cream"
      }`}
    >
      <p>{known?.text ?? `Outcome: ${r}`}</p>
      {detail && <p className="mono mt-2 text-[12px] text-gray-2">{detail}</p>}
    </div>
  );
}

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

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { r?: string; m?: string };
}) {
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
    const drafts = draftListingNotes(l);
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
                  video
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
            {l.ai_review.language && l.ai_review.language !== "en" && l.ai_review.english_details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] uppercase text-gold" style={{ letterSpacing: "0.14em" }}>
                  English translation · original in {l.ai_review.language}
                </summary>
                {l.ai_review.english_product && (
                  <p className="mt-2 text-[12px] text-cream">{l.ai_review.english_product}</p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-[12px] text-gray-2">{l.ai_review.english_details}</p>
              </details>
            )}
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

        {/* One form per decision, because one shared note box cannot hold two
            different messages. Each box arrives already written, drafted from
            this listing's own fields and the co-pilot's findings, and it is a
            default value: type over it, or empty it, and that is what the
            member reads. A note already saved on the row wins over the draft,
            since somebody wrote it on purpose. */}
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2">
          <form action={decideListingAction} className="grid gap-2">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="approved" />
            <textarea
              name="decisionNote"
              rows={8}
              maxLength={1500}
              defaultValue={l.decision_note ?? drafts.approve}
              placeholder="Note to the member, sent with the approval."
              className={FIELD}
            />
            <button className="btn-gold justify-center">Approve</button>
          </form>

          <form action={decideListingAction} className="grid gap-2">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="rejected" />
            <textarea
              name="decisionNote"
              rows={8}
              maxLength={1500}
              defaultValue={l.decision_note ?? drafts.reject}
              placeholder="Reason for the rejection. Sent to the member."
              className={FIELD}
            />
            <button className="btn-ghost-light justify-center">Reject</button>
          </form>
        </div>

        {/* The internal note is not a decision, so it saves on its own and
            emails nobody. It used to ride along inside the single decision
            form, which now means it would only be saved if you happened to
            press the button it shared a form with. */}
        <form action={saveListingNotesAction} className="mt-4 grid gap-2">
          <input type="hidden" name="id" value={l.id} />
          <textarea
            name="adminNotes"
            rows={2}
            maxLength={2000}
            defaultValue={l.admin_notes ?? ""}
            placeholder="Internal note, never shown to the member."
            className={FIELD}
          />
          <div>
            <button
              className="text-[11px] uppercase text-gold hover:text-cream"
              style={{ letterSpacing: "0.14em" }}
            >
              Save internal note
            </button>
          </div>
        </form>

        {l.status === "approved" && (
          <form action={decideListingAction} className="mt-3">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="closed" />
            <button className="btn-ghost-light">Close this listing</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
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
