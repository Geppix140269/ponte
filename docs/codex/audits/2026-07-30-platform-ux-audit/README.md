# Platform-wide UX and interaction audit — 30 July 2026

**Author:** Claude Code, on the owner's platform-wide UX/interaction launch-gate
brief (received 30 July 2026).
**Branch:** `claude/platform-ux-audit-0094f9`
**How it was run:** every route was opened and interacted with against a local
build driven through the temporary private-site gate (`middleware.ts`) with the
owner-supplied password held only in `PONTE_SITE_PASSWORD`; the gate was never
removed or weakened. The audit env points `.env.local` at a **non-production**
Supabase ref, so no read or write could reach production
(`cptglsmjmzcfpjndqfmc`). Consequences of that isolation are noted per row.

This document is the required screen/route inventory and UX interaction matrix.
Fixes for the P0 findings are in the same PR; deferred items are in
`docs/launch/POST-LAUNCH-BACKLOG.md`.

> **Post-rebase status and the owner merge-gate checklist are in
> [`MERGE-READINESS.md`](MERGE-READINESS.md)** (branch rebased onto `main`,
> `npm run verify` now passes end to end, deploy-preview results, and the
> honestly open items: live notification delivery and authenticated core
> journeys). The blockers here are **LB-010/LB-011** and the backlog tickets
> **PL-021..PL-024**; they were renumbered across two rebases because `main` is
> under concurrent development and had reused the earlier IDs.

---

## 1. Headline

The interface has already been substantially rebuilt away from the schema-dump
the brief describes: **Start a Deal opens on a three-route intake (Describe /
Upload / Browse)**, and **Trade services and Distribution are category-first**,
not free-text. The brief's warning — *do not declare this complete because the
cement screen was redesigned* — was well aimed: the **review screen behind the
redesign still dumped all thirteen commercial terms as empty rows with per-row
Add controls and a "still unstated" warning**, before any draft existed. That
was the principal remaining violation and is fixed here. A second launch-gate
defect — **a common single-word misspelling (`cementt`) dead-ended the product
resolver** — is also fixed.

Two P0 fixes, both tested; navigation, family separation and the notification
paths were exercised and pass; the remaining items are genuine P2 polish.

## 2. Answers to the brief's required PR questions

- **Which routes were inspected?** All 25 user-facing locale routes plus the
  product/service/distribution journeys, the review screen, admin, auth and the
  dev state gallery. Full inventory in §4.
- **Which actions were broken or ambiguous?** No dead links or dead primary CTAs
  were found in the link graph (§5). The broken behaviour was the review
  screen's schema dump and the resolver's single-word-typo gap (§6, P0-1/P0-2).
- **Which journeys depended on exact spelling?** Only the product describe path,
  and only for single-word typos of multi-word catalogue products (`cementt`).
  Services and Distribution are category-first (selection, not typing), so they
  never depended on spelling. Fixed for products (§6, P0-1).
- **Which schema-shaped interfaces were removed?** The review screen's flat
  13-row commercial-terms editor with 13 Add actions and a "still unstated"
  warning (§6, P0-2).
- **Which actions now have loading, success and error feedback?** The intake
  already models loading (`analysing`), error (`extractionFailed`,
  `uploadFailed`, `blocked`), success (`extracted`, `resolved`) and empty
  (`unmatched`) as first-class reducer states rendered by `LifecycleState`;
  verified in the gallery. Submit shows submitting/received/error in the
  composer. No feedback regressions were introduced.
- **Which issues remain, and why are none launch blockers?** See §7. They are
  cosmetic or reachable only by manually typing an unlinked URL; none stops a
  core journey, creates incorrect data, or fails a control open.

## 3. Scope confirmation (Launch Mode)

- **Delivered:** the audit inventory and matrix; two P0 fixes (resolver spelling
  tolerance; review-screen progressive disclosure) with unit + Playwright
  coverage; before/after evidence.
- **Launch Blockers discovered:** 2 (LB-010, LB-011 below), both fixed on this
  branch.
- **Post-Launch Tickets created:** 4 (see backlog).
- **Production changes:** None. No migration, flag, schema, secret or hosting
  change. `middleware.ts` untouched.
- **Not done / out of scope:** populated-data states (market-signal lists,
  marketplace listings, deal rooms) could not be exercised end-to-end because
  the audit env has no production database and the Deal Room / Check journeys
  are feature-flag-gated off. Their code paths and empty/error states were read
  and are sound; live verification is a production-preview task.

---

