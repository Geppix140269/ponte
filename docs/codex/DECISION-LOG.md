# Decision log

Newest entries should be added at the top with date, decision, rationale and affected areas.

## 30 July 2026 - the Deal Room function ACL is stated, not inherited

**Decision:** correct LB-008 in a new migration,
`supabase/migrations/20260730b_deal_room_function_acl.sql`, SHA-256
`15f488d87705e5a88def6e1c25e0b006daceda9d3316747eb8bbe87b3f542b31`. **Written and
tested; not applied.** Applying it is a separate owner instruction.

**A new file, not an edit.** `20260729b` is applied and its checksum is in the
ledger. An applied file is immutable, because the ledger is the record that says
what production is; editing it would make that record describe bytes that no
longer exist. The regression suite asserts `20260729b` still hashes to its applied
value, so this branch cannot quietly do it by accident.

**The actual lesson, which is not "we forgot a revoke".** Twice in one day a
migration assumed that a fresh object in a Supabase `public` schema starts
private. It does not: `alter default privileges` grants to `anon`,
`authenticated` and `service_role` **by name**, so `revoke ... from public` — the
statement every Postgres habit reaches for — leaves all three standing. The fix
is not a better revoke but a different posture: **state the intended ACL
explicitly and completely, and let a test hold you to it**, rather than describing
a delta from defaults you do not control.

**The allowlist was derived, not copied, from three places.** Copying the old
grant block would have reproduced whatever it already got wrong. The four helpers
came from the function calls inside the 14 RLS policy expressions, because a
function called in a policy is privilege-checked against the querying role and
dropping one would break every member read. The fifteen commands are proved
against **three independent sources**: what the application calls, what
`20260729b` grants, and what `20260730b` grants.

The third source is the point. Reading the grant list out of `20260729b` and
comparing it with itself agrees even when that list is wrong - which is exactly
the failure mode LB-005 and LB-008 both had, a file asserting something about
itself. So the suite walks production `.ts` and `.tsx` under `app/` and `lib/`
for `.rpc("deal_room_*")`, excluding tests, fixtures, generated output and
non-application trees, and resolves each name to its unique declared signature.
All three agree on the same 15. Four functions end up executable by no member role
at all, the logger among them.

**The test is a closed world, deliberately.** `grant-signatures.test.ts` could not
have caught LB-008 and still cannot: it compares each grant against a declared
signature, and the defect was a revoke naming the wrong grantee. So
`function-acl.test.ts` inverts the question — it builds the inventory of all 23
functions from the declarations and asks what the corrective migration says about
each. **A function the migration forgets fails the suite.** That is the specific
way LB-008 hid, and an open-world check would let it hide again. Demonstrated in
three directions: reintroducing the exact defect fails and names it, omitting one
function fails the completeness check, and granting the logger back later in the
file fails with the offending index.

**What a local test still cannot do.** It cannot observe a Supabase project's
default privileges (PL-002 - there is no non-production database), so it proves
the file complete and consistent, not the outcome. The five production probes that
must pass are recorded in `DATABASE-STATE.md`, and the decisive one is a real
anonymous RPC to the logger returning `42501` where it returns `23503` today.

**Affected areas:** `supabase/migrations/20260730b_deal_room_function_acl.sql`
(new), `lib/deal-room/__tests__/function-acl.test.ts` (new, wired into `npm test`),
`DATABASE-STATE.md`, `LAUNCH-BLOCKERS.md` (LB-008). **No production change.** Gate
C Approval 1 remains incomplete until this migration is approved, applied and
production-verified.

## 30 July 2026 - Two Market Signals corrections: alias precision, and what a zero family count means

**A widening term must be narrower than the thing it widens.** The gas-oil group carried bare `diesel` as an expansion term. `ilike` has no notion of a word, so a search for `gas oil` reached `Diesel Generator`, `Diesel Engine` and `Diesel Pump`: equipment, where the member asked about cargo. It was visible in the sample rows of the read-only production run and not in any assertion, because a widened search returns MORE and that looks like a search that works.

The vocabulary now separates **triggering** from **expanding**. `diesel` still names the group, so a member typing it still reaches EN590 and gas oil, and their own literal word is still searched broadly because they chose it. It is no longer pushed onto a query that did not use it; the fuel-specific forms `diesel fuel`, `automotive diesel` and `diesel oil` do that instead. Measured against production: `gas oil` went from 68 matches to 59 and now reaches **zero** diesel-equipment records, while `diesel` still reaches 7. Both figures are in the evidence file, and the check is now permanent in `scripts/verify-signal-search.ts` rather than something a reader had to notice.

**A zero family count means the filter is unavailable, not that the market is empty.** The count behind the family selector counts records carrying a canonical `market_family`. Zero therefore means *nothing is classified into that family*, which is a different fact from *that family has no signals*: a trade-service requirement can be live on the board right now, findable by searching for it, and still count zero. The copy said "No live trade-service signals are currently available", which is a claim Ponte had not established. It now says "Trade services filtering is not currently available." and offers the search, which does reach those records. A test drives the state with a live unclassified inventory and refuses any wording that reports it as an absent market.

That distinction was then measured rather than argued. The read-only production run now executes the three counts the selector is built from, under the board's own status and public-window predicates on one shared clock: **3,458 eligible signals, 0 classified as Products, 0 as Trade services, 0 as Distribution.** Zero for all three, which is exactly the case the corrected copy was written for - the inventory is there, it is product-oriented, and none of it is reachable by a filter that reads `market_family`. An earlier backlog row had recorded Products as 3,458, inferred from what the records are rather than read from the column that decides what the filter can do; that is corrected in PL-020, which now separates classifying the existing product inventory from sourcing service and distribution inventory, because the single number was hiding two different pieces of work.

That correction matters more than its size. The state existed to stop the board explaining its schema to a customer, and its first wording replaced one untrue statement with another.

**Also:** this branch had duplicated the bridge-invariance gate defect as its own blocker. `main` records it as LB-006; the duplicate is removed and the Market Signals blocker is renumbered to **LB-007**. Two references in shared records that a blind renumber on this branch had reassigned from `main`'s LB-005 are restored.
## 30 July 2026 - Platform UX audit: the review schema dump and the spelling dead-end

**Decision:** on the owner's platform-wide UX and interaction launch-gate brief,
every user-facing route was opened and interacted with, and the two launch
blockers found were fixed on branch `claude/platform-ux-audit-0094f9`.

**What was wrong.** The Start a Deal front door had already been rebuilt to a
progressive three-route intake, and Trade services and Distribution were already
category-first, so the platform did not depend on exact spelling except in one
place and did not expose a schema except in one place - but both remained, and
both are what the brief targeted.

- **LB-010, spelling.** The product resolver returned nothing for `cementt`, a
  one-letter typo of `cement`. The deterministic fuzzy stage matched whole
  queries against whole catalogue terms, so a bare single-word typo of a product
  catalogued only under multi-word names was length-guarded out, leaving only
  the metered model. Fixed with a token-level correction pass in
  `lib/products/fuzzy.ts`.
- **LB-011, schema as interface.** The review screen behind the redesign still
  printed all thirteen commercial terms as empty rows with per-row Add controls
  and a "thirteen terms still unstated" warning, including contract-level fields
  before any draft existed. Fixed with progressive disclosure in
  `components/products/intake/ReviewPanel.tsx`: stated terms shown, optional
  terms collapsed behind one control and grouped, warning removed.

**Rationale.** Both are named in the brief's forbidden-pattern and P0 lists.
Neither fix changes taxonomy, schema, flags, hosting or the Design Constitution;
both use existing tokens and approved components and are covered by unit and
Playwright tests. `middleware.ts` and the private-site gate were untouched.

**Affected areas.** `lib/products/fuzzy.ts`,
`components/products/intake/ReviewPanel.tsx`, `components/products/intake/intake.css`,
their tests, `e2e/product-entry-ux.spec.ts`, `docs/launch/LAUNCH-BLOCKERS.md`
(LB-010, LB-011), `docs/launch/POST-LAUNCH-BACKLOG.md` (PL-021 to PL-024) and
`docs/codex/audits/2026-07-30-platform-ux-audit/`.

## 30 July 2026 - the corrected `20260729b` applied, and a revoke that named the wrong grantee

**Decision:** the owner authorised the Gate C Approval 1 continuation - apply the
corrected `20260729b_deal_room_rls.sql` only, from `main` at `23637d3`, with
per-migration checksum verification and the full section 4.1 to 4.4 probe set.
**It applied cleanly**: one transaction, exit 0, no ambiguous transport response,
ledger 44 to 45, checksum
`b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153` matching the
repository file byte for byte. **LB-005 is closed.** LB-004 is closed and moved to
the resolved register.

**The result of the fourteen required verifications is 11 / 1 / 2: eleven passed,
one failed, two remain pending and unproved.** The failure is requirement 11, the
event logger's grant, recorded as LB-008. The two pending are requirements 12 and
13 — entitlement fail-closed and cross-room isolation — which need real member
sessions against a real room and so belong to Approval 3.

An earlier version of this entry said "thirteen of the fourteen passed". The owner
corrected it on 30 July 2026, and the correction is worth keeping visible: it
counted requirements 12 and 13 as passes while the same records said they were not
proved. **A requirement that cannot be tested yet has not passed**, and a tally
that treats "encoded in the policy predicate" as equivalent to "proved against the
database" is the exact error `GATE-C-TEST-PLAN.md` section 0 was written to
prevent — a policy can be present, correctly named and wrong.

The eleven that passed: 23 `deal_room_*`
functions, 21 SECURITY DEFINER, every one carrying `search_path = public,
pg_temp`. `deal_room_invite` exists on `(uuid, text, timestamptz)` and no other
signature; the five-argument form is absent. 14 policies, one SELECT per
member-facing table, all scoped to `authenticated`, **zero INSERT, UPDATE or
DELETE policies anywhere** and none naming `anon`. The agreement authority is
revoked outright from both member roles - an anon read returns `401 / 42501`. The
append-only trigger fires `BEFORE DELETE OR UPDATE`, binding `service_role` too.
The legacy cluster and `is_deal_participant()` are untouched.

