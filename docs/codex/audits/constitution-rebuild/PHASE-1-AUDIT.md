# Ponte Constitution-led interface rebuild — Phase 1 audit

**Audit date:** 27 July 2026
**Audited commit:** `71b3817` on `origin/main`
**Design authority:** `4d3603b` (PR #58, merged 27 July 2026 14:53 UTC)
**Status:** Phase 1 only. No UI code changed.

---

## 0. Blocking findings

These precede everything. Two are authority conflicts; three are system-level
implementation facts that change the shape of the work.

### 0.1 The merged record authorises less than this instruction requires

`docs/codex/DECISION-LOG.md` (27 July, Constitution entry):

> **Implementation boundary:** this authority PR does not redesign production
> pages. A separate scoped PR **may replace only the temporary landing
> family/action card grid** with the approved bridges and restore
> `Global trade, from <em>signal to deal.</em>`.

`docs/codex/CURRENT-STATE.md`, "Landing visual baseline":

> **No other landing redesign is authorised by this decision.**

`docs/decisions/ADR-0002` rejects, by name, the alternative "Perform an
uncontrolled app-wide repaint", and states implementation "remains
journey-by-journey through scoped PRs".

A full-application rebuild is therefore wider than the merged authority.
Constitution §24 makes conflicting authority a stop condition. AGENTS.md holds
that a conversation is a proposal input until accepted **and merged**.

**Required before Phase 3:** an accepted ADR-0008 (or versioned amendment to
ADR-0002) recording the full-rebuild scope, plus an ExecPlan. Without it, the
next contributor reads `main` and correctly concludes the rebuild was
unauthorised. ADR-0002's rejection of an app-wide repaint must be explicitly
addressed, not bypassed: the reconciliation is that the *Constitution* governs
everything while *implementation* stays sliced, which this audit's PR sequence
preserves.

### 0.2 `.agent/PLANS.md` is not tracked on `main`

The mandated reading list and the ExecPlan process both depend on it. It exists
untracked in local working copies only. **The ExecPlan process has no committed
definition.** Either commit it or name the replacement process.

### 0.3 Ponte Flow tokens and motion CSS are not wired into the application

Neither `design-system/ponte-flow/tokens/ponte-flow-tokens.css`,
`motion/css/ponte-flow-motion.css` nor `motion/reduced-motion/` is imported by
any file under `app/` or `components/`. Verified by grep: zero references.

Consequences:

- All 12 approved motion components (H01–H12) are **0% implemented**. All 11
  motion SVGs and both CSS files are present and unused.
- `components/desk/desk.css` declares **46 of its own custom properties**,
  duplicating the Flow token set (`--pf-*`) with a parallel `--surface`,
  `--ink`, `--gold` vocabulary and hard-coded hex values.

This is the "second design-system layer" the instruction prohibits, and it
conflicts with Constitution §6 ("approved tokens are the sole colour source")
and §20 ("approved shared primitives must be implemented centrally").

**This is the single highest-leverage fix in the audit** and belongs in Phase 2
before any journey work.

### 0.4 The Bridge System has no production implementation

`design/authority/bridge/v1/` contains the approved CSS source, implementation
notes and a base64-chunked JS archive. There is **no React primitive, no
component, no import** anywhere in `app/`, `components/` or `lib/`.

Six bridge types are specified and none exists: Family, Action, Task
Completion, Commercial Journey, Counterparty Connection, Multi-party Deal Room.

The implementation notes require the engine be "wrapped or translated into
shared React primitives **without changing its geometry, states, accessibility
or semantics**", with measured station positions rather than fixed widths.
This is a genuine engineering task, not styling, and it is the critical path.

### 0.5 The approved landing headline is currently flattened in production

`app/[locale]/page.tsx:94` renders:

```tsx
<h1>Global trade, from signal to deal.</h1>
```

Constitution §5 and `bridge/v1/APPROVAL.md` require:

```
Global trade, from <em>signal to deal.</em>
```

with approved serif italic and the AA-safe gold text token. This is an
instance of the "silent simplification" §23 prohibits, it is live on
production, and it was introduced by PR #49. It is a one-line fix, already
authorised by the merged record, and needs no new ADR.

---

## 1. Route inventory

33 user-facing routes under `app/[locale]/`, derived from the repository.
5 admin routes are listed and excluded from user-facing scope.

| # | Route | Current visual system |
|---|---|---|
| 1 | `/` | Ponte Desk |
| 2 | `/market-signals` | Ponte Desk |
| 3 | `/market-signals/[id]` | Ponte Desk |
| 4 | `/login` | Ponte Desk |
| 5 | `/opportunities` | Ponte Desk |
| 6 | `/explore` | PonteShell (heritage-light) |
| 7 | `/verify` | PonteShell |
| 8 | `/verification` | PonteShell |
| 9 | `/check` | `.ponte-find` |
| 10 | `/find` | `.ponte-find` |
| 11 | `/find/o/[ref]` | `.ponte-find` |
| 12 | `/workspace` | `.ponte-find` |
| 13 | `/structure` | `.ponte-find` scope, legacy composer |
| 14 | `/about` | `.ponte-legal` |
| 15 | `/privacy` | `.ponte-legal` |
| 16 | `/terms` | `.ponte-legal` |
| 17 | `/account` | Legacy obsidian |
| 18 | `/marketplace` | Legacy obsidian |
| 19 | `/marketplace/new` | Legacy obsidian |
| 20 | `/marketplace/l/[ref]` | Legacy obsidian |
| 21 | `/join` | Legacy obsidian |
| 22 | `/pricing` | Legacy obsidian |
| 23 | `/contact` | Legacy obsidian |
| 24 | `/offline` | Legacy obsidian |
| 25 | `/learn/duties` | Legacy obsidian |
| 26 | `/learn/trade-data` | Legacy obsidian |
| 27 | `/dev/design` | Legacy obsidian (specimen) |
| 28 | `/dev/flow` | `.ponte-find` (specimen) |
| 29–33 | `/admin`, `/admin/{listings,signals,users,verifications}` | Legacy obsidian — **excluded, not user-facing** |

**5 of 28 user-facing routes (18%) are on the target system.**

### Route-level state files

Only three exist in the entire application:

- `app/[locale]/market-signals/loading.tsx`
- `app/[locale]/market-signals/not-found.tsx`
- `app/[locale]/not-found.tsx` (legacy obsidian)

**25 of 28 user-facing routes have no route-level loading, error or
not-found treatment.** Constitution §19 requires loading, empty, incomplete,
ambiguous, error, blocked, waiting, resumed, completed, expired and withdrawn
states wherever applicable. This is the largest structural gap in the codebase.

---

## 2. Shared-component inventory

55 `.tsx` components under `components/`, in 10 directories plus 20 at root.

| Group | Components |
|---|---|
| **Desk (target)** | `DeskShell`, `DeskAccount`, `DeskLoginForm`, `JourneyRail`, `FactRegister`, `RecordCard`, `KnowledgeBoundary`, `SignalStrip`, `AskPonte` |
| **Shells** | `PonteShell`, `ChromeGate`, `SiteHeader`, `SiteFooter`, `PonteFooter`, `BottomNav` |
| **Auth** | `AccountGate`, `OtpInput`, `VerifyForm` |
| **Journey** | `StructureComposer` (714 lines), `CheckComposer`, `FindChrome`, `HsProductPicker`, `QoRow`, `SignalRow`, `RequestIntroduction` |
| **Records** | `RecordList`, `SignalCard`, `SignalDisclaimer`, `InvestigateButton`, `InterestButton`, `ListingForm` |
| **Home/legacy** | `PonteLanding`, `ActivityBand`, `PonteFlow`, `HeroBridge`, `TradeRouteMap`, `LiveDealsGrid`, `LiveDealCard`, `LiveDealsStrip`, `ProcessFlow`, `Reveal` |
| **Icons** | `PonteIcon` (Flow, correct), `components/icons/index.tsx` + `paths.tsx` (**parallel legacy icon set**) |
| **Other** | `Logo`, `CountryPicker`, `LanguageSwitcher`, `InstallPrompt`, `OfflineRetry`, `NetworkForm`, `ServiceWorkerRegistrar`, `LegalPage`, `LegalOriginalNotice`, `ClaimReferral`, `CaptureReferral`, `tradeCategories` |

### Duplicated and generic components

| Duplication | Detail |
|---|---|
| **Two icon systems** | `PonteIcon` (Flow registry, 89 keys) vs `components/icons/*` (local set) vs `lucide-react` in 11 files |
| **Two verify stylesheets** | `components/check/verify.css` (343 lines) and `components/verify/verify.css` (330 lines), **both scoped `.ponte-find`** |
| **Two header/footer pairs** | `SiteHeader`/`SiteFooter` (obsidian) vs `PonteFooter` + `DeskShell` header |
| **Two record rows** | `find/SignalRow` + `find/QoRow` vs `desk/RecordCard` + `desk/FactRegister` |
| **Three bridge-ish devices** | `home/HeroBridge`, `home/PonteFlow`, `ProcessFlow` — none is the approved Bridge System |
| **Token sets** | `desk.css` 46 custom properties vs `ponte-flow-tokens.css` `--pf-*` |

---

## 3. Legacy-system map

| System | Stylesheet | Lines | Routes |
|---|---|---:|---|
| Obsidian app | `app/globals.css` | 905 | 12 user-facing + 5 admin |
| North Star landing | `components/home/landing/landing.css` | 824 | 0 (orphaned by PR #49) |
| `.ponte-find` | `find.css` 671 · `explore.css` 450 · `signal.css` 315 · `structure.css` 216 · `check/verify.css` 343 · `verify/verify.css` 330 | 2,325 | 8 |
| `.ponte-legal` | `legal.css` | 145 | 3 |
| Footer | `pfooter.css` | 74 | shared |
| Dev specimen | `dev/flow/flow.css` | 107 | 1 |
| **Ponte Desk (target)** | `components/desk/desk.css` | 1,116 | 5 |

**Total ≈ 5,500 lines across 6 competing visual systems.**

`landing.css` (824 lines) is now dead: PR #49 replaced `PonteLanding` on `/`
and nothing else imports it. It is a Phase 4 removal candidate, but only after
confirming `ActivityBand`/`PonteFlow` are unused elsewhere.

---

## 4. Target-system map

| Layer | Authority | Current state |
|---|---|---|
| Tokens | `ponte-flow-tokens.css` | **Not imported.** Desk re-declares 46 |
| Typography | Constitution §5 | Serif/sans/mono present in Desk; editorial gold italic **missing** |
| Icons | Flow registry, 89 keys | `PonteIcon` correct; 11 lucide + 18 raw-SVG files violate |
| Motion | Flow H01–H12 | **0 of 12 implemented** |
| Bridge | `bridge/v1/` | **0 of 6 implemented** |
| Composition | Ponte Desk | 5 of 28 routes |
| Records/evidence | `lib/desk/facts.ts` | Correct on Desk routes only |
| Progress | Constitution §9 | **No compliant primitive exists** |

---

## 5. Screen-by-screen implementation register

Fourteen columns per the instruction. Ordered by the recommended PR sequence.
`BL` = business logic that must not change.

### 5.1 `/` — Landing

- **Purpose:** entry; state an objective or choose a market family
- **Component tree:** `DeskShell` → `SignalStrip`, family grid, `RecordCard`, `PonteFooter`, `PonteIcon`
- **Existing language:** Ponte Desk
- **Target:** Desk + **Family Bridge** + **Action Bridge**; headline gold italic
- **Icons:** `market.family.*`, `evidence.evreview`, `primitive.span`, `participation.boundary`
- **Motion:** H02 explore activation; strip marquee already compliant
- **Bridge:** **Required** — family selection and family-valid action selection
- **Lifecycle:** default, signals-unavailable, signals-empty
- **Reduced motion:** strip becomes static list (done); bridge must settle instantly
- **Mobile:** panels stack; strip clipped, no page overflow (verified)
- **A11y risks:** bridge keyboard model unbuilt; strip duplicate half already `aria-hidden`
- **BL:** `readMarketSignals`, `toDeskRecord`, `marketEntrances()` canonical intents, `lib/landing/routing.ts`
- **Gaps:** Family Bridge, Action Bridge, gold italic token application

### 5.2 `/market-signals` — Market Signals list

- **Purpose:** discover externally observed demand and supply
- **Component tree:** `DeskShell` → `FactRegister` \| `RecordCard`, `PonteIcon`; `loading.tsx`
- **Existing language:** Ponte Desk
- **Target:** Desk retained; register is the approved dense treatment
- **Icons:** `evidence.evreview`, `participation.boundary`, `primitive.span`
- **Motion:** H04 search-in-progress on the loading state
- **Bridge:** Compact journey header (R-FIND) — candidate, not mandatory
- **Lifecycle:** default, loading, empty, error — **all four exist**
- **Reduced motion:** register static; rail pulse removed
- **Mobile:** register collapses to cards, 2-fact prefix (asserted by test)
- **A11y risks:** register head `aria-hidden`, facts carry own `<dt>`; acceptable
- **BL:** `readMarketSignals` ok/unavailable split, `REGISTER_THRESHOLD`
- **Gaps:** H04 wiring; compact journey header

### 5.3 `/market-signals/[id]` — Signal detail

- **Purpose:** read one signal; act on it
- **Component tree:** `DeskShell` → `KnowledgeBoundary`, `InvestigateButton`, `PonteIcon`; `not-found.tsx`
- **Existing language:** Ponte Desk + Atlas ink boundary
- **Target:** retained; investigation flow needs Journey Bridge
- **Icons:** `evidence.evprov`, `participation.commsoff`, `participation.registration`, `deal.submit`, `profile.document`, `hs.*`
- **Motion:** H08 market signal; H05 related activity
- **Bridge:** **Required** for investigation lifecycle once I05–I07 exist
- **Lifecycle:** default, invalid/tombstone, not-found — **3 present**; investigation states absent
- **Reduced motion:** no motion currently
- **Mobile:** boundary stacks below main (verified)
- **A11y risks:** `.erow` icon/`span` grid collision fixed; watch regressions
- **BL:** `getMarketSignal` 3-state lookup, `factsFor`, `signal_investigations`, `AccountGate` resume-once, Block D contract
- **Gaps:** investigation Journey Bridge; H05/H08

### 5.4 `/structure` — Start a Deal ⚠ **highest risk**

- **Purpose:** compose and submit a member record
- **Component tree:** `StructureComposer` (714 lines, client) → `HsDrill`, `SubjectStep`, `FactsStep`, `CompleteStep`, `PreviewStep`, `SubmitStep`, `ReceivedStep`, `AccountGate`
- **Existing language:** `.ponte-find` + `structure.css`; **not on the Desk**
- **Target:** Desk shell + **Task Completion Bridge** + **Commercial Journey Bridge**
- **Icons:** `deal.*` (18 keys), `field.*`, `hs.*` — Flow coverage looks adequate
- **Motion:** H03 assembly, H06 save privately, H07 submit for review
- **Bridge:** **Required** — task completion is a named bridge type
- **Lifecycle:** intent, structuring, facts, complete, preview, submit, received, error — 8 client steps, **no route-level loading/error**
- **Reduced motion:** none defined
- **Mobile:** untested against 390 in this audit
- **A11y risks:** 714-line client component; focus management across 8 steps unaudited
- **BL:** `lib/structure/draft.ts` (`openGaps`, `bucketize`, `blockers`, `synthesiseDetails`, `toSubmitPayload`), canonical family/intent carry, `needsHsCode`, `/api/marketplace/submit`, `AccountGate` resume-once
- **Gaps:** Completion Bridge, Journey Bridge, **compliant progress primitive**, H03/H06/H07

### 5.5 `/explore` — Explore the market

- **Purpose:** browse families and sectors
- **Component tree:** `PonteShell` → `RecordList`, `PonteIcon`, `hsCategories`
- **Existing language:** PonteShell + `explore.css` (450 lines)
- **Target:** Desk shell + Family Bridge
- **Icons:** `market.family.*`, `hs.*`
- **Motion:** H02 explore activation
- **Bridge:** **Required** — family selection
- **Lifecycle:** default only
- **Reduced motion / Mobile / A11y:** unaudited
- **BL:** `busiestSectors`, `HS_CATEGORIES`, sector taxonomy
- **Gaps:** Family Bridge; loading/empty/error

### 5.6 `/find`, `/find/o/[ref]` — Find

- **Component tree:** `FindChrome`, `QoRow`, `SignalRow`, `HsProductPicker`, `RequestIntroduction`
- **Existing language:** `.ponte-find` (671 lines)
- **Target:** Desk shell; rows → `FactRegister`/`RecordCard`
- **Bridge:** Counterparty Connection on `RequestIntroduction`
- **Icons:** `distribution.*`, `hs.*`, `participation.*`
- **Motion:** H04 search; H10 origin-to-destination
- **Lifecycle:** default; others unaudited
- **BL:** `lib/find/query.ts`, feature flag `NEXT_PUBLIC_FIND_JOURNEY`, introduction request contract
- **Gaps:** Connection Bridge; duplicate row components

### 5.7 `/check`, `/verify`, `/verification` — Check and Verify

- **Component tree:** `CheckComposer`; `PonteShell` → `VerifyForm`
- **Existing language:** `.ponte-find`, **two duplicate verify stylesheets**
- **Target:** Desk shell; consolidate to one stylesheet
- **Bridge:** Task Completion for the verification procedure
- **Icons:** `evidence.*`, `profile.*`
- **Motion:** H11 profile strengthening
- **Lifecycle:** purposes, attestation gate, 401/402/429 paths, candidate selection — rich and **must be preserved exactly**
- **BL:** credit cost stated before spend, attestation gate, `PASSING_VERIFICATION_STATUSES`, paid-case resumption
- **Gaps:** stylesheet consolidation; Completion Bridge

### 5.8 `/login` — Authentication boundary

- **Component tree:** `DeskShell` → `DeskLoginForm`
- **Existing language:** Ponte Desk (migrated PR #49)
- **Target:** compliant; retain
- **Icons:** none required
- **Motion:** none
- **Bridge:** none
- **Lifecycle:** email, code, Google-ready/unavailable, link-expired, not-configured — **5 states, all present**
- **Reduced motion:** n/a · **Mobile:** verified · **A11y:** focus ring restored and asserted
- **BL:** `useOtp`, `signInWithIdToken`, nonce pair, `?next=` sanitised same-site
- **Gaps:** none known. **Reference implementation for other journeys.**

### 5.9 `/opportunities` — Member records

- **Component tree:** `DeskShell` → `PonteIcon`, owner-scoped Supabase read
- **Target:** Desk retained; add Commercial Journey Bridge per record
- **Icons:** `profile.drafts`, `profile.saved`, `profile.submitted`, `primitive.span`
- **Motion:** H09 reviewed opportunity
- **Bridge:** **Required** — commercial journey progress
- **Lifecycle:** signed-out, empty, draft, submitted, approved, rejected — 6 present
- **BL:** RLS owner-scoping via member session, publication gate untouched
- **Gaps:** Journey Bridge, H09

### 5.10 `/account`, `/workspace` — Account and workspace

- **Component tree:** `/account` → `ClaimReferral`; `/workspace` → `FindChrome`
- **Existing language:** obsidian; `.ponte-find`
- **Target:** Desk shell
- **Bridge:** Journey Bridge on workspace records
- **Lifecycle:** default only
- **BL:** referral claim, credits balance
- **Gaps:** full composition undefined for both

### 5.11 `/about`, `/privacy`, `/terms` — Legal

- **Component tree:** `LegalPage`, `LegalOriginalNotice`
- **Existing language:** `.ponte-legal` (145 lines)
- **Target:** Desk shell, editorial long-form
- **Bridge:** none · **Motion:** none
- **BL:** legal copy verbatim, original-language notice
- **Risk:** low

### 5.12 `/marketplace*`, `/join`, `/pricing`, `/contact`, `/learn/*`, `/offline`

- **Existing language:** legacy obsidian; lucide icons; hard-coded hex
- **Target:** Desk shell or **retirement decision**
- **BL:** `/marketplace/*` still carries live listing and interest flows
- **Gap:** **product decision required** — retire or rebuild. Not a design question.

---

## 6. Design-system gaps (STOP items)

Per Constitution §7 and §24, no substitutes have been invented.

| # | Gap | Blocks |
|---|---|---|
| G1 | **Bridge React primitives** — 6 types, measured geometry, 10 journey + 10 connection states | Landing, Explore, Structure, Find, Opportunities |
| G2 | **Progress primitive** — weighted, deterministic, 18–25% floor, never 0%, irregular | Structure, Verify, Opportunities |
| G3 | **Flow token import path** — one global import; remove the parallel Desk set | Everything |
| G4 | **Motion component layer** — H01–H12 CSS + reduced-motion wiring | Every animated surface |
| G5 | **Journey/connection state vocabulary** — 20 states vs Desk rail's 5 conditions | Structure, Find, Opportunities |
| G6 | **Icon coverage for legacy routes** — 89 keys not yet proven sufficient for marketplace/account/pricing | Phase 3 slices 7–11 |
| G7 | **Route-level state components** — shared loading/error/empty/blocked/waiting | 25 routes |

---

## 7. Motion and iconography audit

### Motion

- **0 of 12** approved components implemented. `motion/css/ponte-flow-motion.css` and `motion/reduced-motion/` are **not imported**.
- All 11 H-series SVGs present and unused.
- Existing animation is Desk-local: rail pulse (`dk-pt`), skeleton shimmer (`dk-sh`), strip marquee (`dk-strip`), advance (`dk-adv`). Each has a reduced-motion path; **none uses the approved Flow motion layer.**
- No Framer Motion or Lottie in `package.json` — compliant with the prohibition.
- **Constitution §10 risk:** skeleton shimmer on settled content is prohibited; current use is loading-only, which is correct, but must not spread.

### Iconography

| Finding | Count |
|---|---:|
| `lucide-react` imports | **11 files** |
| Raw `<svg>` in `app/` + `components/` | **18 files** |
| Hard-coded hex outside token files | **10+ files** |
| Flow registry keys available | 89 |
| Flow SVG assets | 126 (89 standard + 37 reduced) |

`PonteIcon` enforces `currentColor`, optical stroke and the labelled-key
accessibility contract correctly. The violations are entirely in routes that
have not yet been migrated, plus `Logo.tsx` and `DeskShell`'s inline lockup —
the lockup is brand identity rather than an interface icon, and needs an
explicit ruling (see G6).

---

## 8. Accessibility audit

| Area | State |
|---|---|
| Focus visibility | Desk enforces `:focus-visible` with ink/paper variants. One regression found and fixed (login submit). **Legacy routes unaudited.** |
| Colour-only state | Desk rail uses shape + weight + text; `.cls` tokens pair word + marker. Legacy obsidian relies on lime/coral colour — **violates §6** |
| Motion-only state | Strip duplicate half `aria-hidden` + untabbable; rail conditions announced in words |
| Semantic labels | `PonteIcon` typed labelled-key contract enforced at compile time |
| Focus traps | `AccountGate` implements a correct trap with restore. Not audited elsewhere |
| Loading/error announcement | `aria-busy` on the signals loading state only |
| Landmarks | ChromeGate drops the shared `<main>` on bared routes so `DeskShell` supplies the only one — correct for 5 routes; **unverified for the other 23** |

**Highest a11y risk:** `StructureComposer` — 714-line client component, 8 steps,
no audited focus management across step transitions.

---

## 9. Mobile audit

| Route | 390 × 844 status |
|---|---|
| `/` | Verified — panels stack, strip clipped, no overflow |
| `/market-signals` | Verified — register → cards, 2-fact prefix asserted by test |
| `/market-signals/[id]` | Verified — boundary stacks, rail rotates to two rows |
| `/login` | Verified |
| `/opportunities` | Not verified |
| All other 23 | **Not verified** |

Constitution §17 makes desktop-only approval invalid. **23 of 28 routes have no
recorded mobile review.**

---

## 10. Recommended PR sequence

| # | Slice | Risk | Depends on |
|---|---|---|---|
| **0** | ADR-0008 + ExecPlan recording full-rebuild scope; commit `.agent/PLANS.md` | — | Owner |
| **1** | **Landing headline gold italic** | **Very low** | Already authorised |
| **2** | Flow token + motion CSS import; retire the parallel Desk token set | Medium | — |
| **3** | **Bridge React primitives + progress primitive** | **High** | G1, G2 |
| 4 | Landing: Family + Action Bridges | Medium | 2, 3 |
| 5 | Explore + Market Signals | Medium | 3, 4 |
| 6 | Signal detail + investigation | Medium | 3 |
| 7 | **Start a Deal** | **Highest** | 3, G2, G5 |
| 8 | Find | Medium | 3 |
| 9 | Account + Workspace + saved/submitted | Medium | 3 |
| 10 | Business profile + verification | High | 3 |
| 11 | Connection / introduction (Deal Room) | High | 3, G5 |
| 12 | Legal + secondary surfaces | Low | 2 |
| 13 | **Marketplace: retire-or-rebuild decision** | — | Owner |
| 14 | Legacy removal | Medium | 1–13 verified |

Deviations from the instruction's suggested order, and why:

- **Phase 0 inserted** — scope is not yet authorised (§0.1).
- **Headline promoted to first** — already authorised, isolated, currently wrong in production.
- **Tokens/motion before bridges** — bridges consume tokens; doing it after means touching every bridge twice.
- **Marketplace as an owner decision** — rebuilding 4 legacy commerce routes may be wasted work if they are being retired.

---

## 11. Risk per journey

| Journey | Risk | Principal reason |
|---|---|---|
| Landing headline | Very low | One line, authorised |
| Legal | Low | Static copy |
| Market Signals list/detail | Low–Medium | Already Desk; adding bridges only |
| Explore | Medium | Sector taxonomy + zero-HS-code data defect (Issue #42) |
| Account / Workspace | Medium | Composition undefined |
| Find | Medium–High | Feature-flagged; introduction contract |
| Tokens + motion consolidation | Medium | Touches every route at once |
| **Bridge primitives** | **High** | Measured geometry, 20 states, a11y, reduced motion |
| Verification | High | Credits and payment paths |
| Connection / Deal Room | High | Least-specified in production |
| **Start a Deal** | **Highest** | Live submissions, 714-line client component, HS picker, AccountGate, 8 steps |

---

## 12. Business logic that must not change

| Contract | File | Why |
|---|---|---|
| Commercial fact authority | `lib/desk/facts.ts` | Single fact authority; prefix property |
| Production boundary | `lib/desk/adapter.ts` | Only place signal columns are read |
| Canonical taxonomy | `lib/taxonomy/market.ts` | Families, intents, sectors |
| Market entrances | `lib/desk/entrances.ts` | Derived canonical routing |
| Publication gate | `lib/listings/publication-gate.ts` | `PASSING_VERIFICATION_STATUSES`, min level |
| Signal visibility | `lib/market-signals/logic.ts` | Public/internal column split, 90-day expiry |
| Investigation contract | `lib/signals/investigation.ts` | Block D; never names the third party |
| Draft and submission | `lib/structure/draft.ts` | Gaps, blockers, synthesis, payload |
| Destination authority | `lib/landing/routing.ts` | Feature flags decide destinations |
| Auth resume | `components/AccountGate.tsx` | Runs pending action exactly once |
| Return path | `/login` `safeNext()` | Same-site only |
| Journey rail model | `lib/desk/journey.ts` | Stations only, never navigation |
| RLS ownership | `/opportunities`, `signal_investigations`, `listings` | Member session, no service role |
| Feature flags | `NEXT_PUBLIC_FIND_JOURNEY`, `NEXT_PUBLIC_STRUCTURE_JOURNEY` | Not design's to change |

---

## Reading record

**Read in full for this audit:** Design Constitution v1 (339 lines), Bridge
README, Bridge APPROVAL, Bridge implementation notes 01, ADR-0002,
KNOWN-ISSUES, Flow README, CURRENT-STATE, 00-START-HERE, DECISION-LOG
(27 and 26 July entries).

**Read earlier in this working session:** AGENTS.md, CLAUDE.md,
SOURCE-OF-TRUTH-SOP, North Star Entry Architecture, English-Only policy.

**Inventoried but not read line by line:** Flow `documentation/` (10 files),
Flow `tokens/`, `registry/`, `icons/`, `motion/` (asset manifests and counts
verified programmatically), Bridge CSS source, MASTER-ROADMAP,
00-MASTER-IMPLEMENTATION-BRIEF.

**Not read:** `.agent/PLANS.md` — not tracked on `main` (finding §0.2).

Route-to-system classification was derived by grepping page files for shell
imports and scope classes, then spot-corrected (the legal routes initially
read as obsidian because they reach `.ponte-legal` through `LegalPage`).
Per-route claims are verified only where this document says so.

---

# Phase 1 audit — final revision after full authority reading

**Revision date:** 27 July 2026
**Trigger:** Owner instruction to complete the mandatory reading rather than inventory files programmatically.

The specifications were read. Two findings in the original audit were **wrong** and are corrected below. Several others are refined. The corrections are stated first, because an audit that quietly fixes its own errors is worth less than one that names them.

## A. Corrections to the original audit

### A.1 `.agent/PLANS.md` IS tracked — original finding 0.2 was wrong

`git ls-tree origin/main .agent/` returns `100644 blob cd4d8af7d5666e2e6d3b99c1f888c5631018c1d3 .agent/PLANS.md`. It was added in commit `7fe6602` ("Add ExecPlan standard"). My original existence check reported it MISSING; the check was faulty, not the repository.

**Consequence:** the ExecPlan process is fully defined and authoritative. It is referenced by `AGENTS.md:134`, `CLAUDE.md:25`, `00-START-HERE.md:76`, `docs/codex/README.md:17` and `SOURCE-OF-TRUTH-SOP.md:131`. It requires 13 named sections and places active plans in `docs/plans/active/`, alongside three existing plans. Nothing needed to be created or reconciled; the format was followed.

### A.2 `desk.css` aliases approved tokens — it does not diverge

Original finding 0.3 called this a "parallel token vocabulary". Value-by-value comparison shows every Desk custom property is **byte-identical** to its Flow counterpart:

| Desk | Flow | Value |
|---|---|---|
| `--surface` | `--pf-surface` | `#FCFBF7` |
| `--raised` | `--pf-raised` | `#FFFFFF` |
| `--sunken` | `--pf-sunken` | `#F2EFE6` |
| `--rule` / `--rule-strong` | `--pf-rule` / `--pf-rule-strong` | `#E5DFD2` / `#D5CEBC` |
| `--ink` / `-2` / `-3` / `--mute` | `--pf-ink` / `-2` / `-3` / `--pf-mute` | `#0F0F0E` / `#3A3733` / `#6E6A61` / `#9A958A` |
| `--gold` / `--gold-ink` | `--pf-gold` / `--pf-gold-ink` | `#C9973A` / `#8A6520` |
| `--pos` / `--neg` / `--review` / `--declared` | `--pf-positive` / `--pf-danger` / `--pf-review` / `--pf-declared` | `#0F6E3D` / `#B4402A` / `#4E6472` / `#6F695E` |
| `--focus` / `--select` | `--pf-focus` / `--pf-select` | `#1E5FA8` / `#DCE8F4` |

**Only `--gold-tint: #f5ecd8` has no `--pf-` counterpart** — a genuine local addition (a gold wash used on the kicker and the boundary heading).

**Revised severity:** this is an unauthorised **compatibility layer**, not a second design system. It violates section 20 (primitives implemented centrally) and section 6 (tokens as sole source) because the values are re-declared rather than imported, so a future change to the approved token drifts silently. The fix is mechanical — import the Flow sheet and alias — and carries no visual change. `--gold-tint` must be either promoted into the Flow tokens or recorded as an approved local extension.

### A.3 The Desk dark inverse is unused

Flow tokens ship a complete dark set under `[data-theme="dark"]` / `.inverse`. The Desk implements ink surfaces by hand (`.rail`, `.boundary`) rather than switching tokens. Not a violation — those are ink-on-cream panels, not a dark theme — but it means the approved inverse path is untested.

## B. Verified specification findings

Read in full for this revision: `motion-rules.md`, `colour-and-state-rules.md`, `rejected-icons.md`, `motion-spec.json` (all 12 components), `ponte-flow-tokens.css`, `ponte-bridge.css`, `.agent/PLANS.md`.

- **Six motion verbs only:** Travel, Reveal, Assemble, Connect, Focus, Confirm. Anything else is a state change or nothing.
- **Only Library H animates.** Libraries C, E and F add no animated components; C uses Focus and Reveal, E and F reuse H01, H03, H06, H07.
- **Authored-end-state contract:** every SVG on disk is the finished frame. Reduced motion is a **removal**, never a redraw. Print, paused tabs and JS failure all show correct information.
- **The honesty rule:** a moving point means work is happening now. A record waiting for a person uses the halted point — a state, not an animation, and it never pulses for attention.
- **No amber exists.** Warning is slate, danger is red. Adding amber would place a status between "fine" and "wrong" that the product cannot substantiate.
- **Gold touches an icon in exactly one place:** hover (`--pf-gold-ink` on `--pf-sunken`). That is an affordance, not a status.
- **Semantic colour belongs to the status component beside the icon**, never to the icon. The single in-drawing exception is the reserved route in `evidence.under-review` and `participation.boundary`, using `--pf-review` for a 3/5 dash.
- **Lottie was never authored.** The brief suggested it for H04 and H12; the CSS and SVG implementations are complete and production-usable. A Lottie export would be re-authoring, not conversion.
- **Loading duration law:** under about 500 ms no loader at all; short equals bridge line with no percentage; medium equals line plus one process label; long equals real named stages in the order they run. Never claim a stage the system is not running.

## C. Motion register — H01 to H12

Current production usage is **none** for all twelve: neither `motion/css/ponte-flow-motion.css` nor `motion/reduced-motion/` is imported anywhere in `app/` or `components/`.

| ID | Meaning | Trigger | Settled state | Reduced motion | Target routes |
|---|---|---|---|---|---|
| **H01** | Measurable record completeness, 20 to 100% | Value change on the record | New value, point at rest | Active length set directly, no point | `/structure`, `/verify`, `/opportunities` |
| **H02** | Entering Explore or a broad search | Route enters Explore | Three routes drawn to market anchors | Final frame, all routes present | `/explore`, `/` |
| **H03** | Beginning a deal, preview, restoring a draft | Start a deal or preview requested | One continuous route between two anchors | Assembled frame | `/structure` |
| **H04** | Searching where duration is unknown | Search or filter submitted | Loop resets discreetly, never completed | Static route plus process label, no point | `/find`, `/market-signals`, `/explore` |
| **H05** | Relevance between two records | A related record is found | Anchors linked by one segment | Linked frame | `/market-signals/[id]` |
| **H06** | Draft entering the member's private space | Save privately | Route contained by the member's boundary | Contained frame | `/structure`, `/opportunities` |
| **H07** | Completed draft crossing into review | Submit for review | Point across threshold, review boundary present | Crossed frame with boundary shown | `/structure` |
| **H08** | Detection of commercial activity, never verification | A signal is surfaced | Point with one stable pulse arc | Point with static arc | `/market-signals`, `/`, signal detail |
| **H09** | Evidence layers legible around a route. No tick, no shield | A reviewed record is opened | Route with evidence at named points | All evidence points present | `/opportunities`, QO surfaces |
| **H10** | Routes, lanes, freight, delivery locations | A lane is displayed | Point at destination, discreet reset | Static route between labelled anchors | `/market-signals/[id]`, `/find` |
| **H11** | Segments completing as profile information is added. Never labelled verified | A profile field or document is added | New segment count | Segments set directly | `/verify`, `/account` |
| **H12** | No direct match; route redirects to available activity | Query returns no reviewed opportunity | A redirect route to related activity | Redirect route shown in full | `/find`, `/explore`, `/market-signals` empty |

**Implementation dependency for all twelve:** the Flow motion CSS import (Phase 2 step 2). H01 additionally requires the progress engine specified in `motion/js/ponte-flow-progress.md` and the deterministic value function (gap G2).

**Timing tokens:** `--pf-dur-micro` 120ms, `--pf-dur-enter` 220ms, `--pf-dur-deliberate` 420ms, `--pf-dur-crossing` 900ms, `--pf-dur-loop` 1900ms, `--pf-dur-lane` 1600ms, `--pf-dur-signal` 2600ms. Easing `cubic-bezier(.2,.6,.2,1)`, entrances `cubic-bezier(.16,1,.3,1)`.

## D. Icon register — every violation, with its replacement

**Registry coverage: 89 semantic keys, 126 SVG assets (89 standard plus 37 reduced), reduced variants used below 21px via `assetFor()`.**

| File | Lucide icons | Semantic purpose | Approved Flow key | Variant | Verdict |
|---|---|---|---|---|---|
| `app/[locale]/account/page.tsx` | ArrowRight, BadgeCheck, ShieldAlert, UserCircle2 | account, verification status | `profile.account`, `evidence.evprov`, `participation.boundary` | std 20/24 | **Replaceable.** BadgeCheck and ShieldAlert are precisely the "one shared verified visual" that `rejected-icons.md` forbids; they must map to distinct evidence states. PR 9 |
| `app/[locale]/contact/page.tsx` | ArrowRight, Mail, FileText | contact, document | `profile.contact`, `profile.document` | std 20 | **Replaceable.** PR 12 |
| `app/[locale]/marketplace/l/[ref]/page.tsx` | ArrowRight, Share2, ShieldCheck | listing detail | `deal.preview`, `evidence.evprov` | std 20 | **Blocked on retire-or-rebuild** |
| `app/[locale]/marketplace/page.tsx` | ArrowRight, FilePlus2, ShieldCheck, EyeOff, BadgeCheck, Share2, Sparkles | marketplace board | `deal.submit`, `deal.private`, `evidence.evprov` | std 20/24 | **Blocked.** `Sparkles` has no Ponte equivalent and should not get one |
| `app/[locale]/offline/page.tsx` | WifiOff | offline | **none** | — | **GENUINE GAP G6a** |
| `app/[locale]/pricing/page.tsx` | ArrowRight, Store, Briefcase, CalendarClock, ShieldCheck | pricing tiers | `market.family.products`, `field.duration`, `evidence.evprov` | std 24 | **Replaceable.** PR 12 |
| `components/InstallPrompt.tsx` | Download, Share, X | PWA install | **none for Download or X** | — | **GENUINE GAP G6b** |
| `components/LanguageSwitcher.tsx` | Globe, Check | locale switch | — | — | **OBSOLETE.** English-only policy; the component self-hides. Delete in Phase 4 |
| `components/ListingForm.tsx` | ArrowLeft, ArrowRight, CheckCircle2, Paperclip, Camera, Eye, AlertCircle | listing composer | `deal.evidence`, `profile.document`, `deal.preview` | std 20 | **Blocked.** Camera and arrows are gaps, G6c |
| `components/NetworkForm.tsx` | ArrowRight, CheckCircle2 | form submit | `evidence.infocomplete` | std 20 | **Replaceable.** PR 9 |
| `components/tradeCategories.ts` | type import only | — | — | — | **No violation** |

### Confirmed icon gaps requiring an owner ruling

| Gap | Need | Note |
|---|---|---|
| **G6a** | Offline / no connection | No Flow key. A real interface state with no approved icon |
| **G6b** | Download, close or dismiss, share | Ubiquitous affordances absent from a registry scoped to market, deal and profile semantics |
| **G6c** | Directional arrows, back, forward, next | Used across every composer. Not in the 89 keys |
| **G6d** | Brand lockup as inline SVG | `DeskShell`, `Logo.tsx`. Section 7 prohibits ad hoc SVG icons; a lockup is arguably identity, not an icon. **Owner ruling needed** |

**Not gaps — deliberate rejections** (`rejected-icons.md`): per-frequency, per-currency, per-unit and per-Incoterm icons; "Continue editing"; a distinct "HS code" icon (it reuses `deal.category`); and **"verified participant"**, which was deliberately not drawn because the state does not exist and one shared verified visual across eight truths is the failure Library F exists to prevent. These must not be "fixed".

## E. Bridge register

Geometry source: `design/authority/bridge/v1/source/ponte-bridge.css`, 216 lines. Class vocabulary: `.br`, `.br--travelling`, `.br--chosen`, `.br--drawing`, `.br--still`, `.br--v` (vertical and mobile), `.br__deck`, `.br__deckwrap`, `.br__ab` (plus `--l`, `--r`, `--dashed`), `.br__pt` (plus `--halt`, `--danger`), `.br__runner` (plus `--go`), `.br__tail`, `.brc`, `.brc__mid`.

| Bridge | Purpose | Required primitive | Routes | Lifecycle states | Status |
|---|---|---|---|---|---|
| **Family** | Market-family selection | `PB.route` | `/`, `/explore` | selected, visited, unvisited | **Not implemented** |
| **Action** | Family-valid action selection | `PB.route`, two and three action variants | `/`, `/explore` | selected, unselected | **Not implemented** |
| **Task Completion** | Weighted task progress | `PB.progress` | `/structure`, `/verify` | steps, done, halted, bands | **Not implemented** |
| **Commercial Journey** | Named milestone progress | `PB.journey` | `/opportunities`, `/workspace` | travelling, awaiting-participant, awaiting-evidence, under-review, blocked, paused, expired, withdrawn, declined, completed | **Not implemented** |
| **Counterparty Connection** | Two-party connection | `PB.connection` | `/find`, introduction flows | one-party, awaiting-party, two-parties, proposed, awaiting-acceptance, connecting, accepted, declined, expired, withdrawn | **Not implemented** |
| **Multi-party Deal Room** | Milestones across participants | `PB.dealroom` | Deal room, unbuilt | milestones, participant state, next | **Not implemented** |
| **Compact journey header** | Condensed progress | `PB.header` | Any journey route | name, steps, done, kicker | **Not implemented** |

**Unresolved Bridge gaps:**

1. **All seven primitives are unbuilt.** The engine ships as a base64-chunked archive plus CSS; the notes require translation into React "without changing geometry, states, accessibility or semantics".
2. **Measured geometry.** Station positions and block widths are measured, not fixed. A React port must re-measure on data and width change and re-render idempotently. Substituting a single fixed width is explicitly prohibited.
3. **Twenty states, five implemented.** The Desk rail models done, here, active, halt and reserved. The Bridge specifies 10 journey and 10 connection states. The mapping is undefined and is gap **G5**.
4. **`PB.value(steps, done)`** must be a pure deterministic function with weights summing to exactly 100 — gap **G2**, unbuilt.

## F. Finding classification

| Class | Findings |
|---|---|
| **Verified specification** | Six motion verbs; authored-end-state contract; honesty rule; no amber; gold on hover only; semantic colour beside the icon; Lottie never authored; loading-duration law; 89 keys and 126 assets; Bridge class vocabulary and measured geometry |
| **Repository implementation** | 5 of 28 routes on target; 6 visual systems at about 5,500 CSS lines; 25 of 28 routes without lifecycle states; 23 of 28 without mobile review; 11 lucide files; 18 raw SVG files |
| **Genuine authority conflict** | ADR-0002 narrow boundary versus full rebuild — **resolved by ADR-0010** |
| **Design-system gaps** | G1 Bridge primitives, G2 progress, G3 token import, G4 motion layer, G5 state vocabulary, G6a to G6d icons, G7 shared state components |
| **Legacy violations** | lucide imports; raw SVGs; hard-coded hex; obsidian lime and coral colour-only state |
| **Intentional compatibility layer** | `desk.css` token aliasing with identical values; `next-intl` and `[locale]` under the English-only policy; `messages/en.json` stale login keys, shipped but unrendered |
| **Assumptions requiring owner decision** | `/marketplace` retire or rebuild; G6d lockup ruling; whether `--gold-tint` is promoted or recorded as an approved extension; G6a to G6c icon commissions |

## G. Governance note

The Phase 1 audit is accepted as the repository audit baseline per ADR-0010, subject to final review in the governance PR. Its two corrected findings (A.1, A.2) are recorded here rather than silently edited above.
