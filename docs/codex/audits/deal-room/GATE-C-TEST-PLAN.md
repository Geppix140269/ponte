# Deal Room Gate C pre-activation test plan

**Created:** 29 July 2026, after the owner review of PR #98
**Scope:** what must be proved against a real database before the Deal Room is activated
**Status:** written and **not executed**. No database has the schema.

Gate C stops immediately on any failure below. A failure is not a reason to
adjust the assertion.

---

## 0. Why this exists

The Gate B branch shipped `lib/deal-room/__tests__/rls-contract.test.ts`, which
reads the migration as text. The owner review then found five fail-open paths
that it had not detected, including a `deal_rooms` INSERT policy that let any
authenticated member open a room against somebody else's Deal.

That is the lesson this plan is built on: **a policy can be present, correctly
named and wrong.** Only a database can answer whether a SELECT returns a row.
The text test is retained because it catches vocabulary drift cheaply on every
run; it is not evidence about permissions and is no longer described as such.

## 1. The executable fixture

`scripts/deal-room-negative-access.mjs`.

It creates three real members - a Deal owner, an invited counterparty and an
uninvolved stranger - drives the whole loop, and then tries, as each of them,
the things they must not be able to do.

Every assertion after setup runs on an **anon-key client carrying that member's
JWT**, so Row Level Security is in force exactly as it is for a browser. The
service role is used only to create users, seed the listing, plant a second
private workspace the counterparty must never see, and tear down. It is never
used to check a permission: a proof that ran as a role which bypasses RLS would
prove nothing.

A refusal counts as either an error or an empty result. Both mean "you may
not", and the script treats them the same, because the product treats them the
same: isolation returns zero rows rather than raising.

### Running it

```bash
node scripts/deal-room-negative-access.mjs
```

It reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`, and refuses to run against the production project
unless `PONTE_ALLOW_PRODUCTION_DB=i-understand` is set deliberately.

### Where it has to run

It needs `20260729a`, `20260729b` and `20260729c` applied. That is why it is
committed unrun: production has not received them, and there is no
non-production project (PL-002). Ordering at Gate C is therefore:

1. Owner approves the three migrations.
2. Apply them by hand and record each in `public.schema_migrations` with its SHA-256.
3. Create the `deal-room-evidence` bucket and its two policies.
4. **Run this script.** It creates and removes its own fixtures.
5. Only on a clean pass, set `NEXT_PUBLIC_DEAL_ROOM` and `DEAL_ROOM_ALLOWLIST` and deploy.

Steps 1 to 3 are separate owner approvals. Step 4 is a gate, not a formality.

## 2. What it proves

The owner review named eight properties. Each maps to assertions in the script.

| # | Property | Assertions |
|---|---|---|
| 1 | A non-owner cannot create a room for another member's Deal | `deal_room_propose` refused for the stranger; direct INSERT into `deal_rooms` refused for everybody; a second Starter refused for the same organisation |
| 2 | A member cannot self-issue or extend entitlement | INSERT into `deal_room_entitlements` refused for the room administrator; UPDATE of `expires_at`/`state` refused |
| 3 | An invited but unadmitted participant cannot read or act | evidence unreadable after acceptance and before admission; `deal_room_submit_evidence` refused; `deal_room_admit_participant` refused until all four agreements are accepted; nobody can accept an agreement on another participant's behalf |
| 4 | Participant A cannot select, count or infer sub-room B | B absent from A's list; `count` bounded at 1; naming B's id directly returns nothing; B never appears in the activity A can read; the sponsor team does see both |
| 5 | `own_org`, `principals` and sub-room visibility behave exactly as labelled | an `own_org` item is unreadable by the other organisation; **`selected` is refused outright**, since it was removed from launch scope rather than left overstating its protection |
| 6 | Read-only and expired rooms refuse every mutation | after `deal_room_set_read_only`, evidence submission and blocker creation are refused; the history stays readable |
| 7 | Activity cannot be forged, changed or deleted | member INSERT, UPDATE and DELETE all refused; **the service role's UPDATE is refused too**, by the append-only trigger |
| 8 | Evidence bytes and signed URLs follow the same permission result | a stranger cannot download the object, cannot mint a signed URL for it, and a crafted object path is refused rather than raising |

### The four trust boundaries from the follow-up review of 29 July 2026

Added after the owner found that four durable records could say something the
database had not proved. Each is tested by calling the RPC **directly**, because
the server action is not the boundary — the function is granted to
`authenticated`, so anything the action does can be skipped.

| # | Boundary | Assertions |
|---|---|---|
| 1 | The agreement version and checksum cannot be forged | the four-argument `deal_room_accept_agreement` signature no longer exists; a member cannot read or rewrite `deal_room_agreement_documents`; a member cannot insert an acceptance row directly; an unpublished agreement kind is refused; every recorded acceptance carries the canonical version and checksum; admission succeeds only then |
| 2 | The Integrity pre-flight and preview cannot be authored | the eight-argument `deal_room_invite` signature, which took `p_preview` and `p_preflight`, no longer exists; a member cannot insert an invitation row directly; the stored pre-flight carries the command's own `derivedAt`; it reports sanctions as unscreened because no screening result exists; the stored preview names the Deal from the room |
| 3 | The counterparty is proved, persisted and bound | the invitation is addressed to the persisted intended counterparty and not to any other address; the room carries `intended_counterparty_profile_id`; a counterparty who is not a member is refused; an external principal without a name is refused |
| 4 | Acceptance is not written as admission | accepting records `invitation_accepted` and **not** `participant_admitted`; `participant_admitted` appears exactly once, after the gate is passed |

It also proves the positive path, because a negative proof over a loop that
never ran is worthless: the owner creates the room, the invitee accepts,
declares, accepts four agreements and is admitted; the procedure is proposed,
needs both approvers, and only then governs; evidence is submitted, questioned,
corrected into a second version and accepted by the named reviewer; a blocker is
opened, refused without a note, and resolved with one.

## 3. What the script does not cover, and how those are proved

| Not covered here | Where it is proved |
|---|---|
| The weight law, progress arithmetic and the 22% baseline | `lib/deal-room/__tests__/progress.test.ts`, pure and deterministic |
| Family correctness of the procedure | `lib/deal-room/__tests__/procedure.test.ts` and `interest.test.ts` |
| The four Ponte Integrity prohibitions and the sanctions derivation | `lib/deal-room/__tests__/integrity.test.ts` |
| Professional Momentum wording and prohibited vocabulary | `lib/deal-room/__tests__/momentum.test.ts` |
| Vocabulary agreement between TypeScript and the CHECK constraints | `lib/deal-room/__tests__/rls-contract.test.ts` |
| Bridge geometry, semantics and classes | `components/ponte/bridge/__tests__/deal-room-bridge.test.tsx` |
| Desktop, 390 x 844 and reduced-motion appearance | `npm run evidence:deal-room` |

## 4. Production verification after activation

Read-only, against production, after the migrations are applied and before the
flag is set:

1. All 14 `deal_room_*` tables present, with `relrowsecurity = true` and the expected policy count per table.
2. No policy on any of them names `anon`; `anon` holds execute on no `deal_room_*` function.
3. `deal_room_activity_events` has exactly one policy, and it is `SELECT`.
4. `deal_room_evidence_versions` and `deal_room_agreement_acceptances` have exactly `SELECT` policies.
5. The `deal-room-evidence` bucket exists with `public = false` and the two named policies.
6. The legacy cluster is unchanged: 8 tables, same row counts (0), same policies, `is_deal_participant()` unaltered.
7. `ponte-deal-docs` still has zero objects and zero policies.
8. Each applied file recorded in `public.schema_migrations` with a SHA-256 matching the file byte for byte.

Record the results in `docs/operations/OPERATIONS_LOG.md` and
`docs/codex/DATABASE-STATE.md` in the same change, per `AGENTS.md`.

## 5. Rollback if a failure is found

Do not adjust the assertion. Either fix the policy and re-run from step 4, or
withdraw: the rollback of record is the feature flag, which is not yet set at
that point, so the slice is already unreachable. Withdrawing the schema itself
is clean only while the tables are empty, and this script removes its own
fixtures, so a failed run leaves nothing behind.
