# Proposal — repairing `profiles.verification_level`

**Status:** proposal. Nothing here has been executed, and no mapping has been
chosen. Owner decision required before any change.
**Raised by:** the 28 July 2026 production migration reconciliation, finding
§6.2. Previously recorded as **R-01** in
`docs/codex/audits/issue-42-phase-a/REPOSITORY-RISK-FINDINGS.md`, 26 July 2026,
where the fix was deferred to "a separate targeted corrective PR". This is that
proposal.

---

## 1. The defect in one paragraph

`20260721g_verification.sql` declares:

```sql
alter table profiles add column if not exists verification_level int not null default 0;
```

The column already existed as `text`, so `if not exists` did nothing. The
migration reports success and changes nothing. Production therefore holds a
`text` column that three different writers fill with three different
vocabularies, and one reader compares numerically.

---

## 2. Every value currently in production

Read from `cptglsmjmzcfpjndqfmc` on 28 July 2026.

**Column:** `profiles.verification_level`, `text`, **nullable**, default
`'unverified'::text`.

| Value | Rows | First seen |
|---|---|---|
| `unverified` | 7 | 2026-05-26 |
| `company_verified` | 1 | 2026-07-24 |
| `NULL` | 1 | 2026-05-25 |

Nine rows in total, which is the entire `profiles` table. No row holds a numeric
string today.

The documented enum, per `scripts/seed-ponte-managed-qos.ts:117`, is:

```
unverified | email_verified | phone_verified | company_verified | fully_verified
```

Three of those five have never been written.

### The comparison this feeds

`lib/listings/publication-gate.ts:163`:

```ts
if (Number(s.verificationLevel ?? 0) < MEMBER_BUSINESS_MIN_LEVEL) return false;  // MIN = 2
```

| Stored value | `Number(v)` | Floor blocks? |
|---|---|---|
| `"2"` | 2 | no, correctly |
| `"1"` | 1 | **yes, correctly** |
| `NULL` | 0 | **yes, correctly** |
| `unverified` | `NaN` | **no** |
| `company_verified` | `NaN` | **no** |
| `fully_verified` | `NaN` | **no** |

`NaN < 2` is `false`, so the guard does not fire. **Every text value fails
open**, including `unverified`. The floor works only for the numeric strings the
newer code writes.

This does not currently let an unverified member publish: the gate's other
checks (a bound `business_verification_id`, a `member_business` purpose, a
passing verification status, clean sanctions) still refuse them, and today both
approved listings are held back by the status check alone. The level floor is
defence-in-depth that is not defending.

### Related columns, which matter to the "should it exist" question

| Column | Type | Note |
|---|---|---|
| `verification_tier` | `integer` | A second, apparently redundant level concept. No repository file creates it and no application code reads it. |
| `verified_trader` | `boolean` | Same. Undeclared, unread. |
| `trust_score` | `integer` | Distinct concept; there is also a `trust_score()` function and a `trust_score_components` table. |
| `verified_at` | `timestamptz` | Written alongside the level by the pipeline. |
| `business_verification_id` | `uuid` | The actual binding to a verification. Declared by `20260723b`. |

---

## 3. Every application reference

31 references across 18 files. Grouped by what they do.

### Writers — three, disagreeing

| Location | Writes | Vocabulary |
|---|---|---|
| `lib/verification/pipeline.ts:445` | `verification_level: 2` | integer |
| `lib/verification/rescreen.ts:107` | `verification_level: 1` | integer |
| `app/[locale]/admin/verifications/actions.ts:173` | `verification_level: next` (computed `Number(...) + 1`) | integer |
| `scripts/seed-ponte-managed-qos.ts:128` | `verification_level: "company_verified"` | text enum |
| DB default | `'unverified'` | text enum |

Every insert of a new profile therefore starts as `unverified`, and every
verification event overwrites it with a number.

### Readers — all numeric coercion

