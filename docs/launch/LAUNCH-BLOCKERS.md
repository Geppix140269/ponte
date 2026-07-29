# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-001 | No launch-usable Deal Room progression loop exists | 2026-07-29 | PROGRESS: the downstream journey after credible commercial interest | Classified as a Launch Blocker by the repository owner in issue #97. Verified on `main` at `0318615`: no Deal Room route, component, service or type existed, and no code referenced the Deal Room-era database cluster. A member who reached credible commercial interest had nowhere to go inside Ponte, so the core journey could not be completed at all. Preflight: `docs/codex/audits/2026-07-29-deal-room-preflight.md` | Giuseppe Funaro | Open - Gate B merged to `main` at `42a9d22` on 29 July 2026 with technical and design approval. **The blocker stays open until Gate C production verification**, because nothing is reachable yet: the three migrations are executed nowhere, the Storage bucket does not exist, `NEXT_PUBLIC_DEAL_ROOM` is unset and nothing is deployed | #98 | Partial. `npm run verify` passes end to end (criterion 19); 319 assertions across eleven Deal Room suites cover the family-correct procedure, the no-percentage-before-approval rule, the 22% baseline and the reversion case, the admission gate, read-only continuity, the four Ponte Integrity prohibitions, the invitation preview allowlist, the shipped agreement checksums and the RLS policy contract. Visual evidence **captured** 29 July 2026: 17 frames in `docs/codex/audits/deal-room/evidence/`, all 20 checks passing twice in succession, design approval granted on the four representative frames. **Outstanding:** the executable negative-access fixture (`npm run deal-room:negative-access`), which needs the schema applied, and the read-only production checks in `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`. Both are Gate C. |
| LB-002 | Required form and input boundaries are too faint to identify reliably | 29 July 2026 | Start a Deal (`/[locale]/structure`), and every form surface sharing the tokens | Input boundaries measure approximately **1.52:1** against the page ground, against the 3:1 WCAG 1.4.11 minimum for the boundary of a user-interface component. Measured across `.qfield__i`, `.snote`, `.sigsheet__i` and `.vcp__input`. Audit section 6, row 9 | Giuseppe Funaro | OPEN | Not started — Stage 1 of ADR-0015 | Pending |
| LB-005 | Market Signals could not be searched, and most of the inventory could not be reached | 29 July 2026 | DISCOVER: `/[locale]/market-signals`, the entry route into the commercial inventory | Classified P0 by the repository owner. Verified on `main` at `0e8ed3b`: `/market-signals` had structured family and category filters and **no text input of any kind**. A member could not type a product name, an HS code, a country or a trade term anywhere on the page. `searchSignalInventory()` already searched the whole eligible table and already reported a true total, and the board printed "3,491 signals" beside sixty of them with the sentence "the remaining 3,431 are counted but not yet reachable from this page" - the page said so itself. `signalFilterHref()` serialised five parameters, so every filter link discarded the direction, market, quantity and sort. The inventory was therefore commercially unusable: finding a relevant opportunity required knowing Ponte's taxonomy and then reading a list | Giuseppe Funaro | **Closed in the repository, pending production verification.** Search, relevance ordering, pagination, a shared URL contract and a search-specific empty state are implemented and verified locally. What remains is not repository work: the branch has to be deployed and the search exercised against the real 3,491-record inventory. The `pg_trgm` index migration is written and **not applied**, and deliberately is not required - the search is correct without it and only faster with it | This PR | `npm run verify` passes end to end. 107 new assertions across four suites: 31 on the search domain (normalisation, the alias vocabulary, the PostgREST predicate, the relevance bands, the injection case), 20 on the URL contract (round-trip, every reset rule, legacy URLs, offset clamping), 19 on the rendered controls and the empty-state matrix, 37 on the inventory contract including the privacy boundary. Playwright evidence: 16 frames at 1280x900 and 390x844 in `docs/codex/audits/constitution-rebuild/evidence/market-signals-search/`, each beside an assertion. **Outstanding:** production deployment and a search run against live records |
| LB-003 | Meaningful missing-data text is too faint, risking a misread commercial fact | 29 July 2026 | Market Signals list and detail, Find, Workspace, and every record surface | `Not stated` and equivalent missing-data text render in `--pf-mute` (`#9A958A`) at **2.98:1** on white and **2.59:1** in the sunken well, against the 4.5:1 WCAG 1.4.3 minimum, at 9 to 11px. 27 call sites. Audit section 6, row 6 | Giuseppe Funaro | OPEN | Not started — Stage 1 of ADR-0015 | Pending |

## Resolved blockers

Move resolved items here; do not delete their history.

| ID | Title | Resolved | Resolution PR | Production evidence |
|---|---|---|---|---|
| — | None recorded | — | — | — |

### Notes on LB-002 and LB-003

LB-002 and LB-003 are both contrast defects, and both are duties the Design Constitution already
imposed: section 13 requires input, error, disabled, pending and success states to
be designed, and section 14 requires a record to show only facts it supports, with
missing facts reading `Not stated`. Neither is a new requirement, only an unmet
one.

They are blockers rather than polish because each risks a wrong commercial read
rather than an aesthetic complaint. A member who cannot see a required field may
not complete it; a member who cannot read `Not stated` may take an absent fact for
a stated one.

The minimum work that removes both is the re-point of `--pf-mute` and
`--pf-rule-strong`, which is two values. Stage 1 of ADR-0015 does more than the
minimum, deliberately: a partial token change would leave two palettes on one page.
That widening is owner-approved in ADR-0015 and is not an agent decision.

The 11px mobile structural-caption floor is part of the same launch remediation,
per the owner's decision of 29 July 2026, and is not tracked as a separate item.

## Required handling

1. Record a blocker before implementation begins, or in the same commit that begins the fix.
2. Keep the fix limited to the minimum work required to remove the blocker.
3. Log all non-blocking findings in `POST-LAUNCH-BACKLOG.md` instead of expanding scope.
4. Record production changes in `docs/operations/OPERATIONS_LOG.md`.
5. Move the item to Resolved only after verification evidence exists.
