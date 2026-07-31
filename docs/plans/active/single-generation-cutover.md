# ExecPlan: Single-generation product cutover

**Status:** Active. PR 4 (public market and detail) is on `main` (PR #166,
`1006208`). PR 5 (member operations and board retirement) is implemented on
branch `claude/ponte-issue-130-cutover-pr5` and not merged. PRs 1 and 2 are
implemented on their own branches and not merged. PRs 3, 6, 7 and 8 remain.
**Owner:** Giuseppe Funaro
**Authorised:** 30 July 2026 — the owner authorised this programme to run inside
Launch Mode, to be delivered as separate reviewable PRs (not one PR), with
staging provisioned by the owner and `member_business` verification decoupled
from credits.

Conversations are workshops; this plan is the operating memory. It records the
decision and the discovered reality so the next agent does not need the
originating conversation. It is not itself approval for any production action.

## 1. Purpose and user outcome

Leave one coherent, navigable Ponte Trade application by retiring every obsolete
product generation. A member reaches every capability through one approved shell
and one set of canonical routes; no member is dropped into a legacy screen, a
retired editor, or a credit wall on a path that should be free. This is a
capability migration and route cutover, not a reskin: no obsolete route is
deleted while it still owns a capability that has no replacement.

## 2. Authority consulted

- `AGENTS.md` (Launch Mode; stop conditions; engineering rules).
- `docs/codex/00-START-HERE.md` (authority order) and
  `docs/codex/SOURCE-OF-TRUTH-SOP.md` (a chat brief is a proposal input, binding
  only as a recorded, owner-accepted, merged record).
- `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` (canonical entry
  routes, Ponte Desk as the selected shell, value-before-registration,
  Signals/Opportunities separation).
- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` (one approved shell; no
  generic substitution).
- `docs/codex/CURRENT-STATE.md`, `docs/launch/LAUNCH-BLOCKERS.md`,
  `docs/launch/POST-LAUNCH-BACKLOG.md`.
- `docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md`
  (the escalated `/marketplace` product question this programme answers).
- `docs/plans/active/constitution-led-interface-rebuild.md` (the in-flight
  one-shell migration this programme extends — it must not be forked).

## 3. Current implementation discovered

Mapped on 30 July 2026 by source inspection.

- **Every canonical route in the brief already exists.** This programme is
  mostly flag-flip + capability redistribution + deletion, not greenfield.
- **The new generation is already flag-gated.** `lib/landing/routing.ts` sends
  `find -> /find | /marketplace` (`NEXT_PUBLIC_FIND_JOURNEY`), `structure ->
  /structure | /marketplace/new` (`NEXT_PUBLIC_STRUCTURE_JOURNEY`), `check ->
  /check | /verify?for=counterparty` (`NEXT_PUBLIC_CHECK_JOURNEY`). Each flag is
  a journey's safe-disable.
- **Shell reality.** `components/ChromeGate.tsx` wraps the root layout and bares
  a per-path allowlist so migrated routes mount their own shell. The approved
  end-state shell is **`components/desk/DeskShell.tsx`** (`.ponte-desk`),
  mounted by 8 routes. `components/shell/PonteShell.tsx` (`.ponte-find`) is an
  intermediate Brand-v5 shell on explore/verify/verification and is itself
  migration debt. The legacy obsidian trio `SiteHeader` / `SiteFooter` /
  `BottomNav` is imported only by the root layout, via ChromeGate. The brief's
  "PonteShell / Ponte Desk" parenthetical conflates two different components; in
  code they are separate and the target is **DeskShell**.
- **Login default.** Lands on `/account`, in three places
  (`components/desk/DeskLoginForm.tsx:16-18`, `app/auth/callback/route.ts:10-11`;
  check `app/auth/confirm/route.ts` too). Brief wants `/opportunities`.
- **AccountGate** reads credit balance and prints cost copy even in `verify`
  context (`components/AccountGate.tsx:127-137,536-543`).
- **Verification is not credit-free.** `member_business` and `counterparty_check`
  share one paid path: `spendCredits(...COST_VERIFICATION_L2,
  "spend_verification")` in `lib/verification/pipeline.ts:181-206`, HTTP 402 in
  `app/api/verification/route.ts:95-104`, top-up link to `/pricing` and cost UI
  in `components/VerifyForm.tsx`, `app/[locale]/verify/page.tsx`,
  `components/check/CheckComposer.tsx`. Purpose gates only the badge write, never
  payment. Making `member_business` free is a real behavioural change.
- **`/api/marketplace/*` is load-bearing** (Start a Deal and Find post to it) and
  is NOT a retirement target. Only the `/marketplace` PAGES are arguable.
- **`/marketplace/new`** already redirects to `/structure` (LB-013).
- **No central route manifest existed** before PR 1.
- **Related tracked items:** PL-029 (five emails still link `/marketplace`),
  PL-030 (delete unreachable `ListingForm`), PL-001/PL-002 (no reproducible
  non-production DB — the mandated staging does not exist yet), PL-021..PL-024
  (favicon 500, `/learn` index 404, `/contact` mailto, legacy intent copy).

## 4. Scope

Delivered as separate PRs, in this sequence:

1. **Route authority** (this PR). `lib/navigation/route-manifest.ts` +
   route-audit test. Additive: no route retired, no flag flipped.
2. **Authentication and account.** Default `next` -> `/opportunities`;
   journey-specific `next` preserved; AccountGate keeps work and runs the pending
   action once; remove credit reads/cost copy from AccountGate outside a paid
   counterparty context; rebuild `/account` in the Desk shell (profile, company,
   business status, sign-out only); `/join` -> referral capture then `/login`.
3. **One creation system.** Only `/structure` creates/edits a commercial record;
   flip `NEXT_PUBLIC_STRUCTURE_JOURNEY` on; retire `/marketplace/new`'s residue.
4. **Public market and detail.** `/find` + `/find/o/[ref]` own the public board
   and record; migrate `/marketplace/l/[ref]` capabilities; redirect it.
5. **Member operations.** Move the three `/marketplace` capabilities
   (owner-side introduction decision, listing reconfirmation, account brief) to
   `/opportunities` + `/workspace` + `/account`; repoint PL-029 emails; redirect
   `/marketplace`; repoint the `/cart|/checkout|...` legacy chain to `/find`.
6. **Verification.** Credit-free `member_business` boundary; keep
   `counterparty_check` commercially separate; prove `member_business` cannot
   call any credit function (ADR required — durable commercial change).
7. **One shell and deletion.** Migrate remaining routes onto DeskShell; delete
   ChromeGate, legacy SiteHeader/SiteFooter/BottomNav, obsolete styles and
   retired nav message keys; fold PonteShell into Desk. Extends
   `constitution-led-interface-rebuild.md`.
8. **Production evidence.** Route atlas; record the deployed commit + Netlify
   deployment ID; visual and behavioural production check.

**Explicit exclusions.** No production migration, flag change, deploy or merge
without the owner authority `AGENTS.md` reserves. `/check` and `/deal-rooms/*`
stay feature-gated. The `/api/marketplace/*` namespace is not retired. No new
monetisation, verification-data or trust-representation change beyond the
approved `member_business` decoupling.

## 5. Product rules

- Market Signals and Member Opportunities stay separate in data, status,
  language and actions.
- Value before registration; preserve and resume work across authentication.
- `member_business` verification: authentication, attestation, company
  identification, registry/sanctions checks, candidate selection, evidence,
  binding a pass to the profile, and clear review/error states — with **no**
  credit balance lookup, cost display, top-up link, HTTP 402, credit spend,
  ledger record or refund. `counterparty_check` keeps any payment rule, and the
  business path must never import it.
- Gold is a brand signal, not a status. One approved shell. The Ponte lockup
  always links to `/`. Back moves one journey state backward and is never the
  only way back.

## 6. Technical design

- **Route authority:** `lib/navigation/route-manifest.ts` classifies every route
  `canonical | redirect | internal | feature_gated | development_only`, records
  redirect targets, feature flags, and (for routes mid-retirement)
  `retirementImplemented`. `findRoute()` resolves locale prefixes, dynamic
  segments and subtrees. All navigation builders, middleware redirects, sitemap
  and manifest entries are checked against it.
- **Route-audit test:** `lib/navigation/__tests__/route-manifest.test.ts` (in
  `npm test`). Manifest integrity + filesystem coverage + three cutover ratchets
  (retired-route links; redirect chains; verification->credit coupling), each a
  shrink-only baseline in the repo's `check-governance.mjs` idiom. Each later PR
  empties the baselines it fixes.
- Auth default, AccountGate, `/account`, creation flags, capability moves,
  verification boundary and shell deletion are designed in their own PR sections
  as they are reached.

## 7. Migration plan

Redistribute before retire, per the marketplace dependency finding (option 2):
the owner-side introduction decision and reconfirmation move to `/opportunities`
+ `/workspace`; the account brief moves to `/account`; `/marketplace/l/[ref]`
capabilities move to `/find/o/[ref]`; only then does each page become a
permanent redirect. No production schema change is planned; any that becomes
necessary is additive, idempotent, inspected against live production, and
owner-authorised separately.

## 8. Experience states

Every migrated journey accounts for loading, empty, incomplete, ambiguous,
error, blocked, resumed and completed states, at desktop and 390x844 with
reduced motion and visible focus, per the Constitution and North Star section 13.

## 9. Validation

- `npm run verify` (includes the new route-audit test) green per PR.
- Route atlas for every canonical screen (desktop 1440x900, mobile 390x844;
  signed-out/in; empty/populated/loading/success/validation/permission-denied/
  feature-gated states).
- Authenticated acceptance journeys run against owner-provisioned staging
  (sign-up, submit, resume, verify, interest, decision). No journey is declared
  verified from source inspection alone.

## 10. Rollout and safe-disable

Journey flags remain each journey's safe-disable during the cutover; a route is
only retired once its capability has a proven home. The route-audit ratchets
prevent regressions (a retired route cannot regain a UI, a canonical screen
cannot relink a retired route, the business path cannot regain a credit import).

## 11. Progress log

- **2026-07-30** — PR 1 implemented on branch. Added
  `lib/navigation/route-manifest.ts` (every route classified) and
  `lib/navigation/__tests__/route-manifest.test.ts` (11 checks, wired into
  `npm test`). Additive: no route retired, no flag flipped, no runtime behaviour
  changed. Ratchet baselines recorded from verified current state: 12 files link
  a retired route; 5 redirect chains via `/marketplace`; 4 verification-path
  files import `@/lib/credits`. Remaining: PRs 2-8.
- **2026-07-30** — PR 2 (authentication and account) implemented on branch
  `claude/ponte-issue-130-stage-1-77ca3b` (Issue #130 Stage 1). Not merged, no
  production action. Changes:
  - Generic login fallback `/account` -> `/opportunities` in the three sign-in
    exits (`components/desk/DeskLoginForm.tsx` `safeNext`,
    `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`); a journey-specific
    same-site `next`/`redirect_to` is preserved and still wins.
  - `/account` rebuilt on `DeskShell` (`app/[locale]/account/page.tsx`):
    profile, company, member-business status and sign-out only. The
    marketplace/listings block and its `/marketplace` link are removed;
    `lucide-react` icons replaced with `PonteIcon`; status uses the review/positive
    semantic tokens, not gold. `ClaimReferral` is still mounted (attribution
    integrity), and the page writes no attribution during render.
  - `/join` renders no UI: capture + redirect moved into `middleware.ts`
    (first-touch `ponte_ref` cookie, 307 to `/login`). The legacy
    `app/[locale]/join/page.tsx` and `components/founding/CaptureReferral.tsx`
    are deleted; the manifest's `/join` is now `retirementImplemented: true`.
  - AccountGate (`components/AccountGate.tsx`) reads a credit balance and prints
    cost copy only in the paid counterparty context (`context === "verify"`,
    i.e. `/check`); sign-up/publish/interest show no credit/cost language. The
    pending action still runs exactly once (`ran` guard, unchanged).
  - Ratchets tightened (shrink-only): `RETIRED_LINK_BASELINE`
    (`lib/navigation/__tests__/route-manifest.test.ts`) and `LUCIDE_BASELINE`
    (`scripts/check-governance.mjs`) drop `app/[locale]/account/page.tsx`.
  - `npm run verify` green. Deferred to PR 6 (unchanged): the `member_business`
    verify-page/pipeline credit decoupling (the `VERIFICATION_CREDIT_COUPLING`
    baseline is untouched) and its ADR. Remaining: PRs 3-8.
- **2026-07-30** — PR 2 controller amendment (PR #133 review; PR #132 closed as
  the duplicate, its broad rewrites not imported). Focused corrections only:
  - The signed-in Desk account control (`components/desk/DeskAccount.tsx`) now
    opens `/account`, a discoverable route to the rebuilt settings surface;
    `/opportunities` remains the generic post-sign-in destination.
  - Auth destination sanitisation centralised into one tested helper,
    `lib/auth/next-destination.ts` (`safeNextPath`, `safeRedirectTo`), used by
    `DeskLoginForm`, `app/auth/callback` and `app/auth/confirm`. It defaults to
    `/opportunities`, preserves a valid same-site path/query/hash, rejects
    protocol-relative / backslash / external / scheme / control-character
    targets, and accepts a same-origin absolute `redirect_to` only for confirm.
  - Regression tests `lib/auth/__tests__/next-destination.test.ts` (registered
    in `npm test`) cover the helper and pin the Stage 1 contracts by source. The
    route manifest and its tests are not rewritten.
  - The paid-counterparty separation in AccountGate is unchanged; the
    `member_business` verification pipeline is NOT made credit-free here (that
    remains PR 6). `npm run verify` green.
- **2026-07-31** — PR 4 (public market and detail) **merged to `main`** as PR
  #166, merge commit `1006208`. `/find/o/[ref]` became the one public Member
  Opportunity record page, reading through a single reader,
  `lib/board/qualified-opportunity.ts`, which applies the same publication
  contract the obsidian detail page applied. Every in-product link to
  `/marketplace/l/[ref]` was repointed. The obsidian page itself was left
  rendering, so that PR retired nothing.
- **2026-07-31** — PR 5 (member operations and board retirement) implemented on
  branch `claude/ponte-issue-130-cutover-pr5`. Not merged, no production action.
  This is the retirement of the obsidian board. Changes:
  - **Pages deleted.** `app/[locale]/marketplace/page.tsx` and
    `app/[locale]/marketplace/l/[ref]/page.tsx` no longer exist. Both paths
    answer a permanent **308** in `middleware.ts`, which is where every other
    permanent legacy redirect already lives: `/marketplace -> /find`, and a new
    pattern rule `/marketplace/l/<ref> -> /find/o/<ref>` that carries the
    reference across rather than dropping a forwarded link on the board.
    `LEGACY_PREFIX` gained the ability to derive a destination from the match in
    order to do that. `/marketplace/new` is unchanged and still redirects from
    its own page (its target is derived from `id`/`edit`, so it cannot be a
    static map). `/api/marketplace/*` is untouched.
  - **Legacy chain repointed.** `/cart`, `/checkout`, `/order-success`,
    `/brokerage` and `/network` name `/find` directly. They were redirecting to
    a route that itself redirected, which is the double hop
    `REDIRECT_CHAIN_BASELINE` existed to record.
  - **Public entrances repointed to `/find`:** `app/manifest.ts` (PWA shortcut),
    `app/sitemap.ts`, `/contact`, `/learn/duties`, `/learn/trade-data`,
    `components/SiteHeader.tsx`, `components/SiteFooter.tsx`,
    `components/BottomNav.tsx`, `components/home/LiveDealsGrid.tsx`.
  - **Owner-action emails repointed (PL-029).** "Manage or withdraw this
    listing", "Open your listing" and "Let it expire" go to `/opportunities`;
    "Review the request" and "Open in Ponte" go to `/workspace`. None goes to
    `/find`: they prompt an owner action, and the public search board cannot
    perform one.
  - **Server actions moved** from `app/[locale]/marketplace/actions.ts` to
    `app/[locale]/_actions/listings.ts`. A private folder is never a route
    segment, so the module is genuinely neutral rather than the property of
    whichever surface renders it. `RETURN_PATHS` drops `/marketplace` and
    `DEFAULT_RETURN` becomes `/opportunities`: the allowlist exists to bound
    what `redirect()` may be handed, and a permanent redirect is not a member
    surface. Importers updated: `/opportunities`, `/workspace`,
    `lib/signals/__tests__/route-behaviour.test.ts`, and the source-reading
    assertions in `lib/listings/__tests__/publication-gate.test.ts` and
    `lib/signals/__tests__/block-d.test.ts`.
  - **Landing seam.** `lib/landing/routing.ts` sends the Find intent to `/find`
    unconditionally. `NEXT_PUBLIC_FIND_JOURNEY` governed a fallback to the
    obsidian board; with that board retired the "off" position would forward to
    the "on" position, which is a second hop and a false promise that a previous
    surface still exists, not a safe-disable. `NEXT_PUBLIC_STRUCTURE_JOURNEY` is
    deliberately untouched: `/marketplace/new` is not retired here, and flipping
    that flag is PR 3's decision. A known cost of that flag-off path is now
    recorded in the file: the quarantine redirect discards every query key
    except `id`/`edit`, so the landing's captured intent does not survive it.
  - **Ratchets emptied** (shrink-only, in the same diff):
    `RETIRED_LINK_BASELINE` 10 entries -> 0; `REDIRECT_CHAIN_BASELINE` 5 -> 0;
    `DEPRECATED_SURFACE_PREFIXES` 2 -> 0 (a tightening: the scan now covers
    every file under app/ and components/ with no exclusion);
    `LUCIDE_BASELINE` 5 -> 3 (both marketplace pages, deleted with their icons).
  - **A FOURTH board capability was found with no home, and was carried across
    rather than dropped.** Stage 4a moved three (owner-side introduction
    decision, reconfirmation, account brief). Two more lived only on the board:
    `submitDraftAction`, the member's own `draft -> submitted` hand-in, and the
    `/structure?edit=<id>` link, the ONLY in-product route back into a member's
    own saved record. `/opportunities` listed drafts but offered no way to open
    or submit one, so deleting the board would have made a saved draft
    permanently unreachable and stranded the `draft` state. Both are now
    rendered on `/opportunities` using the same server action, moved not
    rewritten, and the returned-record reason (`decision_note`) is shown there
    too so "a named item must be corrected" names the item. **This was outside
    PR 5's stated scope and is flagged for owner review**: the alternative was
    to retire a capability with no replacement, which section 7 of this plan
    forbids.
  - `npm run verify` green.

## 12. Decisions and discoveries

- **Owner decisions, 30 July 2026:** (a) proceed now with ExecPlan + PR 1 as
  additive route authority; (b) owner provisions staging (non-production
  Supabase, non-production email, member + admin test accounts) — this agent
  wires config and seed scripts to it and cannot provision it (PL-001/PL-002);
  (c) `member_business` verification becomes fully credit-free, with a test
  proving it cannot call any credit function — recorded as an ADR in PR 6.
- **Discovery:** the brief conflates PonteShell and Ponte Desk. The approved
  target is DeskShell; PonteShell is intermediate debt (see section 3).
- **Discovery:** acceptance criteria 12 (authenticated journeys), 14 and 15
  (deployed commit + Netlify deployment ID + production check) are gated on
  owner-held infrastructure and the currently-unknown deployed commit; they stay
  open until that infrastructure exists.
- **Discovery, 31 July 2026 (PR 5), OPEN FOR OWNER RULING.** The obsidian board
  owned FIVE member capabilities, not the three section 7 lists. The two that
  were unrecorded are the draft hand-in (`submitDraftAction`) and the
  `/structure?edit=<id>` link that reopens a member's own saved record; a third,
  smaller loss is the returned-record reason (`decision_note`), which
  `/opportunities` promised in words but did not read. Retiring the board
  without them would have made every saved draft permanently unreachable from
  inside the product, since `/opportunities` listed records but linked none of
  them and `/find` shows only published ones. PR 5 carried all three to
  `/opportunities`, reusing the existing action and the existing Desk classes
  and adding no message keys. **The owner should rule on whether that carry-
  across is the intended home, on the wording of the two new controls, and on
  whether any further board affordance is wanted there.** The remaining board
  affordances were checked and do have homes: the public listing rows are
  `/find`, the WhatsApp share of an approved record is `/find/o/[ref]`, the
  pending introduction requests are `/workspace`, reconfirmation and the record
  list are `/opportunities`, and the account brief is `/account`.

## 13. Final evidence

To be completed per PR: commit SHAs, PR numbers, `npm run verify` output,
deploy-preview URL + commit, route atlas, and the production evidence for
criteria 14-15. None recorded yet beyond PR 1's repository work above.
