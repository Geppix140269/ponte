import { createAdminClient } from "@/lib/supabase/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { approveSignalAction, setSignalStatusAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Market Signal review (Definitive 1 August brief, Block A).
 *
 * The admin sees everything the public never does: the source, the original
 * prose, the counterparty the desk would pursue. That is exactly why the
 * public read in lib/board/market-signals.ts never selects these columns and
 * this page uses the service role. A reviewer judges a signal on its
 * provenance, then approves the anonymised, structured version for the board.
 *
 * English, like the rest of the admin area.
 */

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

const quote: React.CSSProperties = {
  borderLeft: "2px solid var(--rule)",
  paddingLeft: 12,
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--ink-2)",
};

const field: React.CSSProperties = {
  width: 120,
  font: "inherit",
  fontSize: 12,
  color: "var(--ink)",
  background: "var(--raised)",
  border: "1px solid var(--rule-strong)",
  borderRadius: "var(--dk-radius-in)",
  padding: "7px 9px",
};

const summaryStyle: React.CSSProperties = {
  cursor: "pointer",
  fontFamily: "var(--f-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const OUTCOME: Record<string, { tone: "good" | "bad"; text: string }> = {
  approved: { tone: "good", text: "Approved. The signal is on the public board with a 90-day expiry." },
  private: { tone: "good", text: "Unpublished. The signal is private again and off the public board." },
  under_investigation: { tone: "good", text: "Marked under investigation. The signal is off the public board while the desk pursues it." },
  confirmed: { tone: "good", text: "Confirmed. The signal is off the public board; if a listing reference was given it is linked as the Qualified Opportunity." },
  unavailable: { tone: "good", text: "Marked unavailable. The signal is off the public board." },
  expired: { tone: "good", text: "Marked expired. The signal is off the public board and kept for audit." },
  withdrawn: { tone: "good", text: "Withdrawn. The signal is off the public board and kept for audit." },
  not_admin: { tone: "bad", text: "Nothing was written: your session is not signed in as an admin." },
  no_id: { tone: "bad", text: "Nothing was written: the form arrived without a signal id." },
  no_signal: { tone: "bad", text: "Nothing was written: that signal no longer exists." },
  no_status: { tone: "bad", text: "Nothing was written: the form arrived without a valid status." },
  confirm_needs_listing: { tone: "bad", text: "Nothing was written: a confirmation must link a listing reference. Confirm only once a real Qualified Opportunity exists for it." },
  no_listing: { tone: "bad", text: "Nothing was written: no listing has that reference, so nothing was confirmed." },
  listing_missing: { tone: "bad", text: "Nothing was written: that listing could not be read." },
  listing_not_approved: { tone: "bad", text: "Nothing was written: the linked listing is not approved, so it is not a live Qualified Opportunity." },
  listing_not_current: { tone: "bad", text: "Nothing was written: the linked listing is expired or awaiting reconfirmation, so it is not currently public." },
  listing_owner_ineligible: { tone: "bad", text: "Nothing was written: the linked listing's owner does not presently pass business verification, so it is not currently public." },
  db_error: { tone: "bad", text: "The database refused the write, so nothing changed." },
};

const DETAIL: Record<string, string> = {
  past_expiry: "This signal was spotted more than 90 days ago, so it is already past its public expiry and will not appear on the board. Consider whether it is still worth publishing.",
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
          <p style={{ color: "var(--pos)", fontWeight: 600 }}>
            {known?.text ?? `Outcome: ${r}`}
          </p>
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

type Signal = {
  id: string;
  side: string;
  product: string;
  hs_code: string | null;
  qty: number | null;
  unit: string | null;
  incoterms: string | null;
  payment: string | null;
  origin: string | null;
  destination: string | null;
  category: string | null;
  spotted_at: string;
  status: string;
  ai_description: string | null;
  summary_line: string | null;
  source_platform: string | null;
  source_url: string | null;
  raw_description: string | null;
  counterparty_name: string | null;
  counterparty_company: string | null;
  counterparty_contact: string | null;
  notes: string | null;
  approved_at: string | null;
  published_at: string | null;
  public_expires_at: string | null;
  promoted_listing_id: string | null;
  investigation_count: number | null;
};

type Investigation = {
  id: string;
  signal_id: string;
  /** "investigate" (asked the desk something) or "capability" (can supply/buy). */
  request_kind: string | null;
  requesting_business: string | null;
  requester_type: string | null;
  contact_phone: string | null;
  contact_language: string | null;
  establish_goal: string | null;
  capability: string | null;
  indicative: string | null;
  geography: string | null;
  evidence: string | null;
  wants_intro: boolean;
  created_at: string;
};

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "n/a";
}

