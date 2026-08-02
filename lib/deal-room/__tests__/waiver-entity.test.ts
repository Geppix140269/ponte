// Waiver entity resolution: who counts as one organisation.
//
// Authority: ADR-0029 and docs/ponte/PONTE-WAIVER-ENTITY-RESOLUTION-SPEC.md.
//
// Run: npx tsx lib/deal-room/__tests__/waiver-entity.test.ts
//
// The waiver is worth $79 per entity, once and forever, so every assertion here
// is about money that cannot be taken back. Two properties carry most of the
// weight:
//
//   THE LEAK. An entity that claims by registry number and later obtains an LEI
//   must resolve to the SAME entity. Priority order alone does not close that,
//   which is why identity is a resolved entity carrying many identifiers.
//
//   THE DIRECTION OF ERROR. A false merge silently denies a waiver to a company
//   entitled to one. A missed merge grants one extra. The first is worse, and
//   the normalisation rules are deliberately conservative because of it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WAIVER_ELIGIBLE_PURPOSE,
  WAIVER_ELIGIBLE_STATUSES,
  identifiersFrom,
  isValidLei,
  isWaiverEligibleVerification,
  normaliseAuthority,
  normaliseLei,
  normaliseRegistryValue,
  registryAuthorityIsCapturable,
  resolveEntity,
  waiverAvailable,
  type EntityIdentifier,
  type VerificationFacts,
} from "../waiver-entity";

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

/* ------------------------------------------------------------------ *
 * Fixtures
 *
 * Real, published LEIs. Chosen over invented strings because the checksum is
 * the point: a fixture that happens to pass a broken implementation proves
 * nothing, and these are known-good from outside this repository.
 * ------------------------------------------------------------------ */

const ALLIANZ = "529900T8BM49AURSDO55";
const BLOOMBERG = "5493001KJTIIGC8Y1R12";
const THIRD = "213800QILIUD4ROSUO03";

function verification(over: Partial<VerificationFacts> = {}): VerificationFacts {
  return {
    purpose: "member_business",
    status: "verified",
    subjectLei: null,
    subjectRegNumber: null,
    registryAuthority: null,
    ...over,
  };
}

/* ------------------------------------------------------------------ *
 * 1. The LEI checksum
 * ------------------------------------------------------------------ */

test("real published LEIs validate", () => {
  // If these ever fail, the ISO 7064 MOD 97-10 implementation is wrong, and
  // every entity resolved by LEI is suspect.
  for (const lei of [ALLIANZ, BLOOMBERG, THIRD]) {
    assert.ok(isValidLei(lei), `${lei} should be a valid LEI`);
  }
});

test("a single-character typo is rejected", () => {
  /*
    The whole reason the checksum is here. A mistyped LEI that reaches the
    identifier table creates a PHANTOM ENTITY, and a phantom entity carries its
    own unspent waiver - so one typo is worth $79, repeatedly.
  */
  const typo = `${ALLIANZ.slice(0, 5)}X${ALLIANZ.slice(6)}`;
  assert.notEqual(typo, ALLIANZ, "the fixture did not actually change a character");
  assert.equal(isValidLei(typo), false);
});

test("transposed characters are rejected", () => {
  // MOD 97-10 catches transposition, which a length check alone would not.
  const swapped = ALLIANZ.slice(0, 6) + ALLIANZ[7] + ALLIANZ[6] + ALLIANZ.slice(8);
  if (swapped !== ALLIANZ) assert.equal(isValidLei(swapped), false);
});

test("the wrong length is rejected, whatever the checksum does", () => {
  assert.equal(isValidLei(ALLIANZ.slice(0, 19)), false);
  assert.equal(isValidLei(`${ALLIANZ}0`), false);
  assert.equal(isValidLei(""), false);
});

test("lowercase and spacing are normalised, not rejected", () => {
  assert.equal(isValidLei(ALLIANZ.toLowerCase()), true);
  assert.equal(isValidLei(` ${ALLIANZ.slice(0, 4)} ${ALLIANZ.slice(4)} `), true);
  assert.equal(normaliseLei(` ${ALLIANZ.toLowerCase()} `), ALLIANZ);
});

