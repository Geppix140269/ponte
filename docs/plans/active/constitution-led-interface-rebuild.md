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
- **27 Jul 2026** — Slice 2 (`design/phase-2-foundation-tokens`) implemented.
  Token authority consolidated (21 Desk aliases, no rendered change, verified in
  the browser); icon renderer confirmed and the brand lockup consolidated from
  four copies into one shared component; motion and reduced-motion layers
  confirmed live and given shared primitives; deterministic progress engine
  built; seven lifecycle-state primitives built. 72 new tests. `governance:check`
  and `verify` pass. Bridge primitives (slice 3) deliberately not started.
  `/marketplace` investigated and escalated: three unique functions found.
  **Screenshot capture unavailable in the implementing environment; visual
  evidence is outstanding and is recorded as such in section 13.**

- **27 Jul 2026** — Slice 4 (`design/landing-family-action-bridges`) implemented,
  out of the audit's suggested order: the owner directed the landing bridges
  before the full Bridge primitive set. The temporary three-column family/action
  grid is replaced by the approved Family Bridge and revealed Action Bridge. All
  nine destinations preserved and asserted. `BridgeRoute` is the first Bridge
  React primitive (`PB.route`), built against the approved stylesheet because
  **the approved engine source is missing from the repository** (see section 12).
  26 new tests. `governance:check` and `verify` pass.

- **28 Jul 2026** — Slice 4 corrected after owner rejection. The straight-line
  deck was rejected: it was a fallback built while the approved engine was
  missing, not a design. The owner-approved Bridge package was recovered, all 13
  vendored files now match `SOURCE-MANIFEST.md`, and the geometry is the engine's
  own arch. Product sectors and all HS copy removed from the landing per owner
  decisions 4 and 5. 33 unit tests, 17 Playwright checks, 16 byte-deterministic
  evidence frames. `governance:check` and `verify` pass.

- **28 Jul 2026** — Slice 7 (`feature/category-first-market-taxonomy`) implemented,
  again out of the audit's suggested order: the owner directed the Start a Deal
  classification work before Explore. Trade services and Distribution no longer
  open on a blank text field. The canonical taxonomy gains eleven service
  categories with about 120 subcategories, and separates the four questions the
  old distribution list had flattened into one. Find opens on the three families
  and both its lanes filter at the database over the complete record set; Market
  Signals gains structured filters and an exact inventory count. ADR-0011
  proposed. 19 Playwright checks, 65 new unit assertions across four files, 23
  evidence frames. `governance:check` and `verify` pass. **The migration is
  written and not applied.**

## 12. Decisions and discoveries

- **Correction to the Phase 1 audit:** `.agent/PLANS.md` **is** tracked on
  `main`. The audit's finding §0.2 was wrong and is corrected in place.
- **Correction:** `desk.css` does not diverge from approved tokens. Values are
  identical; the defect is duplication, not invention.
- ~~Flow tokens and motion CSS are imported nowhere~~ — **also wrong, corrected
  in slice 2.** `app/globals.css:7` imports the Flow bundle, which imports the
  tokens, the motion CSS and the reduced-motion contract. It has since commit
  `0bb84fa`. The audit grepped for the three leaf filenames under `app/` and
  `components/` and the bundle file legitimately hid them. Verified at runtime:
  `--pf-*` resolves at `:root`, the `pf-draw` keyframes are in the CSSOM, the
  `prefers-reduced-motion` rule is loaded. The real defect was the narrower one
  the audit found itself at A.2 — the Desk held a duplicate copy — and that is
  what slice 2 fixed. See `docs/codex/audits/constitution-rebuild/GAP-REGISTER.md`
  section 4.
- Consequently "all 12 motion components are 0% implemented" conflated the layer
  with its use. The layer ships and is live; no component is *used* on a route.
  Each journey activates what its screens call for.
- The Bridge System has no production primitive; this is engineering, not
  styling, and is the critical path.
- `rejected-icons.md` records seven deliberate non-icons. Their absence is a
  decision, not a gap, and must not be "fixed".
- **The brand lockup was duplicated four times, not twice.** The audit recorded
  `DeskShell` and `Logo.tsx`. `Logo.tsx` is the legacy obsidian mark, a different
  drawing. The Ponte arch was in `DeskShell`, `FindChrome`, `PonteShell` and
  `PonteLanding`, identical in geometry but dressed by three stylesheets, and it
  had already drifted between copies (gap DS-2). One shared component now serves
  all four with each surface rendering exactly what it rendered before.
- **The progress floor is 20**, not a range. Constitution §9 says the first value
  "normally begins between 18% and 25%"; the delivered engine contract and the
  `--pf-progress-floor` token both say 20. The narrower authority governs and the
  two agree.
- **Uniform progress weights are rejected at runtime.** §9 requires irregular
  increments and names "20, 40, 60, 80" as the thing to avoid; equal weights are
  the only way to build an even ladder, so the validator refuses them.
- **`/marketplace` is not simply legacy.** Three functions exist nowhere else:
  the owner-side connection decision, listing reconfirmation, and the account
  brief. Escalated, not resolved. See
  `docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md`.
