// Clean the Go4World supplier signals already in desk_radar: canonical titles,
// real quantity+unit, and a substance gate that publishes only signals worth
// showing. Re-derives everything from the source CSV and upserts in place on
// canonical_signal_id (batch g4wb_suppliers_2026-07-30).
//
//   node scripts/clean-go4world-signals.mjs --file "<csv>" --dry --out payload.json
//   node scripts/clean-go4world-signals.mjs --file "<csv>" --sample 25
//   node scripts/clean-go4world-signals.mjs --file "<csv>" --apply      (writes prod)
//
// Gate: PUBLISH (approved_signal) only when the signal has BOTH a credible
// quantity (a number WITH a recognised unit) AND a clean, specific product
// title. Everything else -> private. Reversible: re-run, or PATCH status.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const fileArg = args[args.indexOf("--file") + 1];
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const sampleN = args.includes("--sample") ? Number(args[args.indexOf("--sample") + 1]) : 0;
const apply = args.includes("--apply");
const BATCH = "g4wb_suppliers_2026-07-30";
if (!fileArg) { console.error("--file <csv> required"); process.exit(1); }

function parseCsv(text) {
  const rows = []; let field = "", row = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- quantity + unit -------------------------------------------------------
const UNIT_ALTS = [
  ["metric\\s*tonnes?|metric\\s*tons?|\\bmt\\b|\\btonnes?\\b|\\btons?\\b", "MT"],
  ["kilograms?|\\bkgs?\\b", "kg"],
  ["quintals?|\\bqtls?\\b", "quintal"],
  ["litres?|liters?|\\bltrs?\\b", "litres"],
  ["twenty[- ]foot\\s*container|forty[- ]foot\\s*container|containers?|\\bfcl\\b|20['\"’]?\\s*ft|40['\"’]?\\s*ft", "containers"],
  ["cartons?", "cartons"], ["drums?", "drums"], ["pallets?", "pallets"],
  ["bags?", "bags"], ["bottles?", "bottles"], ["boxes?", "boxes"],
  ["pieces?|\\bpcs?\\b", "pieces"],
];
const UNIT_RE = new RegExp("(\\d[\\d.,]*)\\s*(" + UNIT_ALTS.map((u) => u[0]).join("|") + ")", "i");
function canonUnit(raw) {
  const s = raw.toLowerCase();
  for (const [pat, name] of UNIT_ALTS) if (new RegExp(pat, "i").test(s)) return name;
  return raw;
}
function extractQtyUnit(quantityField, rawDesc) {
  for (const src of [quantityField, rawDesc]) {
    if (!src) continue;
    const m = src.match(UNIT_RE);
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) return { qty: n, unit: canonUnit(m[2]) };
    }
  }
  return { qty: null, unit: null };
}

