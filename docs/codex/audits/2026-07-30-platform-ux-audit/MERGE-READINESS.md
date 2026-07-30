# Platform UX audit — merge-readiness report (PR #115)

**Date:** 30 July 2026
**Branch:** `claude/platform-ux-audit-0094f9` (rebased onto `origin/main`)
**Instruction:** owner merge-gate checklist, 30 July 2026. **Do not merge.**

This report answers the seven merge gates and states, per item, whether it is
**fixed and verified**, **fixed but not verified in preview**, **code-inspected
only**, **still blocked**, or **deferred P2**.

---

## Gate 1 — Branch updated

`origin/main` was 15 commits ahead of the branch base. The branch was **rebased**
onto current `origin/main` (`cf02f92`).

`main` is under active concurrent development, so this took **two rebases**: the
first onto the state that had reused **LB-007** for Market Signals search and
resolved **LB-006** (PR #111); then `main` advanced six more commits (adding
**LB-008** anon-execute and **LB-009** multilingual Deal Room, closing LB-007),
so a second rebase onto the latest `main` was done. IDs were assigned from
`main`'s stated "next free identifier", landing at **LB-010/LB-011**.

**Conflicts and resolutions (3 doc files; no code conflicts):**

- `LAUNCH-BLOCKERS.md` — adopted `main`'s current active registry wholesale
  (LB-001, LB-008 anon-execute, LB-009 multilingual) and appended my two blockers
  as **LB-010** (spelling) and **LB-011** (review), bumping the file's "next free
  identifier" to LB-012. The stale LB-006 active row my earlier branch carried was
  **dropped** (it is resolved on `main`).
- `POST-LAUNCH-BACKLOG.md` — `main` had taken **PL-016..PL-020**. My four tickets
  were renumbered **PL-021..PL-024**.
