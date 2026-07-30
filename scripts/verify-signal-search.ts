/**
 * Execute the real Market Signals search predicate against PostgREST.
 *
 *   npx tsx scripts/verify-signal-search.ts
 *   npx tsx scripts/verify-signal-search.ts --env ../../.env.local
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 * Every other test in this repository asserts the predicate STRING. That proves
 * the shape Ponte intends and proves nothing about whether PostgREST parses a
 * nested `or=(and(or(...),or(...)))`, whether `ILIKE` behaves as assumed on the
 * stored values, or whether the gateway accepts a filter of the maximum size the
 * caps permit. Those are facts about a server, and the only way to establish a
 * fact about a server is to ask it.
 *
 * It also settles the one number that could not be derived: the safe predicate
 * size. `MAX_PREDICATE_CHARS` is reasoned from Kong's documented buffers; this
 * sends the largest query the caps permit and reports whether it was accepted.
 *
 * ---------------------------------------------------------------------------
 * READ ONLY, and structurally so
 * ---------------------------------------------------------------------------
 * The only Supabase call in this file is `.select()`. There is no insert, no
 * update, no delete, no upsert and no `rpc`, and `assertReadOnly` below checks
 * this file's own source for those verbs before anything runs, so a later edit
 * that adds one fails loudly rather than quietly writing to production.
 *
 * Reads are bounded: counts use `head: true` and fetch no rows at all, and the
 * sample read takes three records of the public columns only.
 *
 * Every query carries the same eligibility predicates the board applies, so this
 * measures what a member can actually reach and not what is stored.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  parseSignalSearch,
  searchPredicate,
  SEARCHABLE_COLUMNS,
  MAX_QUERY_LENGTH,
  MAX_PREDICATE_CHARS,
  MAX_SLOTS,
  MAX_GROUP_VARIANTS,
  MAX_EXPANDED_GROUPS,
} from "../lib/search/signal-search";
import { allAliasTerms } from "../lib/search/aliases";
import { FAMILY_KEYS } from "../lib/board/availability";
import { PUBLIC_SIGNAL_COLUMNS, publicWindowPredicate } from "../lib/market-signals/logic";

/** Refuse to run if this file has grown a writing verb. */
function assertReadOnly(): void {
  const self = readFileSync("scripts/verify-signal-search.ts", "utf8");
  // Split so the check cannot match its own list.
  const forbidden = ["ins" + "ert(", "up" + "date(", "del" + "ete(", "up" + "sert(", ".r" + "pc("];
  for (const verb of forbidden) {
    if (self.includes(verb)) {
      throw new Error(`${verb} appears in a script that must only read. Refusing to run.`);
    }
  }
}

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/** The representative queries the acceptance audit asks for, plus the extremes. */
const QUERIES: Array<{ q: string; note: string }> = [
  { q: "gas oil", note: "alias group, one concept; must not reach diesel equipment" },
  { q: "EN590", note: "sibling term reaches the same group" },
  { q: "diesel cargo rotterdam", note: "alias plus two mandatory qualifiers" },
  { q: "olive oil", note: "multi-word alias, one concept" },
  { q: "freight forwarding Morocco", note: "multi-word alias plus a qualifier" },
  { q: "170199", note: "HS code, both stored spellings" },
  { q: "cafe", note: "accent-folded form only" },
  { q: "café", note: "accented query, both forms searched" },
  { q: "99999999", note: "expected to match nothing" },
];

type Row = Record<string, unknown>;

/**
 * The one table this script touches, named through a counter.
 *
 * The closing report states how many reads were issued, and that figure is part
 * of the evidence that this run only read. It used to be a hand-maintained
 * arithmetic expression, which drifted the moment a check was added. Every read
 * now names its table through here, so the tally is counted rather than claimed.
 */
let reads = 0;
function radar(): "desk_radar" {
  reads += 1;
  return "desk_radar";
}

