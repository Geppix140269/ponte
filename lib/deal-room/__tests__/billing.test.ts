// Deal Room billing: the pure derivations, and the contract between the
// migration and the engine.
//
// The SQL in 20260731e is WRITTEN AND NOT APPLIED, so nothing here proves
// anything about production. What it proves is that the file says what the
// authority requires, and that the numbers in it are the same numbers the
// pricing engine uses.
//
// Run: npx tsx lib/deal-room/__tests__/billing.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BILLING_EVENT_KINDS,
  BILLING_PROVIDERS,
  ROOM_PERIOD_DAYS,
  ROOM_PERIOD_STATES,
  SCHEMA_PRICE_BOUNDS,
  amountDueCents,
  draftRoomPeriod,
  launchPartnerWaiver,
  periodCovers,
  periodEndFrom,
} from "../billing";
import { roomPeriodPriceCents } from "../pricing";

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

const MIGRATION_PATH = "supabase/pending/20260731e_deal_room_paid_room_periods.sql";
const SQL = readFileSync(join(process.cwd(), MIGRATION_PATH), "utf8");
const BILLING_SRC = readFileSync(join(process.cwd(), "lib/deal-room/billing.ts"), "utf8");

/** The block of SQL that creates one table, so an assertion cannot match the wrong one. */
function tableBlock(name: string): string {
  const start = SQL.indexOf(`create table if not exists public.${name} (`);
  assert.notEqual(start, -1, `${name} must be created`);
  const end = SQL.indexOf("\n);", start);
  assert.notEqual(end, -1, `${name} block must terminate`);
  return SQL.slice(start, end);
}

/* ------------------------------------------------------------------ *
 * 1. The pure derivations
 * ------------------------------------------------------------------ */

test("a period is thirty days from the start it was given", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  assert.equal(periodEndFrom(start).toISOString(), "2026-08-31T00:00:00.000Z");
  assert.equal(ROOM_PERIOD_DAYS, 30);
});

test("the period window is half-open, so two periods cannot both cover an instant", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  const end = periodEndFrom(start);
  assert.equal(periodCovers({ start, end }, start), true);
  assert.equal(periodCovers({ start, end }, new Date("2026-08-15T12:00:00.000Z")), true);
  assert.equal(periodCovers({ start, end }, end), false, "the end instant belongs to the next period");
  assert.equal(periodCovers({ start, end }, new Date("2026-07-31T23:59:59.999Z")), false);
});

test("amount due subtracts an authorised waiver and nothing else", () => {
  assert.equal(amountDueCents(7900, 0), 7900);
  assert.equal(amountDueCents(7900, 7900), 0);
  assert.equal(amountDueCents(19900, 5000), 14900);
});

test("a discount cannot exceed the price, go negative, or be fractional", () => {
  assert.throws(() => amountDueCents(7900, 8000), RangeError);
  assert.throws(() => amountDueCents(7900, -1), RangeError);
  assert.throws(() => amountDueCents(7900, 10.5), TypeError);
});

test("a launch-partner waiver keeps the value anchor, not a free room", () => {
  // Authority section 17: the record must still read $79, -$79, $0.
  const waiver = launchPartnerWaiver(7900);
  assert.deepEqual(waiver, { listPriceCents: 7900, discountCents: 7900, amountDueCents: 0 });
  assert.notEqual(waiver.listPriceCents, 0, "the list price must survive the waiver");
});

test("a drafted period prices itself from its capacity", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  const draft = draftRoomPeriod({ purchasedBranchCapacity: 8, periodStart: start });
  assert.equal(draft.purchasedBranchCapacity, 8);
  assert.equal(draft.periodPriceCents, 12400);
  assert.equal(draft.amountDueCents, 12400);
  assert.equal(draft.currency, "usd");
  assert.equal(draft.periodEnd.toISOString(), "2026-08-31T00:00:00.000Z");
});

test("a drafted period is never active on creation", () => {
  // Authority section 9: write-enablement follows a verified server-side
  // confirmation. Nothing is active because somebody asked for it.
  const draft = draftRoomPeriod({
    purchasedBranchCapacity: 5,
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
  });
  assert.equal(draft.state, "pending");
});

