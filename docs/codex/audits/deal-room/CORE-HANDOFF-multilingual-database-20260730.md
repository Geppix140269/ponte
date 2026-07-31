# Core handoff: multilingual Deal Room database portion (LB-009)

- **Date:** 30 July 2026
- **From:** multilingual lane (`agent/multilingual-foundation-20260730`)
- **To:** Deal Room Core lane (owns UI, server actions, database functions and schema)
- **Nature:** requirements only. This document implements nothing and assigns no migration identifier.

The multilingual foundation PR delivers the non-UI, non-database language contracts and
their pure tests. Everything that touches the `deal_room_*` schema, its command functions,
or the shared activity vocabulary is Core-lane-owned and specified here. A complete,
ready-to-lift proposed migration and its RLS/grant text-scan tests already exist on the
preservation branch `preserve/deal-room-multilingual-stageAB-20260730` at `166e3ce`
(`supabase/migrations/20260730b_deal_room_multilingual.sql`,
`lib/deal-room/__tests__/multilingual-rls.test.ts`,
`lib/deal-room/__tests__/multilingual-grants.test.ts`). Core may adopt them verbatim or
re-derive; the requirements below govern either way. Full design rationale is in
`MULTILINGUAL-PREFLIGHT-2026-07-30.md` sections 18a and 18b.

## 0. Hard dependency: LB-008

Do not create a live room, apply this migration, run production negative-access fixtures,
or activate anything until LB-008 is fully closed. As of `main` `b8f3db5`, the LB-008
function-ACL correction (`20260730b_deal_room_function_acl.sql`) is **applied**, but
LB-008 remains ACTIVE because `authenticated` still holds EXECUTE on 22 functions rather
than the specified 19 (Supabase default privileges the file-text fix cannot see). This
migration must not reintroduce that class (section 4).

## 1. The four required activity event types

Add to the closed vocabulary in `lib/deal-room/activity.ts` (`ACTIVITY_EVENT_TYPES` and
`ACTIVITY_EVENT_LABEL`), and only there:

| event_type | label | written by |
|---|---|---|
| `message_posted` | Message posted | `deal_room_post_message` |
| `message_corrected` | Message correction added | `deal_room_correct_message` |
| `interpretation_confirmed` | Interpretation confirmed | `deal_room_confirm_interpretation` |
| `interpretation_rejected` | Interpretation rejected | `deal_room_reject_interpretation` |

Rules: the **message content is never stored in `deal_room_activity_events`**; the event
only records that a message occurred and references it by id. AI proposals are deliberately
absent from the vocabulary: a proposal is system output, not a participant act, so only its
human confirmation or rejection is recorded, each with real `auth.uid()` attribution.

## 2. Participant-language database requirements

- Add `preferred_language text not null default 'en'` to `deal_room_participants`,
  with a CHECK constraining it to `('en','es','ru','zh-CN','ar')`.
- Deal-Room-scoped by design: it is the participant's language for one room, **not** a
  global profile-language and **not** the site interface locale. It must not feed
  `i18n/routing.ts` or the site language switcher.
- Set only by the participant themselves through a command (section 3), never by another
  member. Server-side validation should reuse the lane contract
  `resolveDealRoomLanguage` / `isSupportedDealRoomLanguage` from `lib/deal-room/language.ts`;
  a malformed or unsupported stored value resolves to English.
- No separate preference table: the owner approved the column, and no normalisation or
  lifecycle requirement was found that the column cannot satisfy.

## 3. Proposed database functions

All `SECURITY DEFINER`, `set search_path = public, pg_temp`. Each must enforce its own
authority internally; being authenticated is never sufficient.

Member commands (grant `authenticated`):
- `deal_room_set_participant_language(p_participant_id uuid, p_language text)` — caller must be that participant; validates the language.
- `deal_room_post_message(p_sub_room_id uuid, p_source_language text, p_original_text text, p_content_sha256 text)` — caller must be an admitted/active participant of the sub-room; room must be writable; stores the immutable message; logs `message_posted`.
- `deal_room_correct_message(p_message_id uuid, p_corrected_text text)` — caller must be the original author and a sub-room participant; inserts an attributable correction; logs `message_corrected`.
- `deal_room_confirm_interpretation(p_proposal_id uuid)` — caller must be an admitted/active `participant_class='principal'` of the proposal's sub-room; room writable; supersedes/writes the canonical term; records the decision; logs `interpretation_confirmed`.
- `deal_room_reject_interpretation(p_proposal_id uuid, p_reason text)` — same authority; preserves the proposal; records the rejection; logs `interpretation_rejected`.

