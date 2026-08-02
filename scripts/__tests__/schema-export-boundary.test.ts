// The schema export cannot write, and cannot read member data.
//
// Run: npx tsx scripts/__tests__/schema-export-boundary.test.ts
//
// ## Why a test and not a promise
//
// `scripts/schema-export.sql` is run by an authorised human against the
// PRODUCTION database. The whole DECISION-22 boundary rests on it being
// incapable of writing anything and incapable of returning member records. A
// header comment saying so is not a boundary; it is a note about one.
//
// This is the boundary, expressed as something that fails.
//
// The standing constraint it enforces: a privilege change is a production
// write. `CREATE ROLE` and `GRANT` are not exempt because they are not data
// migrations, and Claude Code must never create or broaden its own role. So
// those verbs are banned here alongside INSERT and DROP.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const PATH = "scripts/schema-export.sql";
const RAW = readFileSync(PATH, "utf8");

/** SQL with comments removed, so a comment explaining a ban is not a ban. */
const SQL = RAW.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("the file exists and is not empty", () => {
  // A silent zero would make every assertion below pass by reading nothing.
  assert.ok(RAW.length > 2000, `${PATH} is ${RAW.length} bytes; it should be the full export`);
  assert.ok(SQL.includes("select"), "no SELECT survived comment stripping; the stripper is wrong");
});

test("every statement is a read", () => {
  /*
    Split on the STATEMENT boundary, not on newlines.

    The first version of this checked the first word of every line against an
    allowlist, and every continuation line of a SELECT list failed it:
    `c.column_name,` is not a keyword. A per-line rule cannot express "this
    statement is a select" because a statement spans lines. Splitting on `;`
    and reading the first word of each is the property actually wanted.
  */
  const statements = SQL.split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    /*
      psql meta-commands are not SQL statements. They end at a newline rather
      than at a semicolon, so a run of them arrives attached to the front of
      the next statement, and blank lines between them mean one pass is not
      enough. Stripped repeatedly until none is left.

      They are safe by construction: `\echo`, `\pset` and `\timing` are the
      only ones present, none reaches the server as SQL, and none can write.
      The write-verb assertion below covers the file as a whole regardless.
    */
    .map((s) => {
      let rest = s;
      let previous: string;
      do {
        previous = rest;
        rest = rest.replace(/^\s*\\[a-z]+[^\n]*(\n|$)/i, "");
      } while (rest !== previous);
      return rest.trim();
    })
    .filter(Boolean);

  assert.ok(statements.length >= 10, `only ${statements.length} statements parsed; the split is wrong`);

  for (const statement of statements) {
    const first = statement.split(/[\s(]/)[0].toLowerCase();
    assert.equal(first, "select", `a statement is not a read, it begins "${first}"`);
  }
});

test("no write verb appears anywhere, including privilege changes", () => {
  /*
    A privilege change IS a production write. `CREATE ROLE` and `GRANT` are not
    exempt because they are not data migrations, and the standing constraint is
    that Claude Code must never create or broaden its own role. Banned here so
    the script cannot quietly acquire the access the boundary exists to avoid.
  */
  const banned = [
    "insert", "update", "delete", "drop", "truncate", "alter",
    "create", "grant", "revoke", "reassign", "set role", "security label",
    "copy", "vacuum", "analyze", "refresh materialized", "comment on",
  ];
  for (const verb of banned) {
    const pattern = new RegExp(`\\b${verb.replace(/ /g, "\\s+")}\\b`, "i");
    const hit = SQL.match(pattern);
    assert.equal(hit, null, `${PATH} contains a write verb: "${hit?.[0]}"`);
  }
});

test("no table that holds member data is selected from", () => {
  /*
    The catalogs are metadata about the shape of the data and are safe. A
    Ponte table is the data. `storage.objects` is on this list for a reason
    that is easy to miss: an object NAME is member data, and a filename in this
    product routinely carries a company name.
  */
  const forbidden = [
    "storage.objects",
    "auth.users",
    "auth.identities",
    "auth.sessions",
    "public.listings",
    "public.profiles",
    "public.deal_rooms",
    "public.credit_purchases",
    "public.market_signals",
  ];
  for (const table of forbidden) {
    assert.ok(!SQL.toLowerCase().includes(table), `${PATH} selects from ${table}`);
  }
  // storage.buckets IS selected, and that is the configuration, not the
  // contents. Pinned so the distinction is deliberate rather than accidental.
  assert.ok(SQL.includes("storage.buckets"), "bucket configuration is no longer exported");
});

test("counts are catalog estimates, never exact", () => {
  /*
    A SELECT grant that permits an exact COUNT(*) also permits reading the
    rows, so asking for exact counts would ask for the grant this boundary
    exists to avoid. `reltuples` is the planner's estimate held in the catalog
    and touches no row.
  */
  assert.ok(!/count\s*\(/i.test(SQL), "the export runs a COUNT, which needs a grant that can read rows");
  assert.match(SQL, /reltuples/, "the export no longer reports estimated row counts at all");
});

test("function and view bodies travel as digests, not as text", () => {
  // A body can embed a key, a webhook secret or a hard-coded address. A digest
  // proves drift against the repository without carrying any of that.
  assert.match(SQL, /sha256\(convert_to\(coalesce\(p\.prosrc/, "function bodies are no longer digested");
  assert.match(SQL, /sha256\(convert_to\(pg_get_viewdef/, "view definitions are no longer digested");
  // `prosrc` and `pg_get_viewdef` may appear ONLY inside a digest call.
  for (const [symbol, count] of [["p.prosrc", 2], ["pg_get_viewdef", 1]] as const) {
    const occurrences = (SQL.match(new RegExp(symbol.replace(".", "\\."), "g")) ?? []).length;
    assert.ok(
      occurrences <= count,
      `${symbol} appears ${occurrences} times; it may only appear inside a digest`,
    );
  }
});

test("SECURITY DEFINER functions are reported", () => {
  // They bypass RLS by design, and RLS is the mandatory permission boundary
  // for the Deal Room. A reconciliation that cannot list them is incomplete.
  assert.match(SQL, /prosecdef/, "the export no longer reports which functions bypass RLS");
});

test("whether RLS is ENABLED is asked separately from what policies exist", () => {
  // A table with policies and RLS disabled is wide open, and reading only
  // `pg_policies` would show a full policy list on a table enforcing none.
  assert.match(SQL, /relrowsecurity/, "the export does not report whether RLS is enabled");
  assert.match(SQL, /pg_policies/, "the export does not report the policies");
});

console.log(`ok   schema export boundary: ${passed} assertions passed`);
