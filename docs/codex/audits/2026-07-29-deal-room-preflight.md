# Deal Room launch slice - Gate A preflight and pre-migration report

**Date:** 29 July 2026
**Authorised by:** Giuseppe Funaro, issue #97
**Branch:** `agent/deal-room-launch-slice`
**Base:** `main` at `0318615459575d42d0fb8542e66c6c644c6560a6` (identical to `origin/main`), clean worktree
**Production project inspected:** `cptglsmjmzcfpjndqfmc` ("Ponte Trade", eu-west-1)
**Nature of this document:** read-only inspection and proposal. **No SQL was applied. No production object was created, altered or dropped. No storage bucket or policy was changed.**

This report satisfies the pre-migration report required by
`docs/codex/DATABASE-STATE.md` and Gate A of issue #97. The execution plan is
`docs/plans/active/deal-room-launch-slice.md`.

---

## 1. Current-state reconciliation

### 1.1 Repository facts verified on this branch

| Question | Answer | How it was established |
|---|---|---|
| Is `main` fresh? | Yes. `HEAD`, `origin/main` and the worktree all sit at `0318615`. | `git fetch origin main`, `git rev-parse` |
| Is the worktree clean? | Yes, `git status --porcelain` empty at start. | `git status` |
| Is any Deal Room runtime code present? | **No.** No route, component, service, type or test implements a Deal Room. | `deal.?room` search across the tree excluding `docs/`: matches only design-authority text, one icon path name and one unrelated test string |
| Does any code read the Deal-era tables? | **No.** No `.from("deals")`, `deal_documents`, `deal_events`, `deal_status_history`, `messages`, `settlements`, `settlement_milestones`, `settlement_events` or `is_deal_participant` reference exists outside `docs/`. | Repository-wide search |
| Is there a reusable deterministic progress engine? | **Yes.** `lib/ponte/progress.ts` is pure, weight-validated, floor 20, never 0, 100 only on full completion, and rejects uniform weight ladders. | Read in full; `lib/ponte/__tests__/progress.test.ts` is in `npm test` |
| Is there a reusable state vocabulary component? | **Yes.** `components/ponte/state/LifecycleState.tsx`. No route has been retrofitted to it. | Read; confirmed by `CURRENT-STATE.md` |
| Is the Bridge System available? | **Partly.** `components/ponte/bridge/BridgeRoute.tsx` is the Family and Action Bridge only. The Task Completion, Commercial Journey, Counterparty Connection and **Deal Room** bridges are unbuilt. | `components/ponte/bridge/`, `CURRENT-STATE.md` |
| Is the temporary site password wall in scope? | **No, and it is untouched.** It is the first guard in `middleware.ts`. | Read; not modified |

### 1.2 Stale Deal Room status records found on `main`

These are corrected in the same pull request that carries this report. They are
recorded here because a future agent reading only `CURRENT-STATE.md` would be
misled.

1. **`docs/codex/CURRENT-STATE.md` cites `docs/decisions/ADR-0008-deal-room-product-contract.md` as the "Deal Room decision".** That file does not exist. The Deal Room product contract is **ADR-0003**; ADR-0008 is the *detailed product definition*. Two different decisions were collapsed into one wrong filename.
2. **`docs/decisions/ADR-0009` names `docs/ponte-authority/PT-TECH-2026-07-27-01-DEAL-ROOM-TECHNICAL-ARCHITECTURE-AND-IMPLEMENTATION-PLAN-V1.md` as its related authority. That file is absent from the repository.** ADR-0009 is therefore an accepted-in-form architecture decision whose long-form authority was never merged. ADR-0009 itself remains **Proposed**, not accepted.
3. **`CURRENT-STATE.md` describes several workstreams as "implemented on branch, not merged" that are now on `main`**: PR #70 (category-first taxonomy, merged at `877448b`), PR #74/#80 (automated listing publication and the email system, merged at `b378ad2` and `c688153`), PR #89 (ADR-0014 family-specific composer, merged at `923d1e3`), and the Design Constitution authority (PR #59, merged at `2e0230a`). The Constitution is therefore **binding repository authority now**, not "implemented on branch".

### 1.3 What the authorities actually say about implementation status

| Authority | Status on `main` | Consequence for this slice |
|---|---|---|
| ADR-0003 Deal Room as the PROGRESS layer | Accepted | Governs product meaning |
| ADR-0004, ADR-0005, ADR-0006, ADR-0007 | Accepted (0006 principle only; limits proposed) | Entitlement is required conceptually; **no price, Stripe or charging** |
| ADR-0008 detailed product definition | Accepted | 21-surface register, domain objects, permission matrix, progress model |
| ADR-0009 technical architecture | **Proposed, not accepted** | This report is the evidence the owner needs to accept or revise it |
| PT-PRODUCT-...-04 detailed definition | Marked "Proposed" in its own header, accepted by ADR-0008 | Treat as accepted; the header is stale |
| PT-DESIGN-...-01 experience design | **Proposed for design approval** | Surfaces are designed from it, but design approval is an owner gate |