test("capacity below the included five is raised, never priced below base", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  for (const asked of [0, 1, 4, 5]) {
    const draft = draftRoomPeriod({ purchasedBranchCapacity: asked, periodStart: start });
    assert.equal(draft.purchasedBranchCapacity, 5, `asked for ${asked}`);
    assert.equal(draft.periodPriceCents, 7900);
  }
});

test("a waived draft still records the list price", () => {
  const draft = draftRoomPeriod({
    purchasedBranchCapacity: 5,
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    discountCents: 7900,
  });
  assert.equal(draft.periodPriceCents, 7900);
  assert.equal(draft.discountCents, 7900);
  assert.equal(draft.amountDueCents, 0);
});

/* ------------------------------------------------------------------ *
 * 2. The migration says it is not applied
 * ------------------------------------------------------------------ */

test("the migration states that it is written and not applied", () => {
  assert.match(SQL, /WRITTEN AND NOT APPLIED/);
  assert.match(SQL, /separate owner approval/i);
});

test("the migration is transactional and bounded", () => {
  assert.match(SQL, /^set lock_timeout = '5s';$/m);
  assert.match(SQL, /^begin;$/m);
  assert.match(SQL, /^commit;$/m);
  assert.match(SQL, /ROLLBACK/);
});

/* ------------------------------------------------------------------ *
 * 3. The entitlement gains `paid` without losing anything
 * ------------------------------------------------------------------ */