function SignalCard({ s, requests }: { s: Signal; requests: Investigation[] }) {
  const isApproved = s.status === "approved_signal";
  return (
    <div
      style={{
        background: "var(--raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--dk-radius)",
        boxShadow: "var(--e-1)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span style={tag}>{s.side}</span>
        <span style={{ flex: 1, fontSize: 15, color: "var(--ink)" }}>{s.product}</span>
        <span
          className="mono"
          style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}
        >
          {s.status} &middot; {fmt(s.spotted_at)}
        </span>
      </div>

      {/* Public facts: what the board would show. */}
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
        {s.qty != null && <span>Qty: {s.qty} {s.unit ?? ""}</span>}
        {s.incoterms && <span>Incoterm: {s.incoterms}</span>}
        {s.payment && <span>Payment: {s.payment}</span>}
        {s.origin && <span>Origin: {s.origin}</span>}
        {s.destination && <span>Destination: {s.destination}</span>}
        {s.hs_code && <span>HS: {s.hs_code}</span>}
        {s.category && <span>Category: {s.category}</span>}
        {isApproved && <span>Public until: {fmt(s.public_expires_at)}</span>}
      </div>

      {s.ai_description && (
        <p style={{ ...quote, marginTop: 12 }}>{s.ai_description}</p>
      )}

      {/* Internal provenance. Admin only, never in a public payload. */}
      <details style={{ marginTop: 12 }}>
        <summary style={summaryStyle}>Internal provenance (never public)</summary>
        <div
          className="mono"
          style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 12, color: "var(--ink-2)" }}
        >
          {s.source_platform && <span>Source: {s.source_platform}</span>}
          {s.source_url && <span style={{ overflowWrap: "anywhere" }}>URL: {s.source_url}</span>}
          {s.counterparty_name && <span>Counterparty: {s.counterparty_name}</span>}
          {s.counterparty_company && <span>Company: {s.counterparty_company}</span>}
          {s.counterparty_contact && <span>Contact: {s.counterparty_contact}</span>}
          {s.raw_description && (
            <p style={{ ...quote, marginTop: 4, whiteSpace: "pre-wrap" }}>{s.raw_description}</p>
          )}
          {s.notes && <span>Notes: {s.notes}</span>}
        </div>
      </details>

      {/* Investigation requests. Members asked Ponte to look into this signal.
          Each is what the REQUESTER told us; there is no third party here to
          reveal, because a Market Signal has none stored. Admin-only. */}
      {requests.length > 0 && (
        <details style={{ marginTop: 12 }} open>
          <summary style={summaryStyle}>
            {requests.length} investigation {requests.length === 1 ? "request" : "requests"}
          </summary>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map((r) => (
              <div
                key={r.id}
                className="mono"
                style={{
                  background: "var(--sunken)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--dk-radius-in)",
                  padding: 12,
                  fontSize: 12,
                  color: "var(--ink-2)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--ink)" }}>{r.requesting_business ?? "Unnamed business"}</span>
                  {/* Which act this was. A capability declaration is an answer
                      to the signal; an investigation is a question about it. */}
                  <span style={tag}>
                    {r.request_kind === "capability" ? "can supply / buy" : "investigate"}
                  </span>
                  {r.requester_type && <span style={tag}>{r.requester_type}</span>}
                  {r.wants_intro && (
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>wants introduction</span>
                  )}
                  <span style={{ marginLeft: "auto" }}>{fmt(r.created_at)}</span>
                </div>
                {r.establish_goal && (
                  <p style={{ ...quote, marginTop: 6, fontSize: 12 }}>Establish: {r.establish_goal}</p>
                )}
                {r.capability && (
                  <p style={{ ...quote, marginTop: 6, fontSize: 12 }}>
                    Can supply / would buy: {r.capability}
                  </p>
                )}
                <div style={{ marginTop: 4, display: "grid", gap: "2px 24px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  {/* How to reach them. Admin only, like everything else on
                      this card, and never shown to another member. */}
                  {r.contact_phone && (
                    <span style={{ color: "var(--ink)" }}>
                      Call: {r.contact_phone}
                      {r.contact_language ? ` (${r.contact_language})` : ""}
                    </span>
                  )}
                  {r.indicative && <span>Indicative: {r.indicative}</span>}
                  {r.geography && <span>Geography: {r.geography}</span>}
                  {r.evidence && <span style={{ gridColumn: "1 / -1" }}>Evidence: {r.evidence}</span>}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Decisions. Approve publishes; the lifecycle buttons pull it off the
          board and drive the investigation states (brief Block D). */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 8,
          borderTop: "1px solid var(--rule)",
          paddingTop: 16,
        }}
      >
        {!isApproved && (
          <form action={approveSignalAction}>
            <input type="hidden" name="id" value={s.id} />
            <button className="b b--sm">Approve for board</button>
          </form>
        )}
        {isApproved && (
          <form action={setSignalStatusAction}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="status" value="private" />
            <button className="b b--2 b--sm">Unpublish</button>
          </form>
        )}
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="under_investigation" />
          <button className="b b--2 b--sm">Under investigation</button>
        </form>
        {/* Confirm links a real member listing by its reference. The listing
            must be approved, current and its owner verification-passing, or the
            action is refused. The signal is never itself promoted; a normal
            Qualified Opportunity carries it. */}
        <form action={setSignalStatusAction} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="confirmed" />
          <label
            className="mono"
            style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}
          >
            Link listing ref (required)
            <input name="listing_ref" required placeholder="PT-0000" style={field} />
          </label>
          <button className="b b--2 b--sm">Confirm</button>
        </form>
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="unavailable" />
          <button className="b b--2 b--sm">Mark unavailable</button>
        </form>
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="expired" />
          <button className="b b--2 b--sm">Mark expired</button>
        </form>
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="withdrawn" />
          <button className="b b--2 b--sm">Withdraw</button>
        </form>
      </div>

      {s.promoted_listing_id && (
        <p style={{ marginTop: 8, fontSize: 11, color: "var(--pos)" }}>
          Linked to a Qualified Opportunity (a normal member listing). This signal did not inherit a badge.
        </p>
      )}
    </div>
  );
}

function Group({ title, signals, requestsFor }: {
  title: string;
  signals: Signal[];
  requestsFor: (id: string) => Investigation[];
}) {
  return (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {signals.map((s) => (
          <SignalCard key={s.id} s={s} requests={requestsFor(s.id)} />
        ))}
      </div>
    </>
  );
}

export default async function AdminSignalsPage({
  searchParams,
}: {
  searchParams: { r?: string; m?: string };
}) {
  const adminSb = createAdminClient();
  const { data, error } = await adminSb
    .from("desk_radar")
    .select("*")
    .order("spotted_at", { ascending: false })
    .limit(400);

  const all = (data ?? []) as Signal[];

  // Member requests, grouped by signal, so a reviewer sees who asked what, and
  // who says they can supply it, right beside the signal's controls.
  const bySignal = new Map<string, Investigation[]>();
  const { data: invData } = await adminSb
    .from("signal_investigations")
    .select("id, signal_id, request_kind, requesting_business, requester_type, contact_phone, contact_language, establish_goal, capability, indicative, geography, evidence, wants_intro, created_at")
    .order("created_at", { ascending: false });
  for (const r of (invData ?? []) as Investigation[]) {
    const arr = bySignal.get(r.signal_id) ?? [];
    arr.push(r);
    bySignal.set(r.signal_id, arr);
  }
  const requestsFor = (id: string) => bySignal.get(id) ?? [];
  const totalRequests = (invData ?? []).length;

  // Signals with a live investigation request rise to the top of the queue,
  // whatever their board status, so an asked-about signal is never buried.
  const requested = all.filter((s) => requestsFor(s.id).length > 0);
  const requestedIds = new Set(requested.map((s) => s.id));
  const awaiting = all.filter((s) => s.status === "private" && !requestedIds.has(s.id));
  const live = all.filter((s) => s.status === "approved_signal" && !requestedIds.has(s.id));
  const rest = all.filter(
    (s) => s.status !== "private" && s.status !== "approved_signal" && !requestedIds.has(s.id),
  );

  return (
    <>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
      <section className="sec">
        <div className="sech">
          <div>
            <h2>
              <PonteIcon name="primitive.span" size={18} />
              Market Signals
            </h2>
            <p className="d">
              {live.length} live &middot; {awaiting.length} awaiting approval &middot; {totalRequests} investigation
              {totalRequests === 1 ? " request" : " requests"} &middot; {all.length} total. Imports land private; a
              signal is public only after you approve it.
            </p>
          </div>
        </div>

        {error && (
          <div className="err">
            <PonteIcon name="evidence.evreview" size={22} />
            <div>
              <b>The signal table could not be read</b>
              <p>
                If the Block A migration has not been applied yet, apply
                supabase/archive/20260723a_desk_radar_signal_gate.sql first.
              </p>
            </div>
          </div>
        )}

        {requested.length > 0 && (
          <Group title="Investigation requests" signals={requested} requestsFor={requestsFor} />
        )}

        <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
          Awaiting approval
        </h3>
        {awaiting.length === 0 ? (
          <div className="empty">
            <PonteIcon name="evidence.infocomplete" size={24} />
            <div>
              <b>Nothing private is waiting</b>
              <p>Imported signals land here first, before you approve them for the board.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {awaiting.map((s) => (
              <SignalCard key={s.id} s={s} requests={requestsFor(s.id)} />
            ))}
          </div>
        )}

        {live.length > 0 && (
          <Group title="Live on the board" signals={live} requestsFor={requestsFor} />
        )}

        {rest.length > 0 && (
          <Group
            title="Investigated, confirmed and retired"
            signals={rest}
            requestsFor={requestsFor}
          />
        )}
      </section>
    </>
  );
}