test("a 20-character LEI does not overflow the arithmetic", () => {
  // A 20-character LEI read as an integer is up to 38 digits, which Number
  // cannot hold. The reduction is done chunk by chunk for exactly this reason,
  // and these fixtures are letter-heavy, which is the expanding case.
  assert.ok(isValidLei(THIRD));
  assert.equal(isValidLei("ZZZZZZZZZZZZZZZZZZZZ"), false);
});

test("non-alphanumeric characters are rejected rather than stripped", () => {
  // Stripping punctuation from an LEI would be invention: it has one canonical
  // form and no formatting conventions.
  assert.equal(isValidLei(`${ALLIANZ.slice(0, 10)}-${ALLIANZ.slice(10)}`), false);
});

/* ------------------------------------------------------------------ *
 * 2. Normalisation, and the direction of error
 * ------------------------------------------------------------------ */

test("registry values normalise formatting away", () => {
  assert.equal(normaliseRegistryValue(" hrb 12.345 "), "HRB12345");
  assert.equal(normaliseRegistryValue("SC-123/456"), "SC123456");
});

test("LEADING ZEROS SURVIVE, because a false merge is the worse error", () => {
  /*
    The single most consequential line in this file.

    Stripping leading zeros would merge 0123 and 123. If they are two companies,
    the second is silently DENIED a waiver it is entitled to, and the denial
    looks like correct behaviour from the inside. Granting one extra waiver
    costs $79; wrongly refusing one costs a customer.
  */
  assert.notEqual(normaliseRegistryValue("0123"), normaliseRegistryValue("123"));
  assert.equal(normaliseRegistryValue("0123"), "0123");
});

test("authority normalisation makes NULL and empty the same thing", () => {
  // Otherwise a scheme could hold both, and the global uniqueness on
  // (scheme, authority, value) would admit a duplicate.
  assert.equal(normaliseAuthority(""), null);
  assert.equal(normaliseAuthority("   "), null);
  assert.equal(normaliseAuthority(null), null);
  assert.equal(normaliseAuthority(" us-de "), "US-DE");
  assert.equal(normaliseAuthority("Companies House"), "COMPANIES_HOUSE");
});

/* ------------------------------------------------------------------ *
 * 3. Which verifications count
 * ------------------------------------------------------------------ */

test("only member_business, and only when externally confirmed", () => {
  assert.equal(isWaiverEligibleVerification(verification()), true);
  assert.equal(isWaiverEligibleVerification(verification({ status: "auto_verified" })), true);
  for (const status of ["pending", "review", "rejected", "failed", "needs_selection"]) {
    assert.equal(isWaiverEligibleVerification(verification({ status })), false, status);
  }
});

test("a counterparty check can neither confer nor consume a waiver", () => {
  /*
    It is a check a member buys on SOMEBODY ELSE'S company. Letting it introduce
    an identifier would let a member consume a stranger's waiver by researching
    them - and the stranger would discover it by being charged $79 for a room
    they were told would be free.
  */
  const check = verification({ purpose: "counterparty_check", subjectLei: ALLIANZ });
  assert.equal(isWaiverEligibleVerification(check), false);
  assert.deepEqual(identifiersFrom(check), [], "a counterparty check yielded an identifier");
});

test("a null purpose yields nothing", () => {
  // The column is nullable, so rows predating the purpose split exist.
  assert.deepEqual(identifiersFrom(verification({ purpose: null, subjectLei: ALLIANZ })), []);
});

/* ------------------------------------------------------------------ *
 * 4. Extracting identifiers
 * ------------------------------------------------------------------ */

test("a valid LEI yields a global identifier with no authority", () => {
  const [id, ...rest] = identifiersFrom(verification({ subjectLei: ALLIANZ }));
  assert.deepEqual(rest, []);
  assert.deepEqual(id, { scheme: "lei", authority: null, valueNormalised: ALLIANZ });
});

test("an INVALID LEI yields nothing at all, rather than a phantom", () => {
  const invalid = `${ALLIANZ.slice(0, 19)}X`;
  assert.equal(isValidLei(invalid), false);
  assert.deepEqual(identifiersFrom(verification({ subjectLei: invalid })), []);
});

