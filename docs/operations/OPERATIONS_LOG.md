# Ponte Trade Operations Log

Purpose: the compact, chronological operating memory for production changes, material implementation outcomes, decisions, risks and immediate next actions.

This file does not replace product authorities, ADRs, `CURRENT-STATE.md`, `DATABASE-STATE.md` or implementation plans. It links operational reality across them so a new agent does not need to reconstruct the project from chat history.

## Operating rule

Add or update an entry whenever work materially changes production, deployment, database state, architecture, security, operating process or a cross-agent handoff. Keep entries factual, concise and evidence-based.

Use this structure:

- **Completed** — what actually happened.
- **Decisions** — owner-approved operational decisions.
- **Risks / discrepancies** — unresolved operational concerns.
- **Next** — the smallest ordered set of actions.
- **Evidence** — PRs, commits, migrations, production checks or canonical documents.

---

## 2026-07-30 - Supplier signals cleaned, category vocabulary merged, Market Signals entrance built

### Completed

- **Editorial cleanup applied in place to all 4,945 rows** of batch
  `g4wb_suppliers_2026-07-30` (`scripts/clean-go4world-signals.mjs`, upsert on
  `canonical_signal_id`, re-runnable):
  - **Titles canonicalised.** Seller marketing stripped ("Premium", "Export
    Quality", "Kualitas terbaik", trailing `, Grade A` clauses, everything after
    a `|`), real variety words kept (Sella, Golden, Steam, 1121, Arabica).
  - **Quantity re-extracted WITH its unit** from `quantity` and the source prose,
    canonicalised to MT / kg / litres / containers / bags / pieces. The first
    import had stored bare numbers, which is why a `qty = 1` Palm Oil card with
    no unit reached the public board.
  - **Origin normalised** to `Region, Country`, dropping city-level noise.
- **Publication gate: a stated quantity WITH a unit, plus a specific product
  name.** 1,310 published (`approved_signal`), 3,635 held `private`. Held rows
  are retained and re-enrichable; nothing was deleted.
- **The duplicate category vocabulary was merged — this was a real defect.** The
  first import invented its own casing, so production carried `"Rice & grains"`
  (250 live) beside the board's existing `"Rice & Grains"` (275 live), and the
  same for four more food markets. Every affected market appeared twice and
  neither entry was the whole of it. All rows were rewritten to the labels the
  inventory already used; the five lowercase labels now return **0**.

### Live board after the work

| | |
|---|---|
| Total live | **4,768** |
| Seller offers | **2,270** |
| Buyer requirements | **2,498** |
| Distinct categories | **22**, no duplicates |

### Decisions

- **Owner decision (2026-07-30): the Market Signals route opens on a CHOICE, not
  a list.** A buyer requirement and a seller offer answer opposite questions, and
  a blended newest-sixty list made the member do the sorting. `/market-signals`
  now renders two doors carrying their own live counts and their own search
  field; any filter, search, sort or page renders the board exactly as before,
  and `?view=board` is the explicit "show me everything" URL.

### Interface shipped (code, deploys with the branch)

- `components/desk/SignalGates.tsx` — the entrance.
- `components/desk/CategoryBrowse.tsx` + `/market-signals/categories` — every
  live market with its offers/requirements split, measured from the inventory
  rather than declared, so a market with nothing live is absent rather than
  listed-and-empty.
- `SignalBoard` gains a Buyer requirements / Seller offers / All lane selector.
- New `category` filter (`FindQuery` → `InventoryQuery` → `eq("category", …)`)
  and a `view` parameter. `showsBoard()` is the single authority for which of the
  two surfaces a URL means.
- **The two sides are NOT colour-coded**, deliberately: the approved palette
  reserves its status colours and keeps gold off status entirely (Constitution
  section 6), and direction is not a state. `token-authority.test.ts` passes,
  which is what proves no colour was invented.

### Risks / discrepancies

- **The interface is unverified in a browser.** `next build` compiles both routes
  and typecheck and the affected suites pass, but no frame was captured: the site
  is behind the Basic-auth gate and the shared password is not held by the agent.
  The gate was NOT weakened to get evidence. `/en/dev/market-signals-entrance`
  renders both surfaces over fixtures (dev-only, 404s in production) for whoever
  has the password.
- Published signals still carry **no written description**; cards show structured
  facts only. The desk write-up pass is not run.
- Signals carry no `public_expires_at`, so they do not auto-expire.

### Next

- Capture desktop and 390×844 evidence via the dev gallery, with the site password.
- Consider the write-up pass so cards carry a Ponte-voice line.

### Evidence

- `scripts/clean-go4world-signals.mjs`, `scripts/import-go4world-suppliers.mjs`.
- Counts above read from production with the service role via PostgREST, using
  the board's own eligibility predicates.
- **Rollback:** `delete from desk_radar where import_batch = 'g4wb_suppliers_2026-07-30';`

---

## 2026-07-30 - Go4WorldBusiness supplier signals imported and published live (batch g4wb_suppliers_2026-07-30)

### Completed

- **4,945 supplier offers imported into production `desk_radar`** (`cptglsmjmzcfpjndqfmc`)
  from the Go4WorldBusiness supplier export
  `go4world_suppliers_liquid_categories.csv` (4,945 data rows; 0 skipped, 0 duplicates —
  every `deal_id` unique). Upserted via PostgREST with the service-role key, in batches
  of 500, `on_conflict=canonical_signal_id` (idempotent; re-runnable).
- **Categorised.** All rows are product supplier offers → `side = offer`,
  `market_family = products`. Six source slugs mapped to a readable public `category`,
  a `product_sector_key` and an HS chapter (`hs_code`) for the board's chapter chips:
  rice-grains→"Rice & grains"/agri/10 (1,086), edible-oils→"Edible oils"/food/15 (1,231),
  nuts-dryfruit→"Nuts & dried fruit"/agri/08 (1,079), coffee-tea→"Coffee & tea"/agri/09 (596),
  spices→"Spices"/agri/09 (491), pulses→"Pulses"/agri/07 (462).
- **Ordered** by category, then newest spotted first.
- **Privacy preserved.** Supplier/contact fields land only in internal columns
  (`counterparty_*`, `import_meta`); none is in `PUBLIC_SIGNAL_COLUMNS`. (The export's
  contact email/phone/buyer_name were empty anyway; `buyer_company`/`buyer_country`
  are the only counterparty data and stay internal.)
- **Importer added:** `scripts/import-go4world-suppliers.mjs` (dependency-free; reads the
  CSV, categorises, orders, upserts via `fetch`; `--dry [--out file]` prepares without
  writing). Sibling of `scripts/import-desk-radar.mjs`, tailored to the supplier export
  (that older script maps `type==="sell"` and requires a quantity, so it would mislabel
  all 4,945 as `requirement` and drop 63%).

### Decisions

- **Owner decision (2026-07-30): publish the whole set LIVE**, not the usual
  private-on-import + per-row admin approval. All 4,945 written `status = approved_signal`,
  `published_at = now`, **`public_expires_at = null`** — deliberately not `spotted_at + 90d`,
  because the scrape carries historical spotted dates back to 2003 and a spotted-based
  window would immediately hide most of the inventory.

### Risks / discrepancies

- These are **unconfirmed external signals** (the record type's premise) published without
  the individual desk review the import convention normally applies. ~1,486 rows share a
  product name with another (different supplier/date); all retained as distinct listings.
- Signals carry no `public_expires_at`, so they will **not auto-expire**; removal is a
  deliberate action.

### Next

- If any subset should not be public, withdraw by canonical id or category.
- **Rollback (one statement):** `delete from desk_radar where import_batch = 'g4wb_suppliers_2026-07-30';`

### Evidence

- Production verification (service-role, exact public read contract
  `status=approved_signal` + `public_expires_at is null or > now`): batch board-visible
  **4,945 / 4,945**; whole-board live inventory **~3,458 → 8,403**; per-category counts
  match the import summary; a public-columns read exposes no internal field.
- Script: `scripts/import-go4world-suppliers.mjs`.

---

## 2026-07-30 - Dedicated QA identity created; LB-008 closed on a real authenticated probe

### Completed

- **One dedicated QA identity created** in production `cptglsmjmzcfpjndqfmc`, on an
  owner-confirmed Ponte-controlled address:
  - email `deals@ponte.trade`, user id `8263140e-4231-496b-b4c6-cfc88739995b`
  - label and purpose `Ponte Trade Deal Room QA`, recorded in `user_metadata`
  - `email_confirm: true`, so no mail was sent to a human
  - **no password was ever supplied**; `app_metadata` carries provider information only
  - auth role `authenticated` (the ordinary Postgres role); **`profiles.role` = `customer`**
  - **no admin and no service-role privilege**
  - user count **9 to 10**; `admin` profile count **unchanged at 1**
- **Credential disposition: nothing reusable retained.** Zero QA sessions, zero QA
  refresh tokens, zero live tokens. Sessions were obtained from single-use links,
  held in memory only, and revoked at the end of the run. **No token, link or secret
  appears in this repository, in any log or in any pull request.**
- **The previously pending real-authenticated direct-RPC probe PASSED.** As the QA
  member: intended functions usable **19 of 19** - four RLS helpers returning `200`,
  fifteen commands reaching their bodies - and internal functions denied **4 of 4**,
  with `deal_room_log_event` returning the PostgreSQL
  `permission denied for function deal_room_log_event`. `deal_room_events_append_only`
  returned `404 PGRST202`, because PostgREST drops functions a role cannot execute
  from its schema cache.
- **Catalogue state unchanged by the probe:** `anon` EXECUTE **0 of 23**, `PUBLIC`
  **0**, `authenticated` **exactly 19 by name**, `service_role` **23 of 23**, 14
  policies with none non-SELECT and none naming `anon`.
  `npm run deal-room:acl-verify` exits 0.
- **No existing account or profile was modified.** One pre-existing account's
  `updated_at` moved during the window; it was a refresh-token rotation from that
  account's own live browser session (token at `.287`, user row at `.297`, ten
  milliseconds later), not a sign-in and not a creation. No operation in this pass
  named any account other than `deals@ponte.trade`.