- **The `/api/marketplace/*` namespace is current infrastructure**, not legacy:
  Start a Deal posts to `/api/marketplace/submit` and Find posts to
  `/api/marketplace/interest`. Retiring the pages and retiring the API are
  separate questions, and only the first is arguable.
- **RESOLVED (28 Jul 2026): the approved Bridge package has been recovered.**
  It was located outside the repository, and all 13 vendored files now match
  `SOURCE-MANIFEST.md` byte for byte, including `source/ponte-bridge.js` and the
  nine reference renders. Two further defects surfaced during the recovery: the
  vendored `ponte-bridge.css` had had its section comments stripped and so failed
  its own checksum, and nothing in the repository verified the manifest at all.
  `check-governance.mjs` now checks every recorded checksum on each run.

  **The straight-line deck built during the outage was rejected by the owner and
  is gone.** `E1` to `E8` are withdrawn: the deck is the engine's cubic Bezier
  arch, stations sit at its own non-uniform path fractions, block widths are
  measured, abutments are present, the gold signal rides the curve, and mobile is
  the engine's bowed elevation rather than a stacked list. The arithmetic lives in
  `components/ponte/bridge/geometry.ts` with each formula quoted from the engine,
  and is unit-tested against its own numbers.
- **Superseded, kept for the record: the approved engine source was not in the
  repository.** `design/authority/bridge/v1/source/ponte-bridge.js` is named by
  `SOURCE-MANIFEST.md` and by the implementation notes, but the only artefact
  present is `source/archive/ponte-bridge.js.gz.b64.part01`: a single 3 KB chunk
  of a gzip stream that does not decompress. The CI job that would fetch the
  package, `Import approved Bridge package`, fails on the Google Drive checksum
  and has failed on every run it has ever had. The reference PNGs are likewise
  recorded by checksum only and are not in the repository.

  What **is** present and complete is `source/ponte-bridge.css`, which the README
  calls the "approved visual and motion rules", plus the implementation notes.
  The notes authorise translating the engine into React primitives, so slice 4
  was built against those two. Every decision the missing engine would have made
  is marked `ENGINE DECISION` in `components/ponte/bridge/BridgeRoute.tsx`, and
  they are: the deck's path shape, the station composition order, the deck
  wrapper's height, and the placement of the deck line. **These need checking
  against the reference renders before the Bridge programme goes further**, since
  slices 5 to 11 all build on this primitive.
- **The approved station carries no icon.** Icons were added to the Family
  Bridge while the reference renders were missing, on the reading that the slice
  scope required them. The recovered references show none, so they are removed:
  a station is an index, a title, a description and a marker.
- **Product sectors and HS language are removed from the landing** by owner
  decision. The sector grid was non-clickable, because no public signal carries
  an HS code, and a filter that cannot filter is noise; sectors belong in the
  Explore journey, which this slice does not build. No landing copy mentions HS
  classification, and no services or distribution destination carries an HS
  parameter or meets an HS gate.

## 13. Final evidence

To be completed per slice: commits, PR URLs, check results, deploy preview,
production verification and stated limitations. Nothing is claimed as deployed
or production-verified without independent evidence.

### Slice 2 — foundation (tokens, icons, motion, progress, lifecycle)

**Repository checks, all passing:**

- `npm run governance:check` — governance contract (18 files) plus the new icon
  law ratchet (11 lucide, 16 authored SVG, 1 shared lockup).
- `npm run verify` — exit 0. Messages, encoding, governance, 72 new tests on top
  of the existing suite, `tsc --noEmit`, `next build`.

**Runtime verification** on a local dev server, measured rather than eyeballed:

- All 17 aliased Desk colour tokens resolve to the identical Flow values. Zero
  mismatches. Rendered surfaces on `/` and `/market-signals` unchanged
  (`--sunken` #F2EFE6 ground, `--ink` #0F0F0E text, cream command bar).
- `--pf-*` present at `:root`; `pf-draw` keyframes in the CSSOM;
  `prefers-reduced-motion` rule loaded.
- Lockup renders identically per scope: Desk butt-capped and CSS-sized; Find
  square-capped and attribute-sized at 20px; gold keystone #C9973A throughout.
- 390 × 844: no horizontal page overflow on `/`, `/market-signals` or
  `/dev/foundation`.
- Reduced motion via the `[data-reduced-motion="1"]` hook: both animated states
  stop; every label, colour and state string byte-identical before and after. A
  removal, not a redraw.

**Environment failure, recorded separately per section 9.** Screenshot capture
was unavailable in the implementing environment (the browser pane does not
composite frames there), so **no desktop or 390 × 844 image evidence is attached
to this slice.** Constitution section 17 and section 21 require visual review
before design approval is complete, and this slice therefore **cannot be treated
as design-approved on the checks alone.**

`/dev/foundation` was added so the review is possible: it renders the seven
lifecycle states, the progress engine's real output and the motion register, it
404s in production, and `/dev/` is already bared by ChromeGate. The outstanding
evidence is a desktop and a 390 × 844 capture of that page plus `/` and
`/market-signals`, with the reduced-motion setting on and off.

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