test("`paid` becomes a valid entitlement kind and the three old values survive", () => {
  const check = SQL.match(/add constraint deal_room_entitlements_kind_check\s*\n?\s*check \(kind in \(([^)]+)\)\)/);
  assert.ok(check, "the kind CHECK must be re-added");
  const kinds = check[1]
    .split(",")
    .map((s) => s.trim().replace(/'/g, ""))
    .sort();
  assert.deepEqual(kinds, ["paid", "sponsored", "starter", "waived"]);
});

/* ------------------------------------------------------------------ *
 * 4. The database enforces the authority's own price formula
 * ------------------------------------------------------------------ */

test("the SQL price CHECK is the authority formula, with the engine's numbers", () => {
  const block = tableBlock("deal_room_room_periods");
  const formula = block.match(
    /check \(period_price_cents = least\(\s*(\d+),\s*(\d+) \+ greatest\(0, purchased_branch_capacity - (\d+)\) \* (\d+)\s*\)\)/,
  );
  assert.ok(formula, "the price CHECK must state the formula");
  const [, cap, base, included, additional] = formula.map(Number);
  assert.equal(cap, SCHEMA_PRICE_BOUNDS.capCents, "cap");
  assert.equal(base, SCHEMA_PRICE_BOUNDS.baseCents, "base");
  assert.equal(included, SCHEMA_PRICE_BOUNDS.includedBranches, "included branches");
  assert.equal(additional, 1500, "additional branch price");
});

test("the SQL formula and the TypeScript engine agree at every capacity", () => {
  // Evaluated the way Postgres would, then compared against the engine. If
  // either side is ever edited alone, this names the capacity where they part.
  const sqlPrice = (capacity: number) =>
    Math.min(19900, 7900 + Math.max(0, capacity - 5) * 1500);
  for (let capacity = 5; capacity <= 40; capacity++) {
    assert.equal(sqlPrice(capacity), roomPeriodPriceCents(capacity), `capacity ${capacity}`);
  }
});

test("the cap is asserted independently of the formula", () => {
  const block = tableBlock("deal_room_room_periods");
  assert.match(block, /period_price_cents between 0 and 19900/);
});

test("capacity can never be sold below the five the base price includes", () => {
  const block = tableBlock("deal_room_room_periods");
  assert.match(block, /purchased_branch_capacity >= 5/);
});

test("USD is the only currency either table will accept", () => {
  for (const table of ["deal_room_room_periods", "deal_room_billing_events"]) {
    assert.match(
      tableBlock(table),
      /currency\s+text not null default 'usd' check \(currency = 'usd'\)/,
      table,
    );
  }
});

test("amount due is generated, so it cannot drift from price and discount", () => {
  const block = tableBlock("deal_room_room_periods");
  assert.match(
    block,
    /amount_due_cents integer\s*\n?\s*generated always as \(period_price_cents - discount_cents\) stored/,
  );
});

test("a waiver cannot exceed the price it waives", () => {
  assert.match(tableBlock("deal_room_room_periods"), /discount_cents <= period_price_cents/);
});

test("a period cannot be active without a confirmation", () => {
  // Authority section 9: a browser return is not authoritative.
  assert.match(
    tableBlock("deal_room_room_periods"),
    /check \(state <> 'active' or confirmed_at is not null\)/,
  );
});

test("a room cannot hold two active periods at once", () => {
  assert.match(
    SQL,
    /create unique index if not exists deal_room_room_periods_one_active[\s\S]*?on public\.deal_room_room_periods \(room_id\)[\s\S]*?where state = 'active'/,
  );
});

/* ------------------------------------------------------------------ *
 * 5. Replay safety, designed in
 * ------------------------------------------------------------------ */

test("a replayed provider event cannot bill twice", () => {
  assert.match(
    SQL,
    /create unique index if not exists deal_room_billing_events_provider_event_idx[\s\S]*?\(provider_event_id\)[\s\S]*?where provider_event_id is not null/,
  );
});

test("the billing record is append-only, against the table owner as well", () => {
  assert.match(SQL, /create or replace function public\.deal_room_billing_append_only\(\)/);
  assert.match(
    SQL,
    /create trigger deal_room_billing_events_append_only\s*\n\s*before update or delete on public\.deal_room_billing_events/,
  );
  assert.match(SQL, /errcode = '42501'/);
});

test("the append-only function is revoked from every member-reachable role", () => {
  // The LB-008 lesson: revoking from PUBLIC does not remove Supabase's explicit
  // default grants to anon and authenticated.
  for (const role of ["public", "anon", "authenticated"]) {
    assert.ok(
      SQL.includes(`revoke all on function public.deal_room_billing_append_only() from ${role};`),
      `must revoke from ${role}`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * 6. The disclosure rule is in the policy, not only in the comment
 * ------------------------------------------------------------------ */

test("both billing tables have row level security enabled", () => {
  assert.match(SQL, /alter table public\.deal_room_room_periods\s+enable row level security/);
  assert.match(SQL, /alter table public\.deal_room_billing_events enable row level security/);
});

test("only a room administrator may read a bill", () => {
  // Authority section 11. purchased_branch_capacity is a branch-count
  // disclosure under section 4, so the participant policies used by every other
  // member-facing Deal Room table would be wrong here.
  for (const policy of ["room period read", "billing event read"]) {
    const at = SQL.indexOf(`create policy "${policy}"`);
    assert.notEqual(at, -1, `${policy} must exist`);
    const block = SQL.slice(at, SQL.indexOf(";", at));
    assert.match(block, /for select to authenticated/, policy);
    assert.match(block, /public\.deal_room_can_administer\(room_id\)/, policy);
    assert.ok(
      !block.includes("deal_room_is_master_participant") &&
        !block.includes("deal_room_is_sub_room_participant"),
      `${policy} must not be readable by an ordinary participant`,
    );
  }
});

test("no member has any write policy on either billing table", () => {
  for (const command of ["for insert", "for update", "for delete", "for all"]) {
    assert.ok(!SQL.includes(command), `no policy may be ${command}`);
  }
});

test("anon holds nothing, and authenticated holds SELECT alone", () => {
  for (const table of ["deal_room_room_periods", "deal_room_billing_events"]) {
    assert.ok(
      new RegExp(`revoke all on table public\\.${table}\\s+from anon;`).test(SQL),
      `${table}: anon must be revoked`,
    );
    assert.ok(
      new RegExp(`revoke all on table public\\.${table}\\s+from authenticated;`).test(SQL),
      `${table}: authenticated must be revoked before the grant`,
    );
    assert.ok(
      new RegExp(`grant select on table public\\.${table}\\s+to authenticated;`).test(SQL),
      `${table}: authenticated must hold SELECT`,
    );
    assert.ok(
      !new RegExp(`grant (insert|update|delete|all) on table public\\.${table}`).test(SQL),
      `${table}: authenticated must hold nothing but SELECT`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * 7. The TypeScript vocabulary matches the CHECK constraints
 * ------------------------------------------------------------------ */

test("room period states match the SQL exactly", () => {
  const block = tableBlock("deal_room_room_periods");
  const check = block.match(/state\s+text not null default 'pending'\s*\n?\s*check \(state in \(([^)]+)\)\)/);
  assert.ok(check, "the state CHECK must be findable");
  const sqlStates = check[1].split(",").map((s) => s.trim().replace(/'/g, "")).sort();
  assert.deepEqual(sqlStates, [...ROOM_PERIOD_STATES].sort());
});

test("billing event kinds match the SQL exactly", () => {
  const block = tableBlock("deal_room_billing_events");
  const check = block.match(/check \(kind in \(([\s\S]*?)\)\)/);
  assert.ok(check, "the kind CHECK must be findable");
  const sqlKinds = check[1].split(",").map((s) => s.trim().replace(/'/g, "")).sort();
  assert.deepEqual(sqlKinds, [...BILLING_EVENT_KINDS].sort());
});

test("billing providers match the SQL exactly", () => {
  const block = tableBlock("deal_room_billing_events");
  const check = block.match(/check \(provider in \(([^)]+)\)\)/);
  assert.ok(check, "the provider CHECK must be findable");
  const sqlProviders = check[1].split(",").map((s) => s.trim().replace(/'/g, "")).sort();
  assert.deepEqual(sqlProviders, [...BILLING_PROVIDERS].sort());
});

/* ------------------------------------------------------------------ *
 * 8. Purity and the Stage 3 boundary
 * ------------------------------------------------------------------ */

/**
 * Code with comments removed.
 *
 * The purity scan runs against this rather than the raw source, because the
 * module's own doc comment legitimately names
 * `supabase/migrations/20260731e_...` — the file it is the TypeScript half of.
 * Scanning raw source would force the documentation to stop naming the thing it
 * documents, which is the wrong trade.
 */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("the billing module is pure: no database, network, clock or environment", () => {
  const code = codeOnly(BILLING_SRC);
  for (const forbidden of [
    "createAdminClient",
    "createClient",
    "supabase",
    "fetch(",
    "process.env",
    "Date.now",
    "new Date()",
    "Math.random",
  ]) {
    assert.ok(!code.includes(forbidden), `lib/deal-room/billing.ts must not contain ${forbidden} in code`);
  }
});

test("the purity scan is looking at code, not at comments", () => {
  // The scan above would be worthless if `codeOnly` silently returned "". Prove
  // it keeps the code and drops the comment that mentions the migration path.
  const code = codeOnly(BILLING_SRC);
  assert.ok(code.includes("export function periodEndFrom"), "code must survive");
  // `supabase/pending/`, not `supabase/migrations/`: WO-8 moved the billing
  // migration there, because it is written and deliberately not applied. The
  // property under test is unchanged - a path in a doc comment must not be
  // visible to the purity scan - only the path is.
  assert.ok(BILLING_SRC.includes("supabase/pending"), "the doc comment does name the migration");
  assert.ok(!code.includes("supabase/pending"), "and the scan does not see it");
});

function importersUnder(dir: string): string[] {
  try {
    const out = execSync(`git grep -l "deal-room/billing" -- ${dir}`, {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return out.split("\n").filter(Boolean);
  } catch {
    return []; // git grep exits 1 when it finds nothing, which is the pass.
  }
}

test("nothing is wired to billing yet, which is the Stage 3 boundary", () => {
  // Stage 4 wires checkout and fulfilment, Stage 5 expiry and reactivation.
  // Each is a separate owner approval, so a caller here without one is a scope
  // breach rather than progress.
  const callers = ["app", "components"].flatMap(importersUnder);
  assert.deepEqual(callers, [], `nothing may import deal-room/billing yet, found: ${callers}`);
});

test("no application code reads the unapplied tables", () => {
  // The migration is written and not applied. A reader shipped ahead of it
  // would answer an error to a member, which is how PL-014 happened.
  for (const table of ["deal_room_room_periods", "deal_room_billing_events"]) {
    const callers = ["app", "components", "lib"]
      .flatMap((dir) => {
        try {
          return execSync(`git grep -l "${table}" -- ${dir}`, { encoding: "utf8", cwd: process.cwd() })
            .split("\n")
            .filter(Boolean);
        } catch {
          return [];
        }
      })
      .filter((f) => !f.includes("__tests__"));
    assert.deepEqual(callers, [], `${table} must have no reader yet, found: ${callers}`);
  }
});

console.log(`ok   deal-room billing: ${passed} assertions passed`);
