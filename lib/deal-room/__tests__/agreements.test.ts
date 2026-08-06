// The agreement documents, and the contract between the shipped text and the
// database authority that the acceptance command reads.
//
// Run: npx tsx lib/deal-room/__tests__/agreements.test.ts
//
// ## Why this file exists
//
// The owner review of 29 July 2026 found that `deal_room_accept_agreement()`
// took the version and checksum from its caller, so a member could call the RPC
// directly and record an acceptance of a document that never existed. The fix
// moved the canonical version and checksum into
// `deal_room_agreement_documents`, a table no member holds a policy on, and
// removed both parameters from the command.
//
// That fix creates a new way to be wrong: the seeded checksum and the shipped
// text can drift. If they do, either every acceptance fails admission, or - far
// worse - the stored hash stops corresponding to any retrievable text, and the
// owner's requirement that "the accepted document version must remain
// retrievable or reproducible from an immutable canonical source" quietly stops
// holding.
//
// So this recomputes the SHA-256 from the text in the repository and asserts it
// against the literal in the migration. Editing a word without publishing a
// version fails here, which is the only place it can be caught cheaply.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { AGREEMENT_DOCUMENTS } from "../agreements";
import { REQUIRED_AGREEMENT_KINDS, type AgreementKind } from "../states";

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

const core = readFileSync("supabase/archive/20260729a_deal_room_core.sql", "utf8");
const rls = readFileSync("supabase/archive/20260729b_deal_room_rls.sql", "utf8");

/** The seeded rows, parsed out of the migration's INSERT. */
function seeded(): Map<AgreementKind, { version: string; sha256: string }> {
  const block = /insert into public\.deal_room_agreement_documents[\s\S]*?on conflict/.exec(core);
  assert.ok(block, "the agreement authority is not seeded by the core migration");

  const rows = new Map<AgreementKind, { version: string; sha256: string }>();
  for (const match of Array.from(
    block![0].matchAll(/\('(\w+)',\s*'([^']+)',\s*'[^']*',\s*\n?\s*'([0-9a-f]{64})'\)/g),
  )) {
    rows.set(match[1] as AgreementKind, { version: match[2], sha256: match[3] });
  }
  return rows;
}

const rows = seeded();

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

test("all four required agreements are seeded", () => {
  assert.deepEqual(Array.from(rows.keys()).sort(), [...REQUIRED_AGREEMENT_KINDS].sort());
});

for (const kind of REQUIRED_AGREEMENT_KINDS) {
  test(`${kind}: the seeded checksum is the SHA-256 of the shipped text`, () => {
    const document = AGREEMENT_DOCUMENTS[kind];
    const recomputed = createHash("sha256").update(document.body, "utf8").digest("hex");

    assert.equal(
      recomputed,
      document.sha256,
      "the module's own checksum is not the hash of its own text",
    );
    assert.equal(
      rows.get(kind)!.sha256,
      recomputed,
      `the migration seeds a checksum that is not the hash of the text in agreements.ts. ` +
        `Either the text was edited without publishing a new version, or the seed was not regenerated.`,
    );
  });

  test(`${kind}: the seeded version matches the module`, () => {
    assert.equal(rows.get(kind)!.version, AGREEMENT_DOCUMENTS[kind].version);
  });

  test(`${kind}: the text is retrievable and not empty`, () => {
    // The owner's condition: the accepted version must remain reproducible from
    // an immutable canonical source, so the stored hash can be verified later.
    assert.ok(AGREEMENT_DOCUMENTS[kind].body.length > 200, "an agreement this short is not the agreement");
  });
}

// ---------------------------------------------------------------------------
// The command must not accept a version or a checksum
// ---------------------------------------------------------------------------

test("deal_room_accept_agreement takes no version and no checksum parameter", () => {
  const fn = /create or replace function public\.deal_room_accept_agreement\(([\s\S]*?)\)\s*returns/.exec(rls);
  assert.ok(fn, "the acceptance command is missing");
  const params = fn![1];
  assert.ok(!/p_version/.test(params), "the command still takes a caller-supplied version");
  assert.ok(!/p_sha256/.test(params), "the command still takes a caller-supplied checksum");
  assert.match(params, /p_participant_id/);
  assert.match(params, /p_kind/);
});

test("the command reads the canonical document from the authority table", () => {
  const fn = /create or replace function public\.deal_room_accept_agreement[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  assert.match(fn![0], /from public\.deal_room_agreement_documents/);
  assert.match(fn![0], /where kind = p_kind and current/);
  // The insert must use the document's values, not anything from the caller.
  assert.match(fn![0], /v_doc\.version/);
  assert.match(fn![0], /v_doc\.sha256/);
});

test("the forgeable four-argument signature is dropped", () => {
  assert.match(rls, /drop function if exists public\.deal_room_accept_agreement\(uuid, text, text, text\)/);
});

test("admission requires the CURRENT version and checksum, not merely a row", () => {
  const fn = /create or replace function public\.deal_room_admit_participant[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  assert.match(fn![0], /from public\.deal_room_agreement_documents d/);
  assert.match(fn![0], /a\.document_version = d\.version/);
  assert.match(fn![0], /a\.document_sha256 = d\.sha256/);
});

test("members hold no privilege on the agreement authority", () => {
  assert.match(rls, /revoke all on table public\.deal_room_agreement_documents from anon, authenticated/);
  const policies = Array.from(
    rls.matchAll(/create policy\s+"[^"]+"\s+on\s+public\.deal_room_agreement_documents/g),
  );
  assert.deepEqual(policies, [], "a policy on the agreement authority would make it member-reachable");
});

console.log(`ok   deal-room agreements: ${passed} assertions passed`);
