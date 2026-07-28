# Design-system gap register

**Status:** Living record, opened by the Phase 2 foundation PR.
**Authority:** Ponte Design Constitution v1 section 24 (stop conditions); ADR-0010.
**Baseline:** `docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md`

A gap is a place the approved system is silent about something production needs.
Constitution section 14 makes a missing decision a stop-and-escalate condition,
not permission to improvise, so each entry below records what is missing, what it
blocks, and who has to decide. Nothing here has been invented around.

Entries are closed by an owner ruling or by an approved amendment, never by an
implementer deciding the gap did not matter.

---

## 1. Closed

| # | Gap | How it closed |
|---|---|---|
| **G2** | Progress primitive: weighted, deterministic, non-zero floor, irregular | `lib/ponte/progress.ts`, 24 tests |
| **G3** | Flow token import path; retire the parallel Desk set | 21 aliases; the import already existed (see §4) |
| **G4** | Motion component layer and reduced-motion wiring | `lib/ponte/motion.ts`, `components/ponte/motion/FlowMotion.tsx`; CSS already imported (see §4) |
| **G6d** | Brand lockup as inline SVG | Owner ruled it an identity asset. One shared component; four copies consolidated |
| **DS-8** | A chosen Bridge station shrank when pointed at | Fixed in `bridge-integration.css`: the selected state is restored at a higher specificity than the approved hover rule. Unselected hover untouched |
| **DS-9** | Two focus treatments on a Bridge station | Fixed in `bridge-integration.css`: the Desk blanket ring is removed inside `.br .brst` only. The approved node ring and title underline remain, at 5.9:1 |
| **DS-5** | The approved Bridge engine and reference renders were missing | **Recovered.** The owner-approved package was located, and all 13 vendored files now match `SOURCE-MANIFEST.md`. `check-governance.mjs` verifies every checksum on each run |
| **DS-6** | No icon slot on a Bridge station | **Answered by the reference:** the approved station carries no icon. The icons added while the reference was missing are removed |
| **DS-7** | No abutment copy for the Family Bridge | **Recovered:** Intent, The market, Structured journey, from the approved reference |
| **G7** | Route-level state components | `components/ponte/state/LifecycleState.tsx`, seven states, 16 tests |

Rows above are closed by PR #62 (foundation) and PR #63 (landing bridges).

DS-5 is the one worth reading twice. The engine was absent, nothing checked that it
was absent, and a landing bridge was built against a guess as a result. The
checksum verification added to `check-governance.mjs` is what would have caught
it on the first commit.

G7 is closed as a **primitive**. The 25 routes that lack lifecycle states adopt
it in their own journey slices; this PR deliberately retrofits none of them.

## 2. Open — icons

The registry holds 89 semantic keys scoped to market, deal, profile and evidence
meanings. It has no vocabulary for ordinary interface affordances, because it was
never asked for one. Every entry below is a real interface need with no approved
drawing, and Constitution section 7 makes inventing one prohibited.

| # | Need | Where it bites | Decision required |
|---|---|---|---|
| **G6a** | Offline / no connection | `/offline` | Commission an icon, or render the state in words only |
| **G6b** | Download, close or dismiss, share | `InstallPrompt`, listing detail, any dialog | Commission, or restrict these affordances to text controls |
| **G6c** | Directional arrows: back, forward, next | Every composer, 11 legacy routes | Commission, or accept text-only navigation controls |

These block the migration of the routes that use them, which are journey slices
7 to 12. They do **not** block the Bridge primitives or any Desk route.

A fourth candidate is explicitly **not** a gap. `rejected-icons.md` records seven
deliberate non-icons, including "verified participant", which was not drawn
because the state does not exist in the product and one shared verified visual
across eight separate truths is the failure Library F exists to prevent. Their
absence is a decision. They must not be "fixed".

## 3. Open — tokens, motion, states

| # | Gap | Detail | Blocks |
|---|---|---|---|
| **DS-1** | No approved on-ink focus or review value | The Desk's ink panels use the `[data-theme="dark"]` values of `--pf-focus` and `--pf-review` as literals. Neither `var(--pf-*)` nor `.inverse` scoping works. See `compatibility-aliases.md` §4 | The rail and knowledge-boundary slices |
| **DS-2** | The lockup drifted between its four copies | Three carried `strokeLinecap="square"`, the Desk did not; the landing wordmark carried no `serif` class. Every surface still renders exactly what it did, but one of the two variants is canonical and nobody has said which | Nothing. Cosmetic, but it should be settled before the mark is used anywhere new |
| **DS-3** | No generated markup module for the 11 H-series SVGs | `FLOW_ICON_MARKUP` serves the icons; motion has no equivalent, so `FlowMotion` takes the drawing as `children` | First real motion consumer, i.e. the Bridge primitives |
| **DS-4** | No approved tint, hairline or elevation tokens | Nine local extensions in `.ponte-desk` derive from tokens that exist. See `compatibility-aliases.md` §3 | Nothing today. Every new surface adds to the list until it is resolved |
| **G5** | Journey and connection state vocabulary | The Bridge specifies 10 journey and 10 connection states; the Desk rail models 5 conditions; the new lifecycle primitive models 7. The mapping between the three is undefined | Bridge primitives, Start a Deal, Find, Opportunities |
| **G1** | Bridge React primitives | 6 types, measured geometry, 20 states. Unchanged by this PR | Landing, Explore, Structure, Find, Opportunities |

**G5 is the one to resolve next.** Three vocabularies now describe overlapping
things, and the Bridge primitives PR will have to reconcile them. Doing that
reconciliation implicitly, inside an implementation, is how a fourth vocabulary
gets created. It wants an explicit mapping first.

## 4. Corrections to the Phase 1 audit

The audit corrected two of its own findings (A.1, A.2). A third is corrected here.

### Finding 0.3 was wrong: the Flow CSS **is** wired into the application

> Neither `design-system/ponte-flow/tokens/ponte-flow-tokens.css`,
> `motion/css/ponte-flow-motion.css` nor `motion/reduced-motion/` is imported by
> any file under `app/` or `components/`. Verified by grep: zero references.

`app/globals.css` line 7 imports `design-system/ponte-flow/ponte-flow.css`, which
imports all three, unmodified and in order. It has done so since commit
`0bb84fa`, "Integrate the Ponte Flow design system", well before the audit.

The grep looked for the three leaf filenames inside `app/` and `components/`. The
bundle file legitimately hides them: it lives in `design-system/`, and it is the
only thing `globals.css` names. The search was correct and its conclusion was not.

Verified at runtime rather than by a second grep: on a running server the
`--pf-*` tokens resolve at `:root`, the `pf-draw` keyframes are present in the
CSSOM, and the `prefers-reduced-motion` rule is loaded.

**What follows from the correction.** Two claims built on finding 0.3 do not hold:

- The tokens were never "not wired". The real defect was narrower and is the one
  the audit itself found at A.2: the Desk held a duplicate copy. That is fixed.
- "All 12 approved motion components are 0% implemented" conflated two things.
  The motion **layer** ships and is live. What is true is that no component is
  **used** on any route, which is a different statement with a different remedy:
  each journey activates the components its screens call for.

The audit's own governance note says a document that quietly fixes its own errors
is worth less than one that names them, so this correction is recorded here and
the audit is left as written.