## 4. Route and state inventory

Status is the final code after following the locale redirect, on the audit
build. "Flag-gated 404" means the route is intentionally off in this env.

| Route | Renders | Notes |
|---|---|---|
| `/` (landing) | 200 | Desk hero, three families, Ask-Ponte console, Market Signals band, Start-a-deal block, footer. Market-signal band shows its honest "sources could not be read" state because the audit DB is synthetic. |
| `/explore` | 200 | Three-family universe. |
| `/market-signals` | 200 | Register; empty/error state under synthetic DB. |
| `/market-signals/[id]` | 200 (dynamic) | Signal detail; investigate action wired (§6 notifications). |
| `/find`, `/find/o/[ref]` | 200 | Find surface. |
| `/structure` (Start a deal) | 200 | Intent picker → product intake / category-first classify. |
| `/marketplace`, `/marketplace/new`, `/marketplace/l/[ref]` | 200 | Listing surfaces. |
| `/opportunities` | 200 | |
| `/check` | Flag-gated 404 | `NEXT_PUBLIC_CHECK_JOURNEY` unset → routes to `/verify` by design. |
| `/verify`, `/verification` | 200 | Verification entry. |
| `/deal-rooms` and children | Flag-gated 404 | `NEXT_PUBLIC_DEAL_ROOM` unset; LB-001 (nothing deployed). |
| `/account` | 200 | |
| `/login`, `/join` | 200 | Auth entry. |
| `/auth/callback`, `/auth/confirm`, `/auth/signout` | route handlers | Not locale-routed. |
| `/contact` | 200 | `mailto:hello@ponte.trade` contact path (see §6 notifications). |
| `/about`, `/pricing`, `/privacy`, `/terms` | 200 | Static content. |
| `/learn/duties`, `/learn/trade-data` | 200 | Learn leaves. |
| `/learn` (index) | 404 | No index page; **not linked anywhere** (P2, backlog). |
| `/workspace` | 200 | Post-submit continuation. |
| `/admin` and children | 200 | Admin; access-controlled server-side. Not linked from member nav. |
| `/dev/product-intake`, `/dev/*` | 200 dev / 404 prod | State galleries; `notFound()` in production. |
| `/offline` | 200 | PWA fallback. |

**Interaction states exercised** (product intake gallery, both viewports):
initial, typing, voice, upload, analysing, resolved, candidates, ambiguous,
identified, corrected, low-confidence, unmatched, browse, extracted,
multi-product, extraction-failed, upload-failed, blocked, review,
review-document, edited, incomplete, confirmed, draft-created, completed,
auth-interrupted, resumed. Each is a real reducer value, not a mock.

---

## 5. Clickability / dead-link audit

Every internal navigation target in the codebase (`href`, `router.push`) was
enumerated and cross-checked against the route table:

- **No dead links.** Every target resolves to a live route (or a
  flag-gated/dynamic one). Footer and command-bar targets are all 200.
- **No links to the `/learn` index** (which 404s) — it is reachable only by
  typing the URL.
- Family-entrance links (`/structure?family=…&intent=…`) all resolve to the
  correct category-first or product journey.

Per-control hover/focus/disabled/loading states are provided by the shared Ponte
component classes (`fbtn`, `pcand__r`, `prow__e`, Bridge stations) and the
`LifecycleState` primitive; no bespoke non-interactive element was found styled
as a control.

---

## 6. UX interaction matrix

