import { createAdminClient } from "@/lib/supabase/server";
import {
  decideListingAction,
  runAiVetAction,
  saveListingNotesAction,
  generateWriteupAction,
} from "./actions";
import { vetListing, isAiConfigured, type AiReview } from "@/lib/ai-vet";
import { draftListingNotes } from "@/lib/listings/decision-notes";
import { checkPublicationGate, gateFailureLabel } from "@/lib/listings/publication-gate";
import { isPubliclyCurrent, reconfirmationLapsed } from "@/lib/listings/validity";

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
  writeup_done: { tone: "good", text: "Fact-only write-up generated from the stored facts." },
  writeup_thin: { tone: "bad", text: "Not enough facts to write up. The listing is untouched." },
  writeup_failed: { tone: "bad", text: "The write-up did not generate. The listing is untouched." },
  gate_blocked: { tone: "bad", text: "Not approved: the publication gate is not satisfied." },
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

type Writeup = {
  description: string;
  strengths: string[];
  open_points: { text: string; field_ref: string | null }[];
  non_negotiables: string;
  summary_line: string;
  share_text: string;
};

type AiVersion = { writeup?: Writeup; prompt_version?: string | null; model?: string | null } | null;
type DeskVersion = { qualification?: string | null; limitations?: string | null } | null;
type SanctionsHits = { clean?: boolean; strongCount?: number } | null;

type Listing = {
  id: string;
  ref: string;
  user_id: string;
  type: string;
  product: string;
  hs_code: string | null;
  origin: string | null;
  destination: string | null;
  origin_country: string | null;
  destination_country: string | null;
  volume: string | null;
  quantity: number | null;
  unit: string | null;
  frequency: string | null;
  incoterm: string | null;
  payment_terms: string | null;
  indicative_value_usd: number | null;
  submitter_role: string | null;
  chain_depth: string | null;
  mandate_sighted: boolean | null;
  validity_type: string | null;
  valid_until: string | null;
  reconfirmed_at: string | null;
  key_notes: string | null;
  details: string;
  status: string;
  admin_notes: string | null;
  decision_note: string | null;
  created_at: string;
  ai_review: AiReview | null;
  ai_reviewed_at: string | null;
  ai_version: AiVersion;
  desk_version: DeskVersion;
};