async function main(): Promise<void> {
  assertReadOnly();

  const envArg = process.argv.indexOf("--env");
  const envPath = envArg > 0 ? process.argv[envArg + 1] : ".env.local";
  const env = { ...loadEnv(envPath), ...loadEnv("../../.env.local"), ...process.env } as Record<
    string,
    string
  >;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
        `Looked in ${envPath}, ../../.env.local and the environment.`,
    );
    process.exit(1);
  }

  const project = /https:\/\/([a-z0-9]+)\.supabase/.exec(url)?.[1] ?? "unknown";
  const nowIso = new Date().toISOString();
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("Market Signals search: read-only verification against PostgREST");
  console.log("");
  console.log(`project           ${project}`);
  console.log(`url               ${url}`);
  console.log(`clock             ${nowIso}`);
  console.log(`searched columns  ${SEARCHABLE_COLUMNS.join(", ")}`);
  console.log(
    `caps              MAX_SLOTS=${MAX_SLOTS} MAX_GROUP_VARIANTS=${MAX_GROUP_VARIANTS} ` +
      `MAX_EXPANDED_GROUPS=${MAX_EXPANDED_GROUPS} MAX_PREDICATE_CHARS=${MAX_PREDICATE_CHARS}`,
  );
  console.log("");

  /** Eligible signals, filters aside. The denominator for everything below. */
  const eligible = await sb
    .from(radar())
    .select("id", { count: "exact", head: true })
    .eq("status", "approved_signal")
    .or(publicWindowPredicate(nowIso));
  if (eligible.error) {
    console.error(`eligible count failed: ${eligible.error.message}`);
    process.exit(1);
  }
  console.log(`eligible public signals   ${eligible.count}`);
  console.log("");

  let failures = 0;

  // -------------------------------------------------------------------------
  // What the family filter can actually answer, measured
  // -------------------------------------------------------------------------
  // The board decides which family filters to offer from these three counts.
  // Until now this report established the total and left the per-family figures
  // to a reconciliation done elsewhere, which meant the number driving a visible
  // control was the one number nobody had executed here.
  //
  // Same predicates as the total above and as the board's own read: the status,
  // the public window, and the one clock declared at the top of this run. The
  // only added filter is `market_family`, which is the stored canonical column
  // and the sole thing that may activate a filter. Nothing is inferred from
  // product text, source category or description, so a count of zero means
  // "nothing is classified into this family" and never "this family is empty".
  console.log("canonical family classification (the counts behind the filters)");
  const familyCounts: Array<[string, number | null]> = [];
  for (const family of FAMILY_KEYS) {
    const read = await sb
      .from(radar())
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .eq("market_family", family);
    if (read.error || typeof read.count !== "number") {
      failures += 1;
      familyCounts.push([family, null]);
      console.log(`  ${family}  FAILED: ${read.error?.message ?? "no count returned"}`);
      continue;
    }
    familyCounts.push([family, read.count]);
    console.log(
      `  market_family = ${family}   ${read.count} of ${eligible.count} eligible   ` +
        `-> filter ${read.count > 0 ? "offered" : "not offered"}`,
    );
  }
  const classified = familyCounts.reduce((sum, [, n]) => sum + (n ?? 0), 0);
  console.log(
    `  ${classified} of ${eligible.count} eligible signals carry any canonical market_family`,
  );
  if (classified === 0) {
    // Said explicitly, because the two readings differ commercially and the
    // wrong one would be an untrue claim about Ponte's inventory.
    console.log(
      "  The eligible records are semantically product-oriented, but none carries a",
    );
    console.log(
      "  canonical market_family, so none is reachable by the family filter. This is a",
    );
    console.log(
      "  classification gap (PL-020), not an absence of signals: every one of them is",
    );
    console.log("  live on the board and reachable by search.");
  }
  console.log("");

  for (const { q, note } of QUERIES) {
    const search = parseSignalSearch(q);
    if (!search) {
      console.log(`"${q}"  not a search (too short); skipped`);
      continue;
    }
    const predicate = searchPredicate(search);
    const concepts = search.slots.length;
    const variants = search.slots.map((s) => s.variants.length).join("+");

    const started = Date.now();
    const counted = await sb
      .from(radar())
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .or(predicate);
    const ms = Date.now() - started;

    console.log(`"${q}"   (${note})`);
    console.log(`  predicate       ${predicate.length} chars, ${concepts} concept(s) [${variants} variants]`);
    if (counted.error) {
      failures += 1;
      console.log(`  RESULT          FAILED: ${counted.error.message}`);
      console.log("");
      continue;
    }
    console.log(`  matched         ${counted.count} of ${eligible.count}   (${ms} ms)`);

    // A sample, so the report carries record identities rather than only a
    // number. Public columns only, three rows, no ordering cost beyond the read.
    const sample = await sb
      .from(radar())
      .select(PUBLIC_SIGNAL_COLUMNS)
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .or(predicate)
      .limit(3);
    if (sample.error) {
      failures += 1;
      console.log(`  sample          FAILED: ${sample.error.message}`);
    } else {
      for (const row of (sample.data ?? []) as Row[]) {
        const ref = row.canonical_signal_id ?? row.id;
        console.log(`    ${String(ref)}  ${String(row.product).slice(0, 62)}`);
      }
      if ((sample.data ?? []).length === 0) console.log("    (no records)");
    }
    console.log("");
  }

  // -------------------------------------------------------------------------
  // The qualifier check, executed rather than reasoned about
  // -------------------------------------------------------------------------
  // The defect this correction exists for was invisible in a single count: a
  // broadened search returns MORE, which looks like a working search. So the
  // qualified query is compared against the alias alone, and the qualified count
  // must be no larger. Equality would mean the qualifier changed nothing, which
  // on this inventory would itself be worth knowing.
  console.log("qualifiers stay mandatory (executed, not inferred)");
  const pairs: Array<[string, string]> = [
    ["gas oil", "gas oil cargo rotterdam"],
    ["diesel", "diesel cargo rotterdam"],
    ["distributor", "distributor spain"],
    ["freight forwarding", "freight forwarding morocco"],
  ];
  for (const [broad, narrow] of pairs) {
    const counts: number[] = [];
    for (const query of [broad, narrow]) {
      const search = parseSignalSearch(query)!;
      const read = await sb
        .from(radar())
        .select("id", { count: "exact", head: true })
        .eq("status", "approved_signal")
        .or(publicWindowPredicate(nowIso))
        .or(searchPredicate(search));
      if (read.error) {
        failures += 1;
        console.log(`  "${query}"  FAILED: ${read.error.message}`);
        counts.push(-1);
      } else {
        counts.push(read.count ?? 0);
      }
    }
    const [wide, tight] = counts;
    if (wide < 0 || tight < 0) continue;
    if (tight > wide) failures += 1;
    // A zero baseline proves nothing: 0 -> 0 satisfies the inequality without
    // the qualifier ever having been tested. Said plainly, because a row of
    // "ok" that carries no evidence is worse than an absent row.
    const verdict = tight > wide ? "BROADENED" : wide === 0 ? "VACUOUS" : "ok";
    const why = wide === 0 ? "   (nothing matches the alias alone, so this proves nothing)" : "";
    console.log(`  ${verdict}  "${broad}" = ${wide}   ->   "${narrow}" = ${tight}${why}`);
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Alias precision: what a widened search must NOT reach
  // -------------------------------------------------------------------------
  // A count alone cannot show this. Widening a fuel enquiry with the bare word
  // `diesel` pulled equipment into the results - `Diesel Generator` appeared in
  // the sample rows of an earlier run of this very script - and a search
  // returning MORE looks like a search that works. So the equipment records are
  // counted directly, under the fuel query and under the typed word, and the two
  // answers must differ.
  console.log("alias precision (the diesel-generator case)");
  {
    const equipment = ["generator", "engine", "pump"];
    for (const query of ["gas oil", "diesel"]) {
      const search = parseSignalSearch(query)!;
      const predicate = searchPredicate(search);
      const sends = predicate.includes('product.ilike."*diesel*"');
      let reached = 0;
      for (const word of equipment) {
        const read = await sb
          .from(radar())
          .select("id", { count: "exact", head: true })
          .eq("status", "approved_signal")
          .or(publicWindowPredicate(nowIso))
          .or(predicate)
          .ilike("product", `%diesel %${word}%`);
        if (read.error) {
          failures += 1;
          console.log(`  "${query}" x ${word}  FAILED: ${read.error.message}`);
        } else {
          reached += read.count ?? 0;
        }
      }
      const verdict = query === "gas oil" ? (reached === 0 ? "ok" : "IMPRECISE") : "expected";
      if (query === "gas oil" && reached > 0) failures += 1;
      console.log(
        `  ${verdict}  "${query}" reaches ${reached} diesel-equipment record(s); ` +
          `bare term in predicate: ${sends ? "yes" : "no"}`,
      );
    }
  }
  console.log("");

  // -------------------------------------------------------------------------
  // The largest request the caps permit
  // -------------------------------------------------------------------------
  // This is the measurement `MAX_PREDICATE_CHARS` was reasoned toward. Two
  // shapes, because the expensive one is not obvious: the longest alias terms
  // expanded twice, and the maximum query length filled with distinct short
  // words.
  console.log("the largest permitted requests");
  const longest = allAliasTerms().reduce((a, b) => (b.length > a.length ? b : a), "");
  const distinct: string[] = [];
  for (let i = 0; i < 26 && distinct.length < 60; i += 1) {
    for (let j = 0; j < 26 && distinct.length < 60; j += 1) {
      distinct.push(`${String.fromCharCode(97 + i)}${String.fromCharCode(97 + j)}`);
    }
  }
  const extremes: Array<{ label: string; q: string }> = [
    { label: "two longest alias groups plus filler", q: `${longest} olive oil ${"zz ".repeat(20)}`.slice(0, MAX_QUERY_LENGTH) },
    { label: "maximum length, distinct two-letter words", q: distinct.join(" ").slice(0, MAX_QUERY_LENGTH) },
    { label: "maximum length, single repeated word", q: "sugar ".repeat(40).slice(0, MAX_QUERY_LENGTH) },
  ];
  for (const { label, q } of extremes) {
    const search = parseSignalSearch(q);
    if (!search) {
      console.log(`  ${label}: not a search`);
      continue;
    }
    const predicate = searchPredicate(search);
    const started = Date.now();
    const read = await sb
      .from(radar())
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .or(predicate);
    const ms = Date.now() - started;
    const within = predicate.length <= MAX_PREDICATE_CHARS ? "within" : "OVER";
    if (read.error) {
      failures += 1;
      console.log(`  ${label}`);
      console.log(`    ${predicate.length} chars (${within} bound), ${search.slots.length} concepts`);
      console.log(`    REFUSED: ${read.error.message}`);
    } else {
      console.log(`  ${label}`);
      console.log(
        `    ${predicate.length} chars (${within} bound), ${search.slots.length} concepts, ` +
          `dropped ${search.droppedConcepts} -> accepted, ${read.count} matched, ${ms} ms`,
      );
    }
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Accent behaviour, as the database actually does it
  // -------------------------------------------------------------------------
  console.log("accent forms, as ILIKE actually resolves them");
  for (const q of ["cafe", "café"]) {
    const search = parseSignalSearch(q)!;
    const predicate = searchPredicate(search);
    const read = await sb
      .from(radar())
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .or(predicate);
    const forms = search.slots[0].variants.join(" | ");
    if (read.error) {
      failures += 1;
      console.log(`  "${q}"  FAILED: ${read.error.message}`);
    } else {
      console.log(`  "${q}"  searched as [${forms}]  ->  ${read.count} matched`);
    }
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Whether the indexes exist yet
  // -------------------------------------------------------------------------
  // The migration is written and unapplied. Timings above mean one thing if the
  // trigram indexes are live and another if they are not, so the report says
  // which. Read through the same PostgREST surface; no SQL is executed.
  console.log("indexes");
  console.log(
    "  20260730a_market_signal_search.sql adds pg_trgm and eight partial GIN indexes.",
  );
  console.log(
    "  Its application is recorded in docs/codex/DATABASE-STATE.md, not detectable here:",
  );
  console.log(
    "  PostgREST exposes tables, not pg_class, and this script executes no SQL by design.",
  );
  console.log("");

  // Wall clock, not query time. Each figure above is a round trip to eu-west-1
  // and includes network latency, TLS and PostgREST parsing, so it is an upper
  // bound on the database work and cannot be decomposed from here. Recorded as
  // measured rather than reasoned: the estimate this replaced said single-digit
  // milliseconds, which was the sequential-scan cost alone and not what a member
  // waits for.
  console.log("timings above are wall-clock round trips, not isolated query time");
  console.log(`writes performed  none (select only; ${reads} reads issued)`);
  console.log(failures === 0 ? "RESULT            all reads succeeded" : `RESULT            ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