test("a registration number WITHOUT an authority is not an identity", () => {
  /*
    Correction 3. Registries are frequently subnational or plural: Delaware and
    California issue independently, Germany issues HRB numbers through many
    local Amtsgerichte, each UAE free zone keeps its own register. An
    unqualified number collides across them, and a collision here is a wrongly
    denied waiver.
  */
  assert.deepEqual(identifiersFrom(verification({ subjectRegNumber: "12345678" })), []);
});

test("a registration number WITH an authority is an identity", () => {
  const [id] = identifiersFrom(
    verification({ subjectRegNumber: "hrb 12.345", registryAuthority: "de-charlottenburg" }),
  );
  assert.deepEqual(id, {
    scheme: "registry",
    authority: "DE-CHARLOTTENBURG",
    valueNormalised: "HRB12345",
  });
});

test("the same number under two authorities is two identities", () => {
  const [delaware] = identifiersFrom(
    verification({ subjectRegNumber: "12345678", registryAuthority: "us-de" }),
  );
  const [california] = identifiersFrom(
    verification({ subjectRegNumber: "12345678", registryAuthority: "us-ca" }),
  );
  assert.notDeepEqual(delaware, california, "two registries collapsed into one identity");
});

test("VAT never resolves identity, and there is no field for it here", () => {
  // A VAT number is a tax registration, not a legal identity: reassigned in
  // some regimes, shared across group members in others, absent in more.
  const source = readFileSync("lib/deal-room/waiver-entity.ts", "utf8");
  assert.ok(!/subjectVat|subject_vat/.test(source), "VAT reached the identity module");
});

test("both an LEI and a registry identity can come from one verification", () => {
  const ids = identifiersFrom(
    verification({ subjectLei: ALLIANZ, subjectRegNumber: "999", registryAuthority: "gb" }),
  );
  assert.equal(ids.length, 2);
  assert.deepEqual(ids.map((i) => i.scheme).sort(), ["lei", "registry"]);
});

test("registry authority is NOT capturable today, and that is recorded", () => {
  /*
    verifications.registry is jsonb holding the PROVIDER's response -
    {source, available, status, companyName, regNumber, checkedAt} - and its
    `source` is the data provider (`opencorporates`, `companies_house`), not the
    register that issued the number. OpenCorporates is a global aggregator, so
    using it as the authority would collapse every jurisdiction into one
    namespace: exactly the collision correction 3 forbids.
    So the waiver is LEI-ONLY in practice until verification captures the
    issuing jurisdiction. Pinned so that fact cannot quietly stop being true.
  */
  assert.equal(registryAuthorityIsCapturable, false);
});

/* ------------------------------------------------------------------ *
 * 5. Resolution
 * ------------------------------------------------------------------ */

/** A lookup backed by a plain map, keyed the way the unique index is. */
function lookupFrom(table: Record<string, string>) {
  return (id: EntityIdentifier) => table[`${id.scheme}|${id.authority ?? ""}|${id.valueNormalised}`] ?? null;
}

test("no identifiers means no waiver, and the activation is simply $79", () => {
  const resolution = resolveEntity([], lookupFrom({}));
  assert.deepEqual(resolution, { outcome: "no_identifier" });
  assert.equal(waiverAvailable(resolution, () => false), false);
});

test("nothing matched creates one entity carrying every identifier", () => {
  const ids = identifiersFrom(
    verification({ subjectLei: ALLIANZ, subjectRegNumber: "999", registryAuthority: "gb" }),
  );
  const resolution = resolveEntity(ids, lookupFrom({}));
  assert.equal(resolution.outcome, "new_entity");
  assert.equal(resolution.outcome === "new_entity" && resolution.attach.length, 2);
  assert.equal(waiverAvailable(resolution, () => true), true, "nothing exists, so nothing can have claimed");
});

