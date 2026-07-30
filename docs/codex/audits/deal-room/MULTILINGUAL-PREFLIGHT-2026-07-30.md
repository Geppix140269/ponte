# Multilingual Deal Room preflight (LB-009)

- **Stage:** A, read-only audit and architecture reconciliation
- **Date:** 30 July 2026
- **Branch:** `agent/lb-009-multilingual-deal-room` (from `origin/main` at `2c21663`)
- **Authority:** ADR-0016, `docs/plans/active/multilingual-deal-room-launch.md`, LB-009
- **Production project:** `cptglsmjmzcfpjndqfmc` (Ponte Trade, eu-west-1)
- **Nature:** inventory and proposal only. No code shipped, no migration written to `supabase/migrations/`, no production action taken. Every schema and contract below is a proposal for Stage B, not an applied change.

This preflight records the current Deal Room and production state with file and schema
evidence, establishes whether the production schema must change, identifies the owner
decisions that gate the work, and proposes the message, translation, interpretation and
confirmation contracts. It closes each of the eighteen points the LB-009 brief requires.

> **Lane note (30 July 2026).** The database portion proposed below (the additive
> migration, the participant-language column, the SECURITY DEFINER commands and the
> activity event types) is delivered by the **Deal Room Core lane**, not by the
> multilingual foundation PR that carries this audit. The multilingual foundation PR
> contains only the non-UI, non-database language contracts and pure tests. The DB
> requirements are specified for Core in
> `docs/codex/audits/deal-room/CORE-HANDOFF-multilingual-database-20260730.md`. **No
> migration identifier is assigned by the multilingual lane;** Core allocates the next
> free identifier against `main` when it implements the schema. Any `20260730b`
> filename in the sections below is illustrative only and is superseded: `20260730b`
> is already taken on `main` by the LB-008 function-ACL correction. The full proposed
> SQL and its RLS/grant text-scan tests are preserved for Core to lift from branch
> `preserve/deal-room-multilingual-stageAB-20260730` at `166e3ce`.

---

## 0. Executive summary

- The Deal Room domain is real and applied. Migrations `20260729a` (15 tables) and
  `20260729b` (RLS, 4 helper predicates, ~18 command functions, 14 SELECT-only policies)
  are **applied to production**; `20260729c` (evidence storage bucket) is **not applied**.
  The slice is **behind Gate C**: `NEXT_PUBLIC_DEAL_ROOM` is unset, allowlist empty, zero
  rooms, nothing deployed.
- **There is no participant message domain, and no participant-language field anywhere.**
  Both are new. A participant-authored message cannot be represented by any existing object
  without harm, and extending `deal_room_activity_events.event_type` would pollute the
  append-only audit history.
- **A production schema change is required.** It must be additive, RLS-covered, command-gated,
  and written-but-not-applied, because a merge to `main` applies no SQL in this repository
  (PL-002: no non-production database; every migration is applied by hand with owner approval).
- **A provider is already present and approved: Anthropic** (`ANTHROPIC_API_KEY`, via
  `lib/ai.ts`). No new provider is strictly required to build the loop. What is **not** yet
  decided is the data-retention, residency and privacy posture for sending private Deal Room
  content to that provider, plus the un-metered legacy translation path. This is recorded as
  the single new owner decision, OD-010.
- **The existing listing-translation cache is public-scoped and unsafe to reuse** for private
  sub-room content as-is. Its pattern is instructive; its access model is not sufficient.
- **The "AI proposes, human confirms" lifecycle already exists** in `lib/products/model.ts`
  and `lib/products/extract-document.ts` and should be the model for interpretation proposals.
- **No async outbox or notification pathway reaches the Deal Room today.** Email is synchronous
  Resend; invitations are out-of-band token links, never emailed.
- **All provider-independent work can proceed now** through contracts, an additive schema
  proposal, a server-side translation/interpretation adapter with a deterministic test adapter,
  UI states and fail-closed tests. Provider approval (OD-010), the LB-008 fix, and every
  production gate remain owner-controlled and are not blocked by this work.

---

## 1. Exact Deal Room tables currently on `main`

Fifteen `deal_room_*` tables, created by `supabase/migrations/20260729a_deal_room_core.sql`
and verified in production (`docs/codex/DATABASE-STATE.md` lines 118-150):

`deal_rooms`, `deal_room_entitlements`, `deal_room_sub_rooms`, `deal_room_participants`,
`deal_room_invitations`, `deal_room_agreement_documents`, `deal_room_agreement_acceptances`,
`deal_room_procedures`, `deal_room_procedure_steps`, `deal_room_procedure_approvals`,
`deal_room_evidence`, `deal_room_evidence_versions`, `deal_room_clarifications`,
`deal_room_blockers`, `deal_room_activity_events`.

