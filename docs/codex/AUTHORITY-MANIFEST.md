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
| 1c | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` | Ponte Trade Deal Room Monetisation Policy | **Accepted 27 July 2026; effective on merge.** The master Deal Room is Ponte's primary paid commercial environment, with one limited Starter-access exception. |
| 1d | `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` | Ponte Trade Deal-to-Room and Sub-Room Model | **Accepted 27 July 2026; effective on merge.** One master Deal Room corresponds to one Deal and may contain private related sub-rooms. |
| 1e | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` | Ponte Trade Starter Deal Room Access | **Starter principle accepted; limits proposed.** One verified organisation may experience one real limited Deal Room before ongoing paid use. |
| 1f | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` | Ponte Trade Deal Room Launch Model v2 | **Proposed for owner approval.** Consolidates Free Market Access, Starter Deal Room, Portfolio subscription and Ponte Credits. |
| 1g | `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` | Ponte Trade Deal Room Launch Pricing and Entitlement Model v1 | Earlier proposal without Starter Access; retained for traceability. |
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

The Master Implementation Brief governs where later accepted authorities do not restate the decision. Later accepted Market Discoverability, Deal Room, monetisation, master-room, Starter Access and Deal Passport authorities govern within their scopes. Verified live technical and legal constraints must still be reported before changing direction.

The proposed launch-model authority does not become binding until owner approval. Its existence on a branch is not implementation status and does not authorise charging.

## Import integrity

The imported Master Implementation Brief Git blob SHA is:

`0e1fe614ca0151a7ff009828ed5db439393989ab`
