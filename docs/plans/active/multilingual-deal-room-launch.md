# ExecPlan — Multilingual Deal Room launch requirement

- **Status:** Active planning; no implementation authorised by this document alone
- **Owner:** Giuseppe Funaro
- **Authority:** ADR-0016, ADR-0009, issue #109, LB-009
- **Created:** 30 July 2026

## 1. Purpose and user outcome

A verified and admitted participant can enter a Ponte Deal Room, communicate in English, Spanish, Russian, Simplified Chinese or Modern Standard Arabic, read authorised discussion in their own preferred supported language, inspect the original wording and confirm or reject Ponte's proposed structured interpretation before it changes the canonical deal state.

The outcome is one controlled commercial record across multiple participant languages, not five independent versions of the deal.

## 2. Authority consulted

Before implementation, read and reconcile:

- `AGENTS.md`;
- `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`;
- `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`;
- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`;
- `docs/codex/00-START-HERE.md`;
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`;
- `docs/decisions/ADR-0009-deal-room-technical-architecture.md`;
- `docs/decisions/ADR-0016-multilingual-deal-room-interpretation.md`;
- `docs/plans/active/deal-room-launch-slice.md`;
- `LANGUAGES.md`;
- `docs/codex/DATABASE-STATE.md`;
- `docs/codex/FEATURE-FLAGS.md`;
- `docs/launch/LAUNCH-BLOCKERS.md`;
- `docs/operations/OPERATIONS_LOG.md` and `OPEN_DECISIONS.md`.

## 3. Current implementation to inspect

The implementer must verify rather than assume:

- the current `deal_room_*` schema, migrations, RLS policies and command functions;
- message, event, evidence, participant and sub-room models already present;
- the existing AI and structured-term services used elsewhere in Ponte;
- the current listing translation mechanism and whether any safe cache or provenance pattern is reusable;
- locale detection and deferred locale infrastructure;
- notification and transactional-email pathways;
- the Deal Room feature flag and Gate C activation state;
- existing audit and evidence conventions;
- any external-provider contracts, secrets or data-residency constraints.

Record findings before choosing a provider or schema.

## 4. Scope

### Included

- Deal Room participant preferred language for `en`, `es`, `ru`, `zh-CN` and `ar`;
- original-language message preservation;
- participant-specific translated display;
- view-original interaction;
- translation pending, failed, uncertain and corrected states;
- multilingual room summaries and structured commercial fact proposals;
- confirmation or rejection before canonical deal-state mutation;
- disagreement preservation;
- translation and interpretation provenance sufficient for audit;
- notifications required to continue the multilingual Deal Room loop;
- Arabic RTL message presentation and mixed-script trade identifiers;
- permission isolation for translations, summaries and AI context;
- resume, history and evidence behaviour.

### Explicit exclusions

- general public-site localisation;
- localised Explore, Find, Start a Deal, account or admin journeys;
- translated SEO and acquisition programmes;
- certified legal translation;
- country-specific Arabic variants;
- unsupported languages;
- automatic acceptance of interpreted terms;
- redesign of the Deal Room Bridge or unrelated Deal Room functionality.

## 5. Product rules

1. The exact original participant text is immutable evidence.
2. Translation is a derived participant-specific view, not a new message.
3. English remains the canonical structured domain language.
4. AI interpretation proposes; an authorised participant confirms or rejects.
5. Conflicting party positions remain separate and visible.
6. Failed or ambiguous translation is explicit and cannot be disguised as success.
7. Translated and derived content inherits the source room and sub-room permission boundary.
8. Standard trade identifiers remain stable across languages.
9. No translated output is called certified, governing or legally authoritative.
10. Provider failure must fail honestly without blocking access to the original authorised message.

## 6. Technical design work

### Stage A — Read-only audit and decision paper

- Map current Deal Room data and service boundaries.
- Identify whether a new message domain is needed or whether an existing event type can be extended safely.
- Define the canonical message, translation, interpretation and confirmation contracts.
- Compare provider options for quality, supported languages, privacy, retention, region, latency, cost and reproducibility.
- Record any production migration, secret or provider decision in `OPEN_DECISIONS.md` for owner approval.

### Stage B — Contracts and fail-closed tests

Before UI work, define and test:

- source message ownership and immutability;
- translation status and provenance;
- target-language cache key and invalidation;
- participant correction without source mutation;
- structured-term proposal and confirmation lifecycle;
- room and sub-room RLS boundaries;
- AI-context construction only from authorised reads;
- safe provider timeout and failure behaviour.

