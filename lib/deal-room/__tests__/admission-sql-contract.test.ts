// The durable half of the admission gate: what 20260731g must say.
//
// Run: npx tsx lib/deal-room/__tests__/admission-sql-contract.test.ts
//
// ## Why a text test, and what it is worth
//
// `deal_room_propose` and `deal_room_admit_participant` are SECURITY DEFINER and
// granted to `authenticated`. Any member with a session can call either over
// PostgREST without ever loading the page that holds the TypeScript gate. So the
// durable boundary is the database, and the database is where the rule has to
// be - which is the whole reason 20260731g exists.
//
// The migration is WRITTEN AND NOT APPLIED, so no test in this repository can
// exercise it against a running Postgres. What this file proves is that the
// text of the boundary is correct and complete: both commands consult the gate,
// neither filters its answer, no signature moved, no overload was created, and
// no drop was left un-regranted.
//
// That is a real and checkable claim, and it is NOT the claim that production is
// closed. Production stays open until an owner applies the file. Both halves are
// stated in the PR rather than left for a reader to infer from a green run.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const FILE = "supabase/migrations/20260731g_deal_room_admission_verification_gate.sql";
const sql = readFileSync(FILE, "utf8");
/**
 * The statements only.
 *
 * BOTH comment forms are stripped, `--` and the block form. The file explains
 * its own mutations in prose - "collapsing the two lines back into
 * `v_name := v_business` is the mutation the falsifiability test exists to
 * catch" - and a scan that read those sentences as code would find the very
 * pattern it is looking for, in a comment saying not to write it.
 */
const code = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");

/**
 * The executable statements, with `comment on ... is '...'` removed as well.
 *
 * A `comment on` is a real statement, so it survives the stripping above - but
 * its payload is documentation, and this file's documentation necessarily names
 * the things the gate must NOT read ("Reads NO verification level: neither
 * company_verified nor identity_verified is required"). Scanning that sentence
 * for forbidden names finds them in the sentence that promises their absence.
 */
