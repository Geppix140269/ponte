// Import the desk collection CSV into desk_radar.
//
//   node scripts/import-desk-radar.mjs --file "<path>.csv" [--limit 120] [--dry]
//
// The collector ships raw, in whatever shape it produces, and normalising is
// our job (spec section 5). This does that: it maps the raw columns onto the
// schema, splits the free-text quantity, recovers the incoterm from the source
// prose where the column is empty, dedupes on product + quantity + route, and
// drops anything it cannot make sense of rather than guessing.
//
// What it deliberately does NOT do:
//   - publish the source's prose. `raw_description` is carried into the
//     internal column and never becomes `ai_description`. The paraphrase is a
//     separate run through the write-up engine.
//   - name the source platform anywhere public.
//   - invent a corridor. A row whose origin and destination are the same
//     country, which is a third of this file, has no route to draw and is
//     imported without one.
//
// Rows are inserted `private`. Nothing an import produces is public: a Market
// Signal appears on the public board only after an individual admin approval
// in /admin/signals (Definitive 1 August brief, Block A). The desk-review step
// is a human one and is not automated here.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let field = "",
    row = [],
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "100 Tons" -> {qty: 100, unit: "Tons"}. "1 Twenty-Foot Container" -> 1 / container. */
function splitQuantity(raw) {
  const s = (raw || "").trim();
  if (!s) return { qty: null, unit: null };
  // A range ("100 - 200 Kilograms") takes its lower bound: it is the number
  // the seller can certainly meet.
  //
  // The separator is a dash and deliberately not the word "to". It was, and
  // "100 Tons" came out as 100 of a unit called "ns", because the optional
  // alternation happily ate the "To".
  const m = s.match(/^([\d.,]+)(?:\s*[-–]\s*[\d.,]+)?\s*(.*)$/);
  if (!m) return { qty: null, unit: s.slice(0, 24) || null };
  const n = Number(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").trim().replace(/\/.*$/, "").slice(0, 24);
  return {
    qty: Number.isFinite(n) && n > 0 ? n : null,
    unit: unit || null,
  };
}

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

/** The column is empty on 86% of rows; the term is usually in the prose. */
function findIncoterm(explicit, prose) {
  const direct = (explicit || "").trim().toUpperCase();
  if (INCOTERMS.includes(direct)) return direct;
  const m = (prose || "").match(/Shipping Terms\s*:\s*([A-Z]{3})/i);
  const found = m && m[1].toUpperCase();
  return found && INCOTERMS.includes(found) ? found : null;
}

const args = process.argv.slice(2);
const fileArg = args[args.indexOf("--file") + 1];
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 120;
const dry = args.includes("--dry");
if (!fileArg) {
  console.error("--file <path.csv> is required");
  process.exit(1);
}

loadEnv();
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const rows = parseCsv(readFileSync(fileArg, "utf8"));
const head = rows[0].map((h) => h.trim());
const at = Object.fromEntries(head.map((h, i) => [h, i]));
const data = rows.slice(1).filter((r) => r[at.deal_id]);

const seen = new Set();
const out = [];
const skipped = { noCorridor: 0, noProduct: 0, noQty: 0, duplicate: 0 };

for (const r of data) {
  const g = (k) => (r[at[k]] || "").trim();

  const product = g("product");
  const origin = g("origin_country");
  const destination = g("destination_country");
  const prose = g("raw_description");

  if (!product || product.length < 3) {
    skipped.noProduct++;
    continue;
  }

  const { qty, unit } = splitQuantity(g("quantity"));
  if (!qty) {
    skipped.noQty++;
    continue;
  }

  const key = `${product.toLowerCase()}|${qty}|${unit ?? ""}|${destination}`;
  if (seen.has(key)) {
    skipped.duplicate++;
    continue;
  }
  seen.add(key);

  const spotted = g("posted_date") ? new Date(g("posted_date")) : new Date();
  const validUntil = new Date(spotted.getTime() + 14 * 86400000);

  out.push({
    side: g("type") === "sell" ? "offer" : "requirement",
    product: product.slice(0, 160),
    qty,
    unit,
    incoterms: findIncoterm(g("incoterms"), prose),
    payment: g("payment_terms").slice(0, 60) || null,
    // Measured across the whole file: `origin_country` is not an origin. It
    // repeats the buyer's own country against a destination port string
    // ("FJ" against "Fiji", "Portugal" against "Lisbon, Lexeos, Portugal"),
    // and on the sell side there is not one genuine two-country pair in 1,859
    // rows. So only the destination is carried, because only the destination
    // is a fact. A corridor is not invented to feed a graphic.
    origin: null,
    destination,
    category: g("category") || null,
    spotted_at: spotted.toISOString(),
    valid_until: validUntil.toISOString(),
    // Private on import. Public display is a separate, individual admin
    // decision; see the header note and the migration's status vocabulary.
    status: "private",
    // Left null on purpose. The public description is written by the write-up
    // engine, in our words, and until that run happens a card shows structured
    // facts only. The source's prose is never promoted into this column.
    ai_description: null,
    source_platform: g("source") || null,
    source_url: g("source_url") || null,
    raw_description: prose || null,
    counterparty_name: g("buyer_name") || null,
    counterparty_company: g("buyer_company") || null,
    counterparty_contact: [g("contact_email"), g("contact_phone")].filter(Boolean).join(" ") || null,
    dedupe_key: key.slice(0, 300),
  });

}

// The file is ordered by category, so taking the first N gives a board that is
// entirely spices and entirely one side of the market. Deal it round robin
// across categories instead, so the ticker looks like a market rather than a
// single trader's inbox.
// Grouped by category AND side: the file lists every buy lead in a category
// before any sell lead, so grouping on category alone produced a board where
// all ninety cards said REQUEST. A market has two sides showing.
const byGroup = new Map();
for (const row of out) {
  const k = `${row.category ?? "other"}|${row.side}`;
  if (!byGroup.has(k)) byGroup.set(k, []);
  byGroup.get(k).push(row);
}
const decks = Array.from(byGroup.values());
const spread = [];
for (let i = 0; spread.length < limit; i++) {
  let placed = false;
  for (const deck of decks) {
    if (i < deck.length) {
      spread.push(deck[i]);
      placed = true;
      if (spread.length >= limit) break;
    }
  }
  if (!placed) break;
}
out.length = 0;
out.push(...spread);

console.log(
  JSON.stringify(
    { considered: data.length, importing: out.length, skipped },
    null,
    1,
  ),
);
if (dry) {
  console.log("dry run, nothing written");
  console.log(JSON.stringify(out.slice(0, 3), null, 1));
  process.exit(0);
}

// --reset clears the table first. Only ever the radar table, which this
// script owns and fills; nothing else is touched.
if (args.includes("--reset")) {
  const { error: delErr } = await sb
    .from("desk_radar")
    .delete()
    .not("id", "is", null);
  if (delErr) {
    console.error("reset failed:", delErr.message);
    process.exit(1);
  }
  console.log("cleared desk_radar");
}

const { error, count } = await sb
  .from("desk_radar")
  .upsert(out, { onConflict: "dedupe_key", count: "exact" });
if (error) {
  console.error("import failed:", error.message);
  process.exit(1);
}
console.log(`imported ${count ?? out.length} radar rows`);
