import { createAdminClient } from "@/lib/supabase/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
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

const card: React.CSSProperties = {
  background: "var(--raised)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  boxShadow: "var(--e-1)",
  padding: "18px 20px",
};

const tag: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "var(--ink-2)",
  border: "1px solid var(--rule-strong)",
  borderRadius: 4,
  padding: "2px 7px",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  fontSize: 13.5,
  color: "var(--ink)",
  background: "var(--raised)",
  border: "1px solid var(--rule-strong)",
  borderRadius: "var(--dk-radius-in)",
  padding: "9px 11px",
  resize: "vertical",
};

const capLabel: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const box: React.CSSProperties = {
  background: "var(--sunken)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  padding: 16,
};

// An understated form-submit affordance, on-system: mono, uppercase, with a
// rule underline rather than a filled control, for the run/generate/return
// actions that are not primary decisions.
const linkBtn: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-2)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  borderBottom: "1px solid var(--rule-strong)",
};

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
  const good = (known?.tone ?? "bad") === "good";
  const detail = m ? (DETAIL[m] ?? m) : null;
  return (
    <section className="sec" style={{ paddingBottom: 0 }}>
      {good ? (
        <div
          style={{
            background: "var(--pos-tint)",
            border: "1px solid var(--pos-line)",
            borderRadius: "var(--dk-radius)",
            padding: "14px 16px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ink-2)",
          }}
        >
          <p style={{ color: "var(--pos)", fontWeight: 600 }}>{known?.text ?? `Outcome: ${r}`}</p>
          {detail && (
            <p className="mono" style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              {detail}
            </p>
          )}
        </div>
      ) : (
        <div className="err">
          <PonteIcon name="evidence.evreview" size={22} />
          <div>
            <b>{known?.text ?? `Outcome: ${r}`}</b>
            {detail && (
              <p className="mono" style={{ marginTop: 6 }}>
                {detail}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
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
   * exists; the family terms (`20260728d`) are still unapplied and arrive as
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

/** The filter bar. A GET form, so every view is a shareable URL. */
function FilterBar({ sp, types }: { sp: Record<string, string | undefined>; types: string[] }) {
  const S: React.CSSProperties = {
    width: "100%",
    font: "inherit",
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--raised)",
    border: "1px solid var(--rule-strong)",
    borderRadius: "var(--dk-radius-in)",
    padding: "9px 11px",
    minHeight: 40,
  };
  const L: React.CSSProperties = { display: "grid", gap: 4 };
  const opt = (v: string, label: string) => <option key={v} value={v}>{label}</option>;
  return (
    <form
      method="GET"
      style={{
        marginBottom: 24,
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        borderRadius: "var(--dk-radius)",
        border: "1px solid var(--rule)",
        background: "var(--raised)",
        boxShadow: "var(--e-1)",
        padding: 16,
      }}
    >
      <label style={L}>
        <span style={capLabel}>Status</span>
        <select name="status" defaultValue={sp.status ?? ""} style={S}>
          {opt("", "Any status")}
          {["flagged", "suspended", "needs_information", "submitted", "approved", "rejected", "expired", "withdrawn"].map((s) =>
            opt(s, statusLabel(s)),
          )}
        </select>
      </label>
      <label style={L}>
        <span style={capLabel}>Reason</span>
        <select name="reason" defaultValue={sp.reason ?? ""} style={S}>
          {opt("", "Any reason")}
          {(Object.keys(REASON_LABEL) as (keyof typeof REASON_LABEL)[]).map((r) => opt(r, r))}
        </select>
      </label>
      <label style={L}>
        <span style={capLabel}>Severity</span>
        <select name="severity" defaultValue={sp.severity ?? ""} style={S}>
          {opt("", "Any severity")}
          {["high", "medium", "low"].map((s) => opt(s, s))}
        </select>
      </label>
      <label style={L}>
        <span style={capLabel}>Listing type</span>
        <select name="type" defaultValue={sp.type ?? ""} style={S}>
          {opt("", "Any type")}
          {types.map((t) => opt(t, t))}
        </select>
      </label>
      <label style={L}>
        <span style={capLabel}>Created from</span>
        <input type="date" name="from" defaultValue={sp.from ?? ""} style={S} />
      </label>
      <label style={L}>
        <span style={capLabel}>Created to</span>
        <input type="date" name="to" defaultValue={sp.to ?? ""} style={S} />
      </label>
      <label style={{ ...L, gridColumn: "1 / -1" }}>
        <span style={capLabel}>Member, business or reference</span>
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="email, company name, or PT-0102"
          style={S}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, gridColumn: "1 / -1" }}>
        <button className="b b--sm">Apply filters</button>
        <a href="/admin/listings" className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
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
      <div style={card}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{l.ref}</span>
          {/* The canonical intent, not the legacy `type`. A reviewer could not
              tell a distribution opportunity from a product requirement:
              `listings.type` stores both as "requirement". */}
          <span style={tag}>{presentRecord(l as FactsRow).kindLabel}</span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--ink)" }}>{l.product}</span>
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}
          >
            {l.status} &middot; {new Date(l.created_at).toLocaleDateString("en-GB")}
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
          // Severity in the desk's semantic tokens: danger, review (slate) and
          // a plain rule. Gold is never a status here.
          const edge =
            sev === "high"
              ? { border: "1px solid var(--neg-line)", background: "var(--neg-tint)" }
              : sev === "medium"
                ? { border: "1px solid var(--review-line)", background: "var(--review-tint)" }
                : { border: "1px solid var(--rule)", background: "var(--sunken)" };
          return (
            <div style={{ marginTop: 12, borderRadius: "var(--dk-radius)", padding: 16, ...edge }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink)", fontWeight: 600 }}>
                  {reasonCode(row)}
                </span>
                {sev && (
                  <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-2)" }}>
                    severity: {sev}
                  </span>
                )}
                {row.completeness_score !== null && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    completeness {row.completeness_score}%
                  </span>
                )}
              </div>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{REASON_LABEL[reason]}</p>
              <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)" }}>{REASON_ACTION[reason]}</p>
              {flags.length > 0 && (
                <ul style={{ marginTop: 12, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {flags.map((f, i) => (
                    <li key={`${f.code}-${i}`} className="mono" style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{f.code}</span>
                      <span> [{f.severity}]</span>: {f.detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        {awaitingReconfirmation && (
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--review)" }}>
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
        <div
          className="mono"
          style={{
            marginTop: 12,
            display: "grid",
            gap: "4px 24px",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            fontSize: 12,
            color: "var(--ink-2)",
          }}
        >
          <span>From: {emailById.get(l.user_id) ?? l.user_id.slice(0, 8)}</span>
          {l.chain_depth && <span style={{ color: "var(--ink)" }}>Chain: {l.chain_depth}</span>}
          {statedFacts(l as FactsRow).map((f) => (
            <span key={f.key} style={f.key === "role" ? { color: "var(--ink)" } : undefined}>
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
        <div style={{ ...box, marginTop: 16 }}>
          <p style={capLabel}>Publication gate</p>
          {ver ? (
            <div
              className="mono"
              style={{ marginTop: 8, display: "grid", gap: "4px 24px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", fontSize: 12.5, color: "var(--ink-2)" }}
            >
              <span style={{ color: "var(--ink)" }}>
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
              <span style={{ color: sanctionsClean ? "var(--pos)" : "var(--neg)" }}>
                Sanctions: {sanctionsClean ? "clean" : `${sanctions?.strongCount ?? "?"} candidate(s)`}
              </span>
              {ver.decided_at && (
                <span>Decided: {new Date(ver.decided_at).toLocaleDateString("en-GB")}</span>
              )}
            </div>
          ) : (
            <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--neg)" }}>
              No verified member-business record is bound to this submitter.
            </p>
          )}
          <p className="mono" style={{ marginTop: 12, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            <span style={{ color: "var(--ink-3)" }}>Authority evidence: </span>
            <span style={{ color: l.mandate_sighted ? "var(--pos)" : "var(--ink-3)" }}>
              {l.mandate_sighted ? "sighted" : "not sighted"}
            </span>
          </p>
          {gate.ok ? (
            <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--pos)" }}>
              Ready to approve: every publication condition is met.
            </p>
          ) : (
            <div style={{ marginTop: 12 }}>
              <p className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--neg)" }}>
                Cannot approve yet
              </p>
              <ul style={{ marginTop: 4, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                {gate.failures.map((f) => (
                  <li key={f} style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    - {gateFailureLabel(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p
          style={{
            marginTop: 12,
            whiteSpace: "pre-wrap",
            borderLeft: "2px solid var(--rule)",
            paddingLeft: 12,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ink-2)",
          }}
        >
          {l.details}
        </p>

        {lmedia.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {lmedia.map((m) =>
              m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={m.id} href={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`}
                    alt="listing media"
                    style={{ height: 80, width: 112, borderRadius: "var(--dk-radius-in)", objectFit: "cover" }}
                  />
                </a>
              ) : (
                <a
                  key={m.id}
                  href={`${SUPA}/storage/v1/object/public/listing-media/${m.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b b--2 b--sm"
                >
                  video
                </a>
              ),
            )}
          </div>
        )}

        {ldocs.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ldocs.map((d) => (
              <a
                key={d.id}
                href={signedByDocId.get(d.id) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="b b--2 b--sm"
              >
                {d.filename}
              </a>
            ))}
          </div>
        )}

        {l.ai_review && (
          <div style={{ ...box, marginTop: 16, borderLeft: "3px solid var(--review)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ ...capLabel, letterSpacing: "0.18em", color: "var(--review)" }}>
                AI co-pilot
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color:
                  l.ai_review.verdict === "looks_solid" ? "var(--pos)"
                  : l.ai_review.verdict === "caution" ? "var(--neg)" : "var(--review)",
              }}>
                {l.ai_review.verdict.replace("_", " ")} · {l.ai_review.score}/100
              </span>
            </div>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{l.ai_review.summary}</p>
            {l.ai_review.language && l.ai_review.language !== "en" && l.ai_review.english_details && (
              <details style={{ marginTop: 8 }}>
                <summary className="mono" style={{ cursor: "pointer", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                  English translation · original in {l.ai_review.language}
                </summary>
                {l.ai_review.english_product && (
                  <p style={{ marginTop: 8, fontSize: 12, color: "var(--ink)" }}>{l.ai_review.english_product}</p>
                )}
                <p style={{ marginTop: 4, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-2)" }}>{l.ai_review.english_details}</p>
              </details>
            )}
            {l.ai_review.red_flags?.length > 0 && (
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--neg)" }}>Flags: {l.ai_review.red_flags.join(" · ")}</p>
            )}
            {l.ai_review.compliance_notes?.length > 0 && (
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--neg)" }}>Compliance: {l.ai_review.compliance_notes.join(" · ")}</p>
            )}
            {l.ai_review.missing_info?.length > 0 && (
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--ink-2)" }}>Missing: {l.ai_review.missing_info.join(" · ")}</p>
            )}
            <details style={{ marginTop: 8 }}>
              <summary className="mono" style={{ cursor: "pointer", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                Drafts (questions email · decision note)
              </summary>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-2)" }}>{l.ai_review.questions_email_draft}</p>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap", borderTop: "1px solid var(--rule)", paddingTop: 8, fontSize: 12, color: "var(--ink-2)" }}>{l.ai_review.decision_note_draft}</p>
            </details>
          </div>
        )}
        <form action={runAiVetAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={l.id} />
          <button style={linkBtn}>
            {l.ai_review ? "Re-run AI vetting" : "Run AI vetting"}
          </button>
        </form>

        {/* The fact-only deal write-up: the desk's draft from the STORED facts.
            Its wording seeds the public text below; it is never published raw. */}
        {wu && (
          <div style={{ ...box, marginTop: 16 }}>
            <p style={capLabel}>Fact-only draft</p>
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
              {wu.description}
            </p>
            {wu.strengths?.length > 0 && (
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--ink-2)" }}>Strengths: {wu.strengths.join(" · ")}</p>
            )}
            {wu.open_points?.length > 0 && (
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--ink-2)" }}>
                Open points: {wu.open_points.map((p) => p.text).join(" · ")}
              </p>
            )}
            {wu.non_negotiables && (
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--ink-2)" }}>{wu.non_negotiables}</p>
            )}
          </div>
        )}
        <form action={generateWriteupAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={l.id} />
          <button style={linkBtn}>
            {wu ? "Regenerate fact-only write-up" : "Generate fact-only write-up"}
          </button>
        </form>

        {/* One form per decision, because one shared note box cannot hold two
            different messages. Each box arrives already written, drafted from
            this listing's own fields and the co-pilot's findings, and it is a
            default value: type over it, or empty it, and that is what the
            member reads. A note already saved on the row wins over the draft,
            since somebody wrote it on purpose. */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            borderTop: "1px solid var(--rule)",
            paddingTop: 20,
          }}
        >
          <form action={decideListingAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="approved" />
            <label style={capLabel}>Public qualification summary</label>
            <textarea
              name="qualification"
              rows={3}
              maxLength={900}
              defaultValue={suggestedQual}
              placeholder="What Ponte qualified, shown publicly. Desk-approved, not raw AI."
              style={fieldStyle}
            />
            <label style={capLabel}>Public limitations statement</label>
            <textarea
              name="limitations"
              rows={3}
              maxLength={900}
              defaultValue={suggestedLim}
              placeholder="What remains unverified or open, shown publicly."
              style={fieldStyle}
            />
            <label style={capLabel}>Note to the member</label>
            <textarea
              name="decisionNote"
              rows={4}
              maxLength={1500}
              defaultValue={l.decision_note ?? drafts.approve}
              placeholder="Sent with the approval."
              style={fieldStyle}
            />
            <button className="b b--block">Approve</button>
          </form>

          <form action={decideListingAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="rejected" />
            <textarea
              name="decisionNote"
              rows={8}
              maxLength={1500}
              defaultValue={l.decision_note ?? drafts.reject}
              placeholder="Reason for the rejection. Sent to the member."
              style={fieldStyle}
            />
            <button className="b b--2 b--block">Reject</button>
          </form>
        </div>

        {/* The internal note is not a decision, so it saves on its own and
            emails nobody. It used to ride along inside the single decision
            form, which now means it would only be saved if you happened to
            press the button it shared a form with. */}
        <form action={saveListingNotesAction} style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <input type="hidden" name="id" value={l.id} />
          <textarea
            name="adminNotes"
            rows={2}
            maxLength={2000}
            defaultValue={l.admin_notes ?? ""}
            placeholder="Internal note, never shown to the member."
            style={fieldStyle}
          />
          <div>
            <button style={linkBtn}>Save internal note</button>
          </div>
        </form>

        {/* Taking a live listing off the market. This is not a rejection: the
            listing is intact and reinstatable, and the member is told so in
            those words. The reason is required because a member who is told
            only that publication stopped has been told nothing actionable. */}
        {l.status === "approved" && (
          <form action={decideListingAction} style={{ marginTop: 16, display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="suspended" />
            <textarea
              name="decisionNote"
              rows={2}
              maxLength={1500}
              placeholder="Why publication is being paused. Sent to the member, so write it for them."
              style={fieldStyle}
              required
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button className="b b--2 b--sm">Suspend, take off the market</button>
            </div>
          </form>
        )}

        {l.status === "suspended" && (
          <form action={decideListingAction} style={{ marginTop: 16 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="approved" />
            <input type="hidden" name="qualification" value={l.desk_version?.qualification ?? ""} />
            <input type="hidden" name="limitations" value={l.desk_version?.limitations ?? ""} />
            <button className="b b--sm">Reinstate, put back on the market</button>
          </form>
        )}

        {/* Handing a listing back to its member. Not a rejection either: it
            says the record needs work, and the member does that work. */}
        {["flagged", "submitted", "suspended"].includes(l.status) && (
          <form action={decideListingAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="needs_information" />
            <button style={linkBtn}>
              Return to the member for more information
            </button>
          </form>
        )}

        {l.status === "approved" && (
          <form action={decideListingAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="decision" value="closed" />
            <button style={linkBtn}>
              Close this listing
            </button>
          </form>
        )}
      </div>
    );
  }

  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
      <section className="sec">
        <div className="sech">
          <div>
            <h2>
              <PonteIcon name="primitive.stack" size={18} />
              Listing exceptions
            </h2>
            {/* The subtitle says what this screen IS. It is not the publication
                queue: a valid listing from a verified member publishes without
                appearing here at all. */}
            <p className="d">
              Listings publish automatically. This console holds only the cases the
              validator could not resolve. {counts.total} open
              {counts.highSeverity > 0 && (
                <span style={{ color: "var(--neg)" }}> · {counts.highSeverity} high severity</span>
              )}
              {" · "}{all.length} listings in total.
            </p>
          </div>
        </div>

        {counts.total > 0 && (
          <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
            {(Object.entries(counts.byReason) as [keyof typeof REASON_LABEL, number][])
              .filter(([, n]) => n > 0)
              .map(([reason, n]) => (
                <a
                  key={reason}
                  href={`/admin/listings?reason=${reason}`}
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}
                >
                  {reason} · {n}
                </a>
              ))}
          </div>
        )}

        <FilterBar sp={searchParams as Record<string, string | undefined>} types={listingTypes} />

        <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
          Needs a person ({exceptions.length})
        </h3>
        {exceptions.length === 0 ? (
          <div className="empty">
            <PonteIcon name="evidence.infocomplete" size={24} />
            <div>
              <b>
                {filtered
                  ? "No exception matches these filters"
                  : "Nothing needs a decision"}
              </b>
              <p>
                {filtered
                  ? "Adjust or clear the filters above to widen the view."
                  : "Automated publication resolved everything."}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{exceptions.map((l) => <Card key={l.id} l={l} />)}</div>
        )}

        {published.length > 0 && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>
              Published ({published.length})
            </h3>
            {/* Stated explicitly, because the screen this replaces listed these
                under a heading that implied they were waiting for something. */}
            <p className="d" style={{ marginBottom: 16 }}>
              Live on the market. Not awaiting approval, and no action is required
              here. Suspend one only if there is a reason to take it off.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{published.map((l) => <Card key={l.id} l={l} />)}</div>
          </>
        )}

        {settled.length > 0 && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>
              Closed, rejected, expired and withdrawn ({settled.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{settled.map((l) => <Card key={l.id} l={l} />)}</div>
          </>
        )}
      </section>
    </>
  );
}