**Consequence to flag:** issue #97 authorises implementation, but the design
authority it derives from (`PT-DESIGN-2026-07-27-01`) is still marked *Proposed
for product-owner design approval*, and ADR-0009 is *Proposed*. The owner's
authorisation on 29 July 2026 is read here as authorising the launch slice to
proceed against those documents. Confirming that reading is a Gate A owner
decision, recorded as a stop condition in the ExecPlan.

---

## 2. Production inspection, read-only

Every fact in this section was read from production on 29 July 2026 through
`scripts/db-query.mjs` (Management API). Every statement executed was a
`SELECT`.

### 2.1 The Deal Room-era cluster exists, is empty, and is closed to writes

| Table | Rows | RLS | Forced | Policies | Policy commands present |
|---|---:|---|---|---:|---|
| `deals` | 0 | on | no | 3 | SELECT, INSERT, UPDATE |
| `deal_documents` | 0 | on | no | 1 | SELECT only |
| `deal_events` | 0 | on | no | 1 | SELECT only |
| `deal_status_history` | 0 | on | no | 1 | SELECT only |
| `messages` | 0 | on | no | 2 | SELECT, INSERT |
| `settlements` | 0 | on | no | 1 | SELECT only |
| `settlement_milestones` | 0 | on | no | 1 | SELECT only |
| `settlement_events` | 0 | on | no | 1 | SELECT only |

Six of the eight tables have **no INSERT, UPDATE or DELETE policy at all**, so
under RLS they are readable-but-unwritable by any member session. Nothing is
failing open. Nothing is exposed.

### 2.2 Structure of the cluster

- `deals`: `id`, `listing_id`, `initiator_id`, `counterparty_id`, `stage`, `title`, `contact_unlocked`, `internal_notes`, `created_at`, `updated_at`, `initiator_accepted_contact`, `counterparty_accepted_contact`.
- `deals_stage_check`: `enquiry | offer | negotiation | closed | cancelled`.
- `deals.listing_id` references **`listings_legacy_20260720(id)`**, not the live `listings` table.
- `deals.initiator_id` and `deals.counterparty_id` reference `profiles(id)`. There is no organisation column anywhere in the cluster.
- `deal_documents`: `deal_id`, `uploader_id`, `name`, `path`, `size_bytes`, `created_at`. No version, no visibility, no provenance, no review state, no procedure link.
- `messages`: `deal_id`, `sender_id`, `body`, `contains_contact_info`, `created_at`.
- `settlements` / `settlement_milestones` / `settlement_events`: escrow-shaped, with `amount_cents`, `fee_bps` default 60, `provider` default `'mock'`, and milestone triggers `deposit | shipment | arrival | inspection | custom`.
- Indexes: 17 total across the cluster, all primary keys plus single- or two-column btree indexes on the parent key.
- Triggers: `touch_deals` and `touch_settlements`, both calling `touch_updated_at()`.

### 2.3 The RLS helper

```sql
CREATE OR REPLACE FUNCTION public.is_deal_participant(p_deal_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1 from deals d
    where d.id = p_deal_id
      and (d.initiator_id = auth.uid() or d.counterparty_id = auth.uid())
  );
$function$
```

It is strictly two-party, profile-to-profile, and reads only `deals`. It has no
concept of an organisation, a sub-room, an admission state, an agreement
acceptance or a visibility boundary.

`is_admin()` (reads `profiles.role = 'admin'`, SECURITY DEFINER) and
`touch_updated_at()` are live, widely used by current policies and triggers, and
are reusable.

### 2.4 Storage

| Bucket | Public | Created | Objects | `storage.objects` policies naming it |
|---|---|---|---:|---:|
| `ponte-deal-docs` | private | 2026-06-05 | **0** | **0** |
| `ponte-verification` | private | 2026-06-04 | 0 | 3 (read/upload/delete own) |
| `ponte-previews` | public | 2026-05-24 | 1 | 4 |
| `listing-docs` | private | 2026-07-20 | 1 | 3 |
| `listing-media` | public | 2026-07-21 | 0 | 2 |
| `verification-docs` | private | 2026-07-21 | 0 | **0** |

`storage.objects` has RLS enabled with 12 policies. **`ponte-deal-docs` is named
by none of them and is referenced by no application code.** It is an orphan
bucket predating every accepted Deal Room authority. It is closed, not exposed:
with no policy, only the service role can reach it.

`verification-docs` also has no policy and is reached only through
`createAdminClient()` (service role) in `app/[locale]/admin/verifications/page.tsx`.
That is consistent, not fail-open, but whether a member-facing path was ever
intended is unresolved. Logged, not changed.