| Location | Expression |
|---|---|
| `lib/listings/publication-gate.ts:104` | `Number(submitter.verificationLevel ?? 0) < 2` |
| `lib/listings/publication-gate.ts:163` | `Number(s.verificationLevel ?? 0) < 2` |
| `lib/listings/public-filter.ts:52` | `Number(p.verification_level ?? 0)` |
| `lib/listings/publish.ts:145` | `Number(profile.verification_level ?? 0)` |
| `lib/board/live-deals.ts:170` | `Number(p.verification_level)` |
| `lib/board/qualified-opportunity.ts:141,178` | `Number(profile.verification_level ?? 0)` |
| `app/[locale]/marketplace/actions.ts:99` | `Number(profile.verification_level ?? 0)` |
| `app/[locale]/marketplace/page.tsx:315` | `Number(p.verification_level ?? 0)` |
| `app/[locale]/marketplace/l/[ref]/page.tsx:143,152` | `Number(profile.verification_level ?? 0)` |
| `app/[locale]/admin/listings/actions.ts:110` | `Number(profile.verification_level ?? 0)` |
| `app/[locale]/admin/listings/page.tsx:190` | `Number(p.verification_level ?? 0)` |
| `app/[locale]/admin/verifications/actions.ts:168` | `Number(profile?.verification_level ?? 0)` |

### Selected but not compared

`app/[locale]/account/page.tsx:58` selects it for display.

### Tests

`lib/listings/__tests__/publication-gate.test.ts:514` asserts the approve action
reads the live profile level. `lib/signals/__tests__/block-d.test.ts:319`
asserts `verification_level` never reaches a public signal payload.

### Migration

`supabase/migrations/20260721g_verification.sql:172` — the declaration that did
not land.

---

## 4. Should the column exist at all?

**Yes, but it is doing two jobs and only one of them is needed.**

The gate already asks the authoritative questions elsewhere: is a verification
bound, is its purpose `member_business`, is its status passing, are sanctions
clean. Those read the `verifications` row itself and are live. The level adds
one thing on top: *how far* the member got, which distinguishes an email-checked
member from a company-checked one.

That distinction is real and is used for display (`trustLevel` on the board and
the listing page). So the column stays.

What should **not** stay is `verification_tier`, an unread `integer` on the same
table that appears to be an earlier attempt at the same concept. Removing it is
part of the baseline workstream, not this one, but it should be named here
because anyone repairing "the level column" will find two.

---

## 5. Two directions, and a recommendation

### Direction A — make the column `int`, as `20260721g` intended

Convert `text` to `integer` and map the enum onto numbers.

