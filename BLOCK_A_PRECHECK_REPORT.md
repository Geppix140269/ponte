# Block A - Independent Pre-Implementation Report
Read-only analysis by Cowork, 2026-07-23. Repo: C:\dev\ponte, branch main @ 941c6eb.
No production DB was touched. Every DB claim below is from repo migration files and MUST be confirmed by Claude Code against the live schema.

---

## 0. Headline

The repo is further along and safer than the brief assumes. The identity/leak protections Block A asks for are already built. The real, unfinished part of Block A is two things: (1) member listings and radar are still merged into one homepage feed, and (2) imported radar rows go public with no per-item human approval. Everything else in Block A is small.

Baseline correction: current origin/main is 941c6eb, exactly the brief's reviewed commit. The earlier "main moved to 6273ec1" note was stale and is wrong for this repo. `git diff 941c6eb..origin/main` is empty.

---

## 1. Observed current behaviour

**getLiveDeals() (lib/board/live-deals.ts) DOES currently merge the two sources.** It reads approved `listings`, then if `radarIsPublic()` is true it appends `desk_radar` rows into the same array, sorts by date, and returns one list. That single list is passed to one `LiveDealsStrip` on the homepage. This is the merge Block A says to stop.

**But the dangerous parts Block A worries about are already handled:**
- Radar rows are tagged `source: "radar"` and never carry a verification level or an href.
- The query selects public columns only. Internal columns (source_url, source_platform, counterparty_name, counterparty_company, counterparty_contact, raw_description, notes) are never selected, so they cannot reach the client.
- The migration puts RLS on desk_radar with NO policy, so nothing reaches a browser except through the service-role public-column read. A careless client query gets nothing.
- Expired rows are filtered: any row past `valid_until` is dropped regardless of status, and only `live`/`under_pursuit` statuses are read.
- LiveDealCard already renders radar visibly differently: a "Desk-sourced opportunity" chip, muted card, grey bridge, and never a tier badge.

**How a radar row reaches the public board today:**
`scripts/import-desk-radar.mjs` inserts rows with `status = 'live'` directly (the migration default is also `'live'`). `radarIsPublic()` returns true unless `DESK_RADAR_PUBLIC=0`. So an import is public on the homepage immediately, with no per-item human approval step. There is no admin radar UI in the repo at all.

**Where radar is public:** only the homepage strip (and the /dev/design preview). The /marketplace board does NOT call getLiveDeals, so it is not affected. Radar has no dedicated public route or detail page.

---

## 2. What Block A still genuinely requires (the real work)

1. **Split the feed.** getLiveDeals() returns approved member listings only. Move `readRadar` out to an exported `getMarketSignals()` with its own type, fetched separately, rendered in its own component with its own CTA. Never interleaved with member cards.
2. **Private by default + per-item approval.** Change the importer to insert a non-public status (e.g. `private`), change the migration default off `live`, and make the public read require an explicit `approved_for_signal_publication` state set by a human, not just `status='live'`. Add the missing admin approval action + surface (none exists today).
3. **Status model.** desk_radar.status check is currently `(live, under_pursuit, graduated, expired, removed)`. The brief wants `(private, approved_signal, under_investigation, confirmed, unavailable, expired, withdrawn)`. Needs an additive, idempotent migration to extend the set (or add a separate approval/publication column plus an investigation-status column). Do not drop or rewrite existing rows.
4. **Mandatory disclaimer + CTA.** No "External market signal - not yet verified by Ponte" text and no "Ask Ponte to investigate" CTA exist yet (grep found none). The separate Market Signals component must carry the exact disclaimer and the CTA. (The CTA's server route is Block D; the label and section are here.)
5. **Naming alignment.** Code says "Desk Radar / Desk-sourced opportunity"; the brief says "Market Signals / not yet verified by Ponte." The underlying table can stay `desk_radar`; the public copy needs to become Market Signals. Full copy is Block E, but the disclaimer string is needed now.

Minor: importer sets `valid_until` = spotted + 14 days; the brief allows up to 90 days off the original signal date. 14 is stricter than the brief and fine, but flag the intended window.

---

## 3. Exact files Block A will touch

- `lib/board/live-deals.ts` - split getLiveDeals (members only) from an exported getMarketSignals; add the approved-publication filter.
- `scripts/import-desk-radar.mjs` - insert a private/pending status instead of `live`.
- `supabase/migrations/2026072x_desk_radar_signals.sql` - NEW additive migration: extend/replace the status check, add approval columns (approved_for_signal_publication, approved_by, approved_at, published_at), public expiry, investigation_count, promoted_listing_id FK. Idempotent, additive only.
- New Market Signals component (components/home or a marketplace surface) with the disclaimer + Ask Ponte CTA. Reuse LiveDealCard styling but not the "desk-sourced" chip.
- `app/[locale]/page.tsx` - render the member strip only; add a separate, visually distinct Market Signals section.
- NEW admin approval action + minimal admin list for signals.
- Netlify production env `DESK_RADAR_PUBLIC` - retire or repurpose in favour of per-item approval (keep as an emergency global kill switch).
- `messages/_fragments/*` - disclaimer + CTA strings (build via scripts/build-messages.mjs, do not hand-edit compiled locales).
- Leave the aria-hidden second render in LiveDealsStrip.tsx unchanged (confirmed: it is the intentional marquee echo).

---

## 4. Database assumptions - MUST be probed live by Claude Code

Repo says desk_radar has: side, product, hs_code, qty, unit, incoterms, payment, origin, destination, category, spotted_at, valid_until, status(check), ai_description, summary_line, and internal source_platform/source_url/raw_description/counterparty_*/notes/dedupe_key; RLS on, no policy.

Unverified against production. Claude Code must confirm before any migration:
1. Does desk_radar actually EXIST in prod? (Memory says the auto-apply migration chain was blocked at 02_ponte_previews_bucket.sql, so 20260722f may not have run.)
2. If it exists, how many rows, and what statuses? Are any `live` and therefore PUBLIC right now?
3. What is DESK_RADAR_PUBLIC set to in Netlify production?
4. The brief's signal fields (approval, investigation count, promoted-listing FK, extraction-confidence, expanded status set) are NOT in the repo schema and need the additive migration.

Priority-one probe: items 1-3 together tell us whether unapproved signals are live on the homepage this minute.

---

## 5. Rollback

- Code: single PR, `git revert` restores the merged behaviour.
- Migration: additive only, so rollback is either a down-migration dropping the new columns / restoring the old check, or simply leaving the harmless additive columns in place. No existing column or row is altered or dropped.
- Importer: revert the one-line status change; existing rows untouched.
- Emergency lever if a signal is exposed in prod during the work: set `DESK_RADAR_PUBLIC=0` in Netlify - pulls the entire radar section instantly with no deploy.

---

## 6. Two things for Giuseppe to note

**A policy shift is baked into this brief.** The 2026-07-23 decision was "radar public and SEO-indexed, four protections, accept the risk." This definitive brief tightens that to "Market Signals private by default, each one individually approved by a human, always labelled not-yet-verified." That is stricter, and it means someone has to approve the ~150-250 launch signals one by one. Good for credibility, but it is manual work before 1 August. Confirm you want that stricter posture (the brief says yes).

**Do not let Claude Code "fix" what is already correct.** The RLS no-policy protection, the public-column-only select, and the no-badge radar card are already right. Block A is separation + approval gate, not a rebuild of the radar or the importer.