### 2.5 Anchor tables the new schema must attach to

| Table | Rows | Note |
|---|---:|---|
| `listings` (the live structured Deal) | 5 | 2 approved. Carries `market_family`, `market_intent`, and the ADR-0011 category columns. |
| `profiles` | 9 | `verification_level` is now the canonical three-value text column. |
| `organizations` | **0** | |
| `profiles.organization_id` set | **0 of 9** | |
| `verifications` | 9 | |

**This is the single most consequential finding for the product design.** The
Deal Room admission model in ADR-0003 section 5 requires each participant to
"identify the business or declared capacity represented", and the permission
matrix is organisation-aware. In production the organisation layer is entirely
unpopulated: no organisation record exists and no profile is bound to one. The
slice therefore cannot assume an organisation exists; it must create or attach
one during admission, and must support declared professional capacity as the
lawful alternative. Handled in the design below; the broader organisation model
is logged as post-launch.

---

## 3. Disposition table

Every existing object named in issue #97, decided explicitly. **Nothing in the
"leave untouched" column is dropped, renamed, altered or declared by this
slice.** Removal of legacy objects is explicitly excluded from launch scope by
issue #97 and stays that way.

| Existing object | Disposition | Reason |
|---|---|---|
| `deals` | **Leave untouched. Do not reuse.** | Two-party `profiles`-to-`profiles`; no organisation, no market family, no sub-room, no admission or agreement concept. `listing_id` points at `listings_legacy_20260720`, so it cannot even reference a current structured Deal. Its `stage` vocabulary (`enquiry/offer/negotiation/closed/cancelled`) is the retired introduction era, not the accepted master-room lifecycle. Adapting it would mean rewriting every column and its foreign key, which is a replacement wearing the old table's name. |
| `deal_documents` | **Leave untouched. Superseded in function.** | No version, visibility, provenance, review state, clarification cycle or procedure link. Every one of those is a named acceptance criterion of #97. Superseded by `deal_room_evidence` + `deal_room_evidence_versions`. |
| `deal_events` | **Leave untouched. Superseded in function.** | Keyed to `deals`, free-text `type`/`detail`, no sub-room scope, no append-only guarantee. Superseded by `deal_room_activity_events`. |
| `deal_status_history` | **Leave untouched. Superseded in function.** | Records transitions of the retired `deals.stage` vocabulary. |
| `messages` | **Leave untouched. Deliberately not reused.** | Generic chat keyed to a deal. Issue #97 and the Experience Design both require the procedure, not conversation, to be the organising structure. Reusing this table would make chat the spine by default. |
| `settlements`, `settlement_milestones`, `settlement_events` | **Leave untouched.** | Escrow and trade settlement are explicitly post-launch in #97, ADR-0003 section 14 and the detailed definition section 9.4. |
| `is_deal_participant()` | **Leave untouched. Do not reuse.** | Two-party and `deals`-only. It cannot express sub-room isolation, admission state or agreement acceptance, which are the properties the whole slice exists to prove. New helpers are added beside it; it is not modified. |
| `is_admin()` | **Reuse unchanged.** | Live, SECURITY DEFINER, already the admin predicate for `listings`, storage and eleven other policies. |
| `touch_updated_at()` | **Reuse unchanged.** | Live trigger function backing five existing tables. New tables reuse it rather than adding a sixth implementation. |
| `listings` (live) | **Reuse, read-only. No column added, no policy changed.** | It is the structured Deal. The master room references it and stores an immutable snapshot, so a later Deal edit cannot silently rewrite an agreed room. |
| `profiles` | **Reuse, read-only. No column added.** | Person identity and `verification_level` for the Integrity pre-flight. |
| `organizations` | **Reuse. No column added.** | The organisation anchor. Empty, so rows are created through the admission command; see section 4.6. |
| `verifications` | **Reuse, read-only.** | The evidence the Integrity pre-flight reports. No new verification store is invented. |
| `ponte-deal-docs` bucket | **Leave untouched. Replaced in function.** | Zero objects, zero policies, zero code references, created 5 June 2026 before any accepted Deal Room authority, and its name collides conceptually with the legacy `deal_documents` table. Attaching a new access model to an object of undocumented intent would inherit that ambiguity. A new, precisely named bucket is created instead. Dropping this one is post-launch cleanup and is out of scope. |
| `verification-docs` bucket | **Leave untouched.** | Adjacent. Logged as an observation, not touched. |
| `public.schema_migrations` | **Reuse as the ledger. No change.** | Protected since 28 July 2026. New rows are recorded only when SQL is actually applied, under separate owner approval. |

---

## 4. Proposed additive schema