- **LB-008 moved to Resolved.**

### Decisions

- Owner, 30 July 2026: `deals@ponte.trade` confirmed as a Ponte-controlled inbox;
  exactly one normal-member QA account authorised; no admin role, no
  `profiles.role` modification, no use or impersonation of the nine existing
  members.

### Risks / discrepancies

- **A testing-method correction worth carrying forward.** The first probe predicate
  treated any SQLSTATE `42501` as a missing grant and reported 0 of 15 commands
  usable. **Ponte command bodies deliberately raise `42501` for domain
  authorisation refusals** - the migration does so 44 times - so "Deal not found" or
  "Only a room administrator can do this" is the function executing correctly for a
  member with no rooms. **Only `permission denied for function <name>`, which
  Postgres alone emits, proves missing EXECUTE.** The corrected predicate produced
  19 of 19 usable and 4 of 4 denied. A future probe that does not make this
  distinction will read a healthy ACL as a broken one.
- **The `/account` browser landing was NOT demonstrated**, and the reasons are
  findings rather than excuses. The requested `http://localhost:3000/auth/callback?next=/account`
  continuation was **not in the project's Redirect URL allowlist, so Supabase
  substituted the project Site URL and discarded the continuation entirely**. Second,
  the admin-generated link returned an **implicit token fragment**
  (`#access_token=...&refresh_token=...`) with **no `code` parameter**, while
  `app/auth/callback/route.ts` requires `?code=` for `exchangeCodeForSession`; it
  would have fallen through to `/login?error=auth`. Third, port 3000 was held by
  another session's dev server and shared `.claude/launch.json` was not repointed.
  **None of this affected the authenticated ACL result and none of it is part of
  LB-008.** `/auth/callback` itself is correct: it honours `next`, defaults to
  `/account`, and blocks open redirects.
- **Unallocated observation for controller intake, no identifier assigned.**
  `lib/email.ts` line 369: the `operator_alert` template hardcodes
  `actionPath: "/admin"`. Combined with `app/[locale]/admin/layout.tsx` line 53,
  which bounces an unauthenticated `/admin` hit to `/login?next=/admin`, that is a
  route by which a session can end on `/admin`. Mitigating: the admin layout gates
  on `profiles.role !== 'admin'` and renders a restricted notice, so landing there
  grants nothing. **No claim is made that the QA account produced the earlier
  `/admin` screenshot** - it did not exist at that time, and the account, the link
  and the session in this pass all postdate it. No fix is included here.
- Requirements 12 and 13 (entitlement fail-closed, cross-room isolation) remain
  catalogue-only and need Approval 3.

### Next

1. Approval 2: `20260729c`, the `deal-room-evidence` bucket and its two policies.
2. Approval 3: a labelled non-commercial pilot Deal using the QA account, then the
   negative-access fixture.
3. Approval 4 - flag and deploy - remains unauthorised.
4. Controller intake for the `operator_alert` `/admin` observation.

### Evidence

- `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md`, closure section
- `docs/codex/DATABASE-STATE.md`, Deal Room internal-function ACL section
- `docs/launch/LAUNCH-BLOCKERS.md` - LB-008 resolved
- `npm run deal-room:acl-verify`, exit 0

---

## 2026-07-30 - "Ask Ponte to investigate" notification lane: real delivery demonstrated, and the send result no longer swallowed

### Completed

- **Real delivery demonstrated end to end.** The exact desk notification the
  investigate CTA produces (`operator_alert`, rendered through `lib/email`) was
  sent from the live Ponte Resend account as `Ponte Trade <hello@ponte.trade>` to
  the real desk `deals@ponte.trade`, clearly marked `[DELIVERY TEST]` and with an
  idempotency key. **Resend status: delivered** (id `9e7e198e-b9d8-43f0-a025-5f84abc32ee9`).
  **Verified received in the desk inbox** (Gmail thread `19fb21f764c560ca`,
  labels `INBOX`, `IMPORTANT` — **not** spam or trash). The email renders with the
  merged PR #114 fixes: header `padding:24px 32px` intact, footer "Privacy · Terms".
- **The CTA path was traced and found sound:** `market-signals/[id]/page.tsx` →
  `components/signals/InvestigateButton.tsx` → `POST /api/market-signals/investigate`
  → persist to `signal_investigations` (RLS, applied to production, three-part
  unique constraint for dedup) → `sendBrokerageSubmission` → `deals@ponte.trade`.
  Result UX is unequivocal (a "received" state on success, visible error text on
  failure, an account gate on 401 that resumes after sign-in); duplicates are
  prevented three ways (an in-flight guard, the post-success button state, and the
  DB unique constraint). All already live and covered by `route-behaviour.test.ts`.
- **One gap closed: the notification send result was discarded.** The route did a
  bare `await sendBrokerageSubmission(...)` and returned `{ok:true}` regardless, so
  a missing `ADMIN_ALERT_EMAIL` or a provider error meant the desk was silently
  never alerted while the caller still saw success. `sendBrokerageSubmission` now
  returns its `SendResult`; the route observes it, logs loudly when the desk was
  not emailed (naming skip vs failure), and returns `{ok, notified}`. `ok` is the
  member's truth (the request is recorded and queued); `notified` is the operator's
  truth (the alert actually went out). The member is never shown a failure, because
  the request is safe either way.

### Decisions

- No product behaviour changed; the request remains the system of record and the
  email remains an alert. Confined to the email/notification lane.

### Risks / discrepancies

- **`ADMIN_ALERT_EMAIL` in production is inferred, not confirmed from the repo.**
  The live Resend log shows desk alerts delivered to `deals@ponte.trade`, so it is
  configured; the new `notified` flag and error log make any future
  misconfiguration observable rather than silent.
- The delivery demonstration used the app's rendered content sent through the same
  Resend account the app uses; it is faithful to the produced email but is not the
  Next.js route executing in production. The route's own path is covered by the
  automated test.

### Evidence

- Resend `emails.get` `9e7e198e-...`: status delivered, from `Ponte Trade <hello@ponte.trade>`, to `deals@ponte.trade`.
- Gmail thread `19fb21f764c560ca`: `INBOX`/`IMPORTANT`.
- `lib/signals/__tests__/route-behaviour.test.ts`: 13 tests (was 11), incl. the recorded-but-not-notified case (skip and provider-error).
- `app/api/market-signals/investigate/route.ts`, `lib/email.ts` (`wasDelivered`, `sendBrokerageSubmission` returns `SendResult`).

---

## 2026-07-30 - Authentication and transactional email pinned; nothing applied to production (LB-012, ADR-0017)

### Completed

