import { createAdminClient } from "@/lib/supabase/server";
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

const OUTCOME: Record<string, { tone: "good" | "bad"; text: string }> = {
  approved: { tone: "good", text: "Approved. The signal is on the public board with a 90-day expiry." },
  private: { tone: "good", text: "Unpublished. The signal is private again and off the public board." },
  unavailable: { tone: "good", text: "Marked unavailable. The signal is off the public board." },
  withdrawn: { tone: "good", text: "Withdrawn. The signal is off the public board and kept for audit." },
  not_admin: { tone: "bad", text: "Nothing was written: your session is not signed in as an admin." },
  no_id: { tone: "bad", text: "Nothing was written: the form arrived without a signal id." },
  no_signal: { tone: "bad", text: "Nothing was written: that signal no longer exists." },
  no_status: { tone: "bad", text: "Nothing was written: the form arrived without a valid status." },
  db_error: { tone: "bad", text: "The database refused the write, so nothing changed." },
};

const DETAIL: Record<string, string> = {
  past_expiry: "This signal was spotted more than 90 days ago, so it is already past its public expiry and will not appear on the board. Consider whether it is still worth publishing.",
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
};

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "n/a";
}

function SignalCard({ s }: { s: Signal }) {
  const isApproved = s.status === "approved_signal";
  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="badge uppercase">{s.side}</span>
        <span className="flex-1 text-[15px] text-cream">{s.product}</span>
        <span className="text-[11px] uppercase text-gold" style={{ letterSpacing: "0.14em" }}>
          {s.status} · {fmt(s.spotted_at)}
        </span>
      </div>

      {/* Public facts: what the board would show. */}
      <div className="mt-3 grid gap-x-6 gap-y-1 text-[13px] text-gray-2 sm:grid-cols-2 md:grid-cols-3">
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
        <p className="mt-3 border-l-2 border-white/10 pl-3 text-[13px] leading-relaxed text-gray-2">
          {s.ai_description}
        </p>
      )}

      {/* Internal provenance. Admin only, never in a public payload. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] uppercase text-gold" style={{ letterSpacing: "0.14em" }}>
          Internal provenance (never public)
        </summary>
        <div className="mt-2 grid gap-1 text-[12px] text-gray-2">
          {s.source_platform && <span>Source: {s.source_platform}</span>}
          {s.source_url && <span className="break-all">URL: {s.source_url}</span>}
          {s.counterparty_name && <span>Counterparty: {s.counterparty_name}</span>}
          {s.counterparty_company && <span>Company: {s.counterparty_company}</span>}
          {s.counterparty_contact && <span>Contact: {s.counterparty_contact}</span>}
          {s.raw_description && (
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-white/10 pl-3">{s.raw_description}</p>
          )}
          {s.notes && <span>Notes: {s.notes}</span>}
        </div>
      </details>

      {/* Decisions. Approve publishes; the rest pull it off the board. */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {!isApproved && (
          <form action={approveSignalAction}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn-gold !px-4 !py-2 text-[12px]">Approve for board</button>
          </form>
        )}
        {isApproved && (
          <form action={setSignalStatusAction}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="status" value="private" />
            <button className="btn-ghost-light !px-4 !py-2 text-[12px]">Unpublish</button>
          </form>
        )}
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="unavailable" />
          <button className="btn-ghost-light !px-4 !py-2 text-[12px]">Mark unavailable</button>
        </form>
        <form action={setSignalStatusAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value="withdrawn" />
          <button className="btn-ghost-light !px-4 !py-2 text-[12px]">Withdraw</button>
        </form>
      </div>
    </div>
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
  const awaiting = all.filter((s) => s.status === "private");
  const live = all.filter((s) => s.status === "approved_signal");
  const rest = all.filter((s) => s.status !== "private" && s.status !== "approved_signal");

  return (
    <div>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
      <h1 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
        Market Signals
      </h1>
      <p className="mt-2 text-[14px] text-gray-2">
        {live.length} live · {awaiting.length} awaiting approval · {all.length} total. Imports land
        private; a signal is public only after you approve it.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-negative/40 bg-negative/10 p-4 text-[13px] text-cream">
          The signal table could not be read. If the Block A migration has not been applied yet,
          apply supabase/migrations/20260723a_desk_radar_signal_gate.sql first.
        </div>
      )}

      <h2 className="serif text-white mt-8 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
        Awaiting approval
      </h2>
      {awaiting.length === 0 ? (
        <div className="glass p-6 text-[14px] text-gray-2">Nothing private is waiting.</div>
      ) : (
        <div className="space-y-4">{awaiting.map((s) => <SignalCard key={s.id} s={s} />)}</div>
      )}

      {live.length > 0 && (
        <>
          <h2 className="serif text-white mt-10 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
            Live on the board
          </h2>
          <div className="space-y-4">{live.map((s) => <SignalCard key={s.id} s={s} />)}</div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="serif text-white mt-10 mb-4" style={{ fontSize: 20, fontWeight: 500 }}>
            Investigated, confirmed and retired
          </h2>
          <div className="space-y-4">{rest.map((s) => <SignalCard key={s.id} s={s} />)}</div>
        </>
      )}
    </div>
  );
}