**Naming rule:** every new table is prefixed `deal_room_`, which cannot collide
with the legacy `deal_*` cluster and makes the boundary obvious in any query,
log or policy.

**Nothing below is created by this pull request.** These are proposed
migrations for Gate C.

### 4.1 The fourteen tables

| # | Table | Purpose | Named acceptance criterion in #97 |
|---|---|---|---|
| 1 | `deal_rooms` | The master room. One defined Deal scope. | 1, 11, 15, 16 |
| 2 | `deal_room_entitlements` | Entitlement state, held separately from room lifecycle. | 15 |
| 3 | `deal_room_sub_rooms` | A private permission scope beneath the master room. | 2, 13 |
| 4 | `deal_room_participants` | Person + organisation or declared capacity + class + role + authority + state. | 4, 5 |
| 5 | `deal_room_invitations` | Time-bound protected invitation with hashed token and the authorised preview snapshot. | 3 |
| 6 | `deal_room_agreement_acceptances` | Versioned, timestamped, attributable acceptance of Participation Agreement, NDA and room rules. | 4 |
| 7 | `deal_room_procedures` | Immutable procedure versions. | 6, 7 |
| 8 | `deal_room_procedure_steps` | Ordered steps with responsible role, required evidence, reviewer, due date, completion condition, stable weight. | 6, 11 |
| 9 | `deal_room_procedure_approvals` | Per-approver response to a version. | 6 |
| 10 | `deal_room_evidence` | Evidence item: provenance, provider, visibility, linked requirement, review state. | 8, 9 |
| 11 | `deal_room_evidence_versions` | Immutable file versions, incl. supersession. | 8 |
| 12 | `deal_room_clarifications` | The clarification cycle attached to evidence or a step. | 8 |
| 13 | `deal_room_blockers` | Owner, affected item, resolution requirement, state. | 10 |
| 14 | `deal_room_activity_events` | Append-only attributable history. | 12, 14 |