Worker commands (grant `service_role` only):
- `deal_room_record_translation(p_message_id, p_target_language, p_status, p_translated_text, p_provider, p_model, p_model_version, p_glossary_version, p_source_sha256, p_confidence)` — upsert one translation per `(message_id, target_language)`.
- `deal_room_record_interpretation(p_room_id, p_sub_room_id, p_field, p_proposed_value jsonb, p_previous_value jsonb, p_party_position, p_party_participant_id, p_source_message_refs jsonb, p_status, p_confidence, p_ambiguity, p_provider, p_model, p_model_version)` — insert an advisory proposal; must reject an empty `source_message_refs`.

Plus an internal generic append-only trigger function (e.g. `deal_room_row_append_only()`),
granted to no member role.

## 4. RLS and grant requirements

Six new tables (`deal_room_messages`, `deal_room_message_corrections`,
`deal_room_message_translations`, `deal_room_interpretation_proposals`, `deal_room_terms`,
`deal_room_term_decisions`):

- Enable RLS on every one.
- Member policies are **SELECT-only**, scoped `to authenticated`; there are **no member
  INSERT/UPDATE/DELETE policies** — all writes go through the commands.
- The message-derived tables reuse the existing predicate
  `deal_room_is_sub_room_participant(sub_room_id)`, so a participant of one sub-room can
  read nothing of another: no row, count, id, status or translation.
- Canonical terms (`deal_room_terms`) are room-level deal state, read via
  `deal_room_is_master_participant(room_id)` / `deal_room_can_administer(room_id)`. See the
  open design question in section 6.
- `deal_room_messages`, `deal_room_message_corrections` and `deal_room_term_decisions` are
  append-only (BEFORE UPDATE OR DELETE trigger), so evidence and decisions cannot be
  rewritten by any role including the owner.

**Grants must avoid the LB-008 class.** For every new function, `revoke all on function ...
from public, anon, authenticated` **by name**, then grant only to the intended role
(members to `authenticated`, workers to `service_role`). A `revoke ... from public` alone
does not remove Supabase's default explicit grants to `anon` and `authenticated` — that is
exactly the LB-008 defect. No function may be granted to `anon`.

## 5. Migration tests required

- An RLS/structure text-scan asserting: RLS enabled on all six tables; exactly one
  SELECT/authenticated policy each; no INSERT/UPDATE/DELETE policy anywhere; no policy names
  `anon`; sub-room-scoped tables read through `deal_room_is_sub_room_participant`;
  append-only triggers on messages/corrections/decisions; the translation text-presence
  CHECK; the cache-identity unique constraint; the source-reference non-empty CHECK; the
  participant-language CHECK.
- A grants text-scan asserting every declared function is revoked from `anon` and
  `authenticated` by name; member commands granted to `authenticated`; worker commands to
  `service_role` and never to `authenticated`; nothing granted to `anon`.
- Reference implementations of both exist on the preservation branch
  (`multilingual-rls.test.ts`, `multilingual-grants.test.ts`).
- After application, production probes in the Gate C pattern: catalogue proof that `anon`
  has EXECUTE on zero new functions; a real anon RPC to a worker command returns permission
  denied; cross-sub-room reads return nothing.

## 6. Dependencies and open questions for Core

- **Migration identifier:** allocate the next free dated identifier against `main` at
  implementation time. The multilingual lane assigns none. `20260730b` is taken.
- **Existing predicates reused:** `deal_room_is_sub_room_participant`,
  `deal_room_is_master_participant`, `deal_room_can_administer`, `deal_room_is_writable`,
  `is_admin`, `touch_updated_at`, and the append-only trigger pattern.
- **Content hash:** messages carry `content_sha256` and translations carry `source_sha256`
  (hex64). The application computes them (no `pgcrypto` dependency in migrations); the
  translation worker binds a translation to its own re-hash of the text it read.
- **Open design question (owner):** whether canonical terms should be room-level (one deal
  state, as proposed and correct for the single-counterparty launch loop) or sub-room-scoped
  in multi-provider rooms. Flagged for owner confirmation before multi-sub-room rooms.
- **Provider boundary (OD-010):** the worker commands persist provider output but the real
  provider stays inactive until OD-010 is decided; the deterministic adapter drives tests.

## 7. What the multilingual lane provides for Core to build against

Stable, tested, non-UI contracts the DB layer and its callers should use:
`lib/deal-room/language.ts`, `messages.ts`, `interpretation.ts`, `glossary.ts`,
`language-detection.ts`, and `translation/*`. These fix the supported languages, the
translation status set and honesty invariant, the provenance and cache identity, the
interpretation evidence and confirmation-attribution rules, the disagreement model, the
controlled trade glossary, and the provider interface with a deterministic adapter.