// ---- title cleaning --------------------------------------------------------
const NOISE = new Set([
  "premium", "quality", "export", "exported", "grade", "graded", "grades", "best", "finest",
  "superior", "top", "ready", "wholesale", "bulk", "cheap", "sale", "kualitas", "terbaik",
  "genuine", "authentic", "guaranteed", "assured", "good", "great", "super", "highquality",
  "agrade", "exportquality", "exportgrade", "premiumquality", "granda", "class", "rating",
  "highest", "economy", "regular", "standard", "commercial", "range", "quality.", "gr",
]);
const GRADE_CODE = /^(a\+*|a{2,}|\d{1,3}%|grade|gr\.?|no\.?\d*|#\d+|\d(st|nd|rd|th)?)$/i;
const DROP_PHRASES = [
  /\bindian origin\b/gi, /\bexport (?:quality|grade|ready|standard)\b/gi,
  /\bpremium (?:quality|grade|export|range)\b/gi, /\bhigh quality\b/gi,
  /\bbest (?:quality|grade|price)\b/gi, /\bfood grade\b/gi, /\bedible grade\b/gi,
  /\b100% (?:pure|natural)\b/gi, /\bas per (?:buyer|customer).*/gi,
  /\bexport ready\b/gi, /\btbc\b/gi,
];

function titleCase(s) {
  return s.split(/\s+/).map((w) => {
    if (!w) return w;
    if (/\d/.test(w) || /^[A-Z]{2,}$/.test(w)) return w.toUpperCase().length === w.length && /^[a-z]/.test(w) ? w : w; // keep codes
    if (/^(and|of|the|or|with|in|for)$/i.test(w)) return w.toLowerCase();
    return w[0].toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function cleanTitle(raw) {
  let t = raw.split("|")[0]; // drop everything after a pipe (price/terms tail)
  for (const re of DROP_PHRASES) t = t.replace(re, " ");
  // Drop trailing grade-only clauses: ", Grade A", ", A", ", Premium", repeatedly,
  // but keep a clause that carries a real variety word (Sella, Golden, Steam...).
  const meaningfulTail = /(sella|golden|white|brown|black|green|raw|steam|parboiled|long|short|whole|split|extra|virgin|cold|refined|organic|arabica|robusta|\d{3,4})/i;
  let guard = 0;
  while (guard++ < 6) {
    const m = t.match(/^(.*),\s*([^,]+)$/);
    if (!m) break;
    const tail = m[2].trim();
    if (meaningfulTail.test(tail)) break;
    const tailTokens = tail.toLowerCase().replace(/[^a-z0-9+% ]/g, " ").split(/\s+/).filter(Boolean);
    const allNoise = tailTokens.length > 0 && tailTokens.every((w) => NOISE.has(w) || GRADE_CODE.test(w));
    if (!allNoise) break;
    t = m[1];
  }
  // Token filter over the whole thing.
  const kept = t.replace(/[()]/g, " ").split(/[\s,]+/).map((w) => w.trim()).filter(Boolean)
    .filter((w) => {
      const bare = w.toLowerCase().replace(/[^a-z0-9+%]/g, "");
      if (!bare) return false;
      if (NOISE.has(bare)) return false;
      if (GRADE_CODE.test(bare)) return false;
      return true;
    });
  let out = titleCase(kept.join(" ")).replace(/\s+/g, " ").replace(/\s*[-–]\s*$/,"").trim();

  // The source repeats the variety in its grade clause ("Premium 1121 Steam
  // Basmati Rice, 1121 Steam Grade"), so stripping the noise words leaves the
  // variety twice. Collapse repeated tokens, keeping first occurrence order.
  // Case-insensitive, and applied to trailing repeats of a phrase as well as to
  // single duplicated words ("Raw ... Rice Raw" -> "Raw ... Rice").
  const toks = out.split(" ").filter(Boolean);
  // 1. trailing repeated phrase: if the last k tokens appear earlier in order, drop them.
  for (let k = Math.floor(toks.length / 2); k >= 1; k--) {
    const tail = toks.slice(-k).map((t) => t.toLowerCase()).join(" ");
    const headStr = toks.slice(0, -k).map((t) => t.toLowerCase()).join(" ");
    if (headStr.includes(tail)) { toks.length = toks.length - k; break; }
  }
  // 2. any remaining duplicate single tokens (keep first).
  const seenTok = new Set();
  const dedup = [];
  for (const t of toks) {
    const k = t.toLowerCase();
    if (seenTok.has(k)) continue;
    seenTok.add(k);
    dedup.push(t);
  }
  out = dedup.join(" ").replace(/\s+/g, " ").replace(/\s*[-–]\s*$/, "").trim();
  // A dangling conjunction left by token filtering reads as truncation.
  out = out.replace(/\s+(and|or|of|with|for|in|the)$/i, "").trim();
  return out;
}

const BASE_GENERIC = /^(wheat|rice|maize|corn|sugar|oil|tea|coffee|spices|pulses|nuts|salt|flour|grain|grains|seed|seeds|beans?|dal|lentil|lentils|nut)$/i;
function generic(title) {
  const t = title.trim();
  return t.split(/\s+/).length <= 1 && BASE_GENERIC.test(t);
}

// ---- category map (unchanged) ----------------------------------------------
/**
 * Categories, in the vocabulary the board ALREADY uses.
 *
 * These labels are not invented here: they are the exact strings the existing
 * desk_radar inventory carries ("Rice & Grains", "Spices & Ingredients"). The
 * first import wrote its own casing ("Rice & grains", "Spices"), which produced
 * two categories per market — 250 under one label and 275 under the other — so
 * a category browse listed the same market twice and neither entry was the
 * whole of it. A category is a shared key, not a per-import display choice.
 */
const CAT = {
  "rice-grains": { label: "Rice & Grains", sector: "agri", hs: "10" },
  "pulses": { label: "Pulses", sector: "agri", hs: "07" },
  "nuts-dryfruit": { label: "Nuts & Dried Fruit", sector: "agri", hs: "08" },
  "spices": { label: "Spices & Ingredients", sector: "agri", hs: "09" },
  "coffee-tea": { label: "Coffee & Tea", sector: "agri", hs: "09" },
  "edible-oils": { label: "Edible Oils", sector: "food", hs: "15" },
};
const ISO2 = { in: "India", us: "United States", vn: "Vietnam", za: "South Africa", ae: "United Arab Emirates", id: "Indonesia", ke: "Kenya", fr: "France", ca: "Canada", tr: "Turkey", my: "Malaysia", gb: "United Kingdom", ua: "Ukraine", de: "Germany", ng: "Nigeria", th: "Thailand", ar: "Argentina", sg: "Singapore", ph: "Philippines", pl: "Poland" };
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
function incoterm(explicit, prose) {
  const d = (explicit || "").trim().toUpperCase();
  if (INCOTERMS.includes(d)) return d;
  const m = (prose || "").match(/\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i);
  return m ? m[1].toUpperCase() : null;
}
// origin -> "Region, Country" (drop the city, keep the last two comma parts)
function originRegionCountry(buyerCountry, iso) {
  if (buyerCountry) {
    let parts = buyerCountry.split(",").map((s) => s.trim()).filter(Boolean);
    // Title-case a lowercase source value ("indonesia" -> "Indonesia") and drop
    // an adjacent repeat, because the source often writes the country as its
    // own region ("Indonesia, Indonesia", "United Arab Emirates, United Arab
    // Emirates"), which reads as a data error rather than a place.
    parts = parts.map((p) => (/[a-z]/.test(p) && p === p.toLowerCase() ? titleCase(p) : p));
    const dedup = parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase());
    if (dedup.length >= 2) return dedup.slice(-2).join(", ");
    if (dedup.length === 1) return dedup[0];
  }
  return ISO2[iso] || (iso ? iso.toUpperCase() : null);
}

/**
 * Is this a credible WHOLESALE quantity for its unit?
 *
 * A number with a unit is not automatically a trade signal: "1 MT" of palm oil
 * is a sample, not an export offer, and publishing it next to a 500 MT cargo
 * makes the whole board look unreviewed. So each unit carries the floor below
 * which the figure is treated as absent rather than as an offer.
 */
const QTY_FLOOR = { MT: 5, kg: 100, quintal: 10, litres: 200, containers: 1, cartons: 50, drums: 10, pallets: 5, bags: 50, bottles: 100, boxes: 50, pieces: 100 };
function credibleQuantity(qty, unit) {
  if (qty === null || !unit) return false;
  const floor = QTY_FLOOR[unit];
  return floor === undefined ? qty > 0 : qty >= floor;
}

// ---- build -----------------------------------------------------------------
const rows = parseCsv(readFileSync(fileArg, "utf8"));
const head = rows[0].map((h) => h.trim());
const at = Object.fromEntries(head.map((h, i) => [h, i]));
const data = rows.slice(1).filter((r) => (r[at.deal_id] || "").trim());
const PUBLISHED_AT = new Date().toISOString();

const out = [];
let pub = 0;
for (const r of data) {
  const g = (k) => (r[at[k]] || "").trim();
  const rawProduct = g("product");
  if (!rawProduct || rawProduct.length < 3) continue;
  const slug = g("category").toLowerCase();
  const cat = CAT[slug];
  if (!cat) continue;

  const title = cleanTitle(rawProduct) || rawProduct.slice(0, 60);
  const prose = g("raw_description");
  const { qty, unit } = extractQtyUnit(g("quantity"), prose);
  const iso = g("origin_country").toLowerCase();
  const origin = originRegionCountry(g("buyer_country"), iso);
  const posted = g("posted_date") ? new Date(g("posted_date")) : new Date();
  const spotted = isNaN(posted) ? new Date() : posted;

  const publishable = credibleQuantity(qty, unit) && !generic(title) && title.length >= 4;
  if (publishable) pub++;

  out.push({
    canonical_signal_id: g("deal_id"),
    side: "offer",
    product: title.slice(0, 160),
    hs_code: cat.hs,
    qty,
    unit,
    incoterms: incoterm(g("incoterms"), prose),
    payment: g("payment_terms").slice(0, 60) || null,
    origin,
    destination: null,
    category: cat.label,
    market_family: "products",
    product_sector_key: cat.sector,
    spotted_at: spotted.toISOString(),
    valid_until: null,
    public_expires_at: null,
    published_at: publishable ? PUBLISHED_AT : null,
    indexable: false,
    status: publishable ? "approved_signal" : "private",
    ai_description: null,
    summary_line: title.slice(0, 160),
    source_platform: g("source") || null,
    source_url: g("source_url") || null,
    raw_description: prose || null,
    counterparty_name: g("buyer_name") || null,
    counterparty_company: g("buyer_company") || null,
    counterparty_contact: [g("contact_email"), g("contact_phone")].filter(Boolean).join(" ") || null,
    dedupe_key: g("deal_id"),
    import_batch: BATCH,
    import_meta: { source_category: slug, origin_iso2: iso || null, buyer_country: g("buyer_country") || null, raw_title: rawProduct },
  });
}
const CAT_ORDER = Object.keys(CAT);
out.sort((a, b) => {
  const d = CAT_ORDER.indexOf(a.import_meta.source_category) - CAT_ORDER.indexOf(b.import_meta.source_category);
  return d !== 0 ? d : b.spotted_at.localeCompare(a.spotted_at);
});

console.log(JSON.stringify({ total: out.length, willPublish: pub, willHoldPrivate: out.length - pub }, null, 1));

if (sampleN) {
  console.log("\n=== before -> after (published sample) ===");
  for (const x of out.filter((r) => r.status === "approved_signal").slice(0, sampleN)) {
    console.log(`  [${x.category}] "${x.import_meta.raw_title}"\n      -> "${x.product}"  |  ${x.qty} ${x.unit}  |  ${x.origin}  |  ${x.incoterms || "-"}`);
  }
}
if (outArg) { writeFileSync(outArg, JSON.stringify(out, null, 1)); console.log(`\nwrote ${out.length} rows to ${outArg}`); }

if (!apply) { console.log("\n(no --apply: nothing written to the database)"); process.exit(0); }

// ---- apply -----------------------------------------------------------------
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest = `${url}/rest/v1/desk_radar`;
const H = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
let written = 0;
for (let i = 0; i < out.length; i += 500) {
  const slice = out.slice(i, i + 500);
  const res = await fetch(`${rest}?on_conflict=canonical_signal_id`, { method: "POST", headers: { ...H, prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(slice) });
  if (!res.ok) { console.error(`\nbatch ${i} failed ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  written += slice.length; process.stdout.write(`\r  upserted ${written}/${out.length}`);
}
const now = new Date().toISOString();
const cnt = await fetch(`${rest}?select=id&import_batch=eq.${BATCH}&status=eq.approved_signal&or=(public_expires_at.is.null,public_expires_at.gt.${now})`, { headers: { ...H, prefer: "count=exact", range: "0-0" } });
console.log(`\ndone. board-visible for batch: ${(cnt.headers.get("content-range") || "/?").split("/")[1]}`);