test("THE LEAK: registry first, LEI later, resolves to the SAME entity", () => {
  /*
    The correction this whole module exists for.

    An entity verifies with a registry number and claims its waiver. It later
    obtains an LEI and re-verifies. Under a naive "LEI first, else registry"
    priority rule it would resolve to a different key and claim a SECOND waiver.

    Here the registry identifier still points at entity E, so the LEI attaches
    to E and the claim is already spent.
  */
  const table = { "registry|GB|999": "entity-E" };
  const ids = identifiersFrom(
    verification({ subjectLei: ALLIANZ, subjectRegNumber: "999", registryAuthority: "gb" }),
  );

  const resolution = resolveEntity(ids, lookupFrom(table));
  assert.equal(resolution.outcome, "existing_entity");
  assert.equal(resolution.outcome === "existing_entity" && resolution.entityId, "entity-E");

  // The LEI is attached; the registry identifier is already held, so it is not
  // re-attached - which would violate the global uniqueness.
  assert.deepEqual(
    resolution.outcome === "existing_entity" && resolution.attach.map((i) => i.scheme),
    ["lei"],
  );

  const spent = (entityId: string) => entityId === "entity-E";
  assert.equal(waiverAvailable(resolution, spent), false, "the entity claimed a SECOND waiver");
});

test("the same leak in reverse: LEI first, registry later", () => {
  const table = { [`lei||${ALLIANZ}`]: "entity-E" };
  const ids = identifiersFrom(
    verification({ subjectLei: ALLIANZ, subjectRegNumber: "777", registryAuthority: "us-de" }),
  );
  const resolution = resolveEntity(ids, lookupFrom(table));
  assert.equal(resolution.outcome === "existing_entity" && resolution.entityId, "entity-E");
  assert.deepEqual(
    resolution.outcome === "existing_entity" && resolution.attach.map((i) => i.scheme),
    ["registry"],
  );
});

test("an entity with an unspent claim is still eligible", () => {
  const table = { [`lei||${ALLIANZ}`]: "entity-E" };
  const resolution = resolveEntity(identifiersFrom(verification({ subjectLei: ALLIANZ })), lookupFrom(table));
  assert.equal(waiverAvailable(resolution, () => false), true);
});

test("two entities means a merge event, refused and raised, never guessed", () => {
  /*
    Do not merge automatically: that would silently destroy one of two waiver
    claims. Do not create a third entity: that would mint a new waiver. Refuse
    this activation, record it, and let a person look - it is either a data
    error or a real corporate event, and both need one.
  */
  const table = { [`lei||${ALLIANZ}`]: "entity-A", "registry|US-DE|555": "entity-B" };
  const ids = identifiersFrom(
    verification({ subjectLei: ALLIANZ, subjectRegNumber: "555", registryAuthority: "us-de" }),
  );
  const resolution = resolveEntity(ids, lookupFrom(table));

  assert.equal(resolution.outcome, "merge_required");
  assert.deepEqual(resolution.outcome === "merge_required" && resolution.entityIds, ["entity-A", "entity-B"]);
  // Both identifiers are reported, so the human sees what actually collided.
  assert.equal(resolution.outcome === "merge_required" && resolution.identifiers.length, 2);
  assert.equal(
    waiverAvailable(resolution, () => false),
    false,
    "a waiver was granted during an unresolved merge; it can never be taken back",
  );
});

test("the merge report is stable, whatever order the identifiers arrive in", () => {
  // So the same collision does not read as two different incidents.
  const table = { [`lei||${ALLIANZ}`]: "entity-B", "registry|GB|1": "entity-A" };
  const lei: EntityIdentifier = { scheme: "lei", authority: null, valueNormalised: ALLIANZ };
  const reg: EntityIdentifier = { scheme: "registry", authority: "GB", valueNormalised: "1" };
  const forward = resolveEntity([lei, reg], lookupFrom(table));
  const backward = resolveEntity([reg, lei], lookupFrom(table));
  assert.deepEqual(
    forward.outcome === "merge_required" && forward.entityIds,
    backward.outcome === "merge_required" && backward.entityIds,
  );
});

test("resolution is pure: the same inputs give the same answer", () => {
  const table = { [`lei||${BLOOMBERG}`]: "entity-C" };
  const ids = identifiersFrom(verification({ subjectLei: BLOOMBERG }));
  assert.deepEqual(resolveEntity(ids, lookupFrom(table)), resolveEntity(ids, lookupFrom(table)));
});

test("the eligible vocabularies are the database's, not a guess", () => {
  // Read from production's own CHECK constraints on verifications.
  assert.deepEqual([...WAIVER_ELIGIBLE_STATUSES], ["verified", "auto_verified"]);
  assert.equal(WAIVER_ELIGIBLE_PURPOSE, "member_business");
});

console.log(`ok   waiver entity resolution: ${passed} assertions passed`);