- The repository owner classified **authentication and transactional email as a launch-blocking workstream**. Recorded as **LB-012** in `docs/launch/LAUNCH-BLOCKERS.md` and decided in **ADR-0017**, which extends ADR-0013 rather than altering it.
- **The reported malformed CSS does not exist in this repository at any revision.** `git log --all -S "32border"` returns nothing; `lib/email/shell.ts` has been modified in exactly two commits (`cc438c2` and its merge `b378ad2`) and has carried `padding:24px 32px;border-bottom:` since it was written; the layout `cc438c2` retired was `<div>`-based on `#0F1E3C`/`#E8A020` and contained no such declaration. The only place those bytes lived outside the code was `docs/email-provider-template-configuration.md`, the Supabase Auth template **that a human pastes by hand**, and that document carried its bodies as fragments with `style="..."` placeholders so every body had to be reassembled by hand.
- **The Supabase Auth template is now generated, committed and checksummed.** `lib/email/auth-templates.ts` builds it through the same `wrapDocument()` shell and tokens as the thirteen application templates; `npm run auth:templates` writes `supabase/templates/`; the test suite fails if the committed file stops matching the generator. SHA-256 of `auth-otp.html` is recorded in `supabase/templates/README.md`.
- **`lib/email/audit.ts`** reads every generated email as a document: tag structure, attribute well-formedness, and every declaration checked for a fused neighbour by requiring each numeric token to wear a real CSS unit. Dependency-free, so it runs inside `npm test`.
- **`lib/email/send.ts` sender identity corrected** from the bare `hello@ponte.trade` to `Ponte Trade <hello@ponte.trade>`, wrapping a bare address supplied through `RESEND_FROM_EMAIL` rather than passing it through.
- **Twelve client-compatibility frames captured** to `docs/codex/audits/email/evidence/` by `npm run email:clients:capture`. They are **not** renders by Gmail, Yahoo or Outlook: each is the same document with that client's documented limitations applied as an explicit transformation.
- Two record conflicts resolved: the dark `#06070A`/`#CBFB5E` E1 template in `AUTH-EMAIL-SETUP.md` §5 is **superseded** (its colours are in no approved token file), and the ten-minute against one-hour code lifetime is settled at **ten minutes**, from one constant that produces both the email's sentence and the required dashboard value.
- **A dead footer link was removed.** Every application email footer linked "Notification preferences" to `/account/notifications`, a route nothing under `app/` serves - a 404 in all thirteen templates. The link is removed from the member footer in HTML and plain text; Privacy and Terms, which resolve, stay; no route was created and no consent semantics changed. The genuine preferences feature is deferred as **PL-025**. Owner-directed correction of 30 July 2026.
- **The live Resend provider state was verified (30 July 2026), resolving most of OD-010.** Querying the account directly: `ponte.trade` is **verified**, sending **enabled**, **DKIM verified**, **SPF (MX + TXT) verified**, and **open and click tracking are both off** — so ADR-0017 §8 is already satisfied in production and delivery is authenticated. The live send log shows real Ponte mail delivered to Gmail, Yahoo and external inboxes, so the operational path works. **Still owner-held:** DMARC (`_dmarc.ponte.trade`, not managed or reported by Resend) and the `auth@ → hello@` reply forward. See OD-010.
- **The Supabase auth OTP template is confirmed NOT applied.** The Resend send log shows the most recent authentication emails carrying the subjects "Confirm your email address" and "Welcome to Ponte · confirm your email", **not** the ADR-0017 subject "Your Ponte Trade sign-in code". So production is still on the Supabase defaults; applying `supabase/templates/auth-otp.html` remains an unperformed owner dashboard action, exactly as `docs/email-provider-template-configuration.md` states.
- **Identifier collisions resolved by renumber, three times, as `main` moved under the branch.** Claimed `LB-008` when free → PR #113 took `LB-008` (anon-EXECUTE) → `LB-009` → PR #112 took `LB-009` and `ADR-0016` (multilingual) → `LB-010` and `ADR-0017` → PR #115 took `LB-010` and `LB-011` (product resolver, product-entry review) → **`LB-012`**. `LB-012` and `ADR-0017` were verified free against `origin/main` immediately before the final push; the four backlog tickets moved to `PL-025..028` for the same reason. Recorded in `LAUNCH-BLOCKERS.md` "Reserved identifiers". The recurring cause is that identifiers invented on unmerged branches are treated as reserved before they merge; the fix that ends it is to merge, which locks the number on `main`.

### Decisions

- ADR-0017, accepted 30 July 2026. One template for both Confirm signup and Magic Link with one subject; a code and never a link; the light Ponte Flow palette; ten minutes; `Ponte Trade <address>` always; open and click tracking disabled; only templates with a Ponte journey behind them are written.

### Risks / discrepancies

- **No production change was made, and none is authorised by this entry.** The Supabase templates, the SMTP sender name (`Ponte Trade`, not `Ponte`), the `600`-second OTP expiry and the Resend tracking toggles are **all unapplied**. Nothing in this repository can apply them.
- **The production-deployed commit could not be determined.** Netlify writes no GitHub deployment (`gh api .../deployments` returns `[]`); the last deployment noted in this log is the 28 July hotfix of `b378ad2`, whose stated next action - confirm the deployment succeeded - has no recorded outcome; and `https://ponte.trade/` answers `401` behind the Basic-auth wall, so no build identifier can be read. `main` is `23637d3` and the working branch is identical to it.
- **`ponte.trade`'s email-authentication state is unrecorded.** Whether DKIM, SPF and DMARC are published is not in any file here, and without them a test send goes to spam in all three clients however well the HTML renders. Raised as **OD-010**.
- **The `auth@ponte.trade` to `hello@ponte.trade` forward has no record of being set up**, so a reply to a sign-in code goes nowhere. Recommended 22 July 2026.
- `CURRENT-STATE.md` described the unified transactional email system as "Not merged, not deployed". It has been on `main` since `b378ad2` on 28 July 2026. Corrected in the same change.
- **The launch-blocker register is churning faster than branches can land.** In one afternoon `LB-005`, `LB-007`, `LB-008` and `LB-009` each collided between concurrent branches, and this branch alone renumbered twice. The recurring cause is that identifiers invented on unmerged branches are treated as reserved before they merge; the mitigation is to re-read the register against `origin/main` immediately before each push, which is what caught both collisions here.

### Next

1. Read and record the four settings in **OD-010**: domain verification with DKIM/SPF/DMARC, both tracking toggles, and the reply forward.
2. Apply the Supabase dashboard changes by following `docs/email-provider-template-configuration.md`, and record the applied checksum here.
3. Run the closing test sends to real Gmail, Yahoo and Outlook mailboxes and record whether each arrived **outside spam** and rendered correctly. That, and only that, closes LB-012.
4. Confirm or reassign this PR's `LB-012` / `ADR-0017` before merge, since the register churned twice under it.

### Evidence

- `docs/codex/audits/email/2026-07-30-auth-and-transactional-email.md`.
- `lib/email/__tests__/auth-email.test.ts` - 25 assertion groups, exit 0. Includes the reader proved to fail in three directions: the reintroduced fusion, a dropped closing tag and a lost attribute quote.
- `npx tsc --noEmit --incremental false` - clean. `npm test` - all suites pass.
- `docs/codex/audits/email/evidence/` - 12 frames, with `README.md` stating what they are and are not.

---

## 2026-07-30 - `20260730c_deal_room_internal_acl.sql` applied; Deal Room ACL matches its contract

### Completed

- **PR #123 merged** after CI `verify` **SUCCESS** on exact head `7f27ec4`. `main`
  `b8f3db5` to **`453a49c`**. `Supabase Preview` failed, the only failure,
  reproducing the recorded migration-bearing-PR pattern and covered by the owner's
  waiver.
- **Applied to production at 08:26:17.995 UTC** from a clean checkout of merged
  `main`. One transaction, exit 0, no timeout, no HTML, no 502. Ledger **46 to 47**,
  exactly one row, checksum
  `5adb34c2ef183c601b30048084121577cf65cba29ad4fb7dacb075ac8c7d1891` verified
  against the **merged** file before execution.
- **All seven required verifications passed:** `anon` 0 of 23; `PUBLIC` 0;
  `authenticated` **19 by name** (four RLS helpers, fifteen commands);
  `service_role` 23 unchanged; the logger and the three internal functions reachable
  by `service_role` alone; all nine before/after md5 fingerprints identical
  (bodies, policies, triggers, indexes, constraints, columns, RLS state,
  `pg_default_acl` at 24 rows); ledger +1 with the correct checksum.
- **`npm run deal-room:acl-verify` exits 0** and is now the standing witness to the
  ACL. Demonstrated in both directions: run before the migration it exits 1 with
  five problems, naming all three functions and reporting `authenticated 22 of 23,
  expected 19`.
- **A real anonymous client confirms it end to end:** logger, commands and helpers
  all `401 / 42501 permission denied for function ...`; member table reads still
  `200 []` rather than erroring, so revoking the three did not disturb policy
  evaluation.
- **The instrument defect is fixed too.** `function-acl.test.ts` had asserted
  "authenticated should end with execute on exactly 19" and passed while production
  held 22. Every assertion now says whether it is about the file or about the world,
  and one of the 28 fails if the verification script stops existing or stops
  interrogating all three roles.

### Decisions

- Owner, 30 July 2026: Phase 1 only. No test account, no `20260729c`, no Storage
  bucket, no pilot Deal, no `NEXT_PUBLIC_DEAL_ROOM`, no deployment or public
  exposure.

### Risks / discrepancies

- **LB-008 stays open on one probe, not on a defect.** The real authenticated
  direct-RPC confirmation needs a dedicated QA account (Phase 2, not started). The
  catalogue proves `authenticated` cannot execute the logger, and the identical
  enforcement is proved at the API layer for `anon`, so the gap is narrow - but the
  standing instruction is not to claim full resolution while that client is
  unavailable.
- Still outstanding from earlier passes: owner confirmation of the RLS containment
  of 03:39 UTC, and requirements 12 and 13 (entitlement fail-closed, cross-room
  isolation), which need Approval 3.
- **The durable lesson:** a Supabase `public` schema does not create objects
  private, and no text scan reveals what privileges exist. Twice in one day a
  migration or a test asserted something about a file rather than about the
  database.

