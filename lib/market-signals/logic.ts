import { isoCode } from "../listing-terms";

/**
 * The pure Market Signal logic: types, the public/internal column split, and
 * the two decisions that keep a signal honest (is it publicly visible, and how
 * does a row map to the client shape).
 *
 * No database, no Next, no server imports. It is imported by the DB module in
 * lib/board/market-signals.ts and, crucially, by the unit test, which runs
 * under tsx and must not drag the Supabase client into the process. The
 * `isoCode` import is relative on purpose, so the test's import chain never
 * depends on tsconfig path resolution.
 */

export type MarketSignalStatus =
  | "private"
  | "approved_signal"
  | "under_investigation"
  | "confirmed"
  | "unavailable"
  | "expired"
  | "withdrawn";

export type MarketSignal = {
  id: string;
  /** "offer" (seller availability) or "requirement" (buyer demand). */
  side: string;
  product: string;
  hsCode: string | null;
  chapter: string | null;
  chapterTitle: string | null;
  quantity: string | null;
  unit: string | null;
  incoterm: string | null;
  payment: string | null;
  originText: string | null;
  destinationText: string | null;
  originCode: string | null;
  destinationCode: string | null;
  /** The date the signal was originally spotted in the open market. */
  spottedAt: string;
  /** When it leaves the public board. Set at approval to spotted_at + 90 days. */
  publicExpiresAt: string | null;
  status: MarketSignalStatus;
  /** The paraphrase written by the desk in our words. Never the source prose. */
  description: string | null;
  summaryLine: string | null;
};

/**
 * The only columns a public Market Signal read may select. Kept as a named
 * constant so a test can assert it against the internal set: a column that
 * appears in both lists is a leak.
 */
export const PUBLIC_SIGNAL_COLUMNS =
  "id, side, product, hs_code, qty, unit, incoterms, payment, origin, destination, category, spotted_at, public_expires_at, status, ai_description, summary_line";

/**
 * The columns that must NEVER reach a public payload. This list is the test's
 * definition of a leak, and it is also documentation for the next person who
 * edits PUBLIC_SIGNAL_COLUMNS.
 */
export const INTERNAL_SIGNAL_COLUMNS: readonly string[] = [
  "source_platform",
  "source_url",
  "raw_description",
  "counterparty_name",
  "counterparty_company",
  "counterparty_contact",
  "notes",
  "approved_by",
  "dedupe_key",
];

/** Two-digit HS chapter from any HS code shape ("1701.99" -> "17"). */
export function chapterOf(hsCode: string | null): string | null {
  if (!hsCode) return null;
  const digits = hsCode.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(0, 2) : null;
}

/** A raw desk_radar row, restricted to the public columns. */
export type SignalRow = {
  id: string;
  side: string;
  product: string;
  hs_code: string | null;
  qty: number | string | null;
  unit: string | null;
  incoterms: string | null;
  payment: string | null;
  origin: string | null;
  destination: string | null;
  category?: string | null;
  spotted_at: string;
  public_expires_at: string | null;
  status: string;
  ai_description: string | null;
  summary_line: string | null;
};

/**
 * Is this row allowed on the public board right now? Approved, and not past its
 * public expiry. Pure, so the rule is unit-tested rather than trusted.
 *
 * A signal with no expiry is still shown while approved: approval always sets
 * one, and hiding an approved signal because a date is missing would be the
 * wrong failure. A signal past its expiry is not, whatever its status says,
 * which is the automatic 90-day disappearance the brief requires.
 */
export function isPubliclyVisible(
  row: Pick<SignalRow, "status" | "public_expires_at">,
  nowMs: number = Date.now(),
): boolean {
  if (row.status !== "approved_signal") return false;
  if (!row.public_expires_at) return true;
  return Date.parse(row.public_expires_at) > nowMs;
}

/** Map a public row to the client-facing shape. Pure. */
export function mapSignalRow(r: SignalRow): MarketSignal {
  return {
    id: r.id,
    side: r.side,
    product: r.product,
    hsCode: r.hs_code,
    chapter: chapterOf(r.hs_code),
    chapterTitle: null,
    quantity: r.qty === null || r.qty === undefined ? null : String(r.qty),
    unit: r.unit,
    incoterm: r.incoterms,
    payment: r.payment,
    originText: r.origin,
    destinationText: r.destination,
    originCode: isoCode(r.origin),
    destinationCode: isoCode(r.destination),
    spottedAt: r.spotted_at,
    publicExpiresAt: r.public_expires_at,
    status: r.status as MarketSignalStatus,
    description: r.ai_description,
    summaryLine: r.summary_line,
  };
}