### Stage C — Message loop

Implement the minimum cross-language loop:

- preferred Deal Room language;
- send in own language;
- authorised recipient translated display;
- view original;
- pending, failed and ambiguity states;
- resume and history.

Do not add unrelated chat features.

### Stage D — Commercial interpretation

- Extract only supported commercial facts.
- Cite the source message or messages behind each proposal.
- Present old value, proposed value and source wording.
- Require explicit confirmation or rejection.
- Preserve incompatible positions as a disagreement.
- Audit every confirmed state change.

### Stage E — Supported-language quality

For each language, maintain fixtures and an approved Ponte trade glossary covering the launch facts. Arabic receives separate RTL and mixed-script evidence.

Native commercial review is required for launch-critical wording and interpretation fixtures. Machine parity alone is insufficient.

### Stage F — Activation gate

Production migration, provider secret, feature flag, deployment and activation each require explicit owner approval under `AGENTS.md`.

## 7. Migration plan

No migration is approved yet.

If the audit requires schema changes, the proposal must:

- inspect live production first;
- remain additive and idempotent where practical;
- preserve existing Deal Room records;
- keep untranslated source messages readable during rollback;
- prevent partial states where a translation exists without an authorised source;
- update `DATABASE-STATE.md` and the migration ledger evidence;
- provide rollback or safe-disable behaviour that leaves original messages intact.

## 8. Experience states

Every relevant surface must account for:

- loading translation;
- translated successfully;
- original language already matches preference;
- source language uncertain;
- translation unavailable or failed;
- commercially ambiguous wording;
- interpretation proposed;
- interpretation rejected;
- interpretation confirmed;
- conflicting party positions;
- participant correction;
- provider outage;
- resumed room;
- read-only participant;
- blocked or removed participant;
- reduced motion;
- keyboard and screen-reader use;
- desktop and 390 × 844;
- Arabic RTL text mixed with Latin codes, numbers, currencies and Incoterms.

## 9. Validation

Minimum evidence before LB-009 can close:

- unit and contract tests for immutable originals and provenance;
- negative-access tests across rooms and sub-rooms;
- tests proving AI cannot update canonical deal terms without confirmation;
- tests for failure, ambiguity and disagreement states;
- fixtures for all five supported languages;
- rendered desktop and 390 × 844 evidence;
- Arabic mixed-script and RTL evidence;
- resume and audit-trail tests;
- transactional notification checks where required by the loop;
- `npm run verify`, separating any pre-existing repository failure;
- deploy-preview review;
- separately authorised production acceptance following the Gate C pattern.

## 10. Rollout and safe-disable

- Keep the capability behind a dedicated flag until production acceptance.
- Safe-disable removes translated presentation and interpretation actions but preserves authorised access to original messages and existing confirmed canonical terms.
- Do not activate a language until its fixtures and native review pass.
- Provider failure must degrade to original-language access with a clear status.
- Monitor translation failures, correction rates, ambiguity rates, confirmation rejection rates and latency without logging unauthorised message content.

## 11. Progress log

### 30 July 2026

- Owner accepted multilingual Deal Room interpretation as a day-one requirement.
- Issue #109 records the wider localisation proposal.
- ADR-0016 created.
- LB-009 proposed in the canonical launch register.
- No code, migration, secret, provider, feature flag, deployment or production action performed.

**Reconciliation after PR #107 and the `LB-008` `anon` EXECUTE defect.** This governance branch was created before PR #107 merged. PR #107 then merged and canonically took `LB-007` for Market Signals search, and a separate merged Gate C defect took `LB-008` on `main`, so the launch register's next free identifier became `LB-009`. This branch was rebased onto current `main` and the multilingual Deal Room blocker was renumbered from its original `LB-007` to `LB-009` on the owner's decision of 30 July 2026. The Market Signals `LB-007` and the `anon` EXECUTE `LB-008` entries and their history are preserved unchanged.

## 12. Decisions and discoveries

- **Owner decision:** the Deal Room must support cross-language participation from day one.
- **Boundary:** full-site localisation remains separate and demand-led.
- **Canonical rule:** one English structured deal state, multiple participant-language representations.
- **Safety rule:** original language survives; AI interpretation cannot silently commit.
- **Pending technical decisions:** provider, storage contract, migration need, feature flag and production activation.

## 13. Final evidence

To be completed with commits, pull requests, checks, deployment evidence, production probes and remaining limitations. This plan is not complete while LB-009 remains open.
