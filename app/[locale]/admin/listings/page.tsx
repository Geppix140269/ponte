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
import {
  exceptionReason,
  rowSeverity,
  compareExceptions,
  applyFilters,
  summarise,
  reasonCode,
  statusLabel,
  REASON_LABEL,
  REASON_ACTION,
  type ExceptionRow,
} from "@/lib/listings/exceptions";
import type { SafetyFlag } from "@/lib/listings/safety";
import { presentRecord, statedFacts, type FactsRow } from "@/lib/listings/record-facts";
import { meetsMemberBusinessFloor } from "@/lib/verification/level";

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
  suspended: { tone: "good", text: "Suspended. It is off the market and the member has been emailed the reason." },
  needs_information: { tone: "good", text: "Returned to the member. They can complete it and it republishes automatically." },
  gate_blocked: { tone: "bad", text: "Not approved: the publication gate is not satisfied." },
  no_reason: { tone: "bad", text: "Nothing was written: a suspension needs a reason, because the member is told it." },
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
  /**
   * The canonical classification and family terms.
   *
   * The console reads with `select("*")`, so these arrive whenever the column
   * exists; the family terms (`20260728e`) are still unapplied and arrive as
   * undefined until it is. They are declared here so the reviewer's fact list
   * can be built from the record's OWN family rather than from the six product
   * columns the console printed for every record.
   */
  market_family?: string | null;
  market_intent?: string | null;
  service_category_key?: string | null;
  service_subcategory_keys?: string[] | null;
  distribution_partner_type_key?: string | null;
  distribution_relationship_terms?: string[] | null;
  coverage_scope_key?: string | null;
  territory_codes?: string[] | null;
  product_sector_key?: string | null;
  custom_category_label?: string | null;
  quantity_mode?: string | null;
  quantity_min?: number | null;
  quantity_max?: number | null;
  service_terms?: Record<string, unknown> | null;
  distribution_terms?: Record<string, unknown> | null;
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