**Deliberately not created:** a progress-snapshot table. Progress is *derived*
on read from the approved procedure version and current step states through
`lib/ponte/progress.ts`. Deriving it satisfies criterion 11 ("reproducible from
approved weights and object states") more strictly than storing it, and removes
a consistency surface. **Deliberately not created:** any Deal Passport,
notification-preference, credit, subscription or Stripe table.

### 4.2 Key columns and constraints (abridged; the migration file is the full statement)

- `deal_rooms`: `id`, `ref` unique (`DR-2026-nnnn`), `listing_id -> listings(id) on delete restrict`, `deal_snapshot jsonb not null` (immutable copy of the Deal at proposal time), `market_family`, `market_intent`, `title`, `purpose`, `completion_condition`, `operating_mode` CHECK, `sponsor_org_id -> organizations`, `sponsor_profile_id -> profiles`, `initiator_profile_id -> profiles not null`, `state` CHECK over the ADR-0008 section 6.1 vocabulary, timestamps. `on delete restrict` on the Deal is deliberate: a room must never be silently orphaned or cascade-deleted by an upstream change.
- `deal_room_entitlements`: one row per room (`unique(room_id)`), `kind` CHECK `starter | sponsored | waived`, `state` CHECK `eligible | reserved | active | grace | expired | restored | closed`, `expires_at`. **No price, no Stripe identifier, no currency.**
- `deal_room_sub_rooms`: `room_id -> deal_rooms on delete cascade`, `kind` CHECK `counterparty | provider | adviser | internal`, `state` CHECK over section 6.2.
- `deal_room_participants`: `room_id`, `sub_room_id` nullable (null = master-level), `profile_id`, `org_id` nullable, `declared_capacity` text nullable, CHECK `(org_id is not null or declared_capacity is not null)` once admitted, `participant_class` CHECK, `transaction_role`, `participation_authority`, `is_required_approver bool`, `state` CHECK over section 6.3. Partial unique indexes on `(sub_room_id, profile_id)` and on `(room_id, profile_id) where sub_room_id is null`.
- `deal_room_invitations`: `token_sha256 text not null unique` - **the raw token is never stored**, `invited_email`, `proposed_role`, `proposed_participant_class`, `preview_facts jsonb not null`, `integrity_preflight jsonb not null` (the pre-flight exactly as shown at send time), `state` CHECK `sent | accepted | declined | expired | revoked`, `expires_at not null`.
- `deal_room_agreement_acceptances`: `participant_id`, `agreement_kind` CHECK `participation | nda | room_rules | authority_declaration`, `document_version text not null`, `document_sha256 text not null`, `accepted_at`. Unique on `(participant_id, agreement_kind, document_version)`. **No IP address or user agent is stored**, on data-minimisation grounds; version + hash + identity + timestamp is the click-to-accept evidence ADR-0003 section 5 permits. Flagged for owner confirmation.
- `deal_room_procedures`: `version int`, `state` CHECK over section 6.5, `unique(room_id, version)`, and a **partial unique index enforcing at most one `approved` version per room**.
- `deal_room_procedure_steps`: `seq`, `stage_label`, `weight int check (weight > 0)`, `mandatory bool`, `requires_evidence bool`, `required_reviewer_role`, `due_date`, `completion_condition`, `state` CHECK over section 6.6. The **weights-sum-to-100** rule cannot be a row CHECK; it is enforced atomically inside the approval command function (section 4.4) and mirrored by `assertWeights()` in `lib/ponte/progress.ts`.
- `deal_room_evidence`: `sub_room_id not null` (launch scope keeps every evidence item inside a private sub-room), `step_id` nullable, `provenance` CHECK `member_declared | member_uploaded | third_party_supplied | ponte_checked`, `visibility` CHECK `own_org | sub_room | principals | selected | ponte_only`, `state` CHECK over section 6.8 including both `accepted_for_procedure` **and** `independently_verified` as distinct values, `current_version_id`, `superseded_by_id`.
- `deal_room_evidence_versions`: `unique(evidence_id, version)`, `storage_path text not null unique`, `checksum_sha256`, `uploaded_by`, `uploaded_at`. No UPDATE path: supersession creates a new row.
- `deal_room_blockers`: `category` CHECK `critical | material | operational`, `owner_participant_id`, `resolution_requirement`, `state` CHECK over section 6.10. Resolution never deletes the row.
- `deal_room_activity_events`: `event_type`, `subject_type`, `subject_id`, `summary`, `detail jsonb`, `actor_profile_id`, `actor_org_id`, `created_at`. Guarded by a `before update or delete` trigger that raises, so the history is append-only against the table owner as well as against members.

### 4.3 Indexes

One per foreign key used in a policy predicate or a list read: `deal_rooms(listing_id)`, `deal_rooms(sponsor_org_id)`, `deal_room_sub_rooms(room_id)`, `deal_room_participants(room_id)`, `deal_room_participants(sub_room_id)`, `deal_room_participants(profile_id)`, `deal_room_invitations(token_sha256)` (unique), `deal_room_procedures(room_id)`, `deal_room_procedure_steps(procedure_id, seq)`, `deal_room_evidence(sub_room_id)`, `deal_room_evidence(step_id)`, `deal_room_evidence_versions(evidence_id, version)` (unique), `deal_room_evidence_versions(storage_path)` (unique), `deal_room_clarifications(evidence_id)`, `deal_room_blockers(room_id)`, `deal_room_activity_events(room_id, created_at)`, `deal_room_activity_events(sub_room_id, created_at)`.

The participant indexes are not optional: every RLS predicate resolves through
them, so their absence would be a performance cliff on the security path.

### 4.4 Deterministic authorised commands

Material state changes do not happen through direct table writes. They happen
through SECURITY DEFINER functions with a pinned `search_path`, each of which
validates authority, performs the transition and writes the activity event in
one transaction:

`deal_room_admit_participant`, `deal_room_approve_procedure` (this one enforces
weights summing to exactly 100 and the single-approved-version rule),
`deal_room_submit_evidence`, `deal_room_request_clarification`,
`deal_room_accept_evidence_for_procedure`, `deal_room_reject_evidence`,
`deal_room_supersede_evidence`, `deal_room_open_blocker`,
`deal_room_resolve_blocker`, `deal_room_set_read_only`.

This is why the activity table has no member INSERT policy: a member cannot
forge history, exactly as `listing_events` already works on `main`.

### 4.5 RLS model

Every new table: `enable row level security`, **no policy granting anything to
`anon`**, and no policy that can reveal the existence of a sub-room to a
non-participant.

Four new helper predicates, SECURITY DEFINER, STABLE, `search_path` pinned:

| Helper | Meaning |
|---|---|
| `deal_room_is_sub_room_participant(uuid)` | caller is an `admitted` or `active` participant of that sub-room |
| `deal_room_is_master_participant(uuid)` | caller is an admitted master-level participant, or on the sponsor team |
| `deal_room_can_administer(uuid)` | caller is the initiator or a sponsor administrator of that room |
| `deal_room_is_writable(uuid)` | room state is not read-only/closed **and** entitlement state permits mutation |

Policy shape, stated as rules rather than SQL:

- **`deal_room_sub_rooms` SELECT** = `deal_room_is_sub_room_participant(id) or deal_room_can_administer(room_id) or is_admin()`. A counterparty admitted to sub-room A receives **zero rows** for sub-room B. Not an error, not a redacted row: absent. Every count, list, navigation item and notification is computed from this same filtered read, which is how criterion 13 is met at the database rather than in the interface.
- **`deal_room_evidence` / `_versions` / `_clarifications` / `_blockers` SELECT** = participant of the owning sub-room, further narrowed by the row's `visibility`.
- **Every WITH CHECK on every INSERT and UPDATE** includes `deal_room_is_writable(room_id)`. Read-only continuity (criterion 15) is therefore enforced in the database; a stale client cannot mutate an expired room.
- **`deal_room_activity_events`**: SELECT for permitted participants, permission-filtered by sub-room. **No INSERT, UPDATE or DELETE policy for any member.** Plus the append-only trigger.
- **`deal_room_invitations`**: no member SELECT policy at all. The invitation landing is resolved server-side: the raw token from the URL is hashed and looked up under the service role, and only the `preview_facts` are returned. An unauthenticated visitor never queries this table.
- **AI context** (criterion 14) is assembled server-side from the *caller's* session client, never the service-role client, so the same RLS that governs the screen governs the model input. AI has no write path: it can only propose text into a command the participant then authorises.

Negative tests are part of Gate B, not an afterthought: a participant of
sub-room A must be proved unable to select, count, or infer sub-room B's rows,
storage objects, activity, or evidence.

### 4.6 The organisation gap

Because `organizations` is empty and no profile is bound to one, admission
cannot read an existing organisation. The admission command therefore:

1. accepts either an organisation (created or selected at admission, with legal or trading name and jurisdiction) **or** a declared professional capacity, per ADR-0003 section 6;
2. binds `profiles.organization_id` only when the member confirms it;
3. never invents an organisation from a company text field.

The wider organisation model, ownership and membership are **not** built here
and are logged as post-launch.

### 4.7 Private Storage design

New private bucket **`deal-room-evidence`**:

- `public = false`;
- `file_size_limit = 26214400` (matching `verification-docs`);
- `allowed_mime_types = application/pdf, image/png, image/jpeg, image/webp`;
- path convention `{room_id}/{sub_room_id}/{evidence_id}/{version}/{filename}`.

Policies on `storage.objects`, all scoped `bucket_id = 'deal-room-evidence'`:

- **SELECT**: an `EXISTS` join from `storage.objects.name` to `deal_room_evidence_versions.storage_path` (unique-indexed) and on to `deal_room_evidence`, permitted only when the caller may read that evidence row. The join, not the path string, is the authority, so a guessed or crafted path grants nothing.
- **INSERT**: caller is an admitted participant of the sub-room named in the path **and** the room is writable.
- **UPDATE and DELETE**: none. Evidence versions are immutable; supersession writes a new version. Only the service role can remove an object, under a separately approved retention procedure.

A path-parsing hazard is handled explicitly: casting `(storage.foldername(name))[2]`
straight to `uuid` raises `22P02` on a malformed path, and Postgres does not
guarantee `AND` evaluation order, so a regex guard placed first is not
sufficient. A small `deal_room_uuid_or_null(text)` function returns `null`
instead of raising, and a null sub-room id denies.

Serving is belt and braces: the database policy above **and** short-lived
signed URLs issued by a server route that re-checks permission before signing.
Bytes are never public, never proxied through a public bucket, and never
embedded in email.

### 4.8 Feature flag and allowlist

| Control | Kind | Behaviour |
|---|---|---|
| `NEXT_PUBLIC_DEAL_ROOM` | build-time, client-visible | `on` exposes the `/deal-rooms` routes; anything else and they are not reachable. Matches the existing `NEXT_PUBLIC_FIND_JOURNEY` pattern. |
| `DEAL_ROOM_ALLOWLIST` | server-only | Comma-separated organisation or profile ids. Every server route and command handler checks it. |

Stated plainly because it matters: **the flag is not a security boundary.**
`NEXT_PUBLIC_*` is inlined into the client bundle and is a routing control only.
RLS and the server-side allowlist are the boundary.

**Safe disable (criterion 16):** turning the flag off removes access to the
slice and changes nothing else. The Deal Room adds only new routes and new
tables; it alters no existing table, column, policy, route or journey. Existing
Deals and every upstream journey are untouched whether the flag is on or off.

---

## 5. Migration, rollback and verification plan

### 5.1 Forward path

Three files, applied in order, by hand, **only after separate explicit owner
approval** (Gate C):

| File | Contents |
|---|---|
| `supabase/migrations/20260729a_deal_room_core.sql` | 14 tables, constraints, indexes, `touch_updated_at` triggers, the append-only trigger, `deal_room_uuid_or_null()` |
| `supabase/migrations/20260729b_deal_room_rls.sql` | `enable row level security` on all 14, the 4 helper predicates, all policies, the 10 command functions |
| `supabase/migrations/20260729c_deal_room_storage.sql` | the `deal-room-evidence` bucket and its 2 policies |

Every statement is `create ... if not exists` or `drop policy if exists` +
`create policy`, so re-running changes nothing. Nothing is renamed, dropped or
rewritten. No existing table, column, constraint, index, policy, function,
trigger or bucket is altered.

**A merge applies nothing.** The historical chain aborts at its first file, so
migrations are applied by hand with `scripts/db-query.mjs` and recorded in
`public.schema_migrations` with the file's SHA-256, exactly as
`20260728a` and `20260728d_verification_level_canonical` were.

### 5.2 Backfill

**None.** There is no data to migrate. All 14 tables begin empty, and no
existing row in any table is read, written or reclassified.

### 5.3 Rollback

Rollback is clean precisely because the change is purely additive and the
tables begin empty.

1. **Before any SQL, and the first line of defence:** set `NEXT_PUBLIC_DEAL_ROOM` off and redeploy. The slice becomes unreachable in under one deploy cycle with no database action at all. This is the rollback that should almost always be used.
2. **If the schema must be withdrawn:** drop in reverse dependency order - the 2 storage policies, then the bucket (only if it holds no objects; if it does, the retention decision comes first and is an owner call), then the 10 command functions and 4 helpers, then the 14 tables in child-before-parent order. Written out statement by statement in the migration file's own rollback section, per repository convention.
3. **What rollback cannot be:** dropping a table that has acquired real evidence. Once a member has uploaded evidence into a room, withdrawal becomes a retention decision, not a rollback. Recorded as a stop condition.
4. `is_deal_participant()`, the legacy cluster, `listings`, `profiles`, `organizations`, `verifications` and every existing bucket are untouched in both directions, so no rollback step can reach them.

### 5.4 Privacy and disclosure effects

- Evidence bytes move from nowhere to a private bucket that no anonymous or unauthorised authenticated caller can read.
- The invitation stores a token hash, never a raw token, and discloses only `preview_facts`.
- No new personal data category is introduced. No IP address or user agent is stored.
- The invitation URL carries a capability token in its path. Mitigations: high entropy, single use, short expiry, stored hashed, and `Referrer-Policy: no-referrer` on the landing route so the token cannot leak through a referrer header.
- Email carries the minimum permitted context and never carries evidence or private terms.

### 5.5 Tests and production verification

Before Gate B is claimed complete:

- unit tests for the procedure weight model against `assertWeights`, the derived progress value, the state machines and the momentum sentence;
- **negative RLS tests**, run as two real member sessions: sub-room A participant cannot select, count or infer sub-room B; an invited-but-not-admitted person cannot act; a read-only room refuses every mutation; the activity table refuses a member INSERT; the storage policy refuses a crafted path;
- desktop and 390 x 844 evidence, keyboard, screen-reader semantics and reduced motion for every surface;
- `npm run verify`, subject to section 7.

After Gate C, production verification mirrors the 28 July method: probe the 14
tables, every constraint, every index, every policy, the bucket and its
policies, and prove the negative access cases against production with a real
session before anything is activated.

---

## 6. Expected file list

Nothing outside this list is touched. No adjacent refactor, cleanup or
unrelated test expansion.

**Migrations (written at Gate B, applied at Gate C)**
- `supabase/migrations/20260729a_deal_room_core.sql`
- `supabase/migrations/20260729b_deal_room_rls.sql`
- `supabase/migrations/20260729c_deal_room_storage.sql`

**Domain and services**
- `lib/deal-room/types.ts`, `states.ts`, `permissions.ts`, `commands.ts`, `procedure.ts`, `progress.ts` (thin adapter over `lib/ponte/progress.ts`, not a second engine), `evidence.ts`, `blockers.ts`, `activity.ts`, `entitlement.ts`, `invitation.ts`, `integrity.ts`, `momentum.ts`, `flags.ts`
- `lib/deal-room/__tests__/` - one suite per module plus the negative-permission suite

**Routes** (all new, all under the flag)
- `app/[locale]/deal-rooms/` - portfolio, `[roomId]/` command view, `[roomId]/procedure`, `[roomId]/sub-rooms/[subRoomId]`, `.../evidence`, `.../evidence/[evidenceId]`, `.../blockers`, `[roomId]/activity`, `[roomId]/read-only`
- `app/[locale]/deal-rooms/propose/` - entry decision and master-room builder
- `app/[locale]/deal-rooms/invitation/[token]/` - unauthenticated landing
- `app/[locale]/deal-rooms/invitation/[token]/admission/` - admission checklist
- `app/api/deal-room/**` - command handlers and the signed-URL issuer

**Components**
- `components/deal-room/**` - composed from approved Ponte primitives only

**Messages**
- `messages/_fragments/deal-room.json`, and `messages/en.json` regenerated by `node scripts/build-messages.mjs` (never hand-edited; that fault broke CI once already)

**Source-of-truth updates in the same pull request**
- `docs/plans/active/deal-room-launch-slice.md`
- `docs/codex/CURRENT-STATE.md` (including the three stale records in section 1.2)
- `docs/codex/DATABASE-STATE.md`
- `docs/codex/FEATURE-FLAGS.md`
- `docs/codex/DECISION-LOG.md`
- `docs/decisions/ADR-0009-deal-room-technical-architecture.md` (status, and the missing PT-TECH reference)
- `docs/operations/OPERATIONS_LOG.md`
- `docs/launch/LAUNCH-BLOCKERS.md`
- `docs/launch/POST-LAUNCH-BACKLOG.md`

**Explicitly not touched:** `middleware.ts` (the temporary site password wall),
the landing, `lib/landing/*`, `lib/structure/*`, `lib/listings/*`,
`lib/verification/*`, the email system, `/marketplace`, any existing migration,
any existing table, policy or bucket, and anything Stripe.

---

## 7. Risks and stop conditions

### 7.1 `npm run verify` cannot pass on `main` today

Two independent repository faults, both found by running the checks on an
unmodified `main`, both **pre-existing and unrelated to this slice**:

1. `node scripts/check-migrations.mjs` **fails**: `20260728d_family_commercial_terms.sql` and `20260728d_verification_level_canonical.sql` share the identifier `20260728d`. Renaming is not free: the second file is **already applied to production and recorded in the ledger under that exact name with its SHA-256**, so the safe rename is the *unapplied* ADR-0014 file, which belongs to another workstream.
2. `node scripts/check-launch-mode.mjs` **fails**: it requires the single-line string `No additional cleanup, refactoring or adjacent improvement is authorised`, and `AGENTS.md` wraps that sentence across a line break, so `String.includes` misses it. The policy text is present and correct; the check's matching is line-sensitive.

CI (`.github/workflows/ci.yml`) runs neither check, and Netlify runs
`npm run build`, so **neither blocks merge or deployment**. Under the mandatory
decision test in `AGENTS.md` both are therefore **Post-Launch Tickets, not
Launch Blockers**, and both are logged as such rather than fixed here.

**But they block acceptance criterion 19 of issue #97** ("`npm run verify`
passes from a clean install"), which this slice cannot satisfy while they stand.
**Owner decision requested at Gate A:** authorise the two minimal repairs as
part of Gate B (rename the unapplied migration file; reflow one sentence in
`AGENTS.md` or make the check whitespace-tolerant), or accept criterion 19 being
evidenced step by step with these two pre-existing failures called out.

Separately and not a repository fault: `node scripts/check-deps.mjs` fails in
this worktree because dependencies are not installed in it. That is an
environment condition and is recorded as such, per `AGENTS.md`.

### 7.2 Other risks

| Risk | Handling |
|---|---|
| The design authority `PT-DESIGN-2026-07-27-01` is still marked *Proposed*, and ADR-0009 is *Proposed*. | Confirmed as a Gate A owner decision. Building against an unapproved design authority is a Constitution stop condition. |
| The **Deal Room Bridge** named by Constitution section 8 is unbuilt, and Constitution section 24 says a missing approved component is a stop-and-escalate condition, not permission to improvise. | Escalated now, before implementation. The slice must not substitute a card grid, tabs or a generic stepper. Owner direction needed: commission the bridge, or approve a named interim treatment. |
| The organisation layer is empty (section 2.5). | Handled by admission-time creation plus declared capacity. The wider model is post-launch. |
| A local dev server is a privileged production client (`docs/security/2026-07-28-local-environment-points-at-production.md`). | Development against the reviewed migration happens in a non-production setup. No slice code runs against production before Gate C. |
| Evidence in a room makes schema withdrawal a retention decision. | Recorded in 5.3; flag-off is the rollback of record. |
| Progress could drift from the Constitution's law if a second engine appears. | `lib/deal-room/progress.ts` is a thin adapter. `assertWeights` stays the single validator. |

### 7.3 Stop conditions - work halts and returns to the owner

1. Before applying **any** SQL to production.
2. Before creating or changing **any** storage bucket or storage policy.
3. Before turning on `NEXT_PUBLIC_DEAL_ROOM` in production.
4. Before merging the Gate B pull request.
5. Before any deployment.
6. Before touching the temporary site password wall, which stays exactly as it is.
7. Before anything Stripe, priced or charged.
8. If the Deal Room Bridge gap (7.2) is not resolved before the first Deal Room surface is built.
9. If implementation would require altering an existing table, policy, route or journey - that would break the additive guarantee this whole report rests on.

---

## 8. What this document did not do

- No SQL was applied. Every production statement executed was a `SELECT`.
- No production object was created, altered, dropped or renamed.
- No storage bucket or policy was created or changed.
- No legacy object was removed, and none is proposed for removal by this slice.
- No feature flag was set, no secret read into a document, no deployment made.
- No runtime code was written. Gate A is preflight only.
