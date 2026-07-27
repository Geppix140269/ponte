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

**Required before Phase 3:** an accepted ADR-0003 (or versioned amendment to
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
| **0** | ADR-0003 + ExecPlan recording full-rebuild scope; commit `.agent/PLANS.md` | — | Owner |
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