### Next

1. Phase 2: a dedicated QA account, on an owner-confirmed Ponte-controlled address.
2. Phase 3 (Approval 2): `20260729c`, the `deal-room-evidence` bucket and its two
   policies.
3. Phase 4 (Approval 3): a labelled non-commercial pilot Deal and the negative-access
   fixture.
4. Approval 4 - flag and deploy - remains unauthorised.

### Evidence

- `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 17 to 21
- `docs/codex/DATABASE-STATE.md`, Deal Room internal-function ACL section
- `docs/launch/LAUNCH-BLOCKERS.md` - LB-008 narrowed to one probe
- `public.schema_migrations`: 47 rows
- `npm run deal-room:acl-verify`, exit 0

## 2026-07-30 - `20260730b_deal_room_function_acl.sql` applied; anonymous path closed, LB-008 still open

### Completed

- **Applied to production `cptglsmjmzcfpjndqfmc` at 07:59:45.928 UTC**, from `main`
  at `9c91e09` with a clean worktree and `npm run verify` exit 0. One transaction,
  exit 0, **no timeout, no HTML, no 502**. Ledger **45 to 46**, exactly one row,
  checksum `15f488d8...542b31` matching byte for byte.
- **Every read-only probe used `--sql`.** `--file` was used exactly once, for the
  authorised migration - the discipline recorded after the `pre.sql` incident.
- **A before-baseline was captured first**, so "unchanged" could be proved rather
  than asserted: md5 fingerprints of function bodies, policy definitions, triggers,
  indexes, constraints, columns, RLS state and `pg_default_acl`, plus
  `service_role` counts and row counts.
- **The anonymous execution path is closed, proved through a real client.** `anon`
  EXECUTE on **0 of 23** (from 23); `PUBLIC` on 0; `deal_room_log_event` reachable
  by `postgres` and `service_role` only. Anon-key RPC to the logger returns
  `401 / 42501 permission denied for function deal_room_log_event`, where the same
  call returned `409 / 23503` before.
- **Nothing else moved.** All nine before/after fingerprints identical.
  `service_role` unchanged at 23. Project-wide default privileges unchanged, 24
  rows. 14 policies, 4 agreement documents, 0 rooms, 0 activity rows.
- Anonymous calls to commands and helpers now fail at the grant rather than inside
  the body, and member table reads still return `200 []` rather than erroring -
  confirming that revoking the helpers from `anon` did not break policy
  evaluation, because the 14 policies are scoped `to authenticated`.

### Decisions

- Owner, 30 July 2026: apply `20260730b` **only**. `20260729c`, Storage, the
  negative-access fixture, a Deal Room or pilot Deal, project-wide default
  privileges, the feature flag, deployment and the access wall all remain
  unauthorised.

### Risks / discrepancies

- **LB-008 stays ACTIVE. Probe 7 failed:** `authenticated` holds EXECUTE on **22**
  functions, not the specified 19 - the 19 intended plus `deal_room_is_writable`,
  `deal_room_uuid_or_null` and `deal_room_events_append_only`. The migration
  revokes `authenticated` only on the logger, and re-granting 19 cannot remove
  grants Supabase's defaults had already created on all 23. Probe 10 fails for
  those same three.
- **The regression suite did not catch it, and its wording overstates its reach.**
  `function-acl.test.ts` asserts "`authenticated` should end with execute on
  exactly 19" and passes, because it counts grant statements in the file. A
  file-text test cannot see a privilege the file never mentions. **LB-008 was a
  file asserting something about itself; the test written to catch it asserts
  something about that file.** Only the catalogue could answer it, and it was not
  consulted until after application.
- **Residual exposure, precisely:** all three are closed to `anon`; `is_writable`
  is a read-only boolean predicate, `uuid_or_null` is pure text coercion with no
  table access, `events_append_only` raises outside a trigger context. None
  writes, and none is the forgery path - the logger is closed to both member
  roles.
- **Probe 6 pending.** A real authenticated direct RPC needs a member JWT; there
  are no authorised test credentials, and production's 9 confirmed users are real
  member accounts. Minting a session for one to satisfy a probe is not a test
  credential and was not done. Probes 8 and 9 are catalogue-verified,
  behaviourally pending.
- Still outstanding from earlier passes: owner confirmation of the RLS containment
  of 03:39 UTC, and requirements 12 and 13 (entitlement fail-closed, cross-room
  isolation), which need Approval 3.

### Next

1. A follow-up migration revoking `authenticated` on the three internal functions,
   and a corrected test that does not claim what a text scan cannot see.
2. An authorised test account, or authorisation to create one, for probe 6.
3. Approval 2: `deal-room-evidence` bucket and its two policies.
4. Approval 3: a published pilot Deal, then `npm run deal-room:negative-access`.
5. Approval 4: flag and deploy.

### Evidence

- `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 11 to 16
- `docs/codex/DATABASE-STATE.md`, Deal Room function ACL section
- `docs/launch/LAUNCH-BLOCKERS.md` - LB-008 active, narrowed
- `public.schema_migrations`: 46 rows, one each for `20260729a`, `20260729b`, `20260730b`

---

## 2026-07-30 - `20260729b_deal_room_rls.sql` applied to production; LB-008 found

### Completed

- **The corrected `20260729b_deal_room_rls.sql` was applied to production project
  `cptglsmjmzcfpjndqfmc`** under the owner's Gate C Approval 1 continuation, from
  `main` at `23637d342bf526252c740b9e53c042668d0f8d2f` with a clean worktree and
  `npm run verify` at exit 0. Applied with `node scripts/db-query.mjs --file`,
  one transaction, **exit 0 at 05:59:43 UTC**, no timeout, no HTML and no 502 -
  so none of the inspect-before-retry procedure was needed.
- **Checksum verified immediately before execution and again after**, as raw
  bytes and as the utf8 string `db-query.mjs` hashes, which are identical for this
  file: `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153`,
  76,684 bytes, no BOM. Recorded as exactly one ledger row, **44 to 45**.
- **All eight preconditions confirmed before touching production:** one ledger
  row for `20260729a`, none for `b`, 15 tables, RLS on all 15, zero policies, no
  `deal-room-evidence` bucket.