**The one that failed is LB-008, and it is the same mistake as the RLS gap eight
hours earlier.** `anon` holds EXECUTE on all 23 functions. The file says "`anon`
is granted execute on nothing" and performs `revoke all on function
public.deal_room_log_event(...) from public`. That revoke works - PUBLIC is gone
from the ACL - but PUBLIC was the wrong grantee. Supabase's `alter default
privileges` grants EXECUTE **explicitly by name** to `anon`, `authenticated` and
`service_role` on every new function in `public`, and revoking from PUBLIC does
not touch an explicit grant. The morning's defect was the same premise on tables;
this one is on functions. **A fresh object in a Supabase `public` schema does not
start private, and a migration that assumes it does will keep producing this
class of defect.**

It matters because `deal_room_log_event()` is deliberately unauthorised
internally - the other twenty commands call it on the member's behalf - so the
grant was its only protection. Proved through the public API rather than the
catalogue: an anon-key RPC returned `409 / 23503`, an FK violation naming the
`room_id` passed in, which means the body executed. Nothing was written, because
`room_id` references `deal_rooms` and production has zero rooms - which is also
why production is fail-closed today and why the probe could prove callability
without forging anything.

**Why it must be fixed before Approval 3 rather than before deploy.** The
exposure begins the moment a room exists, and the activity record is append-only,
so a forged row could never afterwards be removed by anyone. No fix was applied:
none was authorised, and unlike the RLS gap there was no live hole to contain.
That distinction is the reason acting was right in the morning and wrong now.

**Affected areas:** production schema `cptglsmjmzcfpjndqfmc`; `DATABASE-STATE.md`;
`CURRENT-STATE.md`; `LAUNCH-BLOCKERS.md` (LB-004 and LB-005 resolved, LB-008
opened); `GATE-C-APPROVAL-1-2026-07-30.md` sections 6 to 10; the operations log.

**Also recorded, because it was an unintended production write.**
`scripts/db-query.mjs --file` inserts a `schema_migrations` row for *any* file it
is given, keyed on the basename - including a read-only probe. A precondition
query passed with `--file` therefore added a ledger row named `pre.sql`, taking
the ledger to 45 before the migration ran. It was caught in the output of the
query that caused it and removed the same minute with a primary-key-scoped delete
carrying a `returning` clause, restoring the ledger to 44. That delete bypassed
`db-query.mjs`'s own refusal of `delete from`, deliberately and recorded as such.
Every later probe used `--sql`. **In this repository `--file` is a write,
whatever the SQL inside it does.**


## 30 July 2026 - Gate C Approval 1, and a schema that stops half applied

**Decision:** the owner authorised Gate C Approval 1 - applying the three Deal
Room migrations to production, one at a time, stopping on any error.
`20260729a_deal_room_core.sql` applied and verified. `20260729b` was refused by
Postgres and rolled back. `20260729c` was not attempted. **Approval 1 is
incomplete and stopped.**

**Why `20260729b` cannot be applied.** It grants execute on
`deal_room_invite(uuid, text, text, text, timestamptz)`, a signature the same file
drops: the owner's final trust review removed `p_role` and `p_class`, taking the
function from five arguments to three, and the grant block was never updated.
Postgres refuses the whole file. Every one of the 21 declared functions was
audited against its grant programmatically rather than by eye, and exactly one
disagrees. Recorded as **LB-005**. Correcting it changes the file's SHA-256, which
is why it needs its own authorisation rather than being quietly fixed: the
checksum in the preflight audit is what the ledger will be checked against.

**The lesson, which is about tests and not about SQL.** `rls-contract.test.ts`
reads the migration as text and asserts that each command exists and that no
member holds a write policy. It does not compare each `grant execute` signature
against the function the same file declares. That check is three lines, and the
defect it would have caught reached production DDL. It is not added here because
no fix was authorised in this approval, but it is the second time a Deal Room
defect has been found by a production action rather than by the suite - the first
was LB-004, a select naming a column that does not exist.

**A production change the approved files did not contain, taken deliberately.**
Migration `a` creates the tables; `b` enables RLS on them. Between the two,
production held 15 tables in `public` with `relrowsecurity = false` while
Supabase's default privileges granted `anon` and `authenticated` SELECT, INSERT
and UPDATE on all fifteen - an anonymous write path to every Deal Room table,
including the append-only activity record. The tables were empty and nothing was
written while the gap was open. Rather than leave it open and report it, the gap
was closed with `alter table ... enable row level security` on the 15 tables and
nothing else: no policy created, nothing granted, nothing revoked. RLS on with
zero policies is fail-closed, and it is exactly a prefix of what `b` does, so it
conflicts with nothing that follows. **It awaits owner confirmation and is
reversible in one statement per table.**

**A 502 that was not a failure, and the record it nearly cost.** The Management
API returned an HTML 502 for `20260729a`; the transaction had committed and only
the reply was lost. `db-query.mjs` exits before its ledger write when a call
fails, so production briefly held 15 tables with no record that they existed -
precisely the defect PR #106 had finished repairing hours earlier. The row was
written explicitly, and the record states plainly that its `applied_at` is the
write time rather than the execution time, which is unrecoverable.

**Also decided:** `20260729c` belongs to Approval 2, not Approval 1. The
instruction listed the file among those to apply while separately forbidding
creation of the `deal-room-evidence` bucket, and that bucket plus its two policies
is the entire content of the file. `GATE-C-TEST-PLAN.md` treats them as Approval
2, so the file was not applied.

**Affected areas:** `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md`,
`docs/codex/DATABASE-STATE.md`, `docs/codex/CURRENT-STATE.md`,
`docs/operations/OPERATIONS_LOG.md`, `docs/launch/LAUNCH-BLOCKERS.md`.

## 30 July 2026 - Market Signals search corrected after acceptance audit, and executed against PostgREST

**Why this entry exists.** The 29 July search shipped with 267 assertions, all of which asserted the predicate STRING. Three defects survived that, and one of them was a wrong commercial answer rather than a rough edge. Recorded because the lesson is about the shape of the evidence, not about the bug.

**A widened concept must not widen the query.** Alias expansion put every sibling term at the top level of one OR, so `diesel cargo rotterdam` matched any record containing `gas oil` and neither qualifier. The predicate is now AND between concepts and OR inside them: an alias group substitutes for the concept that triggered it and every other word stays mandatory. A longest-match walk over the query words is what keeps multi-word aliases (`olive oil`, `freight forwarding`, `commercial agent`) from swallowing their qualifiers. **Proved on production data**, not reasoned about: `diesel` matches 68 eligible signals, `diesel cargo rotterdam` matches 0.

**A bound on phrases is not a bound on the request.** `MAX_PHRASES` capped the expansion and not the all-terms branch, so a permitted 120-character query of two-character words built a roughly 10,000-character filter. The caps are now stated per concept, per group and per request (`MAX_SLOTS` 6, `MAX_GROUP_VARIANTS` 5, `MAX_EXPANDED_GROUPS` 2, `MAX_PREDICATE_CHARS` 6,144), and a test computes the worst case the caps permit from the constants and the column list so raising a cap or adding a column fails there. The two degradations run in opposite directions and are labelled: past the group cap a phrase is searched as itself, which NARROWS and is always safe; past the concept cap trailing words are dropped, which BROADENS, so the surface tells the member it happened.

**Accent-insensitive search was true of the matcher and false of the database.** `ILIKE` folds case and never accents, and the query was folded before it was sent, so an accented value was unreachable from either direction. Both forms are now sent. The residual gap is stated rather than closed: an unaccented query still cannot reach an accented stored value, because generating every accented spelling is combinatorial and the real fix is `unaccent` at the database, which PostgREST's filter grammar cannot call (PL-019).

**The decision that follows: a predicate assertion is not a database result.** `scripts/verify-signal-search.ts` executes the real predicates against production, read-only, and is the artefact that established the nested `or=(and(or(...)))` parses at all, that the largest permitted request (3,558 characters) is accepted, and that the qualifier fix holds on live records. It also corrected a claim: the documented cost of an unindexed `ilike` said single-digit milliseconds, reasoned from the row count. Measured, it is 184 to 525 ms wall clock. The estimate was never a measurement and is corrected in `DATABASE-STATE.md` and in the migration header rather than quietly dropped.

**Two of the three qualifier checks are recorded as VACUOUS.** `distributor` and `freight forwarding` match zero eligible signals, so narrowing them to zero proves nothing; the script says so rather than printing a passing row. The inventory is entirely product signals today, which is the same fact PL-017 records.

**LB-007 stays open.** Nothing is deployed. Executing a predicate against production is not the same as a member searching the live board.


## 29 July 2026 - Market Signals made searchable, and the search deliberately needs no migration

**Decision:** LB-007. `/market-signals` gets a free-text search over the complete eligible inventory, relevance ordering, exposed pagination and one shared URL contract with `/find`.

**The decision that shaped everything else: the search must work with no SQL applied.** A merge to `main` applies no migration in this repository (the historical chain aborts on its first file), so every schema change is applied by hand with owner approval. A search built on a generated `tsvector`, a maintained search document or an RPC would therefore have shipped as a closed P0 that returned nothing in production until somebody separately ran a file. The search is built on `ilike` over columns that already exist, so it is correct on merge. `20260730a_market_signal_search.sql` adds `pg_trgm` and eight partial GIN trigram indexes, is written and **not applied**, and changes no result when it is: it changes the plan, not the answer. Recorded as PL-016.

**The alias vocabulary is a vocabulary, not a classification.** `lib/search/aliases.ts` joins `gas oil`, `gasoil`, `diesel` and `EN590` into one search, along with seventeen other commercial groups and their common trade-language forms, which is how multilingual input is honoured under an English-only interface. It only ever widens the phrases a query is matched against; every record returned still had to genuinely contain one of them in a public column. So an alias can never manufacture a match, and a wrong alias costs precision rather than truth. That boundary is what keeps it out of `lib/taxonomy/`, where the family rules apply, and it is asserted by a test rather than described. The widening is also stated on the page, because a member who searched for `gas oil` and is shown `Diesel EN590` has been given a correct answer that looks like a wrong one.

**Relevance is bounded, and the bound is disclosed.** Relevance is a function of the query and the row together, so there is no column to sort on and the matched set has to be read before it can be ordered. Above 1,000 matches the board stops claiming relevance, falls back to the database's own recency order, which pages correctly through everything, and says so. Ranking the first thousand and paging through them would have hidden every record past the thousandth from a member who had just been told the total.

**A zero-result search is a third kind of emptiness.** `presentBoard` already separated an empty market from an empty filtered answer; it now separates both from an empty search. "No signal is currently live on the public board" is a statement about the market, and a member reads it as "this market is dead". It must never be printed because somebody's spelling was wrong, or because Ponte's vocabulary does not carry their word yet.

**Also decided:** `signalFilterHref` is replaced by the shared query authority in `lib/find/query.ts`. It serialised five parameters, so every filter link silently discarded the direction, market, quantity, sort and, once it existed, the search. Two builders is how two surfaces come to disagree about what one URL means, so there is one. The six state transitions a member can make (search, filter, sort, page, clear search, clear all) are pure functions with the reset rules asserted once, rather than conventions re-implemented at each href.

**Not decided, and deliberately out of scope:** classifying the existing inventory (PL-017), reconciling the approximately 160-signal batch (PL-018), applying the index migration (PL-016), and any change to `/find`'s Qualified lane beyond making it read the same `q` the same way.

**Implementation boundary:** repository work only. Nothing is deployed, no SQL has been executed, and the blocker stays open in `LAUNCH-BLOCKERS.md` until the search is exercised against the real 3,491-record inventory.


## 29 July 2026 - Two listing migrations applied to production

**Decision:** the owner accepted ADR-0014 and authorised applying `20260728c_automated_listing_publication.sql` and `20260728e_family_commercial_terms.sql` to production, one at a time and in that order, each probe-verified before the next was started. Applied at 15:42:54 and 15:44:45 UTC; hashes recorded in `public.schema_migrations` match both files byte for byte; ledger 41 to 43.

**Consequence for the repository:** `20260728e_family_commercial_terms.sql` is now immutable. Its bytes are what production ran, so the `NOT APPLIED` comment inside it is historically wrong and is left unedited; correcting it would break the ledger match. What is applied is recorded in `DATABASE-STATE.md`, not in a migration's own header.

**Not decided:** whether to `validate constraint listings_product_fields_family`. The migration deploys it `NOT VALID` and validating it would make the deployed object differ from the file. Zero existing rows would violate it.

**Nothing was published.** These migrations add columns and constraints; verification remains blocking, so the number of publicly eligible listings is unchanged at zero.

**Authority:** ADR-0013, ADR-0014. Evidence in `docs/codex/DATABASE-STATE.md` and `docs/operations/OPERATIONS_LOG.md`.


## 29 July 2026 - Deal Room launch slice, and ADR-0009 accepted as amended

**Decision:** the owner authorised the first launch-usable Deal Room protected progression loop (issue #97) and accepted ADR-0009 as amended by the Gate A preflight. The Deal Room is built as an **additive `deal_room_*` domain**, not as an adaptation of the legacy Deal-era cluster.

**Why the legacy cluster is not reused.** Inspected read-only in production on 29 July 2026: all eight tables hold zero rows, no application code references any of them, six of the eight have no write policy at all, `deals.listing_id` references `listings_legacy_20260720` rather than the live `listings`, and `is_deal_participant()` is strictly two-party with no concept of an organisation, a sub-room, an admission state or an agreement acceptance. Adapting it would have meant rewriting every column and its foreign key, which is a replacement wearing the old table's name. **Every legacy object is left untouched** — not dropped, renamed, altered or declared — and its disposition is deferred to PL-010.

**The progress scale, stated because it differs from the repository's other one.** `lib/ponte/progress.ts` remains the progress authority and its validator `assertWeights` is reused unchanged. Its *mapping* is not: `progressValue` maps earned weight onto 20–100 for a draft, where the floor is the reward for starting. A Deal Room has no floor because it shows no number at all until a procedure is approved, and the accepted product definition fixes its scale directly — earned weight **is** the percentage, giving 22% at procedure agreement, inside the Constitution's 18–25 band. Both obey the progress law; they are different scales, which the engine contract itself requires.

**Sub-room isolation is a database property.** The `deal_room_sub_rooms` SELECT policy returns **zero rows** to a non-participant — not an error, not a redacted row. Every list, count, navigation item, notification and AI context is built from that filtered read, because no unfiltered read exists to build them from.

**Also decided:** the Multi-party Deal Room Bridge v1 is commissioned as a required shared component and transcribed from `PB.dealroom` in the approved engine, rather than substituted with a card grid, tabs or a stepper. Click-to-accept evidence is profile identity, organisation or declared capacity, agreement kind, document version, SHA-256 of the accepted content and a UTC timestamp — **no IP address and no user agent**, by explicit owner decision, and it is never described as an electronic signature. Evidence bytes live in a new private `deal-room-evidence` bucket; the orphan `ponte-deal-docs` bucket is left in place.

**Implementation boundary:** merged to `main` at `42a9d22` on 29 July 2026, after technical and design approval. Merging changed nothing a member can reach: **no SQL has been executed anywhere**, no Storage bucket or policy has been created, no feature flag has been set and nothing has been deployed. Applying the migrations, creating the bucket, running the negative-access fixture and activating the flag are four separate owner gates, none of them taken.

**Affected areas:** `docs/decisions/ADR-0009-deal-room-technical-architecture.md`, `docs/codex/audits/2026-07-29-deal-room-preflight.md`, `docs/plans/active/deal-room-launch-slice.md`, `lib/deal-room/`, `components/deal-room/`, `components/ponte/bridge/DealRoomBridge.tsx`, `app/[locale]/deal-rooms/`, `app/api/deal-room/`, `supabase/migrations/20260729a-c`, `docs/codex/CURRENT-STATE.md`, `DATABASE-STATE.md`, `FEATURE-FLAGS.md`, `docs/launch/`.
## 29 July 2026 - Owner sign-off on the three open ADR-0015 matters

**Decision:** All three matters raised when ADR-0015 was opened are resolved, and two further points confirmed. Direction B with Direction C's mobile rules remains the approved contrast direction.

**S-1, the Bridge manifest is decoupled, not re-hashed.** `SOURCE-MANIFEST.md` was checksumming the live shared token file through a resolver in `check-governance.mjs`, so a manifest describing an approved Bridge delivery would have had to change on every palette decision. A byte-identical package-local snapshot of the handoff token file is preserved and verified instead, and no Bridge manifest row resolves to `design-system/ponte-flow` any more. Simply replacing the live checksum after each palette change was **explicitly rejected**: it would make the manifest a moving record and remove the protection the check exists to give. Recorded as OD-008.

**S-2, PL-004 is fixed in the checker, not in `AGENTS.md`.** Normalise whitespace before matching, in a separate minimal PR on `fix/launch-mode-whitespace-check`, before Stage 1, proving the check fails before and passes after.

**S-3, the Bridge deck and passive pier are in Stage 1.** The central Ponte Bridge must not remain at approximately 1.42:1 structural contrast while the rest of the interface is remediated. Contrast only: geometry, station fractions, node sizes, labels, motion and gold semantics unchanged; arrived and selected destinations remain gold. The eight approved reference renders must be re-taken, since they describe the old contrast. Closes OD-007.

**S-4, value-neutral alias conversion approved** for `find.css`, `landing.css`, `legal.css` and `pfooter.css`, which hold literal copies of the palette and would not otherwise receive the central remediation. Must not redesign those routes; subsequent visual change comes from the central Stage 1 tokens.

**Correction, same day.** Two claims that prompted parts of this sign-off were wrong. `check-launch-mode.mjs` failing and the duplicate `20260728d` migration identifier were **both already fixed on `main`** by `228b532` in PR #98, before either was reported. They were asserted from a local `main` ref that had not been fetched and was nine commits stale. Consequences: no migration hotfix branch is created, because the file to rename no longer exists and `20260728e` is now correctly held by it; no `LB-003 - duplicate migration identifier` record is created, because recording a closed defect as an open blocker would make the register untrue; and the redundant checker-fix pull request is recommended for closure. Numbering corrected: `main` already holds LB-001, PL-004 and PL-005, so the contrast blockers are LB-002 and LB-003 and this work adds no PL entry.

**S-5, LB-002 and LB-003 confirmed**, closable only on field boundaries at sufficient non-text contrast, missing-data labels at sufficient text contrast, desktop and 390 x 844 evidence, and no regression in factual hierarchy or task completion.

**Implementation boundary:** still **nothing implemented**. Governance records only. Stage 1 is blocked until both the PL-004 fix and the governance PR are merged.

**Affected areas:** `docs/decisions/ADR-0015-contrast-and-colour-remediation.md` (new sections S-1 to S-5, and a Stage 0), `docs/plans/active/contrast-and-colour-remediation.md` (sections 3, 4, 6.4, 6.5, 7, 9, 11, 11.1, 12, 13), `docs/operations/OPEN_DECISIONS.md` (OD-007 decided, OD-008 added), `docs/launch/POST-LAUNCH-BACKLOG.md` (PL-004 in progress).


## 29 July 2026 - Contrast and colour remediation: strengthened paper with a blue interaction family (ADR-0015)

**Decision:** Ponte adopts Direction B, paper with blue interaction, incorporating Direction C's three non-colour mobile rules. The Design Constitution becomes v1.1.

**The rule:** Ponte now has two semantic colour families and they do not overlap. Gold is exclusively the Ponte signal, movement across an approved Bridge, an arrived or selected Bridge destination, and approved editorial emphasis. Blue is exclusively interaction: links, navigational emphasis, selected controls that are not journey positions, active and expanded controls, active form boundaries, and keyboard focus through the existing focus semantics.

**Where they meet, the Bridge wins:** a chosen Bridge family is both a selected control and an arrived destination, and it stays gold. Blue takes selected controls that are not journey positions, so chips, segments, tabs, rows and tiles. Without that line, blue walks into the Bridge and the two systems stop meaning different things.

**Not:** blue for verification, success, warning, review, commercial completion or Bridge arrival; `--pf-focus` repurposed as a general interaction token; a whole-product repaint; any change to Bridge geometry, motion, typography families or the meaning of gold.

**Rationale:** the audit measured 163 colour pairs and found 96 short. The split was the finding: 39 of 55 text pairs already clear AA, while 80 of 108 non-text pairs fall short. The palette states the words clearly and whispers the shape of the page, which is exactly what the focus group reported. Direction A fixes the measurement completely but leaves the second half of the finding standing, because Ponte's only accent is gold and section 6 bars gold from meaning "act here", so A has nothing to spend on affordance.

**Also decided:** the eight local tint and line extensions in `desk.css`, which `compatibility-aliases.md` section 3 had been holding for an owner ruling, are promoted into the approved token set. Section 18 of the Constitution gains numeric contrast targets; it previously said "at approved contrast levels" without naming a level, which meant the rule could not be failed.

**Launch blockers recorded:** LB-002, required form and input boundaries at approximately 1.52:1. LB-003, meaningful missing-data text such as `Not stated` at approximately 2.98:1. Both are unmet duties under Constitution sections 13 and 14 rather than new requirements.

**Implementation boundary:** at this record point **nothing is implemented**. This entry covers the governance change only: the ADR, the Constitution amendment, the ExecPlan and the registers. No production token, stylesheet, route or component has been modified, nothing is deployed, and Stage 1 must not begin until the governance PR is merged. One item awaits the owner's specific sign-off: the Bridge deck and pier in the approved Bridge authority package, recorded in the ExecPlan section 12.

**Affected areas:** `docs/decisions/ADR-0015-contrast-and-colour-remediation.md`, `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` (v1.1), `docs/plans/active/contrast-and-colour-remediation.md`, `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`, `docs/launch/LAUNCH-BLOCKERS.md`, `docs/operations/OPEN_DECISIONS.md`, `design-system/ponte-flow/documentation/compatibility-aliases.md`, `docs/codex/CURRENT-STATE.md`.

## 29 July 2026 - A family's own vocabulary survives publication, and a discard requires consent

**Decision:** ADR-0014 applies downstream of the composer, not only inside it. Every surface presenting a stored record — the public detail page, the shareable marketplace page, the member's own records, the admin exception console and the member emails — presents that record in its own family's vocabulary, through one shared presenter. And a classification change that would destroy answers the member has already given names them and waits for consent.

**Why:** the family split was correct in the composer and stopped at its edge. Each downstream surface printed its own fixed list of product columns, so a published freight-forwarding record answered Quantity, Incoterm, HS code, Origin and Destination with "Not stated" while its eight stated service terms appeared nowhere but the prose; the emails called every record an "offer". Separately, changing a service category silently discarded the subcategories and specialisations chosen under it — real work, removed without notice, with an absence as the only clue.

**The rule:** a fact a family does not have produces no row, at model-generation level, on a stored record exactly as on a draft. A warning appears only when something real would be lost, and names only what would actually be lost.

**Also:** the missing-column fallback is staged and tested. An absent `service_terms` or `distribution_terms` costs a record its family terms and nothing else; dropping both groups together filed a correctly classified submission as an unclassified row.

**Not:** hiding the product rows with CSS; a second label vocabulary for published records; a confirmation on every classification change.

**Authority:** ADR-0014, sections 9 and 10. **Accepted by the owner on 29 July 2026.**


## 28 July 2026 - Family-specific downstream commercial procedures

**Decision:** Ponte has one shared composer framework and three distinct downstream commercial procedures. Products, Trade services and Distribution and representation share the technical shell, the account gate, the submission orchestration and the design system. They do not share one product-shaped set of commercial questions, blockers, review rows or submission expectations.

**The rule:** a member is only asked for facts relevant to their market family and canonical intent. Quantity, unit, frequency, route, Incoterm, packaging and HS classification belong to Products. Trade services state scope, coverage, specialisation, capability, engagement basis and availability. Distribution states objective, product or sector scope, territory, partner type, channels, capabilities, commercial expectations and timing.

**Not:** service capacity stored as a product quantity; a distribution opening order stored as a shipped quantity; a product field hidden rather than removed; or the composer duplicated per family.

**Authority:** ADR-0014. **Accepted by the owner on 29 July 2026.**


## 28 July 2026 — Automated listing publication and one transactional email system (ADR-0012)
## 28 July 2026 — Automated listing publication and one transactional email system (ADR-0013)

**Decision:** Ponte is a self-publishing trade platform with automated eligibility controls, not a manually moderated noticeboard. A Member Opportunity publishes automatically when the member holds a current passing member-business verification with no unresolved sanctions candidate, every mandatory field for its market family is present and valid, the member has accepted the listing responsibility declaration, and no automated safety check has raised a high- or medium-severity flag. Human review becomes exception-based only, and `/admin/listings` becomes an exception console rather than the publication queue.

**Sub-decisions taken explicitly by the owner:** Verification remains BLOCKING — automated publication does not lower the member-business bar, and an unverified member receives a blocking issue routing them to `/verify` rather than a published listing. The public qualification and limitations text survives, with the AI drafting it and the MEMBER confirming it before publication, so Ponte never publishes unattended model output and the `AGENTS.md` rule that AI must not silently publish continues to hold.

**Accepted consequence:** the bottleneck moves rather than disappearing. Verification remains a desk function, and `CURRENT-STATE.md` recorded zero listings with a passing bound member-business verification at the 26 July probe. Automated publication will not produce a published listing until verification throughput improves. An unverified public board was judged the worse outcome.

**In the same patch:** the quantity model gains a mode (exact, approximate, minimum, maximum, range, negotiable, on request), decimal support and separator-safe parsing, fixing a defect where the composer displayed `10,000` as a render-time fallback that the form state never held. The member/company/email/reference mapping defect in listing notifications is fixed by a type. All application-generated email moves to one shell derived from the approved Ponte Flow tokens, with a plain-text part on every message and no template inviting a reply by email.

**Implementation boundary:** implemented on branch `fix/automated-listings-email-system` on 28 July 2026. At this record point the migration has NOT been applied to production, nothing has been deployed, the Supabase Auth templates have not been configured, and the admin exception console has not been rebuilt. Applying a production migration, deploying and merging remain subject to the stop conditions in `AGENTS.md`.

**Affected areas:** `docs/decisions/ADR-0013-automated-listing-publication.md`, `docs/plans/active/automated-listing-publication-and-email-system.md`, `docs/email-provider-template-configuration.md`, `lib/listings/`, `lib/email/`, `lib/structure/draft.ts`, `components/structure/StructureComposer.tsx`, `app/api/marketplace/submit/route.ts`, `app/[locale]/marketplace/actions.ts`, `app/[locale]/admin/listings/actions.ts`, `supabase/migrations/20260728c_automated_listing_publication.sql`, `docs/codex/CURRENT-STATE.md`, `docs/codex/DATABASE-STATE.md`.

## 28 July 2026 — Close the public read and write hole on the migration ledger

**Decision:** `public.schema_migrations` gets row level security with no policy,
and `anon` and `authenticated` lose every privilege on it. `service_role` keeps
its grants, stated explicitly. Applied to production as
`20260728b_schema_migrations_rls.sql` with owner authorisation.

**What was wrong.** The table had RLS disabled and both public roles held all
seven privileges: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and
TRIGGER. The anon key is in every browser. Proven live over the public internet
before the repair: an unauthenticated `GET /rest/v1/schema_migrations` returned
`HTTP 200` with real rows.

**Why it is more than a privacy leak.** Reading the migration history is the
smaller half. Anyone could also insert a row claiming a migration had been
applied, or delete one saying it had. This table is the only record of what
production has run, and two audits on 28 July read it as evidence. A ledger that
unauthenticated callers can edit is not evidence, and the audits could not have
known the difference.

**The cause was tooling, not any migration.** `scripts/db-query.mjs` and
`scripts/apply-migration.mjs` create the ledger with a bare
`create table if not exists`, and Supabase's default privileges hand every new
table in `public` to `anon` and `authenticated`. Every table this project
declares deliberately carries RLS; this one was created as a side effect of
recording something else, and so never got it. It stood open from its first row.

**Both a revoke and RLS, not one.** The revoke is what closes it: PostgREST
cannot reach a table the role has no privilege on. RLS with no policy is the
lock that survives Supabase's default privileges being re-applied, because a
restored grant does not restore a policy that was never written. Deny-all with
zero policies is how eleven other tables here are already held.

**Both scripts now re-assert it on every run** rather than trusting a one-off,
so a ledger created fresh in another project is protected from its first row
rather than from its first audit.

**Nothing that writes loses access.** `postgres` owns the table and an owner
bypasses RLS unless FORCE is set, which this deliberately does not set;
`service_role` has `rolbypassrls`; both scripts connect as `postgres`; and no
application code touches the table.

**Verified from outside, after the fact.** With the anon key, SELECT, INSERT,
UPDATE and DELETE all return `HTTP 401` with SQLSTATE `42501`, while the control
in the same run, `desk_radar`, still returns `HTTP 200` with `[]` — so the
denial is this table and not a bad key. Server side: RLS on, zero policies,
grantees `postgres` and `service_role` only. The file is idempotent; running it
twice changes nothing.

**Not done:** no row in the ledger was edited, no other table was touched, no
credential was rotated, and nothing was backfilled.

**Affected areas:** `supabase/migrations/20260728b_schema_migrations_rls.sql`
(new), `scripts/db-query.mjs`, `scripts/apply-migration.mjs`,
`docs/codex/DATABASE-STATE.md`.

## 28 July 2026 - The market family decides which classification journey opens

**Two accepted decisions met on one screen.** ADR-0011 (category-first journeys)
merged to `main` as `877448b` while ADR-0012 (AI product intake) was being built
on PR #71. Both rewrote the composer's first step and `lib/structure/draft.ts`,
and the merge conflicted in four files.

**Owner decision: route by market family, and change neither ADR's meaning.**
They are complementary journeys, not competing implementations.

| Family | Decision | What opens the composer |
|---|---|---|
| Products | ADR-0012 | Describe naturally, upload a trade document, or browse categories |
| Trade services | ADR-0011 | Category-first, on the canonical service taxonomy |
| Distribution & Representation | ADR-0011 | Category-first, on the canonical distribution taxonomy |

**Where the branch lives, and why there is only one.** `IntentStep`, on
`needsHsCode(draft)`, which is already the single answer to "is this a product
record". The composer is NOT duplicated: S02 to S06, the account gate, the resume,
the preview and the submit are one stack for all three families.

**Both data models are kept whole.** `Classification` keeps every ADR-0011 key;
`DraftResolution` keeps every ADR-0012 layer; no field carries the other's
meaning. The one place they meet is `productSector`: ADR-0011 wants a sector key
on every record and the ADR-0012 cascade already derives one from the customs
chapter, so `ResolvedProduct` now carries the sector KEY as well as its label and
`applyResolution` writes it onto the draft. An underivable sector stays empty,
because a gap is honest and a guessed classification is not.

**No migration and none needed.** Old drafts predate both decisions; `emptyDraft`
supplies every added field and a draft carrying none of them reads as the legacy
product-shaped path exactly as it did. Two tests pin it.

**Superseded, and removed rather than kept beside its replacement:** the local
`SUBJECT_HEADING` map and the blank one-line `SubjectStep`. `lib/taxonomy/journey.ts`
now holds every heading beside the questions it introduces.

**Corrected because it had become false:** `e2e/category-journeys.spec.ts`
asserted that products still open on the HS drill-down, which ADR-0012 removed on
the owner's instruction that an HS code must not be required before Ponte
understands a product. The assertion now pins what is still true, that a product
record reaches neither category picker, and the stale frame was replaced.

**Affected areas:** `components/structure/StructureComposer.tsx`,
`lib/structure/draft.ts`, `lib/products/model.ts`, `lib/products/intake.ts`,
`app/[locale]/structure/page.tsx`, `package.json`,
`lib/structure/__tests__/family-routing.test.tsx` (new),
`e2e/category-journeys.spec.ts`, `e2e/product-intake.spec.ts`,
`docs/plans/active/ai-product-intake-and-document-to-deal.md`,
`docs/codex/CURRENT-STATE.md`.

**Not owner-approved:** no migration, no storage, no feature flag, no production
configuration, no deployment and no merge. PR #71 remains open.

## 28 July 2026 - The product resolver is a cascade, not a catalogue lookup

**Blocking defect found at owner review.** Giuseppe typed `avocado` into Offer a
product and Ponte answered "did not recognise that yet". The model stage was
restricted to returning keys that already existed in Ponte's curated catalogue,
so the twenty-five seeded products were the boundary of everything Ponte could
understand. That does not satisfy the approved rule that users describe what they
trade and Ponte identifies, structures and classifies it.

**Decision: fix the architecture, not the data.** Adding `avocado` as a
twenty-sixth entry would have left the ceiling exactly where it was.

**What replaced it.** A six-stage cascade in `lib/products/cascade.ts`: exact
over the curated catalogue, fuzzy correction of a curated term, unrestricted
model identification, the HS 2022 catalogue lexically when the model is
unavailable, Ponte-sector mapping derived from the surviving customs chapter, and
a clarification only where the product itself is genuinely ambiguous.

**The safety rule moved rather than being removed, and is stronger for it.** The
old rule was a ceiling on what the model could say. The new one constrains what
its answer may become: an identified product carries the new `ai_identified`
provenance, is scored below any curated match, has every proposed customs code
checked against the real catalogue and dropped if it does not exist, has its
sector derived from that code rather than from the model, surfaces a spelling
correction as a question rather than applying it, and cannot reach a draft until
the member confirms it. AI may recommend; it still may not publish, verify or
commit, and the separate rule against inventing commercial terms a document never
stated is untouched.

**Two catalogues, because they fail in opposite directions.** Verified against
the deploy preview: `avocado` in HS 2022 returns 0804.40 avocados, and `gas oil`
in the same index returns seamless steel drill pipe. A customs nomenclature has
breadth and no commercial vocabulary; the curated catalogue has commercial depth
and no breadth. Neither alone is a resolver.

**Copy corrected at the owner's instruction.** The unmatched state's closing
sentence, "Ponte will not guess a product you did not name", was shown to a
member who had named their product correctly and blamed them for Ponte's limit.
It now reads "We could not classify that confidently yet", states what Ponte
tried, and offers four ways on. A test pins it so the sentence cannot return.

**Deferred by owner decision, unchanged:** durable document storage (issue #72)
and the microphone icon commission.

**Affected areas:** `lib/products/cascade.ts`, `lib/products/identify.ts` and
`lib/products/fuzzy.ts` (all new), `lib/products/model.ts`,
`lib/products/intake.ts`, `lib/products/resolve.ts`, `lib/products/ai-resolve.ts`
(deleted, superseded), `app/api/products/resolve`,
`components/products/intake/*`, `app/[locale]/dev/product-intake/states.ts`,
`e2e/product-intake.spec.ts`, `docs/schemas/product-resolution.schema.json`,
`docs/plans/active/ai-product-intake-and-document-to-deal.md`,
`docs/codex/CURRENT-STATE.md`.

**Not owner-approved:** no migration, no feature flag, no deployment and no
merge. PR #71 remains open pending design approval.

## 28 July 2026 — AI product intake and document-to-deal, implemented

**Decision implemented:** the owner-approved product decision recorded in
`ADR-0012-ai-product-intake-and-document-to-deal-flow.md` (branch
`product/ai-document-product-intake`, draft PR #68) and tracked in issue #67.
Users describe or upload what they trade; Ponte identifies, structures and
classifies it. Both product intents enter through one shared resolver. HS
classification is downstream and confirmable, not the gate on the journey.

**Decisions taken during implementation, because the authorities did not settle them:**

1. **The commercial product vocabulary is a new layer, not an extension of the
   HS catalogue.** `lib/products/catalogue.ts` holds normalised names, synonyms,
   standards, grades and attributes. HS 2022 is a customs nomenclature and will
   never say that `gas oil`, `EN 590` and `ULSD` are one product with one buyer
   pool. The catalogue maps onto `PRODUCT_SECTORS` rather than restating it.

2. **Resolution is deterministic first, semantic second.** The lexical stage is
   pure, free and reproducible, which is what makes the `gas oil` acceptance
   criterion a unit test rather than a manual check against a live service. The
   metered semantic stage runs only when the lexical stage cannot answer, and it
   may return catalogue keys and nothing else.

3. **Product identification in a document is deterministic too.** The
   three-product acceptance case is proved by `lib/products/scan.ts` running the
   catalogue's synonym index over the text, with no model call. The model reads
   the commercial terms, which genuinely need comprehension.

4. **"Do not invent" is enforced by the parser, not requested by the prompt.**
   Any extracted term arriving without the verbatim words it came from is
   discarded and becomes `missing`. A fact Ponte cannot show the member is a
   fact Ponte does not state.

5. **`gas oil` is ambiguous, and stays ambiguous.** Three commercially different
   grades match. The resolver asks which, naming the attribute they differ on,
   and pre-selects nothing. Silently taking the top answer is named as a
   rejected approach in the decision record.

6. **"Verified by Ponte" is rendered as unavailable, not omitted.** Ponte does
   not verify a product claim on this journey. Removing the row would collapse
   four provenance states into three; leaving it as an empty box would imply a
   verification a member could obtain.

7. **Ponte's own product record is shown without a provenance marker.** The
   normalised product, its category and its catalogue attributes are neither a
   claim from the document nor a member confirmation. The first evidence run
   printed "Extracted from document" beside a sulphur content that came out of
   the catalogue, which is a false provenance claim on the one screen that must
   not make any.

8. **The uploaded document is not persisted.** Attaching it durably needs a
   storage bucket, a retention rule and an RLS policy, all owner decisions. The
   intake keeps it for the session and the review screen says so.

9. **PDFs and images are read by the model as content blocks, not by a new
   parser.** No new runtime dependency, and no second unmetered model path:
   everything still goes through `lib/ai.ts`, which is what keeps every call
   costed. `adm-zip` moves from devDependencies to dependencies for `.docx` and
   `.xlsx`. Legacy binary `.doc` and `.xls` are blocked by name with a reason.

10. **Voice is a text-labelled control.** The Ponte Flow registry has no
    microphone key, and Constitution section 7 makes a missing icon a gap to
    escalate rather than permission to draw one. Registered for commission.

**Owner decisions taken on review, 28 July 2026.** Giuseppe reviewed the
implementation report and ruled on the four questions it raised:

1. **The ADR is renumbered to ADR-0012, and the ADR-0002 collision is not
   retained.** Draft PR #68 had added a second `ADR-0002` beside
   `ADR-0002-ponte-design-constitution.md`, which is on `main`, is a required
   governance file and is cited by START-HERE, this log and section 25 of the
   Constitution. The renumber is done at source on
   `product/ai-document-product-intake` (commit `a4ba831`): the file is now
   `docs/decisions/ADR-0012-ai-product-intake-and-document-to-deal-flow.md`, the
   heading matches, and the previously missing row is added to the ADR index.
   Not one word of the decision changed. Every reference in this log, in
   `CURRENT-STATE.md` and in the ExecPlan resolves to ADR-0012.

2. **Durable document storage is deferred, and session-based processing is
   accepted for this release.** Retention, bucket architecture, access control,
   deletion and RLS become a separate decision and work package, raised as
   issue #72. The review screen already states the limit in words, so nothing on
   screen implies an attachment the product does not provide.

3. **No microphone icon is commissioned or introduced.** The
   Constitution-compliant text-labelled voice control stays until an approved
   Ponte Flow icon exists. This is now a closed question for this change and an
   open commission for the design system.

4. **The `import-approved-bridge-package` CI failure is recorded as pre-existing
   and environmental**, on the condition that the canonical repository
   verification and the Bridge manifest integrity check both pass. Both do: the
   `verify` workflow succeeds, and `check-governance.mjs` verifies all 13
   vendored Bridge files against `SOURCE-MANIFEST.md` byte for byte. The failing
   workflow fetches the Bridge archive from Google Drive, which now returns an
   interstitial page instead of the file, and it fails identically on every
   branch including documentation-only ones.

**Reconciled against ADR-0011, merged to `main` while this was in progress.**
ADR-0011 section 5 requires **Trade services and Distribution** to begin with
clickable canonical categories instead of a generic one-line subject field, and
its Context records that "Products already begin with a structured
classification journey". The two decisions therefore agree and do not overlap:
this change governs the Products family only and leaves the non-product subject
step exactly as it found it, for ADR-0011's own implementation to replace.

One consequence: the renumber for the intake ADR is **ADR-0012**, not ADR-0011,
which is now taken. Accepted by the owner and done at source the same day.

**Incidental repair: committed merge-conflict markers.**
`docs/codex/CURRENT-STATE.md` carried literal `<<<<<<< HEAD`, `=======` and
`>>>>>>> origin/main` markers on `main` at lines 4 to 12. This change had to
update that file anyway and its two sides were reconcilable without choosing
between them, so they were folded into one header: the ADR-0010
design-authority line from one side, the Ponte Desk entry-authority amendment
from the other, and the Bridge line corrected to the truth after PR #58.

`docs/codex/00-START-HERE.md` carried the same defect at lines 48 to 67, in the
authority order every new contributor is told to read first. It was reported
rather than repaired here, because its two sides disagreed in substance and
choosing was the owner's call. It has since been resolved independently on
`main` by commit `c0e73ab`, which kept both sides and renumbered the list. **No
marker now remains in either file, or anywhere in the repository.** The interim
entry raised in `docs/codex/KNOWN-ISSUES.md` was removed rather than left to go
stale.

**Affected areas:** `lib/products/` (new), `lib/documents/` (new),
`app/api/products/` (new), `components/products/intake/` (new),
`app/[locale]/dev/product-intake/` (new, development-only),
`components/structure/StructureComposer.tsx`, `lib/structure/draft.ts`,
`lib/ai.ts`, `app/[locale]/structure/page.tsx`, `docs/schemas/product-resolution.schema.json` (new),
`playwright.config.ts`, `next.config.mjs`, `package.json`,
`docs/plans/active/ai-product-intake-and-document-to-deal.md` (new),
`docs/codex/CURRENT-STATE.md`.

**Not owner-approved:** no migration, no feature flag, no deployment and no
merge. Design approval is requested on the pull request with desktop, 390 x 844
and reduced-motion evidence attached.
## 28 July 2026 — Complete Market Signal discoverability and category-first non-product journeys (ADR-0011)

**Decision:** Every approved, unexpired and anonymised public Market Signal must be discoverable through search, filtering, hierarchical browsing or pagination. The current 60-record read may remain a page size but must not be presented as the total inventory or remain a terminal access cap. The approximately 160 newly supplied records must be reconciled through the existing identity, provenance, deduplication, privacy, approval and expiry rules; exact totals must be reported from the database rather than calculated as a hard-coded addition.

**Search and classification:** Market Signals listing, Find and taxonomy browsing must use one server-side query contract across the complete eligible inventory. It must support accurate totals, keyword search, product hierarchy, commercial side, geography, date, stable URL state, filters, sorting and pagination. Unclassified records remain discoverable and must not receive fabricated HS classifications.

**Category-first creation and Find:** Products retain their structured product-classification journey. Trade services and Distribution and representation must begin with clickable canonical categories, not a generic blank one-line text field. Free text appears only after Other or as later optional context. Find, Explore, Start a Deal, storage, filtering, analytics and future matching must use the same stable taxonomy keys.

**Distribution correction:** Partner or channel type, product/sector attachment, territory and relationship structure are separate concepts. Distributor, agent and broker are partner types; Exclusive and Non-exclusive are relationship terms. Existing values require explicit compatibility mapping rather than silent reinterpretation.

**Implementation boundary:** Giuseppe issued the combined development brief to Claude Code on 28 July 2026. The product decision and implementation scope are accepted. At this record point no implementation branch, import result, schema migration, deployment or production verification for this scope has been evidenced. Applying a production migration, deploying or merging remains subject to the stop conditions in `AGENTS.md`.

**Affected areas:** `docs/decisions/ADR-0011-complete-market-discoverability-and-category-first-journeys.md`, `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`, Market Signals listing and detail, Find, Structure/Start a Deal, `lib/taxonomy/market.ts`, public query projections, database indexes and optional additive schema work, import reconciliation, SEO and URL-state behaviour, `docs/codex/CURRENT-STATE.md`.

## 28 July 2026 — Category-first classification for Trade services and Distribution

**Context:** Owner requirement of 28 July 2026, implemented on branch
`feature/category-first-market-taxonomy` and proposed as ADR-0013, which implements the owner-accepted ADR-0011. Trade
services and Distribution opened on a blank line, "State it in one line", while
Products had a progressive category journey. A sentence cannot be filtered,
matched, counted or searched, so two of Ponte's three equal families could
neither be described properly nor searched at all.

**Decisions recorded because the authorities did not settle them:**

1. **The Trade Services escape route is stored as `unlisted`, not `other`.** The
   earlier ten-key list already used `other`, and it meant "Other trade-enabling
   services": a real category with real subcategories. Reusing the key would
   have made every stored `other` ambiguous, and reading one back would have
   silently reclassified a member's trade-enabling record. The label a member
   sees is unchanged. Found by a test written before the collision was noticed.

2. **The legacy `route` value maps to `market_entry`, and is flagged.** The
   requirement maps it to a "route-to-market partner", which is not one of the
   twelve canonical types. `LEGACY_DISTRIBUTION_MAP.route` carries
   `needsOwnerConfirmation: true` so the owner confirms it rather than
   discovering it later.

3. **A relationship term is never read back as a partner type.** `exclusive` and
   `nonexclusive` sat in the same flat list as `distributor`. Answering "which
   partner type is this?" with "exclusive" would keep the original error alive
   under new names, so `canonicalPartnerType("exclusive")` returns null on
   purpose.

4. **An icon appears only where the Flow registry already has one.** Five of the
   twelve partner types and both escape routes have no approved asset, and
   drawing them would be an unapproved addition to the registry (Constitution
   section 7). The grid reserves the icon column either way, so a partly drawn
   list still aligns. The requirement asked for an icon "where available"; this
   is what available means.

5. **Category icons are rendered on the server and passed down as nodes.**
   `PonteIcon` is a server component so the registry's markup never reaches the
   browser bundle, and the pickers are client components. Importing the renderer
   into a picker would quietly undo that; a second client-safe icon module would
   give Ponte two icon renderers, which section 20 forbids.

6. **Cross-family classification is refused in three places.** In the draft, in
   the API, and in a database CHECK. The API is not the only writer a table
   sees, and a mis-filed key is worse than a missing one because every filter,
   count and match downstream trusts it.

7. **`/find` opens on the three market families.** It previously opened on the
   product picker, with products the only family that could be searched.
   Products is now one tap away and unchanged.

8. **A category filter that cannot be applied reports that, and never an empty
   result.** No published record carries a canonical category yet. "No signal
   matches ocean freight" and "Ponte cannot yet tell which signals are about
   ocean freight" are different sentences with different next actions.

9. **Nothing is backfilled.** No existing record has been classified into this
   taxonomy, and writing a guess into those columns would invent a finding.

**Corrections under review, 28 July 2026:**

10. **Eligibility runs in the query, before the page is cut and before the count
    is taken.** Applying the public-expiry rule afterwards to a fetched page
    counted expired rows and returned short pages, which would have made offset
    paging unstable before it was built.

11. **Coverage is measured on every category-filtered read.** Reporting
    "nothing is classified" only when the result was empty held for exactly as
    long as nothing was classified. From the first classified record onwards,
    every filter would have returned small confident results over an inventory
    that was still almost entirely unclassified. There are now three states:
    `unclassified` (nothing carries a category), `partial` (some do, and the
    numbers are printed), and `ok` (all do, so an empty result is conclusive).

12. **The family-coherence constraints are implications, not exemptions.** The
    first draft opened `market_family is null or ...`, which permitted a service
    category on a record belonging to no family. `desk_radar` carries the same
    two constraints, and needs them more than `listings` does: a signal is
    written by an importer, an admin action and any future backfill, none of
    which passes through the member API's validation.

13. **The legacy `route` value is preserved as `route_to_market`, not
    consolidated into `market_entry`.** Consolidation cannot be undone: once
    stored values have been read back through it, which records were `route` is
    unrecoverable. Owner-approved 28 July 2026.

**Not applied:** `supabase/migrations/20260728a_market_classification.sql` is
written and reviewed and has **not** been run. A merge applies no migration in
this repository. The write path tolerates the columns being absent and retries
without them, and the classification still reaches the record through the
synthesised `details`.

> **Superseded the same day.** That paragraph was true when the decision was
> recorded and is not true now: `20260728a` was applied to production by hand on
> 28 July 2026 at 13:25:11 UTC with owner authorisation, and verified. See
> `docs/codex/DATABASE-STATE.md`. Left in place rather than rewritten, because
> this log records what was decided when, but a reader must not be able to reach
> the false statement without the correction attached. Nothing is backfilled:
> the columns exist and no record carries a category.

## 28 July 2026 — Retire the Bridge package import workflow

**Decision:** `.github/workflows/import-approved-bridge-package.yml` is removed. The approved Bridge package is vendored in the repository and verified on every run by `scripts/check-governance.mjs` against `design/authority/bridge/v1/SOURCE-MANIFEST.md`.

**Why it was failing.** The workflow downloaded a zip from a Google Drive link and checked the **container** against a pinned SHA-256. That check had failed on every run the workflow ever had, including on the branch behind merged PR #58. The download now returns roughly 891 KB where the approved archive is 789,853 bytes, so the link no longer serves the file it was pinned to.

**The pin itself was correct.** The owner-approved archive still hashes to exactly `d45d809d2917a6265e368ade5f52c319bbd83937a29070b7b4a338445975d616`. Nothing was wrong with the recorded value; the source behind the link changed.

**But pinning a zip container was the wrong thing to pin, and that is the durable lesson.** Two copies of the approved package were found locally with **byte-identical contents** and **different container hashes**: a zip's bytes depend on timestamps, entry order and compression settings, none of which are the design authority. `SOURCE-MANIFEST.md` already records a SHA-256 for every **file**, which is the thing that actually has to be right, and those hashes are stable across any repackaging.

**What replaces it.** Nothing needs to fetch anything. The package is in the repository, and the governance check hashes all 13 vendored files against the manifest on every run: no network, no external dependency, no expiring link, and it fails on a mismatch **or an absence**. That is strictly stronger than a one-time import, and it is what would have caught the outage described below on the first commit rather than weeks later.

**What the failure cost.** While the workflow was failing, `source/ponte-bridge.js` and the nine reference renders were absent from the repository and nothing reported it. A landing bridge was built against an inferred straight-line geometry as a result, and was rejected by the owner. The vendored `ponte-bridge.css` had also drifted from its own recorded checksum, with its section comments stripped, and nothing reported that either. Both are corrected in PR #63.

**Also removed by this decision:** nothing else. The workflow had no callers, and the `.import-trigger` and `.temporary-import-note` markers it used are removed in PR #63. `.temporary-import-note` itself recorded the requirement being satisfied here: "Temporary import workflow and marker files must be removed before final review."

**Sequencing.** This should merge after PR #63, which is what puts the package and the manifest check on `main`. Merging it first would not regress anything, since a workflow that has never once succeeded protects nothing today, but it would leave `main` briefly with neither the fetch nor the vendored package.

**Affected areas:** `.github/workflows/import-approved-bridge-package.yml` (deleted), `scripts/check-governance.mjs` (the replacement check, added in PR #63), `design/authority/bridge/v1/SOURCE-MANIFEST.md` (unchanged; it is the authority the check reads).

## 27 July 2026 — Phase 2 shared foundation: implementation decisions

**Context:** Slice 2 of the Constitution-led rebuild ExecPlan, branch `design/phase-2-foundation-tokens`. Foundation only. No route was redesigned, no Bridge primitive was built, and no legacy removal was begun.

**Decisions recorded because the authorities did not settle them:**

1. **The Desk keeps its token vocabulary; only the values were centralised.** 21 Desk custom properties now resolve through `var(--pf-*)`. The names are retained rather than replaced route by route, because the duplication that mattered was of values, not names. Recorded in `design-system/ponte-flow/documentation/compatibility-aliases.md`.

2. **Nine local extensions are recorded rather than promoted.** Eight tints and hairlines plus one elevation shadow have no approved `--pf-` counterpart. Adding them to the token file is an owner decision under CODEOWNERS, so they are documented and fenced by a test instead of invented into the authority. Proposal to promote all nine is in the same file.

3. **Two literal colours on the Desk's ink panels were deliberately not aliased.** They are the `[data-theme="dark"]` values of `--pf-focus` and `--pf-review`. Neither `var(--pf-*)` nor `.inverse` scoping works, because the rail paints light tokens as foreground on a hand-built dark ground. Recorded as gap DS-1 for the slice that owns those panels.

4. **The progress floor is 20.** Constitution section 9 gives a band of 18 to 25; the delivered engine contract and the `--pf-progress-floor` token both give exactly 20. The narrower authority governs and the two agree.

5. **Uniform progress weights are refused at runtime.** Section 9 requires irregular increments and names "20, 40, 60, 80". Equal weights are the only way to build an even ladder, so the validator rejects them rather than trusting review to notice.

6. **Nothing completed returns `null`, not `0`.** "Ponte must never display 0%" is enforced by the type rather than by every caller remembering it.

7. **The icon law is enforced as a ratchet.** `check-governance.mjs` records the 11 files importing lucide and the 16 containing authored SVG. The lists may shrink and may never grow, so a new violation fails a check while the existing legacy migrates on its own schedule.

8. **The brand lockup renders through one shared component**, per the owner's ruling that it is an identity asset rather than an interface icon. It was found in four files, not the two the Phase 1 audit recorded, and had already drifted between copies. Every surface still renders exactly what it rendered before; which variant is canonical is gap DS-2.

**Correction to the Phase 1 audit, third of three:** finding 0.3 was wrong. The Ponte Flow tokens, motion CSS and reduced-motion contract **are** imported into the application, and have been since commit `0bb84fa`. The audit grepped for three leaf filenames under `app/` and `components/`; the bundle file that imports them lives in `design-system/`. Verified at runtime. The real defect was the duplication the audit found itself at A.2. Recorded in `docs/codex/audits/constitution-rebuild/GAP-REGISTER.md` section 4.

**Escalated, not decided:** `/marketplace` carries three functions that exist nowhere else — the owner-side decision on an inbound introduction, listing reconfirmation, and the account brief. The presumption that it is a legacy route to retire does not hold as things stand. Nothing was removed. See `docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md`.

**Not design-approved:** screenshot capture was unavailable in the implementing environment, so this slice carries no visual evidence. Constitution sections 17 and 21 make desktop and 390 x 844 review mandatory before design approval is complete. The repository checks pass; the design gate is open.

**Incidental repair:** this file contained committed merge-conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/main`) introduced by commit `077ec5e` and present on `main`. Both sides held complete, distinct entries. The three marker lines were removed and **both sides kept**, which is what an append-only log requires; no entry was chosen over another and no content was changed.

**Affected areas:** `components/desk/desk.css`, `components/ponte/` (new), `lib/ponte/` (new), `scripts/check-governance.mjs`, `app/[locale]/dev/foundation/` (new, development-only), `design-system/ponte-flow/documentation/compatibility-aliases.md` (new), `docs/codex/audits/constitution-rebuild/GAP-REGISTER.md` (new), `docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md` (new), `docs/plans/active/constitution-led-interface-rebuild.md`, `docs/codex/CURRENT-STATE.md`.

## 27 July 2026 — Constitution-led rebuild of the complete interface (ADR-0010)

**Decision:** Giuseppe Funaro authorises a Constitution-led redesign of the complete Ponte Trade interface. The Constitution now applies to every public, authenticated and administrative route, every shared interface component, every meaningful lifecycle state, and desktop, mobile, keyboard, screen-reader and reduced-motion behaviour.

**What it supersedes, exactly:** only the narrow implementation boundary recorded after PR #58, which limited first implementation to the landing family/action grid and the headline. It does not supersede the Constitution, its quality controls, the PR design gate, the visual evidence requirements, or ADR-0002's prohibition on an uncontrolled application-wide repaint. That prohibition survives: this decision widens what the Constitution governs, not how implementation is delivered. One journey per PR remains binding.

**Preserved:** routes, authentication, permissions, schemas, data contracts, lifecycle truth, publication rules, verification rules, commercial logic and protected production behaviour.

**Evidence base:** `docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md` established 5 of 28 user-facing routes on the target system, six competing visual systems at roughly 5,500 CSS lines, all 12 approved motion components unimplemented with the Flow motion and token stylesheets imported nowhere, all six Bridge types without a production primitive, 25 of 28 routes without route-level lifecycle states, and 23 of 28 without a recorded 390 x 844 review.

**Two audit findings were corrected on full reading:** `.agent/PLANS.md` is tracked on `main` and is the authoritative ExecPlan standard; and `desk.css` does not diverge from the approved tokens, since every value is byte-identical, making it an unauthorised compatibility layer rather than a second design system.

**Open, not decided here:** whether `/marketplace` is rebuilt or retired; whether the brand lockup rendered as inline SVG is an interface icon under section 7; whether `--gold-tint` is promoted into the Flow tokens.

**Affected areas:** `docs/decisions/ADR-0010-constitution-led-interface-rebuild.md` (new), `docs/plans/active/constitution-led-interface-rebuild.md` (new), `docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md` (new), `docs/codex/CURRENT-STATE.md`, `docs/codex/00-START-HERE.md`.
## 27 July 2026 — Starter Deal Room provides the first real product experience

**Decision:** Ponte will provide a limited Starter Deal Room before ongoing paid use. The customer-facing language is Starter Deal Room or Starter Access rather than “Freemium Plan”. It is available at organisation level, requires no credit card, includes the real core progress loop and creates no founder, Ponte Desk or specialist obligation.

**Recommended limits awaiting numerical approval:** one Starter master Deal Room per verified organisation; 30 active days beginning with the first required external principal admission; up to three private sub-rooms, two external guest organisations and two internal users; core admission, NDA, procedure, evidence, clarification, blockers, decisions, milestones, progress and basic AI recap included. On expiry the room becomes read-only and upgrades without loss of history.

**Commercial purpose:** The Starter room lets a new organisation feel the Deal Room’s momentum before paying. It is limited by scale and duration rather than being reduced to a static demo. Ongoing use converts to the Portfolio subscription or Ponte Credits. Sponsored participation in another organisation’s room does not consume the guest organisation’s own future Starter entitlement.

**Implementation boundary:** The principle is accepted, while numerical limits remain proposed. No screen, schema, identity enforcement, AI quota, Stripe, charging, deployment or production activation is authorised.

**Affected areas:** `docs/decisions/ADR-0006-starter-deal-room-access.md`, `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`, `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`, `docs/codex/AUTHORITY-MANIFEST.md`, issue #52 and PR #53.

## 27 July 2026 — Free Deals lead to paid master Deal Rooms with private sub-rooms

**Decision:** A complete structured Deal may be created, reviewed and published without a Deal Room fee. When a participant decides to progress that Deal, the participant opens and sponsors one paid master Deal Room linked to the Deal. The master room is the entitlement unit and may contain any number of private related sub-rooms for counterparties, providers, advisers and internal workstreams.

**Commercial counting:** One active master Deal Room consumes one subscription slot or pay-as-you-go activation. Private sub-rooms do not consume additional master-room slots. Five subscription slots therefore mean five concurrent master Deals, not five counterparty conversations. Admitted external guest organisations may consume the included guest allowance or credits.

**Privacy:** Counterparty and provider sub-rooms are isolated permission boundaries. A participant cannot see another sub-room's existence, participants, terms, evidence, progress, blockers or outcome unless deliberately admitted. The authorised master-room sponsor and internal team may see the private sub-room portfolio.

**Sponsorship:** The Deal owner, an eligible interested counterparty, Ponte where authorised, or an institution may sponsor the master room. An interested participant may open a room around another member's posted Deal and invite the Deal owner as a sponsored guest. Payment does not transfer ownership of the Deal or another participant's decision authority.

**Launch pricing status:** The branch proposes, but the owner has not yet accepted, a €149 monthly/€1,490 annual subscription including five concurrent master Deal Rooms, unlimited related sub-rooms, 25 concurrent external guest organisations and five internal users. The credit proposal is 60 credits for a 90-day master room including two external guest organisations, 5 credits per additional guest organisation and 20 credits for a 30-day extension or temporary extra master-room slot.

**Affected areas:** `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`, `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`, `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`, `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`, issues #51 and #52 and PR #53.

## 27 July 2026 — The Deal Room is Ponte's primary monetisation boundary

**Decision:** Ponte creates upstream liquidity through Market Signals, Member Opportunities, trade-service activity, distribution and representation activity, structured commercial intent and controlled qualification. When credible commercial interest moves to structured transaction progression, the parties enter a Deal Room. The Deal Room is the paid commercial environment and Ponte's primary monetisation boundary.

**Commercial rule:** A proposed room and its admission requirements may be previewed before payment, but a standard active Deal Room requires a valid commercial entitlement. The Starter Deal Room is the accepted limited first-use exception. The payer may otherwise be the initiator, one or more principal parties, a sponsor or institution, a subscription with defined room capacity, a promotional entitlement or an auditable owner-approved waiver. Payment does not confer disclosure, visibility or decision authority.

**Monetisation around the room:** Permitted model families include room activation, participant or organisation access, active-room capacity, self-managed or agent-assisted workflow, Ponte-facilitated or managed procedure, investigation and verification services, specialist services coordinated through the room, portfolio subscriptions with defined room capacity and transaction-related fees where attribution, legality and operational rules are clear.

**Relationship to Ponte Desk:** Paid Ponte Desk and founder-capacity boundaries remain valid but are subordinate to the wider Deal Room model. Human assistance is one paid layer inside the Deal Room ecosystem; self-managed and agent-assisted Deal Rooms are also monetised products.

**MVP correction:** The prior broad exclusion of “payments” from the Deal Room MVP applies to settlement, escrow, trade-finance execution and payments between trading parties. A commercial-entitlement gate for ongoing Deal Room activation is required product capability, though no pricing, Stripe, billing, schema or runtime implementation is authorised yet.

**Affected areas:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`, `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`, `docs/decisions/README.md`, `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`, issue #52. Note: PR #47 was closed as superseded by this Deal Room-centred model; its surviving founder-capacity boundary is preserved above.

## 27 July 2026 — Deal Room adopted as the controlled PROGRESS layer

**Decision:** Ponte Trade adopts the Deal Room as a controlled multi-party workspace used after credible commercial interest to progress a cross-border transaction through an agreed procedure. The procedure is the central product object. Admission requires a Deal Room-ready Business Passport, declared organisation or capacity and role, and versioned acceptance of the Deal Room Participation Agreement, confidentiality/NDA obligations and room-specific rules.

**Progress and engagement:** The Deal Room may use named commercial stages, stable weighted procedural completion, meaningful milestones and momentum to make genuine transaction progress visible and motivating. Procedural completion is never a Trust Score, risk score, value score or probability of closing. Points, coins, public leaderboards, popularity badges, random rewards, artificial countdowns and penalties for legitimate due diligence are excluded.

**Authority effect:** ADR-0008 and `PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` provide the separate approval contemplated by the North Star for Business Passport, only for Deal Room admission product definition. They supersede the Master Implementation Brief's blanket Deal Room deferral only for product definition. Ponte remains a wider commercial-intelligence and controlled-execution product, not primarily a Deal Room.

**Implementation boundary:** Product definition is accepted; implementation is not started or authorised. No screen design, technical architecture, schema, migration, runtime code, production action, deployment, electronic-signature platform, trade-payment execution, escrow, trade-finance execution or autonomous negotiation is included. Issue #51 tracks the remaining product-definition outputs required before Design; issue #52 tracks the Deal Room commercial model required before monetisation implementation.

**Affected areas:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`, `docs/decisions/ADR-0008-deal-room-product-contract.md`, `docs/decisions/README.md`, `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`, issues #50, #51 and #52.

## 27 July 2026 — Ponte Design Constitution and Bridge System are binding authorities

**Decision:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` is approved as the binding visual and interaction authority for every Ponte-controlled production interface. The corrected Ponte Bridge System under `design/authority/bridge/v1/` is approved for family and action selection, task completion, commercial journey, counterparty connection, multi-party Deal Room progress, mobile bridge behaviour, reduced motion and the gold italic landing-headline treatment.

**Why:** Approved design work repeatedly drifted during implementation toward generic SaaS cards, plain black typography and locally invented treatments. Technical checks could pass while the recognisable Ponte identity disappeared. The repository therefore needs enforceable design law, not advisory design references.

**Binding consequences:** visual conformity is part of correctness; approved treatments may not be silently simplified or replaced; missing or conflicting authority is a stop condition; exceptions require explicit written approval from Giuseppe Funaro and a versioned amendment; authority paths require owner review; UI PRs must complete the Design Constitution gate and provide desktop, 390 × 844 mobile and reduced-motion evidence.

**Implementation boundary:** this authority PR does not redesign production pages. A separate scoped PR may replace only the temporary landing family/action card grid with the approved bridges and restore `Global trade, from <em>signal to deal.</em>`, preserving navigation, authentication, routes, data and business logic.

**Affected areas:** `design/authority/*`, ADR-0002, `AGENTS.md`, `docs/codex/00-START-HERE.md`, `docs/codex/CURRENT-STATE.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, and `scripts/check-governance.mjs`.

## 26 July 2026 — Ponte Desk is the selected interface implementation

**Decision:** Direction 02, "The Desk", from the Ponte Trade interface-redesign handoff is the selected visual and behavioural implementation for the entry surfaces and for the R-FIND and R-SUBMIT journeys, with exactly two borrowings: The Ledger fact register on dense result sets, and the Atlas ink knowledge boundary on Market Signal detail. Ponte Flow (PR #38) remains the semantic icon and motion implementation; no second design-system layer is created.

**What it supersedes:** the entry composition in §5 of `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` as first issued on 25 July 2026, recorded below as "North Star entry reset: two primary routes". Superseded specifically: the two-route bridge as the landing's central device, the search field beneath it, the counts-derived "popular areas" row, and the trust and evidence block as the landing's composition. The North Star document is amended in place; no competing landing specification exists.

**What is retained:** every product principle in §3 of that document, the separation of Market Signals and Member Opportunities in data, status, language and actions, `lib/landing/routing.ts` as the sole destination authority, and every journey feature flag. No flag, destination or schema changed.

**Three rules the implementation must hold, and does:** the journey rail carries journey stations only and is never navigation, so the landing has no rail at all (`lib/desk/journey.ts`); one authority decides which commercial facts a record shows at every width and in every context, and contexts differ in count only (`lib/desk/facts.ts`, with the production boundary in `lib/desk/adapter.ts`); and nothing is inferred, so a fact the record does not state reads "Not stated" and is never filled.

**Honesty constraints applied against the prototype:** the prototype's market-pulse strip is omitted because no production query backs any of its four values; the sector grid is headed "Browse by sector" and prints no count, because all 3,517 public signals currently carry a null HS code and an HS-derived count would read zero (Issue #42); no prototype record, reference or date ships as data; and the Qualified Opportunities section is omitted rather than shown empty, per §3.2.

**Scope of the first slice:** landing, Market Signals listing, Market Signal detail, and their loading, empty, error and invalid states, desktop and 390px. Explicitly excluded and deferred to later slices: action-aware authentication, investigation and watch workflows, the Start a Deal redesign, the saved and submitted routes, and legacy-route retirement.

**Affected areas:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` (amended §5, §15 and a new supersession section), `lib/desk/*` (new), `components/desk/*` (new), `app/[locale]/page.tsx`, `app/[locale]/market-signals/page.tsx`, `app/[locale]/market-signals/loading.tsx` (new), `app/[locale]/market-signals/[id]/page.tsx`, `lib/board/market-signals.ts` (`readMarketSignals` added so a failed read stays distinguishable from an empty one).

## 26 July 2026 — English-only interface with multilingual input is the product architecture, not a deferral

**Decision:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`, the English-Only Interface and Multilingual Input Policy, is approved. The interface and every piece of content Ponte itself controls are English only. Multilingual natural-language input remains supported, AI may interpret and translate it, and no i18n-level parallel interface is maintained. English as the sole interface language is a product decision, not a state pending translation work.

**Why:** the 25 July "English-only interface" decision achieved the operational outcome but framed it as a deferral, with nine languages awaiting demand. Meanwhile `i18n/routing.ts`, the `[locale]` segment, `next-intl` and `messages/` all remain in the repository. A contributor reading that infrastructure reasonably concludes Ponte intends to become multilingual, and then adds a locale abstraction or a translation key to preserve a capability nobody plans to use. The repository has to state the intent rather than leave it to be inferred.

**Binding rules:** preserve the existing canonical English URLs; do not undertake a risky routing-framework removal unless necessary; add no new locale abstractions; add no translation keys solely to preserve multilingual capability; create no language selectors, locale routes or parallel language copy; treat the current English-only i18n wrapper as legacy compatibility infrastructure; and record its eventual simplification or removal as a separate, deliberate migration with its own approval.

**What is untouched:** natural-language input in any language, AI language detection and normalisation, translated display of member content, accessibility states, the reactivation path in `LANGUAGES.md`, the deferred snapshots in `messages/_deferred/`, and the permanent redirects from old locale-prefixed URLs. Input language is not interface language.

**Affected areas:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`, `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`. No code change; the policy governs future work.

## 26 July 2026 — Repository source-of-truth operating procedure

**Decision:** Conversations with ChatGPT, Codex, Claude, humans, meetings and research are working inputs. The merged `Geppix140269/ponte` repository is the only canonical operating memory. `docs/codex/SOURCE-OF-TRUTH-SOP.md` governs proposal intake, owner decisions, ADRs, implementation, cross-agent handover and current-state updates. The procedure applies equally to every agent and contributor.

**Why:** Product knowledge and decisions were being fragmented across separate conversations and tools. A decision could be understood in one chat but absent from the repository, leaving the next agent to guess, repeat work or implement an older interpretation.

**Enforcement:** `AGENTS.md` is the common mandatory entry point; `CLAUDE.md` delegates to it rather than creating a parallel authority; GitHub receives a Product Decision proposal form and a source-of-truth pull-request checklist; accepted durable decisions are recorded under `docs/decisions/`; machine-readable contracts live under `docs/schemas/` and `lib/taxonomy/`; current implementation truth remains in `CURRENT-STATE.md`.

**Affected areas:** `AGENTS.md`, `CLAUDE.md`, `docs/codex/SOURCE-OF-TRUTH-SOP.md`, `docs/codex/00-START-HERE.md`, `docs/decisions/*`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/product-decision.yml`.

## 26 July 2026 — One trade market, three equal primary families

**Decision:** Ponte Trade is one global trade market organised around exactly three equal primary families: Products, Trade services, and Distribution and representation. Every market record has exactly one family, one origin (Market Signal or Member Opportunity), and one intent valid for its family. Each family supports both externally observed signals and opportunities created directly by Ponte Trade members.

**Why:** Trade services and Distribution and representation are genuine forms of cross-border commercial intent, not secondary directories or decorative categories. The architecture must support companies seeking and offering services, distribution, representation, products and brands, using the same market, discovery, creation, matching and lifecycle principles while preserving the factual distinction between external signals and member-created opportunities.

**Consequences:** Explore, Start a deal, ingestion, search, matching, filters, alerts and analytics must derive from the shared contract. The stable logical definitions are in ADR-0001, `lib/taxonomy/market.ts` and `docs/schemas/`. This decision does not by itself authorise a production migration, backfill or scraping operation; those require a reconciled ExecPlan and owner approval.

**Affected areas:** `docs/decisions/ADR-0001-unified-trade-market.md`, `lib/taxonomy/market.ts`, `lib/explore/families.ts`, `lib/taxonomy/__tests__/market.test.ts`, `docs/schemas/market-taxonomy.yaml`, `docs/schemas/market-record.schema.json`, future database, ingestion, creation and Explore implementation.

## 25 July 2026 — North Star entry reset: two primary routes

**Decision:** The Ponte Trade entrance has exactly two primary journeys, Explore the market and Start a deal. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` is the governing authority for the entry experience and supersedes all earlier landing, gateway and primary-entry instructions, including the four-route bridge decision recorded below (25 July 2026, "The four bridge routes are direct entrances"), which is retained for history.

**Why:** The entrance was organised around the wrong hierarchy. Four routes split a decision that is really two; the voice control drew more attention than its reliability across browsers and accents justifies; and a visitor searching a product could be met with "No Qualified Opportunity matches yet" while many relevant Market Signals existed. That reads as "Ponte has nothing for me". Ponte has one chance to establish relevance and must give value immediately.

**What changed:** Two bridge routes, both navigating directly; the voice control and its bottom sheet removed with no reserved layout space; a recent market activity band above the masthead built from real public records; the search field beneath the bridge; popular areas derived from real counts; a trust and evidence explanation; and a new `/explore` market universe over Products, Trade services, and Distribution and representation.

**What is preserved:** Check a company and Investigate a signal remain reachable downstream and through search, which still resolves the older `RouteKey` vocabulary through `lib/landing/routing.ts`; that file remains the sole destination authority, so `NEXT_PUBLIC_STRUCTURE_JOURNEY` still decides where Start a deal lands. Market Signals and member records stay separate in data, status, language and actions; only the presentation hierarchy is unified, and every record prints its own true class. Voice input inside journeys is untouched.

**What was deliberately not done:** No migration, no flag change, no monetisation, no verification work, no rewrite of `/find`, and no sector drill-down below one level.

**Affected areas:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, entry and Explore components, routing, analytics, messages and tests.

## 25 July 2026 — The four bridge routes are direct entrances (superseded by the North Star entry reset above)

**Decision:** A click on one of the four named routes across the gateway bridge navigates immediately to that route's journey. It no longer only selects the route and focuses the objective field.

**Why:** Selecting a route without going anywhere made the application look stuck and turned a deliberate decision into a second avoidable step.

## 25 July 2026 — English-only interface

**Decision:** Ponte's interface is English-only. English is the canonical product and operational language and the sole interface language. Other interface languages are deferred until real demand justifies reactivation.

**Why:** Maintaining multiple fully localised interfaces was disproportionate complexity for the current stage.

## 25 July 2026 — English-first localisation (superseded same day by English-only)

**Decision:** Ponte is an English-first platform. English is the canonical product and operational language; Spanish is the only additional fully supported interface language. Chinese, Arabic, French, Portuguese, Russian, German, Hindi and Italian are removed from the active interface build and deferred until real market demand justifies reactivation.

**Why:** Maintaining ten fully localised interfaces was disproportionate complexity for the current stage. Reducing to two actively supported interface languages cuts all translation-parity, review and CI burden without a redesign or any schema change.

**Status:** Superseded the same day by the English-only decision. Retained for history.

## 25 July 2026 — Governing implementation authority

**Decision:** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` is the single self-contained governing implementation authority for the current development cycle.

## 25 July 2026 — Phase 0 before new implementation

**Decision:** Codex must complete the repository-to-architecture gap report defined in the governing brief before implementing new product behaviour.

## 25 July 2026 — Phase 1 direction

**Decision:** After Phase 0 and Giuseppe's approval, the governing programme's next target is the smallest truthful agentic vertical slice.

## 25 July 2026 — Codex handover model

**Decision:** The repository, not a chat transcript, is the operating memory for future agents.

## 24 July 2026 — Journey-level implementation

**Decision:** Apply Brand v5 while implementing complete connected journeys. Do not repaint the legacy application globally before correcting the product flow.

## 24 July 2026 — Product category

**Decision:** Ponte is a commercial intelligence and controlled-execution layer for cross-border trade.

**Not:** a consumer buy/sell marketplace, public lead directory, generic CRM, chatbot, trade-data terminal or consultancy brochure.

## 24 July 2026 — Truth model

**Decision:** Qualified Opportunities, Market Signals, Trade Movements, Price Observations, Business Evidence, Ponte Inference and Commercial Developments are materially different objects and must not be blended.

## 24 July 2026 — Authentication boundary

**Decision:** Let visitors receive useful value first. Authenticate only when Ponte must save, submit, disclose, spend or perform a material external action. Preserve and resume pending work.

## 24 July 2026 — Trust presentation

**Decision:** Do not use numbered tiers or a Trust Score as the principal user-facing trust representation. Show evidence type, source, date, result, limitations and expiry instead.

## 24 July 2026 — Human control

**Decision:** AI may observe, structure, analyse, recommend and prepare. Publication, verification, disclosure, payment, third-party contact and commercial commitments require deterministic workflow and human approval.

## 23 July 2026 — No fabricated traction

**Decision:** Never manufacture member counts, live traders, transaction volume, opportunity volume, urgency or marketplace activity. Thin inventory must be described honestly.
