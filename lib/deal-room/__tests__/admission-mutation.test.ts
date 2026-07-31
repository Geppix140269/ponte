// Falsifiability. Ten named ways to break the admission gate, and the proof
// that the suite goes red for every one of them.
//
// Run: npx tsx lib/deal-room/__tests__/admission-mutation.test.ts
//
// ## Why this file exists
//
// A green test run proves the tests pass. It does not prove they would have
// failed had the code been wrong, and a test that cannot fail is worse than no
// test because it reads like assurance. The controller named six specific
// breakages on 31 July 2026 and required each to be demonstrated:
//
//   1. unknown defaults to satisfied
//   2. the opener bypasses one criterion
//   3. an invited participant bypasses one criterion
//   4. company_verified becomes mandatory
//   5. the SQL command omits the central gate
//   6. an overload is introduced
//
// The second controller pass, on 31 July 2026, found three more product
// defects, and their corrections are covered the same way:
//
//   7. unrelated evidence is relabelled identity_confirmed
//   8. every remedy collapses onto one route
//   9. the opener's route into criterion 3's "or" is closed again
//
// The third pass found one more, and it is covered the same way:
//
//   10. the opener's authority is manufactured from ownership again
//
// Each mutation below is applied to the real file, the relevant suite is run in
// a child process, and the run is required to FAIL. The file is then restored.
//
// ## How it cannot leave the tree dirty
//
// Every original is read into memory before anything is written, and restored in
// a `finally` that runs whether the assertion passed, failed or threw. A second
// restore runs on process exit, including on an uncaught exception and on
// SIGINT. The last test in this file re-reads both files from disk and asserts
// they are byte-identical to what was read at the start, so a restore that
// silently failed is itself a failure rather than a surprise for the next
// person to run `git status`.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

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

const PREDICATE = "lib/deal-room/admissibility.ts";
const MIGRATION = "supabase/migrations/20260731g_deal_room_admission_verification_gate.sql";

const PREDICATE_SUITE = "lib/deal-room/__tests__/admissibility.test.ts";
const SQL_SUITE = "lib/deal-room/__tests__/admission-sql-contract.test.ts";
const SIGNATURE_SUITE = "lib/deal-room/__tests__/grant-signatures.test.ts";

/** Read once, before anything is touched. These are the restore points. */
const ORIGINAL: Record<string, string> = {
  [PREDICATE]: readFileSync(PREDICATE, "utf8"),
  [MIGRATION]: readFileSync(MIGRATION, "utf8"),
};

function restoreAll(): void {
  for (const [path, content] of Object.entries(ORIGINAL)) {
    try {
      if (readFileSync(path, "utf8") !== content) writeFileSync(path, content);
    } catch {
      // A read that fails means the file is gone, which the final check catches.
    }
  }
}

process.on("exit", restoreAll);
process.on("SIGINT", () => {
  restoreAll();
  process.exit(130);
});
process.on("uncaughtException", (err) => {
  restoreAll();
  throw err;
});