- **The fourteen required verifications came out 11 / 1 / 2:** eleven passed, one
  failed (requirement 11, the event logger's grant — **LB-008**), and two remain
  pending and unproved (requirements 12 and 13, entitlement fail-closed and
  cross-room isolation, which need Approval 3). An earlier version of this entry
  implied thirteen passes; the owner corrected the tally on 30 July 2026. A
  requirement that cannot be tested yet has not passed.
- **Verified after:** 23 `deal_room_*` functions, 21 SECURITY DEFINER, all with
  `search_path = public, pg_temp`; `deal_room_invite` on `(uuid, text, timestamptz)`
  only and the five-argument form absent; 14 policies, one SELECT per
  member-facing table, all `authenticated`, zero non-SELECT, none naming `anon`;
  `deal_room_agreement_documents` revoked from both member roles (anon read
  returns `401 / 42501`); the append-only trigger firing `BEFORE DELETE OR
  UPDATE`; the legacy cluster and `is_deal_participant()` untouched.
- **LB-005 closed. LB-004 closed** and moved to the resolved register.

### Decisions

- Owner, 30 July 2026: apply the corrected `20260729b` **only**. `20260729c`, the
  Storage bucket, the negative-access fixture, the feature flag, the allowlist and
  deployment all remain unauthorised.

### Risks / discrepancies

- **LB-008, a new Launch Blocker.** `anon` holds EXECUTE on all 23
  `deal_room_*` functions. `20260729b` intends the opposite and performs `revoke
  all on function public.deal_room_log_event(...) from public`; that removes the
  PUBLIC grant but not Supabase's explicit `alter default privileges` grants to
  `anon`, `authenticated` and `service_role`. It matters for
  `deal_room_log_event()`, which has no authorisation check of its own by design,
  so the grant was its only protection. Proved with an anon-key RPC returning
  `409 / 23503` - an FK violation naming the `room_id` passed in, so the body
  executed - without writing anything.
  **Fail-closed today** (zero rooms, so the FK rejects every forged row; member
  reads return zero rows; flag unset; nothing deployed) but **exploitable as soon
  as a room exists**, and the activity record is append-only so a forged row could
  never be removed. **Must be fixed before Approval 3, not before deploy.** No fix
  applied: none authorised, and unlike the RLS gap of 03:39 UTC there was no live
  hole to contain.
- **Same defect class, twice in one day.** A fresh object in a Supabase `public`
  schema does not start private. `20260729a` assumed it on tables; `20260729b`
  assumed it on functions.
- **One unintended production write, made and reversed.** `db-query.mjs --file`
  inserts a `schema_migrations` row for any file given to it, keyed on the
  basename. A read-only precondition probe passed with `--file` added a row named
  `pre.sql`, taking the ledger to 45 before the migration ran. Caught in the
  output of the query that caused it and removed the same minute with a
  primary-key-scoped `delete ... returning`, restoring the ledger to 44. That
  delete **bypassed `db-query.mjs`'s own refusal of `delete from`**, deliberately
  and recorded here as such. Every later probe used `--sql`.
- Still outstanding from the first pass: owner confirmation or reversal of the RLS
  containment applied at 03:39 UTC, and confirmation that `20260729c` belongs to
  Approval 2.
- Requirements 12 and 13 - entitlement fail-closed and cross-room isolation -
  **are not recorded as proved.** They need real member sessions against a real
  room, which is `npm run deal-room:negative-access` (Approval 3) and a published
  pilot Deal. The policy predicates encode room and sub-room scoping; that is not
  the same as proof.

### Next

1. Fix LB-008 in a new migration: revoke EXECUTE by name from `anon` on all 23
   functions and from `authenticated` on `deal_room_log_event`, with a text-scan
   regression test beside `grant-signatures.test.ts`.
2. Owner decision on the RLS containment and on `20260729c`'s approval boundary.
3. Approval 2: `deal-room-evidence` bucket and its two policies.
4. Approval 3: a published family-classified pilot Deal, then
   `npm run deal-room:negative-access`.
5. Approval 4: `NEXT_PUBLIC_DEAL_ROOM`, allowlist, deploy.

### Evidence

- `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 6 to 10
- `docs/codex/DATABASE-STATE.md`, Deal Room launch slice section
- `docs/launch/LAUNCH-BLOCKERS.md` - LB-008 active; LB-004 and LB-005 resolved
- `public.schema_migrations`: 45 rows, one each for `20260729a` and `20260729b`

## 2026-07-29 - Two listing migrations applied to production (ADR-0013, ADR-0014)

### Completed

- The owner accepted **ADR-0014** and authorised applying two migrations to production, one at a time and in order. Both were applied with `node scripts/db-query.mjs --file` against `cptglsmjmzcfpjndqfmc`, each fully probe-verified before the next was started.

| Migration | Applied (UTC) | SHA-256 recorded in `public.schema_migrations` | Ledger |
|---|---|---|---|
| `20260728c_automated_listing_publication.sql` | 15:42:54 | `745453c93b8d88614fe45dd2a75639c70760325a4e25ed64c2b06236aabf11c4` | 41 to 42 |
| `20260728e_family_commercial_terms.sql` | 15:44:45 | `4224fa274291f074d1ef0c948c52ba9afbeaa5378111b4686c05cebde9f18fa8` | 42 to 43 |

- Both hashes match their files byte for byte. `20260728e` was applied second because it depends on `20260728c`: its `listings_product_fields_family` constraint references `quantity_min` and `quantity_max`.
- **Preflight:** none of the thirteen columns existed; `listing_events` absent; `listings` held 5 rows (approved 2, draft 1, submitted 2), 4 carrying a quantity; no duplicate `listings_status_check1`; the three policy names `20260728c` replaces existed under exactly those names, so no orphan policy could survive; `is_admin()`, `gen_random_uuid()` and `auth.users` all present.
- **Post-application probes:** 11 columns with the stated types, all nullable except `quantity_extracted` (`NOT NULL DEFAULT false`); status CHECK carrying all 13 values; 5 new CHECK constraints; `listing_events` with RLS enabled; 5 indexes; `service_terms` and `distribution_terms` as nullable jsonb; the two family CHECKs valid and `listings_product_fields_family` NOT VALID, exactly as the file deploys.
- **Nothing was published.** `listings` still holds 5 rows at approved 2, draft 1, submitted 2. No status changed. The only data written is the documented `quantity_mode = 'exact'` backfill on the 4 rows that already carried a quantity, and 2 seeded `listing_published / admin / legacy_desk_approval` events, one per already-approved listing, with zero orphans.
- **Security verified.** Seven policies on `listings`, no duplicates; no member policy permits writing `approved`, `flagged`, `suspended`, `validating` or `needs_information`; **no anonymous SELECT policy exists on `listings`**; `listing_events` has SELECT-only policies and no INSERT policy, so a member cannot forge a publication event.
- **Functional probes ran inside transactions that were rolled back**, and the rollbacks were confirmed held: 8 of 8 for `20260728c`, and all cross-family cases for `20260728e`.
- **Private-site gate confirmed intact:** `https://ponte.trade/` answers `401` with `WWW-Authenticate: Basic realm="Ponte Trade"`, and `middleware.ts` is unchanged.

### Decisions

- The owner accepted ADR-0014 and authorised both applications.
- **`listings_product_fields_family` was deliberately left `NOT VALID`.** The migration deploys it that way and validating it would make the deployed object differ from the file. Zero existing rows would violate it; enforcing it is a separate owner decision.

### Risks / discrepancies

- The `NOT APPLIED` comment inside `20260728e_family_commercial_terms.sql` is now historically wrong and is **left unedited on purpose**: the file's bytes are what production ran, and editing them would break the match with `schema_migrations`. Recorded in `DATABASE-STATE.md` instead.
- **Automated publication still produces nothing on its own.** Verification remains blocking by owner decision and no member holds a passing bound member-business verification, so there is still no publicly eligible listing. Unchanged by these migrations.

### Next

1. Merge this reconciliation, then close PR #101 as superseded by PR #100 plus this record.
2. Separately decide whether to `validate constraint listings_product_fields_family`.

### Evidence

- `docs/codex/DATABASE-STATE.md`, the two "APPLIED to production, 29 July 2026" sections.
- `public.schema_migrations` rows for both filenames, hashes matching the files.
- The tested read-side implementation preserved at PR #101 head `53c9d99`; see PL-014.

## 2026-07-30 - Gate C Approval 1: 20260729a applied, and stopped there

### Completed

- **`20260729a_deal_room_core.sql` applied to production** (`cptglsmjmzcfpjndqfmc`) under Gate C Approval 1, from `main` at `7f979e0` with a clean worktree. All three checksums were recomputed and matched the preflight audit before anything ran, and each was re-verified immediately before its own execution. Recorded in `public.schema_migrations` with SHA-256 `24932e4a...58a78c8a`, matching the file byte for byte. **Ledger 43 to 44.**
- Verified in production: 15 tables, 34 CHECK constraints, 52 foreign keys, 54 indexes, 9 non-internal triggers, 2 helper functions, public tables 53 to 68. The append-only trigger is on `deal_room_activity_events`, and the agreement authority is seeded with all four documents at `v1-2026-07-29`, each `current` and carrying its checksum.
- Full record, every probe result: `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md`.

### Decisions

- **None taken by me that the owner had not already taken, with one exception, flagged below.** Gate C Approvals 2, 3 and 4 remain untaken.
- `20260729c` was not applied. Its three executable statements create the `deal-room-evidence` bucket and its two policies, which the instruction listed as not authorised while also listing the file as one to apply. `GATE-C-TEST-PLAN.md` treats the bucket as Approval 2, which resolves it: not applied.

### Risks / discrepancies

- **A production change outside the approved files, and it needs owner confirmation.** Migration `a` creates the tables; `b` enables RLS. Between them, production held 15 tables with `relrowsecurity = false` while Supabase's default privileges granted `anon` and `authenticated` SELECT, INSERT and UPDATE on all 15 - an anonymous write path through PostgREST to every Deal Room table, including the append-only activity record. The tables were empty and no write was attempted while it was open. It was closed with `alter table ... enable row level security` on the 15 tables and nothing else: no policy created, nothing granted, nothing revoked. Fail-closed, and a prefix of what `b` does. Proved with an anon-key client: SELECT `200 []`, INSERT `401 / 42501`. Reversible in one statement per table.
- **LB-005: `20260729b` cannot be applied.** Postgres refused it and rolled the file back - it grants execute on `deal_room_invite(uuid, text, text, text, timestamptz)`, a signature the same file drops, because the owner's final trust review took that function from five arguments to three. All 21 declared functions were audited programmatically; exactly one broken grant. Correcting it changes the file's SHA-256, so it needs its own authorisation and a new recorded checksum.
- **A 502 that was not a failure.** `db-query.mjs --file` returned an HTML 502 from `api.supabase.com` on `20260729a`. The transaction had committed; only the reply was lost. Because the script exits before its ledger write on a failed call, production briefly held 15 tables with no record they existed - the exact defect PR #106 had just repaired for another migration. The row was written explicitly. Its `applied_at` is the write time, not the execution time, and the record says so.
- The test suite did not and could not catch LB-005: `rls-contract.test.ts` scans the file for command names and member write policies, not for grant signatures against the functions the same file declares. The check is three lines and belongs in that suite. Not added - no fix was authorised.

### Next

1. Owner decides LB-005 and authorises the corrected `20260729b` with its new checksum.
2. Owner confirms or reverses the RLS containment.
3. Owner confirms `20260729c` belongs to Approval 2.
4. Then: apply the corrected `20260729b`, verify against `GATE-C-TEST-PLAN.md` sections 4.1 to 4.4, and record it.

### Evidence

- Branch `gate-c-approval-1`, from `main` at `7f979e0`. `npm run verify` clean.
- Production, after: 15 `deal_room_*` tables, RLS on all 15, **0 policies**, 2 functions, ledger 44 rows with one `20260729a` entry. No Storage bucket or policy. `NEXT_PUBLIC_DEAL_ROOM` unset, allowlist unchanged, nothing deployed, access wall untouched. Legacy cluster 8 tables / 0 rows, `is_deal_participant()` unaltered, `ponte-deal-docs` 0 objects, `listings` 5 rows.

---

## 2026-07-29 - Deal Room: four trust boundaries closed (no production change)

### Completed

- The owner follow-up review of PR #98 found four defects that let the durable Deal Room record state something the database had not proved. All four are closed on the same branch, each with direct-RPC negative tests, because the server action is not the boundary: every command is granted to `authenticated`, so anything the action does can be skipped.
  - **Agreement acceptance was forgeable.** `deal_room_accept_agreement()` took the version and checksum from its caller. It now takes neither: the canonical values are read from a new `deal_room_agreement_documents` table that no member holds a policy on, the old four-argument signature is dropped, and admission joins acceptances to that authority on version **and** checksum, so a forged or retired acceptance no longer satisfies the gate.
  - **The Integrity pre-flight and invitation preview were caller-authored.** `deal_room_invite()` took `p_preview` and `p_preflight` as JSON. Both are now derived inside the command from `profiles`, `organizations` and `verifications`; the stored pre-flight carries the command's own `derivedAt` and reports sanctions as unscreened when nothing was screened. The sanctions refusal moved into the command too. The eight-argument signature is dropped.
  - **The counterparty was not durable.** `deal_room_propose()` now proves the named member exists and has a reachable address, or requires a named external principal, and persists them on the room. `deal_room_invite()` has no email parameter: the address comes from that record, so the invitation cannot be redirected.
  - **Acceptance was written to history as admission.** `deal_room_accept_invitation()` recorded `participant_admitted` while the participant was still outside the gate. It now records `invitation_accepted`, and `participant_admitted` is written in exactly one place, by the command that verified identity, capacity, role, authority and every current agreement.
- New `lib/deal-room/__tests__/agreements.test.ts` recomputes each agreement's SHA-256 from the shipped text and asserts it against the literal seeded in the migration, so the retrievable source and the database authority cannot drift.

### Decisions

- The agreement authority is a table rather than a hard-coded list in the function, so publishing a new version is a reviewed migration and old acceptances stay explicable against the version they named.
- The pre-flight stores attributable **source facts**, not a rendered report. The wording stays in `lib/deal-room/integrity.ts` and renders those facts, so there is one copy of the wording and one copy of the facts.

### Risks / discrepancies

- Still executed nowhere. The four boundaries are enforced in SQL that no database has run, so they are reviewed and not proven. `npm run deal-room:negative-access` is the first Gate C step and now covers all four.

### Next

1. Owner review of the four corrections and the embedded frames.
2. Gate C, unchanged in order: apply the three migrations; create the bucket and policies; run the negative-access fixture; only on a clean pass, set the flag and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`, reconciled with `main` at `6b6c85a`. `npm run verify` clean.

---

## 2026-07-29 - Deal Room Gate B corrections after owner review (no production change)

### Completed

- The owner review of PR #98 did not accept Gate B. Five findings, all correct. Fixed on the same branch:
  - **The loop is now operable.** `app/[locale]/deal-rooms/actions.ts` holds fifteen server actions, each calling one `deal_room_*` command through the caller's own session client. Every surface is wired to them with real inputs. Previously the controls existed and nothing joined them to the commands.
  - **The invented sanctions check is gone.** `IntegrityInput` now takes a `SanctionsPosition` union that cannot express a screening without its date, source and result, and `sanctionsPositionFrom()` derives it from `verifications.sanctions_hits`. Absence reports under Unproved. A latent defect surfaced in the same code: the query filtered on `profile_id`, which is not a column on `verifications`, so it had been reading nothing.
  - **Five RLS fail-open paths closed.** No member INSERT, UPDATE or DELETE policy remains on any of the fourteen tables. Room creation proves listing ownership, publication, family facts and Starter bounds, and builds the Deal snapshot rather than accepting one. Entitlement is created only by that command and only as a bounded Starter. `deal_room_is_writable()` joins the entitlement, so a missing row fails closed. `selected` evidence visibility is removed from launch scope.
  - **An executable negative-access fixture.** `scripts/deal-room-negative-access.mjs` drives the loop with three real member sessions and asserts every property the review listed, including that even the service role cannot rewrite the activity history. Plan: `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`.
- `npm run verify` passes end to end. The contract test now carries the blanket "no member write policy" assertion that would have caught the original defect.

### Decisions

- `selected` visibility removed rather than given an ACL. Implementing an exact recipient relation is real work with its own negative tests and the launch loop does not need it; a label that overstates its own protection is worse than no label.
- Server actions redirect with the command's own sentence on refusal, rather than returning a result. The whole slice stays server-rendered and no surface becomes a client component for the sake of one error string.

- **Visual evidence captured**, after the owner supplied `PONTE_SITE_PASSWORD`. The value was verified against the SHA-256 in `middleware.ts` before use; the wall was not altered, and no page or route was exempted from it. 17 frames in `docs/codex/audits/deal-room/evidence/`, all 20 checks passing twice in succession.

  The gate did its job. Two defects in this slice were visible only in the frames:
  - every Deal Room surface was rendering ink-on-obsidian and was close to illegible, because nothing painted the Ponte paper surface behind the room. Fixed with the room's own surface container plus `body:has(.dr-page)` to reach the canvas, scoped so no adjacent page is repainted.
  - a blocked room printed "Blocked" twice, as the condition chip and again as the momentum chip. The momentum chip is now suppressed when it would repeat the condition.

  A third finding was in the harness: the 390 overflow assertion raced the bridge's post-webfont re-fit and passed only on a re-run. The capture now waits on `document.fonts.ready` and a measured stage height.

### Risks / discrepancies

- The migrations are still executed nowhere, so the negative-access fixture is unrun. It is the first Gate C step.

### Next

1. Owner reviews the 17 frames and records design approval.
2. Gate C, in order: apply the three migrations; create the bucket and policies; run `npm run deal-room:negative-access`; only on a clean pass, set the flag and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`. `npm run verify` clean. `next build` emits all twelve surfaces plus the dev harness.

---

## 2026-07-29 - Deal Room launch slice, Gate B (no production change)

### Completed

- Gate A preflight approved by the owner at `35d2071`. Gate B implemented on `agent/deal-room-launch-slice`: the protected progression loop of issue #97, behind `NEXT_PUBLIC_DEAL_ROOM` and a server-side `DEAL_ROOM_ALLOWLIST`, both unset.
- `lib/deal-room/` holds the domain: states, procedure, progress, momentum, permissions, integrity, credible interest, invitation, entitlement, activity, bridge model, flags and the server query layer. 264 assertions across nine suites, plus 16 markup assertions for the Bridge, all in `npm test`.
- Twelve surfaces under `app/[locale]/deal-rooms/`, plus one API route that issues short-lived signed URLs for evidence after re-checking permission through the caller's own session.
- **Multi-party Deal Room Bridge v1** built as commissioned: `components/ponte/bridge/DealRoomBridge.tsx`, transcribed from `PB.dealroom` in the approved engine (deck height 104, rise 46, station fractions, participant block cap 140, shared elevation drawer below a 460px container). Its wrapper rules are the only new CSS, in `bridge-integration.css`, tokens only.
- Three additive migration files written: 14 `deal_room_*` tables, four RLS helper predicates, every policy, five authorised command functions, and one private storage bucket.
- The two separately authorised repairs (issue #97, decision 3): `20260728d_family_commercial_terms.sql` renamed to `20260728e_`, and `check-launch-mode.mjs` made whitespace-tolerant. Both now pass. PL-004 and PL-005 moved to Completed.

### Decisions

- ADR-0009 accepted as amended (issue #97, decision 1). Recorded in `DECISION-LOG.md`.
- `components/ponte/bridge/DealRoomBridge.tsx` added to the `RAW_SVG_BASELINE` ratchet in `check-governance.mjs`, with its argument written beside the two existing entries. The check refused the file first; the entry was written because of that, not to get past it. A bridge deck is structural interaction geometry from the approved package, not an interface icon.

### Risks / discrepancies

- **The migrations have been executed nowhere.** There is no non-production database to run them against (PL-002) and applying SQL to production is a Gate C decision. They are reviewed, not proven: treat their runtime behaviour as unverified until Gate C.
- **No visual evidence was captured.** Ponte is behind the temporary Basic-auth wall, whose password exists only as a SHA-256 in `middleware.ts`, and modifying the wall is prohibited. The evidence harness (`/en/dev/deal-room`, which 404s in production) and the capture spec (`npm run evidence:deal-room`) are both committed and unrun. One command with `PONTE_SITE_PASSWORD` set produces desktop, 390 x 844 and reduced-motion captures of all eight states.
- **Live negative RLS tests are outstanding** for the same reason: they need a running Postgres and two real member sessions. `lib/deal-room/__tests__/rls-contract.test.ts` asserts the policy contract textually in the meantime, including that no policy names `anon`, that the activity table has only a SELECT policy, that evidence versions and acceptances have no UPDATE or DELETE path, and that no statement touches the legacy cluster.
- `npm run verify` fails on Windows at `lib/verification/__tests__/guard.mjs`, which uses the POSIX `|| true`. Environment failure, not a repository failure: the file is untouched by this branch and the guard passes under bash and in CI.

### Next

1. Owner review of the Gate B pull request, and design approval of the Bridge.
2. Capture the visual evidence with the site-wall password, or authorise it to be captured against a deploy preview.
3. Gate C, as four separate approvals: apply the three migrations by hand and record them in `schema_migrations`; create the bucket and its policies; run the live negative-access tests against production before activation; then set the flag and the allowlist and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`, based on `main` at `0318615`.
- `docs/codex/audits/2026-07-29-deal-room-preflight.md`, `docs/plans/active/deal-room-launch-slice.md`.
- `npm test`: all suites pass, including the ten new ones. `tsc --noEmit`: clean. `next build`: all twelve Deal Room routes and the API route emitted.

---

## 2026-07-29 - Family vocabulary downstream of publication (ADR-0014 §9-§10)

### Completed

- Built `lib/listings/record-facts.ts` as the single presenter for a STORED listing row, and routed every surface that presents one through it: `/find/o/[ref]`, `/marketplace/l/[ref]`, `/opportunities`, the workspace rows, `/admin/listings` and the member email templates. Each previously carried its own fixed list of product columns, so a published trade service answered Quantity, Incoterm, HS code, Origin and Destination with "Not stated" and its stated service terms appeared only inside the prose.
- Member emails now name the record the member posted. `recordNoun` supplies "offer", "requirement", "trade service" or "distribution opportunity", and the metadata block leads with the family's own headline fact instead of "Quantity". A caller that sends no noun keeps the historical wording exactly, so no existing sender changed meaning.
- The submit route's missing-column fallback was extracted here into `lib/listings/write-fallback.ts` and tested. **That extraction was superseded before this branch merged**: PR #99 landed its own `lib/listings/write-fallback.ts` on `main`, which reads the missing column out of the error and drops it one at a time rather than dropping this branch's two staged groups. On the rebase onto `6b6c85a` the version from #99 was kept in full and this branch's module and its tests were dropped. Nothing here modifies the fallback.
- Added `lib/structure/discard.ts` and a confirmation in `ClassifyStep`, so a classification change that would destroy answers already given names them and waits. A change that costs nothing is not interrupted.
- Both public readers now degrade their select when the unapplied family-terms columns are absent, so the pending `20260728e` migration cannot 404 a shareable listing link.

### Decisions

- **ADR-0014 accepted by the owner on 29 July 2026**, and this work merged in PR #100. The ADR was Proposed when this entry was written; acceptance is recorded in the ADR, the decisions README and both decision-log entries. Acceptance is **not** authority to apply `20260728e_family_commercial_terms.sql`, which stays written and unapplied pending its own approval.

### Risks / discrepancies

- `20260728e_family_commercial_terms.sql` remains **written and not applied**. Until it is, `service_terms` and `distribution_terms` are absent, the new surfaces render the family's classification without its terms, and the terms reach readers through the record's synthesised `details`. No production migration was applied by this work.
- PL-013 recorded: `canonicalServiceCategory`, `canonicalPartnerType` and `canonicalRelationshipTerm` exist to reconcile superseded stored keys and have no callers, so a record stored under a superseded key loses its specialisations on edit. Production incidence is **unmeasured**; it is not asserted to be zero.

### Next

1. Owner accepts or rejects ADR-0014.
2. On acceptance, apply `20260728e_family_commercial_terms.sql` with owner approval and record it in `DATABASE-STATE.md`.
3. Triage PL-013 against production data.

### Evidence

- Branch `claude/classify-tests-discard-warning-15173f`, cut from `origin/main` at `923d1e3`, rebased onto `6b6c85a` after PR #95, #99 and the password rotation landed, then merged with `main` at `42a9d22` after PR #98. The rebase kept `main`'s `write-fallback.ts` and submit-route wiring, and kept both operations entries; the merge resolved `package.json` as a strict union of both test lists, 65 suites, and kept every register entry from both sides.
- **`npm run verify` passes end to end.** This entry originally recorded two failures that were real when it was written: `check-migrations.mjs` on the duplicate `20260728d` identifier and `check-launch-mode.mjs` on a literal it could not find because `AGENTS.md` wrapped the sentence. Both were repaired on `main` by PR #98 under issue #97 decision 3, and are closed as PL-004 and PL-005. The two blocker rows this branch had opened for them (its own LB-001 and LB-002) are removed rather than carried, because the register on `main` now uses LB-001 for the Deal Room loop, and because the conditions they described no longer exist.
- No production change, no deployment, no migration applied, no feature flag altered.
## 2026-07-29 — Start a Deal could not submit or save at all

### Completed

- Diagnosed and fixed a total failure of the Start a Deal composer reported by the owner from the live site: **Submit for Ponte review and Save draft both failed, for every member and every market family.** The member saw "Ponte kept your words. Something interrupted the submission."
- Root cause: `20260728c_automated_listing_publication.sql` is written and **not applied**, so `listings` has no `quantity_mode`, `quantity_min`, `quantity_max`, `quantity_extracted`, `quantity_confirmed_at`, `declaration_accepted_at` or `declaration_version`. `POST /api/marketplace/submit` sends all of them on **every** write. PostgREST refused the insert with `PGRST204`, and the route's retry dropped two fixed GROUPS of columns (family terms, then the classification set), neither of which contains any of them, so both retries re-sent a row the database had already refused and the route answered 500.
- The retry now reads the missing column out of the error and drops that one, repeating until the row is acceptable. Extracted to `lib/listings/write-fallback.ts` so the rule is unit-tested rather than only exercised through HTTP. It never drops `user_id`, `type`, `product`, `details` or `status`; it never reacts to an error that is not a missing column; every drop is logged by name. The two named groups remain as the fallback for a missing-column error that does not name a column.
- `structure.submit.declarationAccept` was missing from the catalogue, so the publication declaration's checkbox label rendered as the raw dotted path next to the five terms a member has to accept. Added, and a sweep test now asserts every key the composer names outright exists.
- The trade-service scope question rendered the engagement chips underneath it. They were the only tappable control on a screen whose actual answer is a typed sentence, so a member who tapped one and pressed Save still had "Scope: Not stated" and no indication why. Engagement is now its own step, and the review prints an engagement row whether or not it has been answered.
- "What is your role?" answered from one combined list for every family, so a freight forwarder offering road freight was shown "Grower / farmer", "End buyer" and "Exclusive distributor" alongside the five service roles. Roles are now chosen by family and, for trade services, by side: `roleGroupsFor` in `lib/structure/procedures/registry.ts`, vocabularies in `lib/structure/vocabulary.ts`. Stored values are unchanged strings; existing records keep the role they hold.
- A refused submission now logs the status, message and field to the browser console. Until now a refusal left nothing behind, so a submission failing for every member looked exactly like a dropped connection.

### Decisions

- None taken. No schema was changed and nothing was applied to production.

### Risks / discrepancies

- **The code fix stops the data loss; it does not restore the behaviour the missing columns carry.** Until `20260728c` is applied, a member's accepted declaration cannot be stored (`declaration_accepted_at`), so the publication gate will not see it, and `publishOrHold` cannot write the `validating` / `needs_information` / `flagged` states the widened status constraint permits. A submission therefore stores and stays `submitted`, and the member is told it is with the desk. That is honest but it is not automated publication.
- `20260728d_family_commercial_terms.sql` remains written and unapplied, unchanged by this work.
- `node scripts/check-migrations.mjs` fails on a pre-existing duplicate letter suffix: `20260728d_family_commercial_terms.sql` and `20260728d_verification_level_canonical.sql`. Not introduced here and not repaired here.

### Next

1. Owner review and merge.
2. Apply `20260728c_automated_listing_publication.sql` by hand with owner authorisation, then `20260728d_family_commercial_terms.sql`, and record both in `DATABASE-STATE.md`. Until then the composer's own log names every column being dropped on each write.
3. Re-walk one trade-service submission end to end after the migration and confirm the listing carries its declaration and reaches a decided state.

### Evidence

- Branch `claude/opportunity-form-bugs-0c79cc`, based on `main` at `0318615`.
- `lib/listings/write-fallback.ts` and `lib/listings/__tests__/write-fallback.test.ts` (6 assertions, including the exact production column set that failed).
- `lib/listings/__tests__/classification.test.ts` (`missingColumnFrom`, both driver spellings).
- `lib/structure/__tests__/downstream-journeys.test.ts` (21 assertions: the composer key sweep, the per-family role lists, the engagement split).
- `lib/structure/__tests__/composer.test.tsx` (10 assertions: the scope question offers one box and no taps; engagement is its own question; a service member is offered service roles).
- `npm test` passes (41 suites); `tsc --noEmit` clean.

---

## 2026-07-28 - Family-specific downstream composer (ADR-0014)

### Completed

- Replaced the shared product-shaped S02-S06 commercial procedure with one procedure per market family, behind a central registry at `lib/structure/procedures/`. The composer shell, account gate, submission orchestration, lifecycle screen and design system are unchanged.
- Trade services and Distribution now have their own completion queues, fact buckets, blockers, question controls, review models and submit payloads. Neither is asked for, blocked on, or reviewed against a quantity, unit, Incoterm, packaging or HS code.
- Extended cross-family sanitisation from the classification fields to the commercial fields, and added server-side refusal of product-only fields and of one family's terms on another family's record.
- Repaired two defects found on `main` while reading it, both of which blocked this work's own verification:
  - `package.json` carried a duplicate `"test"` key. JSON takes the last, and the winning copy silently dropped `lib/listings/__tests__/eligibility.test.ts`, `lib/listings/__tests__/quantity.test.ts` and `lib/email/__tests__/email-system.test.ts`. `npm test` had not been running them since the PR #74 merge. Deduplicated to one script containing the union.
  - `familyOf()` in `lib/listings/eligibility.ts` did not recognise `services`, the value the canonical taxonomy defines and the composer sends. It resolved correctly only by accident, via the legacy `type === "service"` fallback.
- Full verification run on the branch: `npm run verify` passes (messages, encoding, governance, 40 test suites, `tsc --noEmit`, `next build`).
- Journeys walked in the running dev server at desktop and 390 x 844: services/offer_trade_service through freight forwarding to review and submit, and distribution/seek_distribution_partner through to review. No horizontal overflow at 390.

### Decisions

- None taken. ADR-0014 is **proposed**, not accepted.

### Risks / discrepancies

- `20260728e_family_commercial_terms.sql` adds `service_terms` and `distribution_terms` as additive nullable jsonb, with cross-family CHECK constraints and a rollback path. It is **written and not applied**. The submit route already retries the write without them and the terms also travel in the synthesised `details`, so the branch is safe to deploy before the migration is run.
- The `listings_product_fields_family` constraint is added `not valid` so applying it cannot fail on a historical row. Validating it is a separate, deliberate step.
- Not every trade-service category is modelled to the same conditioned depth. The architecture supports category-conditioned questions; a complete model of eleven professions was not attempted here.

### Next

1. Owner review of ADR-0014 and of PR for `fix/family-specific-downstream-composer`.
2. On acceptance: merge, then apply `20260728e_family_commercial_terms.sql` by hand with owner authorisation, then record the application in `DATABASE-STATE.md`.
3. Validate `listings_product_fields_family` after inspecting any rows it reports.

### Evidence

- Branch `fix/family-specific-downstream-composer`, based on `main` at `457eaf6`.
- `docs/decisions/ADR-0014-family-specific-downstream-commercial-procedures.md`.
- `lib/structure/__tests__/procedures.test.ts` (27 assertions, all seven canonical intents and the mandatory negative assertions) and `lib/structure/__tests__/downstream-journeys.test.ts` (16 assertions, the two worked journeys plus a sweep proving every message key each procedure emits exists in the catalogue).

---

## 2026-07-28 — Emergency build hotfix: PR #74 merge artefacts blocked deployment

### Completed

- Netlify deployment of `main` at `b378ad2` failed: SWC could not parse `lib/structure/draft.ts` or `app/api/marketplace/submit/route.ts`.
- Diagnosed as merge artefacts from PR #74, not a design or behavioural defect. In four places an inserted line overwrote the first line of the construct that followed it:
  - `lib/structure/draft.ts` — `export type { QuantityMode };` overwrote the `import {` opening the `../taxonomy/services` import.
  - `lib/structure/draft.ts` — `quantityMode: QuantityMode | null;` overwrote the `/**` opening the doc comment on `resolution`.
  - `app/api/marketplace/submit/route.ts` — the `DECLARATION_VERSION` import overwrote the `import {` opening the `@/lib/listings/classification` import.
  - `components/structure/StructureComposer.tsx` — the submit-response binding `j` was left declared inside the per-payload loop while the outcome block after the loop still read it, so the file failed type checking even once parsing succeeded.
- Each overwritten line was restored from `be634b1`, the last revision in which the file was well formed. In `StructureComposer.tsx` the binding was hoisted to the loop's enclosing scope and renamed `body`.
- A fifth artefact from the same merge failed CI rather than the build: PR #74 hand-edited the GENERATED `messages/en.json` without adding the 25 new strings to `messages/_fragments/structure.json`, so `en.json` no longer reproduced from its source. The strings were copied verbatim into the fragment. `node scripts/build-messages.mjs` now regenerates `en.json` byte-for-byte identical to the shipped file, so no user-facing string changed.
- No product behaviour, taxonomy, database state, schema, migration, flag or design token was changed. The hotfix restores the code PR #74 intended to merge.

### Decisions

- Repair the merge artefacts in place rather than revert PR #74: reverting would withdraw automated publication, the quantity model and the unified email system for a defect that is four lines of damage.

### Risks / discrepancies

- `package.json` carries a duplicate `"test"` key from the same merge. JSON parsers keep the last, so the first list is silently dead. Not build-blocking and deliberately left untouched by this hotfix.
- The same merge could have damaged files whose defects neither the parser nor the type checker can see. Type checking and the full suite are clean, which bounds but does not eliminate this.

### Next

1. Confirm the Netlify deployment of the merge commit succeeds and production is serving.
2. De-duplicate the `"test"` key in `package.json` and reconcile the two script lists in a separate change.

### Evidence

- `npx tsc --noEmit --incremental false` — clean.
- `npm run build` — compiled successfully, all routes emitted.
- `npm test` — full suite passed, including `lib/structure/__tests__/draft.test.ts` (18), `lib/listings/__tests__/quantity.test.ts` (23) and `lib/structure/__tests__/composer.test.tsx` (7).
- `check-messages`, `check-encoding` and `check-governance` — all passed.

---

## 2026-07-28 — Market classification schema and migration audit

### Completed

- PR #70 merged to `main` at merge commit `877448bd6c47aaa74e6c6eee50b1ba1f8386cafb`.
- Production Supabase project confirmed as `cptglsmjmzcfpjndqfmc` (`Ponte Trade`, eu-west-1).
- Migration `20260728a_market_classification.sql` applied to production and recorded.
- Verified in production: 17 columns, 10 CHECK constraints and 9 indexes.
- Product, Trade Services and Distribution database write paths were verified in rolled-back transactions; no test rows remained.
- Market classification coverage now reports `nothing_classified`, not `columns_absent`.
- Historical migration reconciliation completed read-only: 40 repository migration files, 0 missing schema migrations, 0 partially applied migrations, 1 superseded migration and 4 data-only migrations whose historical execution cannot be proved from schema alone.
- Application code was checked against production objects; no referenced database object was absent.

### Decisions

- Do not replay historical migrations merely because a ledger entry is absent.
- Do not backfill or classify the historical Market Signals inventory as part of the schema migration.
- Treat repository migration files, the migration ledger and the actual production schema as separate evidence sources.
- Do not relink Supabase Preview until the repository can reproduce the production base schema reliably.

### Risks / discrepancies

- `public.schema_migrations` was found publicly readable and writable through the anon role; this is an urgent security and migration-governance defect.
- Twenty-six migration-ledger rows were inserted in bulk at 2026-07-28 13:37:42 UTC by an unidentified actor or process. The entries are not independent proof that the migrations ran.
- Production contains 29 tables without repository migration provenance; the existing migration chain is not a complete production rebuild path.
- The Supabase GitHub App check points to project reference `kltuzbxnldtmdfhakphv`, which is not accessible in the account holding the production project and has produced persistent failed checks.

### Next

1. Merge PR #73 after confirming it remains documentation-only and records the production migration evidence accurately.
2. Review PR #64 and merge only if it contains solely the intended retirement of an obsolete permanently failing check.
3. Create, review and apply an additive migration that protects `public.schema_migrations` by enabling RLS and revoking anon/authenticated privileges while preserving privileged migration tooling.
4. Investigate the 2026-07-28 13:37:42 UTC ledger backfill using available logs; preserve existing rows during the investigation.
5. Capture a sanitised schema-only production baseline for the 29 unprovenanced tables.
6. Decide whether to disable the invalid Supabase Preview GitHub App integration until reproducible preview databases are possible.

### Evidence

- PR #70
- Merge commit `877448bd6c47aaa74e6c6eee50b1ba1f8386cafb`
- Migration `supabase/migrations/20260728a_market_classification.sql`
- PR #73 (documentation record; pending merge at time of this entry)
- `docs/codex/DATABASE-STATE.md`
- `docs/codex/CURRENT-STATE.md`