- `DECISION-LOG.md` — both entries kept (main's newest first, then mine); my
  entry's references renumbered to LB-010/LB-011 and PL-021..PL-024.
- `CURRENT-STATE.md` — auto-merged; my note's LB references renumbered.

**Full suite on the rebased branch: `npm run verify` exits 0 end-to-end** —
`npm test` (all suites), `tsc --noEmit`, `next build`, `check-deps`,
`check-messages`, `check-encoding`, `check-migrations`, `check-governance`,
`check-launch-mode`, `check-contrast`, `check-token-adoption`,
**`check-bridge-invariance`** and the verification guard. The bridge-invariance
gate that was red before now passes, because LB-006 landed on `main`. The
earlier PR claim that verify could not fully pass is **superseded** by the rebase.

Playwright on the rebased branch: `e2e/product-entry-ux.spec.ts` **5/5**,
`e2e/interaction-audit.spec.ts` **11/11**.

**Status: fixed and verified.**

## Gate 2 — Deploy preview, not only localhost

Preview: `https://deploy-preview-115--ponte-trade.netlify.app` (Netlify build
green). It is **connected to production** (the Supabase Preview check names the
production project; Netlify holds the production Resend key). So the audit against
it was **strictly read-only** — no writes, no `/admin/*` (which writes on GET).

Verified on the preview, against **real production data**:

- **Landing renders with live records** — the Market Signals band shows real
  buyer requirements with refs (`EXT-G4WB-000002`), quantities and destinations,
  which localhost's synthetic DB could not show.
- **The LB-010 spelling fix is live in the production environment.** Through the
  default cascade path the UI uses (`POST /api/products/resolve {"text":"…"}`):
  `cementt` → resolved (Ordinary Portland cement), `cemnet` → resolved,
  `portland cemant` → resolved, `gasoill`/`sugarr`/`avocado` → resolved. Read-only
  (no DB write). The earlier stage-1-only path (`semantic:false`) correctly still
  returns none, confirming the fix lives in the fuzzy stage.
- **Quantity and unit render together on real data** (e.g. "20000 Metric Tons",
  "300 Metric Tons"), never a bare quantity beside "Unit: Not stated"; missing
  values read "PRICE BASIS: Not stated".
- **Notification endpoints fail closed unauthenticated:** `POST /api/market-signals/investigate`
  and `POST /api/marketplace/interest` return **401 "Sign in first."** with no
  write — the front door of Gate 4, proven in production.

**Not done on the preview:** the review screen itself was not driven end-to-end
in the browser there, because the dev state gallery is production-disabled
(`notFound()` in prod) and the intake Bridge station did not respond to automated
clicks (the SVG deck overlay intercepts synthetic clicks — a tooling artifact;
the station is a real keyboard-operable radio, verified in source and by the
interaction sweep). The review's progressive disclosure is verified on localhost
(Gate 6) and the same component is deployed on the preview.

**Status: fixed and verified in preview** for the resolver fix and data states;
**fixed, verified on localhost, deployed-but-not-driven-in-preview** for the
review screen.

## Gate 3 — Route coverage classification

**Exercised interactively** (browser and/or read-only HTTP against localhost
and/or preview): `/` landing, `/explore`, `/market-signals`, `/structure`
(products intake + review), `/structure?family=services`,
`/structure?family=distribution`, `/find`, `/pricing`, `/about`, `/contact`, and
the product-intake state gallery (`/dev/product-intake` — all review/intake
states). Interaction integrity asserted on the 10 principal routes.

**Inspected in code only** (rendered/HTTP-checked but not fully driven through
their authenticated or write behaviour): `/account`, `/login`, `/join`, `/verify`,
`/verification`, `/workspace`, `/marketplace`, `/marketplace/new`,
`/marketplace/l/[ref]`, `/opportunities`, `/market-signals/[id]`, `/find/o/[ref]`,
`/learn/duties`, `/learn/trade-data`, `/admin/*` (deliberately not opened on the
production preview — writes on GET), the `/auth/*` route handlers.

**Unavailable — feature-flag-gated:** `/check` (NEXT_PUBLIC_CHECK_JOURNEY unset →
routes to `/verify`), `/deal-rooms/*` (NEXT_PUBLIC_DEAL_ROOM unset; LB-001,
nothing deployed).

**Unavailable — no populated data in the synthetic local DB:** authenticated
member surfaces (`/account`, `/workspace`), populated marketplace listings and
member opportunities, and any post-submit state. On the **preview** the public
read surfaces (landing, market-signals) showed real data; authenticated surfaces
were not entered to avoid production writes.

**Open verification items (not passed tests):** the authenticated core journeys —
submit an opportunity end-to-end, resume across auth, express interest, request an
introduction, and the Deal Room progression — remain **unverified in this audit**.
They need a member session and either a staging DB or an owner-run test. Recorded
here as open, not green.

## Gate 4 — Notification delivery

**Code path — fully verified (inspected):** `Ask Ponte to investigate` and the
capability declaration (`/api/market-signals/investigate`) validate, rate-limit,
require auth, insert `signal_investigations`, dedupe on the unique constraint, and
call `sendBrokerageSubmission` → `sendOperatorEmail` → `ADMIN_ALERT_EMAIL`. The
mailer (`lib/email/send.ts`) sends via Resend with a **two-attempt retry**, writes
a delivery record through `observe()` (status sent/skipped/failed, messageId,
failureCategory) and logs `console.error` on failure. Third-party identity is
never read. Same path for `/api/brokerage/submit` and `/api/marketplace/interest`.
`/contact` is a `mailto:` (no backend; PL-023).

**Front door — verified in production (read-only):** both endpoints return
**401 "Sign in first."** unauthenticated on the preview — fail-closed, no write.

**Full live end-to-end — STILL BLOCKED for this audit.** Confirming *visible
action → 200 → DB row id → provider accept → delivery to the Ponte inbox →
failure logging* requires all of: (a) an authenticated, email-confirmed member
session, which I am not permitted to create and which needs an OTP round-trip;
(b) a **real write to the production database** and a **real email send** to the
Ponte inbox — which the same instruction ("do not alter production data") forbids,
and for which there is no non-production database (PL-002); (c) access to the
Ponte inbox to confirm receipt. None is available in this environment.

**What is needed to close it:** an owner-run submission on the deployed app (or a
staging environment with test credentials), then read back the `signal_investigations`
row id, the Resend message id from the delivery record, and confirm the desk email
arrived. I did not fabricate any of these values.

**Status: code-inspected and front-door-verified; live delivery still blocked.**

## Gate 5 — Interaction integrity

`e2e/interaction-audit.spec.ts` (**11/11 pass**) proves, across the 10 principal
unauthenticated routes, that **no visible button lacks an accessible name** and
**no visible link lacks a destination** (no `href="#"`, no empty href), and that
the app ships a **visible `:focus` treatment**. The nav link graph was separately
enumerated in code — every internal target resolves to a live route.

Loading/success/error feedback: the product intake models loading (`analysing`),
error (`extractionFailed`, `uploadFailed`, `blocked`), success and empty as
first-class reducer states rendered by `LifecycleState` (verified in the gallery);
the composer shows submitting/received/error. **Authenticated write-path feedback
states are code-inspected only**, per the DB constraint above.

**Status: fixed/verified for unauthenticated controls and focus; write-path
feedback code-inspected only.**

## Gate 6 — Progressive disclosure

`e2e/product-entry-ux.spec.ts` (**5/5 pass**) confirms on the rendered review:

- optional commercial fields are **hidden by default** — and hidden from the
  accessibility tree (the `hidden` attribute), so a screen-reader user is not read
  thirteen empty fields, resolving the a11y-confusion concern;
- expanding works by **mouse** (click) and by **keyboard** — the toggle is a
  native `<button>`, `tabIndex 0`, focusable; a browser diagnostic confirmed
  **Space activates it** (Playwright's synthesised key activation after a
  programmatic focus is timing-flaky and is not relied on in the committed test,
  which asserts reachability + activation deterministically);
- the **primary creation action stays clear and singular** ("Confirm and create
  the draft");
- **quantity and unit render together**, never quantity-without-unit;
- optional fields remain **available** (the copy states they can be added now or
  on the draft after creation).

**Status: fixed and verified (localhost, rendered).**

## Gate 7 — Merge-readiness classification

| Item | Classification |
|---|---|
| LB-010 spelling fix (fuzzy token pass) | **Fixed and verified** — unit test, localhost API, **and production preview** |
| LB-011 review progressive disclosure | **Fixed and verified on localhost** (Playwright + rendered evidence + unit tests); component deployed to preview but not driven there |
| Family separation (services/distribution category-first) | **Fixed/verified** (already correct; asserted by e2e) |
| No dead/unnamed controls + focus treatment (10 routes) | **Fixed and verified** (localhost) |
| Quantity/unit consistency | **Verified** on real preview data and in the review |
| Notification code path + fail-closed gate | **Code-inspected + front-door verified in production** |
| Notification live end-to-end delivery | **Still blocked** — needs owner-run test or staging (see Gate 4) |
| Authenticated core journeys (submit/resume/interest/intro/Deal Room) | **Open verification items** — not exercised; need session + DB |
| `npm run verify` full gate | **Passes end-to-end** after rebase |
| PL-021 favicon 500 / PL-022 `/learn` index / PL-023 contact mailto / PL-024 intent copy | **Deferred P2** (backlog) |

**Recommendation:** the two blockers this audit was scoped to (LB-010, LB-011) are
fixed, tested and — for the resolver — verified in production. The branch is
rebased and fully green. **Merge remains gated on owner review**, and two things
are honestly *not* closed by this audit and should be weighed: the **live
notification-delivery test** (Gate 4) and the **authenticated core-journey
verification** (Gate 3), both of which need a member session and a safe (staging)
or owner-run path that this environment cannot provide without writing production
data.

**Not merged.**
