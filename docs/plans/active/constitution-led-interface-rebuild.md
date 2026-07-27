# ExecPlan — Constitution-led interface rebuild

**Status:** Active
**Authority:** ADR-0010, Ponte Design Constitution v1, Bridge System v1
**Audit baseline:** `docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md`
**Format:** `.agent/PLANS.md`

---

## 1. Purpose and user outcome

Every public and authenticated Ponte screen should read as one product: warm
paper, ink-led editorial typography, one deliberate gold emphasis, Ponte Flow
line icons, bridge geometry where the interaction is a crossing, structured
evidence, and states that tell the truth about what is happening.

Today a member crossing from the landing to the composer to verification passes
through three different visual systems and two different icon sets. The outcome
is a member who can move through a commercial journey without the interface
changing identity underneath them, and without a screen ever implying review,
verification or completion that has not happened.

## 2. Authority consulted

Binding, in Constitution §2 order:

1. `docs/decisions/ADR-0008` (this programme's scope), `ADR-0002`
2. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
3. `design/authority/bridge/v1/` — README, APPROVAL, implementation notes, `source/ponte-bridge.css`
4. `design-system/ponte-flow/` — tokens, registry, icons, motion, 10 documentation files
5. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, `00-MASTER-IMPLEMENTATION-BRIEF.md`
6. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`
7. `AGENTS.md`, `CLAUDE.md`, `docs/codex/SOURCE-OF-TRUTH-SOP.md`

## 3. Current implementation discovered

From the Phase 1 audit, verified against the repository at `71b3817`:

- **Reusable:** `PonteIcon` (correct Flow contract, typed labelled keys),
  `lib/desk/facts.ts`, `lib/desk/adapter.ts`, `lib/desk/journey.ts`,
  `lib/desk/entrances.ts`, `DeskShell`, `FactRegister`, `RecordCard`,
  `KnowledgeBoundary`, `AccountGate`, `DeskLoginForm`.
- **Token state:** `desk.css` declares 46 custom properties whose values are
  **byte-identical** to the approved `--pf-*` set. This is duplication under
  different names, not divergence — an aliasing problem, not a colour problem.
- **Seams:** `ChromeGate` decides which routes escape the obsidian shell.
  Feature flags `NEXT_PUBLIC_FIND_JOURNEY` and `NEXT_PUBLIC_STRUCTURE_JOURNEY`
  decide destinations through `lib/landing/routing.ts`.
- **Constraints:** 3,517 public signals carry null HS codes (Issue #42), so no
  sector count can be shown. Zero listings pass the publication gate.

## 4. Scope

**In:** all 28 user-facing routes, the 5 administrative routes (per ADR-0010),
all 55 shared components, all applicable lifecycle states, desktop and
390 × 844, keyboard, screen reader, reduced motion.

**Excluded:**

- business logic, routes, authentication, permissions, schemas, data contracts,
  lifecycle rules, commercial behaviour (§12 below);
- database migrations;
- feature-flag values;
- the `/marketplace` retire-or-rebuild decision (ADR-0010 leaves it open);
- Lottie or any new animation runtime.

## 5. Product rules

- Market Signals and Member Opportunities stay visually and linguistically
  distinct (Constitution §14).
- A fact the record does not state reads `Not stated`; nothing is inferred.
- Gold is brand signal, moving point, active choice and approved editorial
  emphasis only. Never verification, approval, warning, success or completion.
- Progress never shows 0%; first visible value falls between 18% and 25%;
  values are deterministic, weighted and irregular.
- A moving point means work is happening now. Waiting uses a halted state.
- Evidence, declaration, review, verification and approval remain five separate
  states.

## 6. Technical design

**Phase 2 shared foundation, in dependency order:**

1. Import `ponte-flow-tokens.css` once globally; convert `desk.css` custom
   properties to aliases (`--surface: var(--pf-surface)`), deleting no value.
2. Import `ponte-flow-motion.css` and `ponte-flow-reduced-motion.css`.
3. `components/ponte/bridge/` — React primitives translating
   `ponte-bridge.css` geometry: `Route`, `Progress`, `Header`, `Journey`,
   `Connection`, `DealRoom`, mirroring the approved `PB.*` API without
   reinterpreting measured station positions.
4. `lib/ponte/progress.ts` — weighted deterministic completion, pure function
   of the completed set, weights summing to 100, floor 18–25%, never 0.
5. `components/ponte/state/` — shared loading, empty, error, blocked, waiting,
   completed surfaces.
6. `lib/ponte/motion.ts` — reduced-motion hook and H01–H12 trigger bindings.

**Phase 3** composes these per journey. No journey PR may introduce a primitive
that belongs in Phase 2.

## 7. Migration plan

No data migration. Presentation only. Each journey PR is independently
revertable. Legacy CSS is removed only in Phase 4, after its replacement is
verified in production.

Forward path per route: mount `DeskShell`, add the route to `ChromeGate`'s
bared list, replace icons with registry keys, replace local tokens with
aliases, add the missing lifecycle states, then delete the orphaned stylesheet
in Phase 4.

## 8. Experience states

Every journey PR must deliver, where applicable: default, loading, empty,
incomplete, ambiguous, error, blocked, waiting, resumed, completed, expired,
withdrawn. Plus 390 × 844, desktop, keyboard focus, screen-reader labels and a
reduced-motion equivalent that removes movement without removing information.

Reduced motion is a **removal**, never a redraw: every Flow component is
authored in its end state, so the settled frame is already correct.

## 9. Validation

Per PR: `npm run governance:check`, `npm run verify`, targeted journey tests,
desktop and 390 × 844 evidence, keyboard-focus confirmation, reduced-motion
confirmation, motion evidence where animation changed.

Environment failures (screenshot capture, preview origins, external
integrations) are recorded separately from repository failures.

## 10. Rollout and safe-disable

No new flags. Each journey PR is a revert-one-commit rollback. Phase 4 legacy
removal is the only irreversible step and runs last, per journey, after
production verification.

## 11. Progress log

- **27 Jul 2026** — Phase 1 audit completed and accepted as baseline. ADR-0010
  drafted. Headline correction opened as PR #60 (separately, already
  authorised). Phase 2 not started; blocked on ADR-0010 merge.

## 12. Decisions and discoveries

- **Correction to the Phase 1 audit:** `.agent/PLANS.md` **is** tracked on
  `main`. The audit's finding §0.2 was wrong and is corrected in place.
- **Correction:** `desk.css` does not diverge from approved tokens. Values are
  identical; the defect is duplication, not invention.
- Flow tokens and motion CSS are imported nowhere — the largest single
  compliance gap and the reason Phase 2 leads.
- The Bridge System has no production primitive; this is engineering, not
  styling, and is the critical path.
- `rejected-icons.md` records seven deliberate non-icons. Their absence is a
  decision, not a gap, and must not be "fixed".

## 13. Final evidence

To be completed per slice: commits, PR URLs, check results, deploy preview,
production verification and stated limitations. Nothing is claimed as deployed
or production-verified without independent evidence.

---

## Journey PR sequence

| # | Slice | Branch | Risk |
|---|---|---|---|
| 1 | Headline emphasis | `fix/landing-headline-emphasis` (PR #60) | Very low |
| 2 | Tokens, motion CSS, alias consolidation | `design/phase-2-foundation-tokens` | Medium |
| 3 | Bridge primitives + progress primitive | `design/phase-2-bridge-primitives` | High |
| 4 | Landing: Family + Action Bridges | `design/journey-landing` | Medium |
| 5 | Explore + Market Signals | `design/journey-explore-signals` | Medium |
| 6 | Signal detail + investigation | `design/journey-signal-detail` | Medium |
| 7 | Start a Deal | `design/journey-structure` | Highest |
| 8 | Find | `design/journey-find` | Medium-high |
| 9 | Account + Workspace + records | `design/journey-account` | Medium |
| 10 | Verification + business profile | `design/journey-verification` | High |
| 11 | Connection + Deal Room | `design/journey-connection` | High |
| 12 | Legal + secondary | `design/journey-secondary` | Low |
| 13 | Administrative routes | `design/journey-admin` | Medium |
| 14 | Legacy removal | `design/phase-4-legacy-removal` | Medium |

## Acceptance criteria

A slice is complete when: every applicable state is implemented; approved
tokens, icons, bridges and motion are used; no page-specific convention is
introduced; desktop and 390 × 844 are reviewed; keyboard focus is visible;
reduced motion preserves all information; `governance:check` and `verify` pass;
evidence is attached; and the owner records design approval.

## Stop conditions

Stop and escalate when: an approved component does not support a required
state; a required icon is missing from the registry; a design reference
conflicts with truthful production data; accessibility needs a change the
authority does not cover; implementation would alter navigation,
authentication, routing, data or permissions; or any Constitution exception is
proposed.