const executable = code.replace(/comment on [\s\S]*?';/g, "");

const PROPOSE_ARGS = "uuid, uuid, text, text, text, text, text, text, text";
const ADMIT_ARGS = "uuid";
const DECLARE_OLD = "uuid, text, text, text, text, text";
const DECLARE_NEW = "uuid, text, text, text, text, text, text, text";

// ---------------------------------------------------------------------------
// The two granted commands keep their exact signatures
// ---------------------------------------------------------------------------

test("deal_room_propose is replaced at its exact existing signature", () => {
  assert.ok(
    code.includes("create or replace function public.deal_room_propose(") ,
    "propose must be replaced, not created beside itself",
  );
  const body = code.match(/create or replace function public\.deal_room_propose\(([\s\S]*?)\)\s*returns/);
  assert.ok(body, "propose's parameter list must be readable");
  const types = body![1]
    .split(",")
    .map((a) => a.trim().replace(/\s+/g, " ").split(" ").slice(1).join(" "))
    .filter(Boolean)
    .join(", ");
  assert.equal(types, PROPOSE_ARGS, "propose's signature must not move: a grant follows the signature, not the name");
});

test("deal_room_admit_participant is replaced at its exact existing signature", () => {
  assert.ok(code.includes("create or replace function public.deal_room_admit_participant(p_participant_id uuid)"));
});

test("neither granted command is dropped, so neither loses its ACL", () => {
  for (const name of ["deal_room_propose", "deal_room_admit_participant"]) {
    assert.ok(
      !new RegExp(`^[ \\t]*drop function[^\\n]*public\\.${name}\\(`, "m").test(code),
      `${name} must not be dropped: drop function discards the ACL with the function`,
    );
  }
});

test("no overload is created anywhere in the file", () => {
  // One signature per function name, counted from the statements themselves.
  const created = new Map<string, Set<string>>();
  for (const m of Array.from(
    code.matchAll(/create (?:or replace )?function public\.(deal_room_\w+)\(([\s\S]*?)\)\s*returns/g),
  )) {
    const args = m[2]
      .split(",")
      .map((a) => a.trim().replace(/\s+/g, " ").split(" ").slice(1).join(" "))
      .filter(Boolean)
      .join(", ");
    if (!created.has(m[1])) created.set(m[1], new Set());
    created.get(m[1])!.add(args);
  }
  assert.ok(created.size > 0, "the scan found no function definitions; it has drifted from the file");
  for (const [name, signatures] of Array.from(created.entries())) {
    assert.equal(
      signatures.size,
      1,
      `${name} is created at ${signatures.size} different signatures in one file, which is an overload`,
    );
  }
});

// ---------------------------------------------------------------------------
// The declaration command: re-signed deliberately, old form gone
// ---------------------------------------------------------------------------

test("the six-parameter declaration command is dropped by name", () => {
  assert.ok(
    code.includes(`drop function if exists public.deal_room_declare_participation(${DECLARE_OLD});`),
    "without the drop, both arities stay callable and the old one keeps its grant",
  );
});

test("the eight-parameter form is created, and the old one is never recreated", () => {
  assert.ok(code.includes(`create function public.deal_room_declare_participation(`));
  const created = Array.from(
    code.matchAll(/create (?:or replace )?function public\.deal_room_declare_participation\(([\s\S]*?)\)\s*returns/g),
  );
  assert.equal(created.length, 1, "exactly one definition of the declaration command");
  const types = created[0][1]
    .split(",")
    .map((a) => a.trim().replace(/\s+/g, " ").split(" ").slice(1).join(" "))
    .filter(Boolean)
    .join(", ");
  assert.equal(types, DECLARE_NEW);
});

test("the ACL the drop discarded is re-issued exactly as 20260730b had it", () => {
  assert.ok(
    code.includes(
      `revoke execute on function public.deal_room_declare_participation(${DECLARE_NEW}) from public, anon;`,
    ),
  );
  assert.ok(
    code.includes(`grant execute on function public.deal_room_declare_participation(${DECLARE_NEW}) to authenticated;`),
    "drop function takes the ACL with it; without this the command is unreachable",
  );
});

test("no later migration recreates the six-parameter form", () => {
  const later = readdirSync("supabase/migrations")
    .filter((f) => /^\d{8}[a-z]_.*\.sql$/.test(f))
    .sort()
    .filter((f) => f >= "20260731g");
  for (const file of later) {
    const text = readFileSync(`supabase/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "");
    for (const m of Array.from(
      text.matchAll(/create (?:or replace )?function public\.deal_room_declare_participation\(([\s\S]*?)\)\s*returns/g),
    )) {
      const types = m[1]
        .split(",")
        .map((a) => a.trim().replace(/\s+/g, " ").split(" ").slice(1).join(" "))
        .filter(Boolean)
        .join(", ");
      assert.equal(types, DECLARE_NEW, `${file} recreates the declaration command at a superseded signature`);
    }
  }
});

// ---------------------------------------------------------------------------
// Both doors consult the gate, and neither edits its answer
// ---------------------------------------------------------------------------

test("both commands call the gate, on the door-appropriate arguments", () => {
  assert.ok(
    code.includes("v_missing := public.deal_room_admission_minimum_missing(auth.uid(), null, p_listing_id);"),
    "the propose door must ask about the caller and the Deal",
  );
  assert.ok(
    code.includes("v_minimum := public.deal_room_admission_minimum_missing(auth.uid(), p_participant_id, null);"),
    "the admission door must ask about the caller and their participation",
  );
});

test("neither call filters, trims or otherwise edits the gate's answer", () => {
  // The subtle bypass: keep the call, drop one criterion from what comes back.
  for (const m of Array.from(code.matchAll(/public\.deal_room_admission_minimum_missing\([^;]*/g))) {
    const statement = m[0];
    for (const edit of ["array_remove", "array_positions", "filter", "[1:", "array_replace"]) {
      assert.ok(!statement.includes(edit), `the gate's answer must reach the caller whole (found ${edit})`);
    }
  }
  // Call sites only: the definition, the comment and the revoke also name it.
  const calls = Array.from(code.matchAll(/:= public\.deal_room_admission_minimum_missing\(/g));
  assert.equal(calls.length, 2, "exactly two call sites, one per door");
});

test("both commands refuse when anything is missing, and name it", () => {
  const refusals = Array.from(
    code.matchAll(/if v_(?:missing|minimum) is not null and array_length\(v_(?:missing|minimum), 1\) > 0 then/g),
  );
  assert.ok(refusals.length >= 2, "each door must act on the answer, not merely fetch it");
  assert.ok(
    code.includes("array_to_string(v_missing, ', ')") && code.includes("array_to_string(v_minimum, ', ')"),
    "the refusal names the missing evidence rather than counting it",
  );
});

test("the caller cannot reach the gate helper directly", () => {
  // A member who could call it could probe another member's admission state one
  // profile id at a time.
  assert.ok(
    code.includes(
      "revoke execute on function public.deal_room_admission_minimum_missing(uuid, uuid, uuid) from public, anon, authenticated;",
    ),
  );
  assert.ok(
    code.includes("revoke execute on function public.deal_room_room_prerequisite_state(uuid) from public, anon, authenticated;"),
  );
  assert.ok(
    !/grant execute on function public\.deal_room_(admission_minimum_missing|room_prerequisite_state)/.test(code),
    "neither internal helper may be granted to anything",
  );
});

// ---------------------------------------------------------------------------
// What the gate reads, and what it must never read
// ---------------------------------------------------------------------------

test("the gate reads no verification level, at either height", () => {
  for (const forbidden of ["verification_level", "company_verified", "identity_verified", "business_verification_id"]) {
    assert.ok(!executable.includes(forbidden), `the gate must not read ${forbidden}`);
  }
});

test("the gate touches no credit, price or entitlement fact", () => {
  for (const forbidden of ["credit", "price", "amount_cents", "stripe", "entitlement_state"]) {
    assert.ok(!executable.toLowerCase().includes(forbidden), `the gate must not read ${forbidden}`);
  }
});

test("criteria 4 and 6 read their own columns and not the capacity or the authority", () => {
  const name = code.match(/v_name := ([\s\S]*?);/);
  assert.ok(name, "the legal-name resolution must be readable");
  assert.ok(
    name![1].includes("represented_legal_name"),
    "criterion 4 must read its own column",
  );
  assert.ok(
    !name![1].includes("declared_capacity"),
    "criterion 4 must not fall back to the declared capacity",
  );

  const relationship = code.match(/v_relationship := nullif\(btrim\(coalesce\(v_p\.(\w+)/);
  assert.ok(relationship, "the relationship resolution must be readable on the admission path");
  assert.equal(relationship![1], "business_relationship", "criterion 6 must read its own column");
  const relationshipBlock = code.match(/v_relationship := [\s\S]*?;/g) ?? [];
  for (const block of relationshipBlock) {
    assert.ok(!block.includes("participation_authority"), "criterion 6 must not fall back to the authority");
    assert.ok(!block.includes("declared_capacity"), "criterion 6 must not fall back to the capacity");
  }
});

test("criterion 9 is asked as an explicit named state and fails closed on anything else", () => {
  assert.ok(code.includes("v_prerequisites := public.deal_room_room_prerequisite_state("));
  assert.ok(
    code.includes("if v_prerequisites is null or v_prerequisites not in ('not_applicable', 'completed') then"),
    "any state other than the two that pass - including a new one added later - must block",
  );
  assert.ok(
    /return 'not_applicable';/.test(code),
    "this release's answer must be stated in the function, not assumed by omission",
  );
});

// ---------------------------------------------------------------------------
// Nothing else about admission was weakened
// ---------------------------------------------------------------------------

test("the versioned agreement gate survives intact", () => {
  assert.ok(code.includes("from public.deal_room_agreement_documents d"));
  assert.ok(code.includes("and a.document_version = d.version"));
  assert.ok(code.includes("and a.document_sha256 = d.sha256"));
  assert.ok(code.includes("where d.current"), "a retired document version must not satisfy admission");
});

test("the admission state ladder is preserved", () => {
  assert.ok(code.includes("'invited','prerequisites_pending','terms_pending'"));
  assert.ok(code.includes("set state = 'admitted', admitted_at = now()"));
});

test("the opener has a real route into criterion 3's 'or'", () => {
  // Controller ruling, 31 July 2026: an independent professional with no
  // `profiles.company` could never satisfy "identified business OR declared
  // professional capacity" at the propose door, because nothing else was read.
  assert.ok(code.includes("add column if not exists declared_capacity text;"));
  assert.ok(code.includes("add column if not exists legal_or_trading_name text;"));
  assert.ok(
    code.includes("p.declared_capacity, p.legal_or_trading_name"),
    "the gate must read the opener's own declarations",
  );

  const business = code.match(/v_business := ([\s\S]*?);/);
  assert.ok(business, "the business resolution must be readable");
  assert.ok(
    business![1].includes("v_profile_capacity"),
    "criterion 3 must accept the opener's declared capacity, or the 'or' has one working branch",
  );

  const name = code.match(/v_name := ([\s\S]*?);/);
  assert.ok(name![1].includes("v_profile_legal_name"), "criterion 4 must accept the opener's own trading name");
});

test("the opener's participant rows carry declarations, not borrowed facts", () => {
  const seed = code.match(/select coalesce\(nullif\(btrim\(coalesce\(p\.declared_capacity[\s\S]*?;/);
  assert.ok(seed, "the initiator's own declarations must be read before the inserts");
  assert.ok(seed![0].includes("p.legal_or_trading_name"), "the trading name comes from the member's declaration");
  for (const borrowed of ["submitter_role", "participation_authority", "business_relationship"]) {
    assert.ok(
      !seed![0].includes(borrowed),
      `the capacity and the name must not be taken from ${borrowed}: the controller ruled all three out by name`,
    );
  }
});

test("the two new columns are additive: nullable, no default, no backfill", () => {
  assert.ok(code.includes("add column if not exists represented_legal_name text;"));
  assert.ok(code.includes("add column if not exists business_relationship text;"));
  for (const bad of ["represented_legal_name text not null", "business_relationship text not null"]) {
    assert.ok(!code.includes(bad), "a not-null column would invalidate every existing participant row");
  }
  assert.ok(!/update public\.deal_room_participants[\s\S]{0,200}(represented_legal_name|business_relationship)\s*=\s*'/.test(code),
    "no backfill: a literal written into either column would be a fabricated declaration");
});

test("the file is one transaction and says it has not been applied", () => {
  assert.match(sql, /WRITTEN AND NOT APPLIED/);
  assert.ok(/^begin;/m.test(code), "a partial apply must leave the database as it was");
  assert.ok(/^commit;/m.test(code));
});

console.log(`admission SQL contract: ${passed} passed`);
