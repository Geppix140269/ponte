// Import the Go4WorldBusiness supplier-offer collection CSV into desk_radar.
//
//   node scripts/import-go4world-suppliers.mjs --file "<path>.csv" [--dry [--out preview.json]] [--limit N]
//
// This is a sibling of scripts/import-desk-radar.mjs, tailored to the SUPPLIER
// export (go4world_suppliers_*.csv). That file differs from the buyer-lead
// collection in three ways that the older script gets wrong for this data:
//
//   1. `type` is `seller_offer`, not `sell`. Every row is a seller availability,
//      so side is always `offer`. (import-desk-radar.mjs tests `=== "sell"` and
//      would file all 4,945 as `requirement`.)
//   2. Only ~37% carry a quantity. A supplier listing without a stated quantity
//      is still a real signal, so quantity is NOT required here (the older
//      script drops every row without one).
//   3. `origin_country` IS meaningful — it is the supplier's country — and
//      `destination_country` is empty. So origin is carried, destination is null.
//
// CATEGORISE: every row is a product. Each of the six source categories maps to
// a canonical product sector, an HS chapter (for the board's chapter chips) and
// a readable category label. See CATEGORY_MAP below.
//
// ORDER: rows are sorted by category, then newest spotted first, so the write is
// deterministic and grouped rather than in raw scrape order.
//
// PUBLICATION: every row is inserted `private`. Nothing an import produces is
// public; a Market Signal reaches the public board only after an individual
// admin approval in /admin/signals (same rule as import-desk-radar.mjs). The
// contact columns (buyer_name / company / email / phone) land ONLY in the
// internal counterparty_* columns, never in a public column.
//
// IDEMPOTENT: upserts on canonical_signal_id (the PONTE-SUP deal id), so
// re-running refreshes in place. Tagged with import_batch for one-statement
// rollback:  delete from desk_radar where import_batch = '<batch>';
//
// Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const fileArg = args[args.indexOf("--file") + 1];
const dry = args.includes("--dry");
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const batch = args.includes("--batch") ? args[args.indexOf("--batch") + 1] : "g4wb_suppliers_2026-07-30";
if (!fileArg) {
  console.error("--file <path.csv> is required");
  process.exit(1);
}