| # | Route / state | User intention | Visible action | Expected result | Actual result (pre-fix) | Severity | Fix | Test |
|---|---|---|---|---|---|---|---|---|
| P0-1 | `/structure` product describe | Enter a product with a typo (`cementt`) | Identify this product | Ranked suggestion (cement) | `kind:none`, blank/unmatched dead-end; only the metered model could rescue it, and nothing if it was down | **P0** | Token-level fuzzy pass in `lib/products/fuzzy.ts`: a single mistyped word is corrected against catalogue *words*, not only whole terms | `lib/products/__tests__/cascade.test.ts` 3d; live API re-test |
| P0-2 | `/structure` → review | Create a draft from a simple requirement | Review + Confirm | Concise understanding, optional terms progressive | 13 empty "Not stated" rows, 13 Add controls, "13 terms are still unstated" warning, contract fields before any draft | **P0** | `ReviewPanel.tsx`: stated terms shown; optional terms collapsed behind one control, grouped (Quantity & delivery / Pricing & payment / Contract detail); warning removed | `components/products/intake/__tests__/intake-ui.test.tsx`; `e2e/product-entry-ux.spec.ts` |
| ✓ | `/structure?family=services` | Offer/seek a trade service | Pick a category | Category-first, no product/HS/quantity | **Pass** — "Which trade service…?" 10 categories + Other | — | (already correct) | `e2e/category-journeys.spec.ts` |
| ✓ | `/structure?family=distribution` | Seek/offer distribution | Pick a partner type | Category-first, no shipment form | **Pass** — 11 partner types + Other | — | (already correct) | `e2e/category-journeys.spec.ts` |
| ✓ | `/market-signals/[id]` | Ask Ponte to investigate | Investigate | Auth-gate → record + desk notification, no 3rd-party disclosure | **Pass** — inserts `signal_investigations`, emails desk, dedups, rate-limits | — | (already correct) | `lib/signals/__tests__/block-d.test.ts` |
| ✓ | `/contact` | Contact Ponte | Email link | Opens mail client to hello@ponte.trade | **Pass** — deliberate `mailto:` | — | (acceptable; form is P2) | — |
| ✓ | `/` Ask-Ponte console | State an objective | Start | Carries words verbatim into `/market-signals` | **Pass** — no silent classification | — | (already correct) | — |
| ✓ | intake resolver | `gas oil` / `gasoil` | Identify | Ambiguity question, three grades, nothing pre-picked | **Pass** | — | (already correct) | `resolve.test.ts` |
| P2 | `/learn` | (typed URL) | — | Redirect or index | 404 | P2 | backlog | — |
| P2 | `/favicon.ico` | tab icon | — | 200 icon | 500 (app/ + public/ duplicate) | P2 | backlog | — |

---

## 7. Findings and severity

### Fixed on this branch (Launch Blockers)

- **LB-010 — product resolver dead-ends on a common single-word misspelling.**
  `cementt` (one letter off `cement`) returned `kind:none` with no suggestion.
  The deterministic fuzzy stage compared the whole query against whole catalogue
  terms, so a bare typo of a product catalogued only under multi-word names
  (`portland cement`) was length-guarded away, leaving only the metered model —
  which costs a token per typo and dead-ends entirely if unavailable. Fixed with
  a token-level correction pass. `cementt`, `cemnet`, `gasoill`, `sugarr` now
  resolve for free; `avocado`/gibberish still correctly return nothing (no wrong
  guess).

- **LB-011 — the product-entry review exposes the commercial-terms schema.**
  The review printed all thirteen `CommercialTerms` as empty rows with per-row
  Add controls and warned that thirteen terms were "still unstated", including
  contract-level fields (counterparties, signatories) before any draft existed.
  Fixed with progressive disclosure: stated terms show; the optional terms
  collapse behind one control, grouped into three clear sections, described as
  optional rather than as a problem. The primary action stays "Confirm and
  create the draft".

### Deferred (Post-Launch backlog)

- `/favicon.ico` 500 — `app/favicon.ico` and `public/favicon.ico` both claim
  `/favicon.ico`. Pre-existing on `main`; blocks no journey.
- `/learn` index 404 — segment has leaves but no index; unlinked.
- `/contact` is a `mailto:` rather than a tracked form — works, but a form would
  give delivery confirmation and a logged record.
- Landing intent vs. product-intake copy: on `/structure` (no family entrance),
  choosing "Source a product" does not switch the intake's supply/need copy,
  because the intake reads `canonical.intent` which the legacy picker does not
  set. Cosmetic (copy only); the resolver and payload are unaffected.

## 8. Confirmations

- **Desktop and mobile:** review screen verified and captured at 1280×900 and
  390×844; no horizontal overflow at 390 (asserted).
- **Authenticated and unauthenticated:** unauth intake, review and category
  journeys exercised; authenticated actions (investigate, submit) are auth-gated
  by design and their gates were read and are intact. Full authenticated runs
  need a non-synthetic DB (production-preview task).
- **Notification paths:** "Ask Ponte to investigate" and Contact verified to
  reach a backend/desk path in code; end-to-end delivery needs production creds.
- **Design Constitution:** both fixes use only existing tokens and approved
  component classes; no new colour, radius, shadow, font, icon or component was
  introduced. Evidence in `evidence/`.

## 9. Evidence

- `evidence/desktop/review-collapsed.png` — after: understanding + one optional
  control + one primary action.
- `evidence/desktop/review-expanded.png` — optional terms opened into grouped
  sections.
- `evidence/mobile-390x844/review-collapsed.png` — 390-wide, no overflow.
