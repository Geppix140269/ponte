# Decision log

Newest entries should be added at the top with date, decision, rationale and affected areas.

## 28 July 2026 — Complete Market Signal discoverability and category-first non-product journeys (ADR-0011)

**Decision:** Every approved, unexpired and anonymised public Market Signal must be discoverable through search, filtering, hierarchical browsing or pagination. The current 60-record read may remain a page size but must not be presented as the total inventory or remain a terminal access cap. The approximately 160 newly supplied records must be reconciled through the existing identity, provenance, deduplication, privacy, approval and expiry rules; exact totals must be reported from the database rather than calculated as a hard-coded addition.

**Search and classification:** Market Signals listing, Find and taxonomy browsing must use one server-side query contract across the complete eligible inventory. It must support accurate totals, keyword search, product hierarchy, commercial side, geography, date, stable URL state, filters, sorting and pagination. Unclassified records remain discoverable and must not receive fabricated HS classifications.

**Category-first creation and Find:** Products retain their structured product-classification journey. Trade services and Distribution and representation must begin with clickable canonical categories, not a generic blank one-line text field. Free text appears only after Other or as later optional context. Find, Explore, Start a Deal, storage, filtering, analytics and future matching must use the same stable taxonomy keys.

**Distribution correction:** Partner or channel type, product/sector attachment, territory and relationship structure are separate concepts. Distributor, agent and broker are partner types; Exclusive and Non-exclusive are relationship terms. Existing values require explicit compatibility mapping rather than silent reinterpretation.

**Implementation boundary:** Giuseppe issued the combined development brief to Claude Code on 28 July 2026. The product decision and implementation scope are accepted. At this record point no implementation branch, import result, schema migration, deployment or production verification for this scope has been evidenced. Applying a production migration, deploying or merging remains subject to the stop conditions in `AGENTS.md`.

**Affected areas:** `docs/decisions/ADR-0011-complete-market-discoverability-and-category-first-journeys.md`, `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`, Market Signals listing and detail, Find, Structure/Start a Deal, `lib/taxonomy/market.ts`, public query projections, database indexes and optional additive schema work, import reconciliation, SEO and URL-state behaviour, `docs/codex/CURRENT-STATE.md`.

## 28 July 2026 — Category-first classification for Trade services and Distribution

**Context:** Owner requirement of 28 July 2026, implemented on branch
`feature/category-first-market-taxonomy` and proposed as ADR-0012, which implements the owner-accepted ADR-0011. Trade
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

**Not applied:** `supabase/migrations/20260728a_market_classification.sql` is
written and reviewed and has **not** been run. A merge applies no migration in
this repository. The write path tolerates the columns being absent and retries
without them, and the classification still reaches the record through the
synthesised `details`.

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