/** Does this suite pass right now? */
function suitePasses(suite: string): boolean {
  try {
    execFileSync("npx", ["tsx", suite], { stdio: "pipe", shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply one mutation, require the named suites to fail, and put the file back.
 *
 * `assert.ok(file.includes(from))` first: a mutation whose anchor text has
 * drifted would otherwise write nothing, run the unmutated suite, watch it pass
 * and report "the tests did not catch it" - a false alarm that looks exactly
 * like a real finding. The anchor check turns that into an honest error.
 */
function mutation(name: string, path: string, from: string, to: string, suites: string[]): void {
  test(name, () => {
    const original = ORIGINAL[path];
    assert.ok(
      original.includes(from),
      `the mutation anchor is no longer in ${path}; this check is testing nothing until it is updated`,
    );
    try {
      writeFileSync(path, original.replace(from, to));
      for (const suite of suites) {
        assert.equal(suitePasses(suite), false, `${suite} must FAIL when: ${name}`);
      }
    } finally {
      writeFileSync(path, original);
    }
  });
}

// ---------------------------------------------------------------------------
// The baseline: everything passes before anything is broken
// ---------------------------------------------------------------------------
//
// Without this, six suites failing under mutation would prove nothing - they
// might have been failing already.

test("all three suites pass before any mutation", () => {
  for (const suite of [PREDICATE_SUITE, SQL_SUITE, SIGNATURE_SUITE]) {
    assert.equal(suitePasses(suite), true, `${suite} must pass on the unmutated tree`);
  }
});

// ---------------------------------------------------------------------------
// 1. Unknown defaults to satisfied
// ---------------------------------------------------------------------------

mutation(
  "1. an unevaluable prerequisite silently passing is caught",
  PREDICATE,
  `  if (prereq === null) {
    prerequisiteState = "pending";`,
  `  if (prereq === null) {
    prerequisiteState = "confirmed";`,
  [PREDICATE_SUITE],
);

// ---------------------------------------------------------------------------
// 2 and 3. One door lets one criterion through
// ---------------------------------------------------------------------------
//
// Not "the gate is removed" - that is mutation 5. This is the subtler bypass:
// the door still calls the gate, still refuses on what comes back, and quietly
// deletes one criterion from the answer first. It is the shape a real
// regression takes, because it survives a reader checking that the call is
// still there.

mutation(
  "2. the opener bypassing one criterion is caught",
  MIGRATION,
  "v_missing := public.deal_room_admission_minimum_missing(auth.uid(), null, p_listing_id);",
  "v_missing := array_remove(public.deal_room_admission_minimum_missing(auth.uid(), null, p_listing_id), 'jurisdiction');",
  [SQL_SUITE],
);

mutation(
  "3. an invited participant bypassing one criterion is caught",
  MIGRATION,
  "v_minimum := public.deal_room_admission_minimum_missing(auth.uid(), p_participant_id, null);",
  "v_minimum := array_remove(public.deal_room_admission_minimum_missing(auth.uid(), p_participant_id, null), 'jurisdiction');",
  [SQL_SUITE],
);

// ---------------------------------------------------------------------------
// 4. company_verified becomes mandatory
// ---------------------------------------------------------------------------
//
// The wall the controller struck, reintroduced. This is the mutation that
// matters most to a member: it does not break the product, it just quietly
// refuses everybody who has not run a registry check, which is precisely the
// gate the owner did not approve.

mutation(
  "4. reintroducing the company_verified wall is caught",
  PREDICATE,
  "const attributable = uid !== null && pid !== null && uid === pid;",
  "const attributable =\n    uid !== null && pid !== null && uid === pid &&\n    (facts as { level?: unknown }).level === \"company_verified\";",
  [PREDICATE_SUITE],
);

// ---------------------------------------------------------------------------
// 5. The SQL command omits the central gate
// ---------------------------------------------------------------------------

mutation(
  "5. an admission command with no gate at all is caught",
  MIGRATION,
  "v_minimum := public.deal_room_admission_minimum_missing(auth.uid(), p_participant_id, null);",
  "v_minimum := array[]::text[];",
  [SQL_SUITE],
);

// ---------------------------------------------------------------------------
// 6. An overload is introduced
// ---------------------------------------------------------------------------
//
// The defect that made the ACL tests necessary in the first place: a second
// function under the same name, keyed on a different argument list, callable by
// everyone the first one was granted to and gated by nothing.

mutation(
  "6. a second signature for a granted command is caught",
  MIGRATION,
  "commit;",
  `create or replace function public.deal_room_admit_participant(p_participant_id uuid, p_force boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.deal_room_participants set state = 'admitted', admitted_at = now()
   where id = p_participant_id;
end;
$$;

grant execute on function public.deal_room_admit_participant(uuid, boolean) to authenticated;

commit;`,
  [SQL_SUITE, SIGNATURE_SUITE],
);

// ---------------------------------------------------------------------------
// 7, 8 and 9. The corrections of the second controller pass
// ---------------------------------------------------------------------------
//
// Not on the controller's original list of six, because the defects they cover
// were found later. They are here for the same reason the six are: a correction
// nobody can break on purpose is a correction nobody has tested.

mutation(
  "7. relabelling unrelated evidence as identity_confirmed is caught",
  PREDICATE,
  `      attributable ? "authenticated_member" : "not_confirmed",`,
  `      attributable ? "identity_confirmed" : "not_confirmed",`,
  [PREDICATE_SUITE],
);

mutation(
  "8. collapsing every remedy onto one route is caught",
  PREDICATE,
  "remedy: state === \"pending\" ? { statement, href: routes[criterion] } : null,",
  "remedy: state === \"pending\" ? { statement, href: routes.identified_business_or_capacity } : null,",
  [PREDICATE_SUITE],
);

mutation(
  "9. closing the opener's route into criterion 3 again is caught",
  MIGRATION,
  `                         nullif(btrim(coalesce(v_profile_capacity, '')), ''));`,
  `                         null);`,
  [SQL_SUITE],
);

// ---------------------------------------------------------------------------
// 10. The correction of the third controller pass
// ---------------------------------------------------------------------------

mutation(
  "10. manufacturing the opener's authority from ownership again is caught",
  MIGRATION,
  "    v_authority := nullif(btrim(coalesce(v_open_authority, '')), '');",
  "    v_authority := 'Owner of the published Deal';",
  [SQL_SUITE],
);

// ---------------------------------------------------------------------------
// The tree is exactly as it was found
// ---------------------------------------------------------------------------

test("every mutated file was restored byte for byte", () => {
  for (const [path, content] of Object.entries(ORIGINAL)) {
    assert.equal(readFileSync(path, "utf8"), content, `${path} was not restored`);
  }
});

test("and the suites pass again afterwards", () => {
  for (const suite of [PREDICATE_SUITE, SQL_SUITE, SIGNATURE_SUITE]) {
    assert.equal(suitePasses(suite), true, `${suite} must pass again once the mutations are reverted`);
  }
});

console.log(`admission mutation: ${passed} passed`);