Salient columns for this work:

- `deal_room_sub_rooms` (`20260729a:252`): PK `id`, FK `room_id` CASCADE, UNIQUE `(room_id, ref)`,
  `kind`, `state`. The sub-room is the isolation unit.
- `deal_room_participants` (`20260729a:286`): FKs `room_id`, `sub_room_id` (null = master-level),
  `profile_id`; flags `is_required_approver`, `is_room_administrator`; partial unique indexes on
  `(sub_room_id, profile_id)` and `(room_id, profile_id) where sub_room_id is null`.
  **No language or locale column.**
- `deal_room_clarifications` (`20260729a:697`): free-text `question` and `answer`, target-constrained
  to an evidence item or a step. The only participant free-text with a two-party question/answer shape.
- `deal_room_activity_events` (`20260729a:767`): `event_type text not null` (free text, **not** a CHECK
  enum), `summary text not null`, `detail jsonb`, denormalised `actor_label`; only `created_at`;
  append-only.

The canonical structured deal state today is `deal_rooms.deal_snapshot jsonb`, an immutable snapshot
of the Deal at room creation. There is **no mutable "confirmed commercial terms" table**; the room is
organised around the procedure, not around a terms ledger.

## 2. Which Deal Room migrations are actually applied to production

Authority: `docs/codex/DATABASE-STATE.md` lines 104-224; `GATE-C-APPROVAL-1-2026-07-30.md`.

| Migration | State | Evidence |
|---|---|---|
| `20260729a_deal_room_core.sql` | **APPLIED** 30 Jul 2026, ledger 43 to 44, SHA `24932e4a...a78c8a` | 15 tables, 34 CHECKs, 52 FKs, 54 indexes, 9 triggers, 2 functions verified |
| `20260729b_deal_room_rls.sql` | **APPLIED** 30 Jul 2026 05:59:43 UTC, ledger 44 to 45, SHA `b379f869...ea3153` | 23 functions, 14 SELECT-only policies, append-only trigger; **one failed verification = LB-008** |
| `20260729c_deal_room_storage.sql` | **NOT applied, not attempted** | `deal-room-evidence` bucket does not exist; Gate C Approval 2 |

Governing constraint, load-bearing for this work: **a merge to `main` applies no SQL.** The automated
migration chain aborts at its first file, there is no non-production database (PL-002), and applying SQL
to production is a separate explicit owner decision (`DATABASE-STATE.md` lines 541-579, 716-721, 737-747).
Any migration this work produces is therefore additive, idempotent, documented in `DATABASE-STATE.md` as
written-not-applied, and left unapplied.

## 3. Current RLS policies and helper predicates

Source: `supabase/migrations/20260729b_deal_room_rls.sql`. RLS is enabled on all 15 tables. **Every member
policy is SELECT-only and scoped `to authenticated`; there are zero INSERT/UPDATE/DELETE policies and no
policy names `anon` or `service_role`.** All writes flow through SECURITY DEFINER commands.

Helper predicates (all `SECURITY DEFINER STABLE`, `search_path = public, pg_temp`):

- `deal_room_is_sub_room_participant(p_sub_room_id uuid)` (`:81`): membership of that sub-room in state
  `admitted`/`active`. This is the predicate a message/translation SELECT policy must reuse.
- `deal_room_is_master_participant(p_room_id uuid)` (`:100`).
- `deal_room_can_administer(p_room_id uuid)` (`:118`): initiator/sponsor or a room administrator.
- `deal_room_is_writable(p_room_id uuid)` (`:145`): room lifecycle state permits writes AND an entitlement
  row exists in a live state. Missing entitlement fails closed.
- `deal_room_can_read_evidence(p_evidence_id uuid)` (`:168`): per-visibility evidence read.

Representative policy shape (`deal_room_clarifications`, `:402`):
`deal_room_is_sub_room_participant(sub_room_id) or is_admin()`. This is the isolation model the multilingual
tables must copy: a row is readable only by a participant of the row's own sub-room.

## 4. Current Deal Room command functions and signatures

~18 command functions plus the central logger and two utilities, all in `20260729b` (verified 23
`deal_room_*` functions in production, 21 SECURITY DEFINER). The ones a message/interpretation loop
composes with:

- `deal_room_log_event(p_room_id, p_sub_room_id, p_event_type text, p_subject_type text, p_subject_id uuid, p_summary text, p_detail jsonb) -> uuid` (`:433`). Writes one attributed activity row. **No internal authz check** (by design; the other commands call it). Actor is derived from `auth.uid()` inside the function (looks up `profiles.full_name` and `organizations.name`); the caller cannot supply the actor. **This is the LB-008 surface** (section 8).
- `deal_room_propose(...)` (`:478`), `deal_room_invite(...)` (`:719`), `deal_room_accept_invitation(...)` (`:887`), `deal_room_declare_participation(...)` (`:980`), `deal_room_accept_agreement(...)` (`:1055`), `deal_room_admit_participant(...)` (`:1109`).
- `deal_room_request_clarification(p_evidence_id uuid, p_question text) -> uuid` (`:1401`) and
  `deal_room_answer_clarification(...)` (`:1446`): the closest existing "authored free text under a command" precedent; the multilingual commands should follow their authorisation shape.

Grants (`:1706`): every command except `deal_room_log_event` is `grant execute ... to authenticated`;
`anon` is granted execute on nothing in the file. The multilingual commands must be granted the same way,
and (learning from LB-008) must be **revoked from `anon` and `authenticated` by name** where they must not
be callable, not merely from `PUBLIC`.

## 5. Current participant, room, sub-room, event, evidence and procedure models

Application domain is pure modules in `lib/deal-room/` plus server-only DB row interfaces in
`lib/deal-room/queries.ts`:

- Vocabularies: `lib/deal-room/states.ts` (room, sub-room, participant, entitlement, procedure, step,
  evidence, clarification, blocker, agreement, invitation, operating modes).
- Central object: `lib/deal-room/procedure.ts` (`MarketFamily = products|services|distribution`, templates,
  weight law). ADR-0003: procedure before conversation.
- Row interfaces: `RoomAccess`, `SubRoomRow`, `ParticipantRow`, `EvidenceRow`, `BlockerRow`, `ProcedureRow`,
  `RoomOverview` in `queries.ts`; `Viewer`/`RoomContext` in `permissions.ts`.
- Capability predicates: `lib/deal-room/permissions.ts` (`participantMayAct` = only `admitted|active`;
  `canSeeSubRoomPortfolio` = room administrator only).
- Activity vocabulary: `lib/deal-room/activity.ts` (closed set of ~29 event types, past-tense labels).

`ParticipantRow` (`queries.ts:85`) has **no language attribute**. `locale` throughout the routes is only the
`[locale]` URL/i18n route segment, never persisted against a participant or profile.

## 6. Can any existing object represent participant-authored messages

**No.** There is deliberately no messages/notes/comments/chat/discussion surface. It is load-bearing in the
design:

- `app/[locale]/deal-rooms/[roomId]/page.tsx:39`: "The command view shows no message feed. The procedure is
  the spine."
- `app/[locale]/deal-rooms/[roomId]/workspaces/[subRoomId]/page.tsx:36`: "there is no message feed, and no
  navigation destination called 'Discussion'."

Structured free-text exists only attached to a specific record and written through a command: room `objective`
and `subRoomPurpose`, admission `authority`, blocker `title/description/requirement/note`, clarification
`question/answer`, evidence `title`. `deal_room_clarifications` is the nearest shape (two-party, authored,
command-written) but is bound to a single evidence item or step and has a one-question/one-answer lifecycle.
It is not a conversation channel and must not be overloaded into one.

Conclusion: a participant-authored message is a **new domain**. It is also a deliberate product boundary that
this work touches, so the message surface must remain inside the private sub-room and procedure context, not
become a generic messenger (ADR-0016 and the ExecPlan both say so).

## 7. Would extending an existing event type pollute audit history

**Yes, it would.** `deal_room_activity_events.event_type` is free text (`20260729a:772`), so nothing
structurally blocks a new value, but the table is the **append-only, attributable audit history**: trigger
`deal_room_activity_append_only` (`20260729a:793`) refuses UPDATE and DELETE for every role including the table
owner and `service_role`. Carrying participant-authored messages there would make each message a permanent,
unremovable, uneditable audit row, mixing authored content into the evidential event log and making a
correction impossible without a second audit row. The append-only guarantee is right for events and wrong for
messages (which need corrections as attributable follow-ups). Messages and their derived translations belong
in their own tables that reference the sub-room, with the activity log recording only that a message occurred.

## 8. Current Deal Room feature flag and allowlist state

Definition: `lib/deal-room/flags.ts`. `dealRoomRoutesEnabled()` = `process.env.NEXT_PUBLIC_DEAL_ROOM === "on"`
(`:33`); `allowlist()` parses server-only `DEAL_ROOM_ALLOWLIST` (empty/absent = nobody, `:44`);
`dealRoomAvailableTo(profileId, orgId)` requires both (`:61`). Single server gate `dealRoomGate()`
(`queries.ts:141`) is reused by every route and by the command actions; public invitation routes gate on the
flag only.