**Against.** It requires deciding what `company_verified` is worth, and that
decision silently changes who can publish. It also contradicts the more recent
recorded intent: commit `9fa0aa6` ("the QO seed set `verification_level` to the
integer 2 ... `verification_level` is a TEXT enum, so the write silently
failed") treats text as correct and production as authoritative.

**For.** It matches the migration already in the repository, and numeric
comparison then works as written.

### Direction B — accept `text` as canonical, fix the migration and the readers

Correct `20260721g` to describe the column that exists, and replace the twelve
`Number(...)` coercions with an ordered enum comparison.

**For.** It matches production, matches the seed script, matches `9fa0aa6`, and
requires no data migration at all: every existing row is already valid. The
five-value enum carries more meaning than an integer, and the failure mode of a
typo is a hard error rather than a silent `NaN`.

**Against.** The three integer writers must change in the same commit, or they
will write `1` and `2` into a text enum and the same class of defect returns.

### Recommendation

**Direction B.** It is the better-evidenced canonical form, it needs no
destructive data change, and its failure mode is loud.

---

## 6. Direction B in full, if approved

### 6.1 Schema

The column already has the right type. The only schema change is honesty:

```sql
-- Correct the declaration to describe the column that exists. The original
-- said `int not null default 0`; the column has always been text.
alter table profiles alter column verification_level set default 'unverified';
update profiles set verification_level = 'unverified' where verification_level is null;
alter table profiles alter column verification_level set not null;

alter table profiles drop constraint if exists profiles_verification_level_check;
alter table profiles add constraint profiles_verification_level_check check (
  verification_level in (
    'unverified','email_verified','phone_verified','company_verified','fully_verified'
  )
);
```

The one `NULL` row becomes `unverified`, which is what a profile with no
verification is. That is the only data change, it affects one row, and it is
reversible.

### 6.2 Code

New module, `lib/verification/level.ts`:

```ts
export const VERIFICATION_LEVELS = [
  "unverified", "email_verified", "phone_verified",
  "company_verified", "fully_verified",
] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** Ordered comparison. An unrecognised value is treated as unverified. */
export function levelRank(v: string | null | undefined): number {
  const i = VERIFICATION_LEVELS.indexOf(v as VerificationLevel);
  return i < 0 ? 0 : i;
}

/** The member-business floor the publication gate enforces. */
export const MEMBER_BUSINESS_MIN_LEVEL: VerificationLevel = "company_verified";

export function meetsMemberBusinessFloor(v: string | null | undefined): boolean {
  return levelRank(v) >= levelRank(MEMBER_BUSINESS_MIN_LEVEL);
}
```

Then, in one commit:

- replace all twelve `Number(...)` reads with `meetsMemberBusinessFloor()` or
  `levelRank()`;
- `pipeline.ts:445` writes `"company_verified"` instead of `2`;
- `rescreen.ts:107` writes `"email_verified"` instead of `1`;
- `admin/verifications/actions.ts` promotes along the enum instead of `+ 1`;
- `trustLevel` on the board becomes the rank, so the public surface is unchanged.

An unrecognised value ranks 0, so the failure mode is **closed**, not open.

### 6.3 Mapping

No historical rows need mapping: all nine are already valid enum values or NULL.
The mapping below exists only for the integer values the current code writes, in
case any row is written between approval and deployment.

| Current write | Becomes |
|---|---|
| `0` | `unverified` |
| `1` | `email_verified` |
| `2` | `company_verified` |
| `NULL` | `unverified` |

`company_verified` is chosen for `2` because that is exactly what the pipeline
writes `2` to mean: a company checked against a registry. It is also what the
seed already writes for the desk account, so the one production row carrying it
keeps its meaning and its publication eligibility.

### 6.4 Rollback

```sql
alter table profiles drop constraint if exists profiles_verification_level_check;
alter table profiles alter column verification_level drop not null;
alter table profiles alter column verification_level set default 'unverified';
```

The single `NULL` row that became `unverified` is not restored, because
`unverified` is a truthful description of it and reintroducing a NULL would
restore an ambiguity rather than a fact. If that row must be restored exactly,
capture its id before applying.

Reverting the application code is a plain `git revert`. The column type never
changes in this direction, so no rollback can lose data.

### 6.5 Verification after applying

```sql
select verification_level, count(*) from profiles group by 1 order by 2 desc;
select conname, pg_get_constraintdef(oid) from pg_constraint
 where conrelid = 'profiles'::regclass and conname like '%verification_level%';
```

Then, in the application: a member below `company_verified` must be refused by
the publication gate **with the level as the stated reason**, which is the case
that has never once been exercised in production.

---

## 7. What this proposal does not do

- It does not touch `verification_tier`, `verified_trader` or `trust_score`.
- It does not change who is verified today. The one `company_verified` profile
  keeps that level and the eligibility that follows from it.
- It does not weaken the gate. The level floor becomes enforced where it is
  currently inert, so this is a tightening, and a member who was passing the
  floor only because `NaN < 2` is `false` will stop passing it. Given the other
  four checks, no currently public listing is affected — but that must be
  re-confirmed against live data immediately before applying, not assumed from
  this document.
