# Authority manifest

The governing product authorities are present in the repository. They are the
required sources for audits and the current development cycle.

## Product and experience authorities

| Priority | Target path | Source title | Status |
|---:|---|---|---|
| 0 | `docs/decisions/ADR-*.md` | Later owner-accepted decisions that explicitly supersede a named earlier decision | Binding within their stated scope after merge; not implementation status. |
| 1 | `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` | Ponte Trade North Star Reset, entry architecture | **Current authority for the entry experience, amended 26 July 2026.** |
| 1a | `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` | English-Only Interface and Multilingual Input Policy | **Approved 26 July 2026.** |
| 1b | `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` | Ponte Trade Deal Room Product Contract v1 | **Accepted 27 July 2026; effective on merge.** Governs the downstream Deal Room PROGRESS layer. |
| 1b-i | `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` | Deal Room Transaction Infrastructure Pricing Authority (short reference: **Deal Room-Only Pricing Authority**) | **Accepted 31 July 2026 by the owner; recorded by ADR-0020.** The governing commercial authority. Ponte Deal Room is the only paid product: **$79 USD for 30 active days**, five concurrently active private principal-counterparty Deal Branches included, **$15 USD** per additional concurrent branch, capped at **$199 USD** per Master Deal Room per 30-day period, **USD only**, five languages included. Supersedes rows 1c, 1e, 1f and 1g within their commercial scope. **Delivered by PR #155 and not yet on `main`** — until #155 merges this row points forward to an accepted decision that is not yet repository authority. **Nothing is implemented.** |
| 1c | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` | Ponte Trade Deal Room Monetisation Policy | **Superseded within its commercial scope on 31 July 2026** by row 1b-i / ADR-0020. Its free-upstream, no-authority-from-payment and no-deletion-on-lapse principles survive; Starter access, Portfolio subscriptions, Ponte Credits, paid verification, Ponte Desk packages, retainers, success fees and commissions do not. Preserved as history. |
| 1d | `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` | Ponte Trade Deal-to-Room and Sub-Room Model | **Accepted 27 July 2026; effective on merge.** One master Deal Room corresponds to one Deal and may contain private related sub-rooms. |
| 1e | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` | Ponte Trade Starter Deal Room Access | **Superseded 31 July 2026** by row 1b-i / ADR-0020. **There is no Starter Deal Room.** The pre-activation journey is free for everyone instead. Preserved as history. |
| 1f | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` | Ponte Trade Deal Room Launch Model v2 | **Superseded 31 July 2026** by row 1b-i / ADR-0020, having never been approved. The four-level ladder is retired. Preserved as history. |
| 1g | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` | Ponte Trade Deal Room Launch Pricing and Entitlement Model v1 | **Superseded 31 July 2026** by row 1b-i / ADR-0020, having never been approved. Every euro price, subscription and credit pack in it is retired. Preserved as history. |
| 1h | `docs/ponte-authority/PT-PRODUCT-2026-07-27-03-DEAL-PASSPORT.md` | Ponte Trade Deal Passport | **Accepted 27 July 2026; effective on merge.** Defines the evidence-backed transaction-history layer derived from Deal Rooms, distinct from the Business Passport and without a generic Trust Score. |
| 1i | `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md` | Complete Market Discoverability and Category-First Journeys | **Accepted 28 July 2026; effective on merge.** Every eligible Market Signal must be discoverable, and Trade Services and Distribution must begin with structured categories rather than generic free text. |
| 2 | `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` | Ponte Trade Master Implementation Brief v1 | **Imported and byte-verified on 25 July 2026.** |
| 3 | `docs/ponte-authority/01-MASTER-PRODUCT-ARCHITECTURE-V3.md` | Master Product, Experience and Agentic Architecture v3 | Optional supporting import |
| 4 | `docs/ponte-authority/02-FINAL-BRAND-SYSTEM.md` | Final Brand System and Product-Design Handoff / Brand Book v5 authority | Optional supporting import |
| 5 | `docs/ponte-authority/03-MESSAGING-AND-SCREEN-COPY.md` | Messaging and Screen Copy Pack | Optional supporting import |
| 6 | `docs/ponte-authority/04-DEFINITIVE-LAUNCH-ENGINEERING-BRIEF.md` | Definitive August 1 Claude Code Brief | Optional supporting import |
| 7 | `docs/ponte-authority/05-END-TO-END-BLUEPRINT.md` | End-to-End Process and Experience Blueprint | Optional supporting import |
| 8 | `docs/ponte-authority/06-EXPERIENCE-ARCHITECTURE-V2.md` | Experience Architecture and Emotional Design Blueprint v2 | Optional supporting import |
| 9 | `docs/ponte-authority/07-MASTER-ROUTE-ATLAS.md` | Master Route Atlas and Screen Register v1 | Optional supporting import |
| 10 | `docs/ponte-authority/08-MASTER-FLOW-REGISTER.md` | Ponte Trade Master Flow Register | Optional supporting import |

## Governance and operating records

| Path | Purpose |
|---|---|
| `AGENTS.md` | Common mandatory instructions for all agents and contributors. |
| `CLAUDE.md` | Claude entry point that delegates to the common instructions. |
| `docs/codex/SOURCE-OF-TRUTH-SOP.md` | Procedure for proposal intake, owner decisions, ADRs, implementation and cross-agent handover. |
| `docs/codex/00-START-HERE.md` | Authority order and required reading path. |
| `docs/codex/DECISION-LOG.md` | Chronological owner-decision and supersession index. |
| `docs/codex/CURRENT-STATE.md` | Implementation, deployment and production-verification truth. |
| `lib/taxonomy/*` and `docs/schemas/*` | Shared machine-readable and code-level contracts implementing accepted decisions. |

The SOP governs process, not product meaning. GitHub Issues remain proposal and backlog records until accepted decisions are written into canonical records.

## Governing rule

The Master Implementation Brief governs where later accepted authorities do not restate the decision. Later accepted Market Discoverability, Deal Room, monetisation, master-room and Deal Passport authorities govern within their scopes. Verified live technical and legal constraints must still be reported before changing direction.

**On commercial questions, row 1b-i governs.** The Deal Room-Only Pricing
Authority is the single answer to "what does Ponte charge for, and how much?".
Where rows 1c, 1e, 1f or 1g say anything different, they are history. Do not
implement a Starter room, a Portfolio subscription, a credit pack, a paid
verification, a Ponte Desk package, a retainer, a success fee, a commission, a
percentage of transaction value or a euro Deal Room price from any document in
this repository.

Recording the pricing authority is **not** implementation status and does **not**
authorise charging. Nothing in the pricing model is built, and no production
charge can be made until every gate in authority §20 and §21 has separate owner
approval.

## Import integrity

The imported Master Implementation Brief Git blob SHA is:

`0e1fe614ca0151a7ff009828ed5db439393989ab`