Production (`docs/codex/FEATURE-FLAGS.md:10`): `NEXT_PUBLIC_DEAL_ROOM` **not set, never activated**;
`DEAL_ROOM_ALLOWLIST` not set. Flags are `NEXT_PUBLIC_*`, evaluated at build time, changed only by redeploy.

Recommendation: a **dedicated multilingual capability flag** (proposed `NEXT_PUBLIC_DEAL_ROOM_MULTILINGUAL`),
so translation and interpretation can be disabled without coupling to the Deal Room routing flag, and so
safe-disable (section 17) removes derived presentation while preserving original messages and confirmed terms.
No flag is to be set in production by this work.

## 9. Existing notification and transactional-email pathways

Provider: **Resend**, `lib/email/send.ts` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_ALERT_EMAIL`).
Single dispatch path `sendTemplateEmail()` is **synchronous and always awaited**; on provider failure it
resolves rather than throwing, so a failed notification cannot roll back the state change it announced.
13 templates in `lib/email/templates.ts`; **none for the Deal Room**. Deal Room invitations are **not emailed**:
`actions.ts:160` mints a token, stores only its SHA-256, and redirects the sender to show the raw link once to
pass on out-of-band. There is **no email-log table** (the observer is an optional in-process callback).

Implication: notifications for the multilingual loop must be minimal, synchronous, awaited, and must never put
private message content in a subject line, analytics or logs (ExecPlan section 10). A Deal Room email template
is new work; the loop can be proven without email by in-room state, and email can be added narrowly for the
"awaiting your confirmation" and "translation failed, action needed" cases.

## 10. Existing AI-provider abstractions and expected secrets

Only one provider is present: **Anthropic**. Two adapters:

- `lib/ai.ts` (**canonical, metered**): `callAi`/`callAiJson` post to the Anthropic Messages API;
  `ANTHROPIC_API_KEY` required; models `MODEL_FAST = claude-haiku-4-5-20251001`,
  `MODEL_WORK = claude-sonnet-4-6`; `DEFAULT_TIMEOUT_MS = 60_000` with `AbortController`; **no retries**;
  every call recorded to `ai_calls` (token counts only, never content); HTTP error bodies truncated to 200
  chars so member content cannot leak into logs. **This is the client the multilingual adapter should reuse.**
- `lib/ai-vet.ts` (**legacy, un-metered**): direct fetch, no timeout, no retries, writes no `ai_calls` row;
  used by `translateListing` and the listing vetting helpers.

Secrets (names only): `ANTHROPIC_API_KEY`, `AI_VET_MODEL` (optional model override). Both in `.env.example`.
There is **no** `DEEPL_*`, `GOOGLE_TRANSLATE_*`, `AZURE_*` or `OPENAI_*` variable, and **no** zod/`env.mjs`
schema; env is read via raw `process.env.*`.

"AI proposes, human confirms" precedents to model the interpretation loop on:

- `lib/products/model.ts`: `Provenance` state machine `extracted | ai_identified | member_confirmed |
  ponte_verified | missing`; AI output arrives as `ai_identified` and can never auto-promote. This is the
  canonical lifecycle to reuse for interpretation proposals.
- `lib/products/extract-document.ts`: every extracted value MUST carry a verbatim source quote or it is
  dropped, not kept as low-confidence. This is the rule for interpretation source excerpts.
- `lib/landing/interpret.ts`: multilingual free text to structured output with language detection, metered,
  deterministic fallback. Directly relevant prior art.
- `lib/writeup/index.ts`: `PROMPT_VERSION` plus a SHA-256 payload hash as a stable cache key. The pattern the
  translation cache should adopt (and today lacks).

## 11. Current listing-translation mechanism and reusable patterns

`lib/ai-vet.ts:220` `translateListing({product, details}, targetLang)` calls Anthropic directly (legacy,
un-metered, no timeout, no retry). Cache table `listing_translations`
(`supabase/migrations/20260721c_translations.sql`): columns `listing_id`, `lang`, `product`, `details`,
`created_at`; PK `(listing_id, lang)`. Read/written server-side via the service-role admin client;
`app/[locale]/marketplace/l/[ref]/page.tsx:265` checks cache then translates on a miss.

Reusable **patterns**: translate-once-cache-forever keyed by target language; server-side only; JSON contract
that instructs the model to preserve numbers, units and Incoterms. **Not reusable as-is**: it stores **no
provenance** (no model, no model version, no source language, no confidence), and its access model is wrong
for private content (section 12).

## 12. Is the listing-translation access model strong enough for private sub-rooms

**No.** The cache key is `(listing_id, lang)` with **no room/participant/viewer dimension**, and the content is
served to anyone who can load the parent listing page, which serves **approved public listings to the public**
(`app/[locale]/marketplace/l/[ref]/page.tsx:287`). Its table RLS is enabled with no policies, which blocks
direct client reads but delegates all authorisation to the calling page. For a private Deal Room sub-room this
is insufficient: a Deal Room translation cache must carry the sub-room/message identity and enforce
authorisation from the requesting participant's permitted read (the `deal_room_is_sub_room_participant`
predicate), never from a service-role query alone. A cached translation must never be shared across permission
scopes. The listing mechanism is therefore a reference for shape only, not a component to reuse.

## 13. Existing asynchronous outbox infrastructure

**None.** There is no generic outbox, job queue, worker, `pg_cron` or Supabase Edge Function. The only
scheduled job is a GitHub Actions cron for sanctions refresh. `deal_room_activity_events` is a record, not a
dispatch queue: nothing polls it. Email retry is two synchronous inline attempts with no backoff
(`lib/email/send.ts`).

Consequence for translation, which must be asynchronous so a provider timeout does not hold a transaction open:
there is no existing outbox to reuse. The design must either add a minimal, durable, RLS-covered job row per
translation (enqueued inside the message command, processed by a server route or action, idempotent, bounded
retries) or perform translation in a fire-after-commit server action guarded so the original message is durably
stored first and a failure only sets the translation status to `failed`, never rolls back the message. The
message must be accepted before translation begins.

## 14. Data-retention and logging behaviour of existing AI/translation providers

`lib/ai.ts` records only token counts and an optional truncated error to `ai_calls`; it never logs request or
response content, and truncates HTTP error bodies to 200 chars to prevent content leaking into logs. The
legacy `lib/ai-vet.ts` (translation) writes no `ai_calls` row at all and `console.error`s a short slice of any
API error body. No analytics or monitoring vendor receives AI content.

What is **not** established in the repository: Anthropic's server-side retention terms for the content Ponte
sends, and whether sending private Deal Room negotiation text to a US-based API is acceptable under the data
residency and privacy posture the owner wants for the Deal Room. This is the substance of OD-010.

## 15. Legal, privacy, residency, cost or latency decisions requiring owner approval

Recorded as **OD-010** in `docs/operations/OPEN_DECISIONS.md` (added by this work). In summary:

- **Provider and data posture:** confirm Anthropic as the Deal Room translation and interpretation provider,
  and accept its data-retention, residency and privacy terms for private commercial negotiation content, or
  direct an alternative. Recommendation: use the existing approved Anthropic path via `lib/ai.ts` (metered,
  timed, content-safe logging), not the legacy un-metered `lib/ai-vet.ts` path.
- **Certified vs machine translation:** confirmed already by ADR-0016 (machine output is never certified,
  governing or legally authoritative). No further decision needed; recorded for completeness.
- **Native commercial review:** launch requires native review of launch-critical glossary and interpretation
  fixtures. This is an outstanding acceptance item, truthfully recorded as not yet supplied.
- **Production gates:** the additive migration, the multilingual flag, any secret, deployment and activation
  each remain separate owner approvals under AGENTS.md.

No new provider is selected by this preflight. Provider-independent work continues with a deterministic test
adapter regardless of OD-010's timing.

## 16. Whether the present production schema must change

**Yes.** The launch loop needs, and no existing object safely provides: a participant preferred Deal Room
language; an immutable participant-authored message with source language and content hash; derived
participant-specific translations with explicit status and provenance; participant corrections as follow-ups;
structured interpretation proposals with source excerpts and a lifecycle; a confirmation/rejection record; and
a canonical confirmed-terms store the interpretation confirmation writes to. The change is additive only;
section 18a proposes it; section 18b gives pre-migration and rollback. **It is written-not-applied.**

## 17. Whether the Deal Room base is activated or still behind Gate C

**Behind Gate C, not activated.** `GATE-C-APPROVAL-1-2026-07-30.md` section 9: 15 tables, RLS on all,
14 SELECT-only policies, 23 functions, agreement authority seeded, **0 rooms, 0 activity rows**, flag unset,
allowlist unchanged, nothing deployed. Approval 1 verification is **11 passed / 1 failed / 2 pending**:

- Failed: requirement 11 = **LB-008** (`anon` holds EXECUTE on all 23 functions, including
  `deal_room_log_event`). Fail-closed today only because the FK to `deal_rooms` blocks forged rows while zero
  rooms exist. **Must be fixed before any room is created.**
- Pending: entitlement fail-closed and cross-room / cross-sub-room isolation, provable only by
  `npm run deal-room:negative-access` (Gate C Approval 3), not yet run.

Remaining Gate C approvals: LB-008 fix; owner confirms the manual RLS containment; `20260729c` storage bucket
(Approval 2); negative-access run (Approval 3); flag + allowlist + deploy (Approval 4).

**Dependency this creates for LB-009:** the end-to-end multilingual loop needs a real room, which needs Gate C
progression, which needs the LB-008 fix. LB-008 is a separate blocker with its own owner track; LB-009's
provider-independent contracts, schema, adapters, UI states and fail-closed tests do **not** depend on it and
proceed now. The live two-participant E2E and production acceptance do depend on it and are sequenced after it.

## 18. Conflicts between ADR-0016 and existing repository authority

1. **English-only interface policy (`LANGUAGES.md`, `AGENTS.md`).** No hard conflict. ADR-0016 states it "does
   not supersede the English-only general interface policy" and "does not reactivate a general site interface."
   `LANGUAGES.md` already separates interface language (en), user input language (any), and canonical English
   output. The Deal Room message translation is a fourth, new concern: participant-to-participant content inside
   a private room. The constraint this imposes on implementation: the Deal Room language preference must **not**
   reactivate the site `LanguageSwitcher`, the next-intl `locales` array, or locale-prefixed routing. It is a
   Deal-Room-scoped preference, stored on the participant, independent of `i18n/routing.ts`.
2. **Older Deal Room launch-slice exclusion.** `docs/plans/active/deal-room-launch-slice.md:110` lists
   "multilingual work" among explicit launch-slice exclusions, and line 231 anticipates the extraction point if
   the language policy reopens. ADR-0016/LB-009 now **amends** that: multilingual participation is a launch
   requirement. Reconciliation is a Stage F documentation update to that plan (note the amendment; do not
   restate history), not a code conflict.
3. **Locale code set.** ADR-0016 uses `zh-CN` and `ar`; `i18n/routing.ts` `deferredLocales` uses `zh` and `ar`;
   no `zh-CN` region tag or BCP-47 speech map exists in code (the `SPEECH_LANG` reference in `LANGUAGES.md` is
   stale; the constant is absent from `components/home/landing/PonteLanding.tsx`). Resolution: the Deal Room
   supported-language set (`en`, `es`, `ru`, `zh-CN`, `ar`) is a **separate** BCP-47 constant for the Deal Room,
   not the interface `locales`. Unsupported or malformed values fall back to English, mirroring `resolveLocale`.
4. **RTL plumbing exists but is empty.** `i18n/routing.ts` has `rtlLocales: Locale[] = []`, `isRtl`, and
   `<html dir>` wiring, but no active RTL locale, no `<bdi>` anywhere, and Deal Room surfaces currently receive
   no `dir` handling. Arabic message presentation is genuinely new UI work: per-message `dir`/`dir="auto"` and
   `<bdi>` around mixed-script trade identifiers, driven by the message's own source or the viewer's preference,
   without corrupting the surrounding LTR layout. No conflict, but a real gap to build.
5. **House writing rule.** `LANGUAGES.md` forbids em dashes and fixes the untranslated trade-term list (Ponte,
   Ponte AI, NCNDA, Incoterms, unit/container codes, currency codes, listing refs, HS codes, company names).
   The glossary contract must encode exactly this list. No conflict; it constrains the glossary fixtures.

---

## 18a. Proposed domain contracts and additive schema (WRITTEN, NOT APPLIED)

Design goal: the cleanest fit that keeps original content immutable, derives translations per participant,
proposes interpretation without mutating canonical state, and inherits the sub-room boundary everywhere. The
tables below are a **proposal for Stage B**. Nothing here is applied, and the final table split is confirmed in
Stage B against the audit rather than fixed now.

**Participant preferred language (extend an existing table).**

- Add `preferred_language text` to `deal_room_participants`, CHECK in (`en`,`es`,`ru`,`zh-CN`,`ar`), nullable,
  application default and fallback `en`. Deal-Room-scoped, not a global profile-language migration. Set by a
  new command `deal_room_set_participant_language(p_participant_id uuid, p_language text)`, callable only by the
  participant themselves.

**Original messages (new table `deal_room_messages`) - immutable evidence.**

- Columns: `id uuid pk`, `room_id` FK CASCADE, `sub_room_id` FK CASCADE **NOT NULL** (messages live in a
  sub-room; master-level discussion is out of scope for the minimum loop), `author_participant_id` FK,
  `author_profile_id` FK, `source_language text` (CHECK in the supported set), `source_language_confidence text`
  (`declared`|`detected`|`uncertain`), `original_text text not null`, `content_sha256 text` CHECK hex64,
  `created_at`. Append-only via a `BEFORE UPDATE OR DELETE` trigger mirroring
  `deal_room_events_append_only()`. Written only by command `deal_room_post_message(p_sub_room_id, p_text,
  p_declared_language)`, granted to `authenticated`, which verifies sub-room membership and writability, stores
  the row, logs one `message_posted` activity event, and enqueues translation. Members hold no INSERT/UPDATE/
  DELETE policy; SELECT policy = `deal_room_is_sub_room_participant(sub_room_id) or is_admin()`.

**Corrections (new table `deal_room_message_corrections`) - follow-up, never mutation.**

- Columns: `id`, `message_id` FK CASCADE, `corrected_by_participant_id` FK, `corrected_text text not null`,
  `created_at`. A correction is an attributable new record; the original message row is never updated. SELECT
  inherits the message's sub-room boundary; written by command `deal_room_correct_message`.

**Derived translations (new table `deal_room_message_translations`) - participant-specific view.**

- Columns: `id`, `message_id` FK CASCADE, `target_language text` (supported set), `status text` CHECK in
  (`pending`,`completed`,`failed`,`provider_unavailable`,`source_uncertain`,`low_confidence`,`ambiguous`),
  `translated_text text` (nullable until completed), `provider text`, `model text`, `model_version text`,
  `glossary_version text`, `source_sha256 text` (binds to the immutable source; a superseding source or
  correction never mutates an old row), `confidence text`, `created_at`, `updated_at`. Cache identity =
  (`message_id`, `target_language`, `model`, `glossary_version`). RLS SELECT policy joins to the parent message
  and requires `deal_room_is_sub_room_participant(message.sub_room_id)`; never shared across permission scopes.
  Written only under the service role or a SECURITY DEFINER command from the authorised translation worker;
  members hold no write policy and cannot forge a translation row.

**Interpretation proposals (new table `deal_room_interpretation_proposals`) - advisory.**

- Columns: `id`, `room_id` FK, `sub_room_id` FK NOT NULL, `field text` (canonical commercial field key),
  `proposed_value jsonb`, `previous_value jsonb` (nullable), `party_position text` (which participant/org the
  position represents), `source_message_refs jsonb` (message ids plus verbatim source-language excerpts, within
  safe copyright/privacy bounds), `status text` CHECK in
  (`proposed`,`confirmed`,`rejected`,`superseded`,`disputed`), `confidence text`, `ambiguity text`,
  `provider text`, `model text`, `model_version text`, `created_at`. Written by the service role/worker; never
  by a member; it can never itself change canonical state. Modelled on `lib/products/model.ts` provenance and
  `extract-document.ts` (every value carries a source excerpt or is dropped). SELECT inherits the sub-room
  boundary.

**Confirmation and canonical terms (new tables `deal_room_term_decisions` and `deal_room_terms`).**

- `deal_room_terms`: the canonical confirmed commercial facts, one current value per (`room_id`, `field`) with
  an append-only history and a `current bool`. English-canonical. This is the state AI cannot mutate directly.
- `deal_room_term_decisions`: `id`, `proposal_id` FK, `decided_by_participant_id` FK, `capacity_label text`,
  `organisation_label text`, `previous_value jsonb`, `decided_value jsonb`, `decision text`
  (`confirm`|`reject`), `created_at`. Command `deal_room_confirm_interpretation(p_proposal_id)` and
  `deal_room_reject_interpretation(p_proposal_id, p_reason)`, granted to `authenticated`, verify the caller's
  authority (principal participant of the sub-room with the relevant capacity), record the decision, and on
  confirm write/supersede the `deal_room_terms` row and log an activity event. A rejection preserves the
  proposal and records the rejection; incompatible party positions are preserved as `disputed`, never merged.

**Domain distinctions this preserves** (as the ExecPlan requires): original statement, derived translation,
participant correction, interpretation proposal, confirmed canonical fact, disputed position, append-only audit
event are seven distinct records, not one overloaded object.

**Server-side adapter (provider-independent, no browser calls).** A `lib/deal-room/translation/` module with an
explicit input contract, the supported-language allowlist, a timeout via `AbortController`, bounded retries,
safe error mapping to the status enum, no unauthorised content in logs, stable provenance fields, reuse of
`lib/ai.ts` (metered, content-safe) for the real provider, and a **deterministic test/fixture adapter** so
every contract and UI state is testable without a live provider or OD-010.

## 18b. Pre-migration and rollback (for the proposed additive migration)

Following `DATABASE-STATE.md` "Required pre-migration report":

1. **Target outcome:** the minimum cross-language loop of ADR-0016, section 84.
2. **Current production objects relevant:** the 15 `deal_room_*` tables, their RLS, the 4 helper predicates and
   the command grant pattern (sections 1-4). Live-inspect before proposing the final DDL; do not infer from
   files.
3. **Matching repository migrations:** `20260729a`, `20260729b` applied; `20260729c` not applied.
4. **Drift / manual SQL:** the manual RLS containment between `a` and `b` (owner confirmation pending); the
   LB-008 anon-EXECUTE defect. The multilingual migration must (a) enable RLS on every new table, (b) grant
   commands to `authenticated` and **revoke from `anon` and `authenticated` by name** where not callable,
   avoiding the LB-008 class, (c) never rely on `revoke ... from public` alone.
5. **Forward migration:** additive only. New tables plus one nullable column on `deal_room_participants`. No
   existing table, column, constraint, policy, function or trigger altered. Idempotent where practical
   (`if not exists`, guarded policy creation).
6. **Rollback / safe-disable:** primary rollback is the multilingual capability flag (unset and redeploy),
   which removes derived presentation while leaving original messages and confirmed terms intact. Schema
   withdrawal is a reverse-order drop of the new tables and the added column, clean only while empty; once a
   member has posted a message it becomes a retention decision, not a rollback step.
7. **Backfill / idempotency:** none; all new tables begin empty; the added column defaults to null and is read
   as `en`.
8. **Privacy / disclosure:** message and translation content is private sub-room data; no policy broadens any
   read; translations never cross the sub-room boundary; no content enters logs, analytics or email subjects.
9. **Tests and production verification:** fail-closed RLS tests, negative-access across rooms and sub-rooms,
   immutability and provenance tests, confirmation-gate tests, and a production probe after any separately
   authorised application, mirroring the Gate C pattern.

**The migration will be documented in `DATABASE-STATE.md` as written-not-applied and will not be applied.**

---

## 19. Owner decisions and stop conditions carried out of Stage A

- **OD-010 (new):** Deal Room translation/interpretation provider and data-retention/residency/privacy posture.
  Recommendation: existing approved Anthropic path via `lib/ai.ts`. Provider-independent work proceeds
  regardless with a test adapter.
- **Native commercial review** of launch-critical glossary and interpretation fixtures: outstanding, recorded
  truthfully as not yet supplied.
- **Dependency on LB-008:** the live E2E and production acceptance need a real room, which needs the LB-008 fix
  and Gate C progression; provider-independent contracts, schema, adapters, UI states and tests do not.
- **Stop conditions (unchanged):** no migration applied, no Storage bucket, no secret, no provider contracted,
  no flag set, no deployment, no merge of the implementation PR, no full-site localisation change. Every such
  step is a separate owner approval.

## 20. Exact next implementation stage

**Stage B - contracts and fail-closed tests**, provider-independent:

1. Add the BCP-47 Deal Room supported-language constant and `resolveLocale`-style validation/fallback (separate
   from `i18n/routing.ts`).
2. Author the message, translation, interpretation, confirmation and glossary TypeScript contracts in
   `lib/deal-room/` with the seven distinct record types.
3. Write the additive migration to `supabase/migrations/` as written-not-applied, with RLS on every new table,
   command functions granted to `authenticated` and revoked from `anon`/`authenticated` by name where not
   callable, and the append-only trigger on `deal_room_messages`.
4. Build the server-side translation/interpretation adapter with a deterministic test adapter.
5. Fail-closed contract tests: supported-locale validation and English fallback; immutable original; translation
   status transitions and provenance; cache identity; provider timeout and failure mapping; glossary preservation
   of trade identifiers; interpretation proposal and confirmation/rejection lifecycle; disagreement preservation;
   audit event creation; inability of AI output to change canonical terms directly.
6. Extend the negative-access fixture: non-participant, invited-not-admitted, sub-room A vs sub-room B for
   messages, translations, translation status/counts and AI context; read-only participant cannot post or
   confirm; no forged translation, proposal or audit row; no confirmation outside authority; crafted identifier
   grants nothing.

Stages C (message loop), D (interpretation/confirmation/disagreement), E (five-language fixtures, Arabic RTL,
notifications, visual evidence) and F (validation, documentation reconciliation, draft PR) follow, with all
production actions deferred to explicit owner approval.