// ---- csv (same proven parser as import-desk-radar.mjs) ---------------------
function parseCsv(text) {
  const rows = [];
  let field = "", row = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** "2500 Kilograms Foo Ltd" / "100 - 200 Tons" -> {qty, unit}. Lower bound of a range. */
function splitQuantity(raw) {
  const s = (raw || "").trim();
  if (!s) return { qty: null, unit: null };
  const m = s.match(/^([\d.,]+)(?:\s*[-–]\s*[\d.,]+)?\s*(.*)$/);
  if (!m) return { qty: null, unit: s.slice(0, 24) || null };
  const n = Number(m[1].replace(/,/g, ""));
  // Keep only the leading unit word(s), drop any trailing company name / rate.
  let unit = (m[2] || "").trim().replace(/\/.*$/, "").split(/\s+/).slice(0, 3).join(" ").slice(0, 24);
  return { qty: Number.isFinite(n) && n > 0 ? n : null, unit: unit || null };
}

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
function findIncoterm(explicit, prose) {
  const direct = (explicit || "").trim().toUpperCase();
  if (INCOTERMS.includes(direct)) return direct;
  const m = (prose || "").match(/\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i);
  return m ? m[1].toUpperCase() : null;
}

// ---- categorisation --------------------------------------------------------
// slug -> { category label (public), product_sector_key, hs_code chapter }
const CATEGORY_MAP = {
  "rice-grains":  { label: "Rice & grains",       sector: "agri", hs: "10" },
  "pulses":       { label: "Pulses",              sector: "agri", hs: "07" },
  "nuts-dryfruit":{ label: "Nuts & dried fruit",  sector: "agri", hs: "08" },
  "spices":       { label: "Spices",              sector: "agri", hs: "09" },
  "coffee-tea":   { label: "Coffee & tea",        sector: "agri", hs: "09" },
  "edible-oils":  { label: "Edible oils",         sector: "food", hs: "15" },
};

const ISO2_NAME = {
  in: "India", us: "United States", vn: "Vietnam", za: "South Africa", ae: "United Arab Emirates",
  id: "Indonesia", ke: "Kenya", fr: "France", ca: "Canada", tr: "Turkey", my: "Malaysia",
  gb: "United Kingdom", ua: "Ukraine", de: "Germany", ng: "Nigeria", th: "Thailand",
  ar: "Argentina", sg: "Singapore", ph: "Philippines", pl: "Poland",
};

// ---- map -------------------------------------------------------------------
const rows = parseCsv(readFileSync(fileArg, "utf8"));
const head = rows[0].map((h) => h.trim());
const at = Object.fromEntries(head.map((h, i) => [h, i]));
const data = rows.slice(1).filter((r) => (r[at.deal_id] || "").trim());

const PUBLISHED_AT = new Date().toISOString();
const out = [];
const seen = new Set();
const skipped = { noProduct: 0, unknownCategory: 0, duplicate: 0 };
const byCategory = {};

for (const r of data) {
  const g = (k) => (r[at[k]] || "").trim();

  const product = g("product");
  if (!product || product.length < 3) { skipped.noProduct++; continue; }

  const canonical = g("deal_id");
  if (seen.has(canonical)) { skipped.duplicate++; continue; }
  seen.add(canonical);

  const slug = g("category").toLowerCase();
  const cat = CATEGORY_MAP[slug];
  if (!cat) { skipped.unknownCategory++; continue; }
  byCategory[slug] = (byCategory[slug] || 0) + 1;

  const { qty, unit } = splitQuantity(g("quantity"));
  const prose = g("raw_description");
  const iso = g("origin_country").toLowerCase();
  const originText = g("buyer_country") || ISO2_NAME[iso] || iso.toUpperCase() || null;

  const posted = g("posted_date") ? new Date(g("posted_date")) : new Date();
  const spotted = isNaN(posted) ? new Date() : posted;

  out.push({
    canonical_signal_id: canonical,
    side: "offer",
    product: product.slice(0, 160),
    hs_code: cat.hs,
    qty,
    unit,
    incoterms: findIncoterm(g("incoterms"), prose),
    payment: g("payment_terms").slice(0, 60) || null,
    origin: originText,
    destination: null,
    category: cat.label,
    market_family: "products",
    product_sector_key: cat.sector,
    spotted_at: spotted.toISOString(),
    valid_until: null,
    // Owner decision 2026-07-30: publish the whole set live. public_expires_at
    // is left null (visible while approved) rather than spotted_at + 90 days,
    // because the scrape carries historical spotted dates back to 2003 and a
    // spotted-based window would hide most of the inventory the moment it lands.
    public_expires_at: null,
    published_at: PUBLISHED_AT,
    indexable: false,
    status: "approved_signal",
    // No paraphrase yet: the public description is written by the desk, never
    // promoted from the source prose. summary_line carries the clean title.
    ai_description: null,
    summary_line: (g("ai_title") || product).slice(0, 160),
    // ---- internal only (never in a public read) ----
    source_platform: g("source") || null,
    source_url: g("source_url") || null,
    raw_description: prose || null,
    counterparty_name: g("buyer_name") || null,
    counterparty_company: g("buyer_company") || null,
    counterparty_contact: [g("contact_email"), g("contact_phone")].filter(Boolean).join(" ") || null,
    dedupe_key: canonical,
    import_batch: batch,
    import_meta: {
      source_category: slug,
      origin_iso2: iso || null,
      buyer_country: g("buyer_country") || null,
      source_status: g("status") || null,
    },
  });
  if (out.length >= limit) break;
}

// ---- order: by category, then newest spotted first -------------------------
const CAT_ORDER = Object.keys(CATEGORY_MAP);
out.sort((a, b) => {
  const ca = CAT_ORDER.indexOf(a.import_meta.source_category);
  const cb = CAT_ORDER.indexOf(b.import_meta.source_category);
  if (ca !== cb) return ca - cb;
  return b.spotted_at.localeCompare(a.spotted_at);
});

console.log(JSON.stringify({
  considered: data.length,
  importing: out.length,
  skipped,
  byCategory,
  status: "approved_signal (LIVE on the public board; public_expires_at null)",
  import_batch: batch,
}, null, 1));

if (dry) {
  if (outArg) {
    writeFileSync(outArg, JSON.stringify(out, null, 1));
    console.log(`\ndry run — wrote full prepared payload (${out.length} rows) to ${outArg}. Nothing written to any database.`);
  } else {
    console.log("\ndry run, nothing written. First 2 prepared rows:");
    console.log(JSON.stringify(out.slice(0, 2), null, 1));
  }
  process.exit(0);
}

// ---- upload (service role via PostgREST; no npm dependency) -----------------
// Loads .env.local from cwd. Run from the repo root that holds it, e.g.
//   cd /c/dev/ponte && node <worktree>/scripts/import-go4world-suppliers.mjs --file ...
const envPath = existsSync(".env.local") ? ".env.local" : null;
if (!envPath) {
  console.error("\nNo .env.local in cwd; cannot upload. Run with --dry to prepare only, or run from the repo root that holds .env.local.");
  process.exit(1);
}
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  process.exit(1);
}
const rest = `${url}/rest/v1/desk_radar`;
const baseHeaders = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };

async function restCount() {
  const res = await fetch(`${rest}?select=canonical_signal_id&import_batch=eq.${encodeURIComponent(batch)}`,
    { headers: { ...baseHeaders, prefer: "count=exact", range: "0-0" } });
  const cr = res.headers.get("content-range"); // e.g. "0-0/1234"
  return cr ? cr.split("/")[1] : "?";
}

// Preflight: confirm the table is reachable with these credentials.
const probe = await fetch(`${rest}?select=canonical_signal_id&limit=1`, { headers: baseHeaders });
if (!probe.ok) {
  console.error(`Cannot read desk_radar (HTTP ${probe.status}): ${(await probe.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log(`before: desk_radar batch '${batch}' holds ${await restCount()} rows.`);

const SIZE = 500;
let written = 0;
for (let i = 0; i < out.length; i += SIZE) {
  const slice = out.slice(i, i + SIZE);
  const res = await fetch(`${rest}?on_conflict=canonical_signal_id`, {
    method: "POST",
    headers: { ...baseHeaders, prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(slice),
  });
  if (!res.ok) {
    console.error(`\nBatch at row ${i} failed (HTTP ${res.status}): ${(await res.text()).slice(0, 400)}\n${written} written before this.`);
    process.exit(1);
  }
  written += slice.length;
  process.stdout.write(`\r  upserted ${written}/${out.length}`);
}
console.log(`\ndone. desk_radar batch '${batch}' now holds ${await restCount()} rows (status approved_signal, LIVE).`);