/** The filter bar. A GET form, so every view is a shareable URL. */
function FilterBar({ sp, types }: { sp: Record<string, string | undefined>; types: string[] }) {
  const S =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-cream focus:border-gold focus:outline-none";
  const opt = (v: string, label: string) => <option key={v} value={v}>{label}</option>;
  return (
    <form
      method="GET"
      className="mb-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Status</span>
        <select name="status" defaultValue={sp.status ?? ""} className={S}>
          {opt("", "Any status")}
          {["flagged", "suspended", "needs_information", "submitted", "approved", "rejected", "expired", "withdrawn"].map((s) =>
            opt(s, statusLabel(s)),
          )}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Reason</span>
        <select name="reason" defaultValue={sp.reason ?? ""} className={S}>
          {opt("", "Any reason")}
          {(Object.keys(REASON_LABEL) as (keyof typeof REASON_LABEL)[]).map((r) => opt(r, r))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Severity</span>
        <select name="severity" defaultValue={sp.severity ?? ""} className={S}>
          {opt("", "Any severity")}
          {["high", "medium", "low"].map((s) => opt(s, s))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Listing type</span>
        <select name="type" defaultValue={sp.type ?? ""} className={S}>
          {opt("", "Any type")}
          {types.map((t) => opt(t, t))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Created from</span>
        <input type="date" name="from" defaultValue={sp.from ?? ""} className={S} />
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Created to</span>
        <input type="date" name="to" defaultValue={sp.to ?? ""} className={S} />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
          Member, business or reference
        </span>
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="email, company name, or PT-0102"
          className={S}
        />
      </label>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button className="btn-gold">Apply filters</button>
        <a href="/admin/listings" className="text-[12px] uppercase text-gray-2 hover:text-gold" style={{ letterSpacing: "0.14em" }}>
          Clear
        </a>
      </div>
    </form>
  );
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: {
    r?: string; m?: string;
    status?: string; reason?: string; severity?: string; type?: string;
    from?: string; to?: string; q?: string; ref?: string;
  };
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
  const levelByUser = new Map<string, string | null>();
  {
    const userIds = Array.from(new Set(all.map((l) => l.user_id)));
    if (userIds.length > 0) {
      const { data: profs } = await adminSb
        .from("profiles")
        .select("id, business_verification_id, verification_level")
        .in("id", userIds);
      for (const p of profs ?? []) {
        bvidByUser.set(p.id, p.business_verification_id ?? null);
        levelByUser.set(p.id, p.verification_level ?? null);
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
      verificationLevel: levelByUser.get(l.user_id) ?? null,
      business_verification_id: bvid,
      verification: ver
        ? { purpose: ver.purpose, status: ver.status, sanctions_hits: ver.sanctions_hits }
        : null,
      snapshot: ver,
    };
  }

  // ---- The exception model -------------------------------------------------
  //
  // This screen is no longer a publication queue. It shows the cases automated
  // publication could not resolve, and it does NOT present a published listing
  // as waiting for anything, because it is not waiting for anything.
  const rowFor = (l: Listing): ExceptionRow => ({
    id: l.id,
    ref: l.ref,
    status: l.status,
    type: l.type,
    product: l.product,
    created_at: l.created_at,
    flag_reason: (l as { flag_reason?: string | null }).flag_reason ?? null,
    flag_severity: (l as { flag_severity?: string | null }).flag_severity ?? null,
    safety_flags: ((l as { safety_flags?: SafetyFlag[] | null }).safety_flags ?? null),
    completeness_score: (l as { completeness_score?: number | null }).completeness_score ?? null,
    user_id: l.user_id,
    reportCount: 0,
    // Whether the member could publish if the listing itself were complete.
    // This is what separates "finish your listing" from "verify your business",
    // and an operator can act on neither, so the console must not conflate them.
    submitterVerified: (() => {
      const s = submitterFor(l);
      return Boolean(
        s.business_verification_id &&
          s.verification &&
          ["auto_verified", "verified"].includes(s.verification.status ?? "") &&
          meetsMemberBusinessFloor(s.verificationLevel),
      );
    })(),
  });

  const rowsById = new Map<string, ExceptionRow>();
  for (const l of all) rowsById.set(l.id, rowFor(l));

  const identityFor = (row: ExceptionRow) => ({
    email: emailById.get(row.user_id) ?? null,
    company: verById.get(bvidByUser.get(row.user_id) ?? "")?.subject_name ?? null,
  });

  // A direct link from a flagged-listing alert carries ?ref=PT-XXXX. It is
  // treated as the search term so the operator lands on that listing with the
  // rest of the console intact, rather than on a bare detail page with no
  // context.
  const filters = {
    status: searchParams.status || undefined,
    reason: searchParams.reason || undefined,
    severity: searchParams.severity || undefined,
    type: searchParams.type || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    q: searchParams.q || searchParams.ref || undefined,
  };

  const filteredRows = applyFilters(Array.from(rowsById.values()), filters, identityFor);
  const filteredIds = new Set(filteredRows.map((r) => r.id));
  const visible = all.filter((l) => filteredIds.has(l.id));

  const exceptions = visible
    .filter((l) => exceptionReason(rowsById.get(l.id)!) !== null)
    .sort((a, b) => compareExceptions(rowsById.get(a.id)!, rowsById.get(b.id)!));
  const published = visible.filter((l) => l.status === "approved");
  const settled = visible.filter(
    (l) => exceptionReason(rowsById.get(l.id)!) === null && l.status !== "approved",
  );

  const counts = summarise(Array.from(rowsById.values()));
  const listingTypes = Array.from(new Set(all.map((l) => l.type).filter(Boolean))) as string[];

  // AI co-pilot: vet up to 2 unreviewed exception listings per page load so
  // a case that needs a person arrives with its analysis already done. It is
  // scoped to exceptions rather than to everything, because under automated
  // publication the ordinary listing is never read here at all.
  if (isAiConfigured()) {
    const unvetted = exceptions.filter((l) => !l.ai_review).slice(0, 2);
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
          {/* The canonical intent, not the legacy `type`. A reviewer could not
              tell a distribution opportunity from a product requirement:
              `listings.type` stores both as "requirement". */}
          <span className="badge">{presentRecord(l as FactsRow).kindLabel}</span>
          <span className="flex-1 text-[15px] text-cream">{l.product}</span>
          <span className="text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.14em" }}>
            {l.status} · {new Date(l.created_at).toLocaleDateString("en-GB")}
          </span>
        </div>

        {/* WHY this listing is on the console. A machine-readable code an
            operator can paste into a query, the sentence that says what it
            means, the severity, what to do about it, and the automated
            findings verbatim. The retired screen said only "submitted". */}
        {(() => {
          const row = rowsById.get(l.id);
          const reason = row ? exceptionReason(row) : null;
          if (!row || !reason) return null;
          const sev = rowSeverity(row);
          const flags = row.safety_flags ?? [];
          const tone =
            sev === "high" ? "border-negative/50 bg-negative/10"
            : sev === "medium" ? "border-gold/40 bg-gold/10"
            : "border-white/15 bg-white/[0.03]";
          return (
            <div className={`mt-3 rounded-xl border p-4 ${tone}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="mono text-[11px] uppercase text-gold" style={{ letterSpacing: "0.14em" }}>
                  {reasonCode(row)}
                </span>
                {sev && (
                  <span className="mono text-[11px] uppercase text-cream" style={{ letterSpacing: "0.14em" }}>
                    severity: {sev}
                  </span>
                )}
                {row.completeness_score !== null && (
                  <span className="mono text-[11px] text-gray-2">
                    completeness {row.completeness_score}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-cream">{REASON_LABEL[reason]}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-2">{REASON_ACTION[reason]}</p>
              {flags.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {flags.map((f, i) => (
                    <li key={`${f.code}-${i}`} className="text-[12px] leading-relaxed text-gray-2">
                      <span className="mono text-gold">{f.code}</span>
                      <span className="mono"> [{f.severity}]</span>: {f.detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        {awaitingReconfirmation && (
          <p className="mt-2 text-[12px] text-gold">
            Awaiting reconfirmation, hidden from public surfaces
            {reconfirmationLapsed(l.reconfirmed_at)
              ? " (90-day reconfirmation lapsed)."
              : " (validity date passed)."}
          </p>
        )}

        {/* The record's own facts, in its own family's vocabulary.
            This grid used to be six product columns: HS, origin, destination,
            volume, Incoterm and payment. A reviewer opening a flagged
            freight-forwarding record therefore saw its reference, its type and
            its prose, and none of the eight service terms the member had
            actually stated - the very facts a review turns on. `statedFacts`
            returns whatever THIS record has and nothing it does not. */}
        <div className="mt-3 grid gap-x-6 gap-y-1 text-[13px] text-gray-2 sm:grid-cols-2 md:grid-cols-3">
          <span>From: {emailById.get(l.user_id) ?? l.user_id.slice(0, 8)}</span>
          {l.chain_depth && <span className="text-gold">Chain: {l.chain_depth}</span>}
          {statedFacts(l as FactsRow).map((f) => (
            <span key={f.key} className={f.key === "role" ? "text-gold" : undefined}>
              {f.label}: {f.value}
            </span>
          ))}
          {l.volume && <span>Volume: {l.volume}</span>}
          {l.indicative_value_usd && (
            <span>Value: ${Number(l.indicative_value_usd).toLocaleString("en-US")}</span>
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

        {/* Taking a live listing off the market. This is not a rejection: the
            listing is intact and reinstatable, and the member is told so in
            those words. The reason is required because a member who is told
            only that publication stopped has been told nothing actionable. */}
        {l.status === "approved" && (
          <form action={decideListingAction} className="mt-4 grid gap-2">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="suspended" />
            <textarea
              name="decisionNote"
              rows={2}
              maxLength={1500}
              placeholder="Why publication is being paused. Sent to the member, so write it for them."
              className={FIELD}
              required
            />
            <div className="flex flex-wrap gap-3">
              <button className="btn-ghost-light">Suspend, take off the market</button>
            </div>
          </form>
        )}

        {l.status === "suspended" && (
          <form action={decideListingAction} className="mt-4">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="approved" />
            <input type="hidden" name="qualification" value={l.desk_version?.qualification ?? ""} />
            <input type="hidden" name="limitations" value={l.desk_version?.limitations ?? ""} />
            <button className="btn-gold">Reinstate, put back on the market</button>
          </form>
        )}

        {/* Handing a listing back to its member. Not a rejection either: it
            says the record needs work, and the member does that work. */}
        {["flagged", "submitted", "suspended"].includes(l.status) && (
          <form action={decideListingAction} className="mt-3">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="needs_information" />
            <button
              className="text-[11px] uppercase text-gray-2 hover:text-gold"
              style={{ letterSpacing: "0.14em" }}
            >
              Return to the member for more information
            </button>
          </form>
        )}

        {l.status === "approved" && (
          <form action={decideListingAction} className="mt-3">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="closed" />
            <button
              className="text-[11px] uppercase text-gray-2 hover:text-gold"
              style={{ letterSpacing: "0.14em" }}
            >
              Close this listing
            </button>
          </form>
        )}
      </div>
    );
  }

  const filtered = Object.values(filters).some(Boolean);

  return (
    <div>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
      <h1 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
        Listing exceptions
      </h1>
      {/* The subtitle says what this screen IS. It is not the publication
          queue: a valid listing from a verified member publishes without
          appearing here at all. */}
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-gray-2">
        Listings publish automatically. This console holds only the cases the
        validator could not resolve. {counts.total} open
        {counts.highSeverity > 0 && (
          <span className="text-cream"> · {counts.highSeverity} high severity</span>
        )}
        {" · "}{all.length} listings in total.
      </p>

      {counts.total > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {(Object.entries(counts.byReason) as [keyof typeof REASON_LABEL, number][])
            .filter(([, n]) => n > 0)
            .map(([reason, n]) => (
              <a
                key={reason}
                href={`/admin/listings?reason=${reason}`}
                className="mono text-[11px] uppercase text-gray-2 hover:text-gold"
                style={{ letterSpacing: "0.14em" }}
              >
                {reason} · {n}
              </a>
            ))}
        </div>
      )}

      <div className="mt-6">
        <FilterBar sp={searchParams as Record<string, string | undefined>} types={listingTypes} />
      </div>

      <h2 className="serif text-white mt-8 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
        Needs a person ({exceptions.length})
      </h2>
      {exceptions.length === 0 ? (
        <div className="glass p-6 text-[14px] text-gray-2">
          {filtered
            ? "No exception matches these filters."
            : "Nothing needs a decision. Automated publication resolved everything."}
        </div>
      ) : (
        <div className="space-y-4">{exceptions.map((l) => <Card key={l.id} l={l} />)}</div>
      )}

      {published.length > 0 && (
        <>
          <h2 className="serif text-white mt-10 mb-2" style={{ fontSize: 20, fontWeight: 500 }}>
            Published ({published.length})
          </h2>
          {/* Stated explicitly, because the screen this replaces listed these
              under a heading that implied they were waiting for something. */}
          <p className="mb-4 text-[13px] text-gray-2">
            Live on the market. Not awaiting approval, and no action is required
            here. Suspend one only if there is a reason to take it off.
          </p>
          <div className="space-y-4">{published.map((l) => <Card key={l.id} l={l} />)}</div>
        </>
      )}

      {settled.length > 0 && (
        <>
          <h2 className="serif text-white mt-10 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
            Closed, rejected, expired and withdrawn ({settled.length})
          </h2>
          <div className="space-y-4">{settled.map((l) => <Card key={l.id} l={l} />)}</div>
        </>
      )}
    </div>
  );
}