type VerRow = {
  id: string;
  subject_name: string | null;
  subject_country: string | null;
  subject_reg_number: string | null;
  subject_vat: string | null;
  subject_lei: string | null;
  status: string | null;
  purpose: string | null;
  sanctions_hits: SanctionsHits;
  decided_at: string | null;
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

  // The submitter's own business verification, for the publication gate and the
  // evidence panel. Batched to avoid a query per card: user -> bound record id,
  // then id -> the verification snapshot.
  const bvidByUser = new Map<string, string | null>();
  const levelByUser = new Map<string, number>();
  {
    const userIds = Array.from(new Set(all.map((l) => l.user_id)));
    if (userIds.length > 0) {
      const { data: profs } = await adminSb
        .from("profiles")
        .select("id, business_verification_id, verification_level")
        .in("id", userIds);
      for (const p of profs ?? []) {
        bvidByUser.set(p.id, p.business_verification_id ?? null);
        levelByUser.set(p.id, Number(p.verification_level ?? 0));
      }
    }
  }
  const verById = new Map<string, VerRow>();
  {
    const ids = Array.from(new Set(Array.from(bvidByUser.values()).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: vers } = await adminSb
        .from("verifications")
        .select(
          "id, subject_name, subject_country, subject_reg_number, subject_vat, subject_lei, status, purpose, sanctions_hits, decided_at",
        )
        .in("id", ids);
      for (const v of vers ?? []) verById.set(v.id, v as VerRow);
    }
  }

  function submitterFor(l: Listing) {
    const bvid = bvidByUser.get(l.user_id) ?? null;
    const ver = bvid ? verById.get(bvid) ?? null : null;
    return {
      verificationLevel: levelByUser.get(l.user_id) ?? 0,
      business_verification_id: bvid,
      verification: ver
        ? { purpose: ver.purpose, status: ver.status, sanctions_hits: ver.sanctions_hits }
        : null,
      snapshot: ver,
    };
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

    const submitter = submitterFor(l);
    const gate = checkPublicationGate(
      { ...l, desk_version: l.desk_version } as never,
      {
        verificationLevel: submitter.verificationLevel,
        business_verification_id: submitter.business_verification_id,
        verification: submitter.verification as never,
      },
    );
    const ver = submitter.snapshot;
    const sanctions = ver?.sanctions_hits;
    const sanctionsClean = sanctions?.clean === true && (sanctions?.strongCount ?? 0) === 0;
    // An approved listing that is not publicly current is awaiting reconfirmation
    // (or its validity passed): kept for audit, but hidden from every public
    // surface until an owner reconfirms it.
    const awaitingReconfirmation = l.status === "approved" && !isPubliclyCurrent(l);
    const wu = l.ai_version?.writeup ?? null;
    // The desk-approved public text defaults to the stored version, else a
    // suggestion drawn from the fact-only draft for the admin to edit.
    const suggestedQual = l.desk_version?.qualification ?? wu?.summary_line ?? "";
    const suggestedLim =
      l.desk_version?.limitations ??
      (wu
        ? [wu.non_negotiables, ...(wu.open_points ?? []).map((p) => p.text)]
            .filter(Boolean)
            .join("\n")
        : "");

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

        {awaitingReconfirmation && (
          <p className="mt-2 text-[12px] text-gold">
            Awaiting reconfirmation, hidden from public surfaces
            {reconfirmationLapsed(l.reconfirmed_at)
              ? " (90-day reconfirmation lapsed)."
              : " (validity date passed)."}
          </p>
        )}

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
          {l.payment_terms && <span>Payment: {l.payment_terms}</span>}
          {l.validity_type && (
            <span>
              Validity: {l.validity_type === "dated" ? `until ${l.valid_until}` : "standing"}
            </span>
          )}
        </div>

        {/* The submitter's own business verification and the publication gate,
            resolved here so the desk sees exactly what blocks approval. */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.18em" }}>
            Publication gate
          </p>
          {ver ? (
            <div className="mt-2 grid gap-x-6 gap-y-1 text-[12.5px] text-gray-2 sm:grid-cols-2">
              <span className="text-cream">
                Business: {ver.subject_name ?? "-"}
                {ver.subject_country ? ` (${ver.subject_country})` : ""}
              </span>
              <span>Purpose: {ver.purpose ?? "unclassified"}</span>
              <span>
                Status: {ver.status ?? "unknown"} · level {submitter.verificationLevel}
              </span>
              {ver.subject_reg_number && <span>Reg: {ver.subject_reg_number}</span>}
              {ver.subject_vat && <span>VAT: {ver.subject_vat}</span>}
              {ver.subject_lei && <span>LEI: {ver.subject_lei}</span>}
              <span className={sanctionsClean ? "text-positive" : "text-red-400"}>
                Sanctions: {sanctionsClean ? "clean" : `${sanctions?.strongCount ?? "?"} candidate(s)`}
              </span>
              {ver.decided_at && (
                <span>Decided: {new Date(ver.decided_at).toLocaleDateString("en-GB")}</span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[12.5px] text-red-400">
              No verified member-business record is bound to this submitter.
            </p>
          )}
          <p className="mt-3 text-[11px] uppercase" style={{ letterSpacing: "0.14em" }}>
            <span className="text-gray-2">Authority evidence: </span>
            <span className={l.mandate_sighted ? "text-positive" : "text-gray-2"}>
              {l.mandate_sighted ? "sighted" : "not sighted"}
            </span>
          </p>
          {gate.ok ? (
            <p className="mt-3 text-[12.5px] text-positive">
              Ready to approve: every publication condition is met.
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-[11px] uppercase text-red-400" style={{ letterSpacing: "0.14em" }}>
                Cannot approve yet
              </p>
              <ul className="mt-1 space-y-0.5">
                {gate.failures.map((f) => (
                  <li key={f} className="text-[12.5px] text-gray-2">
                    - {gateFailureLabel(f)}
                  </li>
                ))}
              </ul>
            </div>
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

        {/* The fact-only deal write-up: the desk's draft from the STORED facts.
            Its wording seeds the public text below; it is never published raw. */}
        {wu && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.18em" }}>
              Fact-only draft
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-cream">
              {wu.description}
            </p>
            {wu.strengths?.length > 0 && (
              <p className="mt-2 text-[12px] text-gray-2">Strengths: {wu.strengths.join(" · ")}</p>
            )}
            {wu.open_points?.length > 0 && (
              <p className="mt-1 text-[12px] text-gray-2">
                Open points: {wu.open_points.map((p) => p.text).join(" · ")}
              </p>
            )}
            {wu.non_negotiables && (
              <p className="mt-1 text-[12px] text-gray-2">{wu.non_negotiables}</p>
            )}
          </div>
        )}
        <form action={generateWriteupAction} className="mt-3">
          <input type="hidden" name="id" value={l.id} />
          <button className="text-[11px] uppercase text-gold hover:text-cream" style={{ letterSpacing: "0.14em" }}>
            {wu ? "Regenerate fact-only write-up" : "Generate fact-only write-up"}
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
            <label className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              Public qualification summary
            </label>
            <textarea
              name="qualification"
              rows={3}
              maxLength={900}
              defaultValue={suggestedQual}
              placeholder="What Ponte qualified, shown publicly. Desk-approved, not raw AI."
              className={FIELD}
            />
            <label className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              Public limitations statement
            </label>
            <textarea
              name="limitations"
              rows={3}
              maxLength={900}
              defaultValue={suggestedLim}
              placeholder="What remains unverified or open, shown publicly."
              className={FIELD}
            />
            <label className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              Note to the member
            </label>
            <textarea
              name="decisionNote"
              rows={4}
              maxLength={1500}
              defaultValue={l.decision_note ?? drafts.approve}
              placeholder="Sent with the approval."
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
