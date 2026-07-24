/**
 * The pure mapping from a go4WorldBusiness workbook row to a desk_radar insert.
 *
 * No database, no Next, no filesystem: the import script (scripts/import-
 * market-signals.ts) reads the xlsx and calls this, and the unit test calls it
 * directly. Keeping the mapping here is what lets the two hard rules be tested
 * rather than trusted:
 *
 *   1. No provenance in a public column. Every source/scoring field the sheet
 *      carries goes into import_meta or an internal column; the public columns
 *      (see PUBLIC_SIGNAL_COLUMNS) carry only safe facts. PUBLIC_INSERT_KEYS
 *      below is the allow-list a test asserts against.
 *   2. Nothing is public unless the sheet says so. publishable && !review_required
 *      becomes 'approved_signal' (auto-published per the 24 Jul decision);
 *      everything else — including every review_required row — lands 'private'.
 */

/** The workbook's boolean cells arrive as "1"/"0", "TRUE()"/"FALSE()", or bools. */
export function flattenBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    return s === "1" || s === "TRUE" || s === "TRUE()" || s === "YES" || s === "Y";
  }
  return false;
}

/** True only when the cell is explicitly a falsey flag (present and false). */
export function isExplicitlyFalse(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  return !flattenBool(v);
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // Excel's day 0 (1900 date system)
const DAY_MS = 86_400_000;

/**
 * Convert an Excel serial date (e.g. 46227) to an ISO date "YYYY-MM-DD".
 * Passes an already-ISO string straight through. Returns null for anything that
 * is neither, so a bad cell never becomes a wrong date.
 */
export function excelSerialToISODate(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(EXCEL_EPOCH_MS + Math.round(n) * DAY_MS);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** buyer_requirement -> requirement, supplier_offer -> offer. */
export function sideFromSignalType(signalType: unknown): "offer" | "requirement" {
  const s = String(signalType ?? "").toLowerCase();
  if (s.includes("offer") || s.includes("supplier") || s.includes("sell")) return "offer";
  return "requirement";
}

const str = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : null;
};

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Public expiry: 90 days after the signal date, or the source's own earlier expiry. */
export function publicExpiry(spottedAt: string | null, expiresDate: string | null): string | null {
  if (!spottedAt) return expiresDate;
  const base = new Date(Date.parse(spottedAt) + 90 * DAY_MS);
  if (Number.isNaN(base.getTime())) return expiresDate;
  const ninety = base.toISOString().slice(0, 10);
  if (expiresDate && Date.parse(expiresDate) < Date.parse(ninety)) return expiresDate;
  return ninety;
}

/**
 * The safe columns this mapping writes that are ALSO part of the public read
 * contract (PUBLIC_SIGNAL_COLUMNS). A test asserts every one is genuinely
 * public and that no provenance column ever joins them. `valid_until` and
 * `published_at` are written too (real, benign date columns) but are not part
 * of the public SELECT, so they are intentionally absent here.
 */
export const PUBLIC_INSERT_KEYS = [
  "canonical_signal_id",
  "side",
  "product",
  "hs_code",
  "qty",
  "unit",
  "incoterms",
  "payment",
  "origin",
  "destination",
  "category",
  "spotted_at",
  "public_expires_at",
  "status",
  "ai_description",
  "summary_line",
] as const;
// Also written, safe, but not part of the public SELECT: valid_until,
// published_at, indexable.

export type SignalImportInsert = Record<string, unknown> & {
  canonical_signal_id: string;
  side: "offer" | "requirement";
  product: string;
  status: "approved_signal" | "private";
};

export type MapResult =
  | { ok: true; insert: SignalImportInsert }
  | { ok: false; reason: string };

/**
 * Map one raw workbook row (header -> cell value) to a desk_radar upsert object.
 *
 * `nowIso` is injected so the import stamps a single deterministic published_at
 * across the batch and the test is not clock-dependent. A row without a
 * canonical id or a product is rejected rather than guessed: those two are the
 * spine of a Market Signal, and a signal missing either is not one.
 */
export function mapImportRow(
  raw: Record<string, unknown>,
  opts: { batch: string; nowIso: string },
): MapResult {
  const canonical = str(raw.canonical_signal_id);
  const product = str(raw.product) ?? str(raw.source_product);
  if (!canonical) return { ok: false, reason: "no canonical_signal_id" };
  if (!product) return { ok: false, reason: "no product" };

  const publishable = flattenBool(raw.publishable);
  const reviewRequired = flattenBool(raw.review_required);
  const status: "approved_signal" | "private" =
    publishable && !reviewRequired ? "approved_signal" : "private";

  const spottedAt = excelSerialToISODate(raw.signal_date) ?? opts.nowIso.slice(0, 10);
  const expiresDate = excelSerialToISODate(raw.expires_date);
  const isApproved = status === "approved_signal";

  // Every provenance and scoring field the sheet carries, kept off the public
  // payload. The internal desk_radar columns take the three that already have a
  // home; the rest live in import_meta.
  const importMeta: Record<string, unknown> = {
    source_deal_id: str(raw.source_deal_id),
    legacy_signal_id: str(raw.legacy_signal_id),
    record_kind: str(raw.record_kind),
    signal_type: str(raw.signal_type),
    source_category: str(raw.source_category),
    sub_category: str(raw.sub_category),
    source_product: str(raw.source_product),
    specification: str(raw.specification),
    quantity_raw: str(raw.quantity_raw),
    quantity_min: num(raw.quantity_min),
    quantity_max: num(raw.quantity_max),
    origin_raw: str(raw.origin_raw),
    origin_iso2: str(raw.origin_iso2),
    destination_raw: str(raw.destination_raw),
    destination_iso2: str(raw.destination_iso2),
    age_days: num(raw.age_days),
    age_band: str(raw.age_band),
    signal_state: str(raw.signal_state),
    source_ids: str(raw.source_ids),
    source_files: str(raw.source_files),
    match_method: str(raw.match_method),
    match_confidence: num(raw.match_confidence),
    provenance_status: str(raw.provenance_status),
    quality_score: num(raw.quality_score),
    information_missing: str(raw.information_missing),
    import_ready: flattenBool(raw.import_ready),
    publishable,
    indexable: flattenBool(raw.indexable),
    review_required: reviewRequired,
    review_reason: str(raw.review_reason),
    disclaimer: str(raw.disclaimer),
    dup_count: num(raw.dup_count),
    conflicting_fields: str(raw.conflicting_fields),
  };

  const insert: SignalImportInsert = {
    // ---- public, safe columns ----
    canonical_signal_id: canonical,
    side: sideFromSignalType(raw.signal_type),
    product,
    hs_code: null, // no clean HS column in the source; category carries the class
    qty: num(raw.quantity_min),
    unit: str(raw.quantity_unit),
    incoterms: str(raw.incoterm),
    payment: str(raw.payment_terms),
    origin: str(raw.origin_country) ?? str(raw.origin_raw),
    destination: str(raw.destination_country) ?? str(raw.destination_raw),
    category: str(raw.canonical_category),
    spotted_at: spottedAt,
    valid_until: expiresDate,
    public_expires_at: isApproved ? publicExpiry(spottedAt, expiresDate) : null,
    published_at: isApproved ? opts.nowIso : null,
    status,
    indexable: flattenBool(raw.indexable),
    ai_description: str(raw.clean_description), // our paraphrase, never raw prose
    summary_line: str(raw.clean_title),
    // ---- internal columns (never in a public read) ----
    source_platform: str(raw.source_name),
    source_url: str(raw.source_url),
    raw_description: str(raw.raw_description),
    dedupe_key: canonical,
    import_batch: opts.batch,
    import_meta: importMeta,
  };

  return { ok: true, insert };
}
