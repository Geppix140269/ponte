# Authority manifest

The governing product authorities are present in the repository. They are the
required sources for audits and the current development cycle.

## Product and experience authorities

| Priority | Target path | Source title | Status |
|---:|---|---|---|
| 0 | `docs/decisions/ADR-*.md` | Later owner-accepted decisions that explicitly supersede a named earlier decision | Binding within their stated scope after merge; not implementation status. |
| 1 | `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` | Ponte Trade North Star Reset, entry architecture | **Current authority for the entry experience, amended 26 July 2026.** Supersedes all earlier landing, gateway and primary-entry instructions in every document below. The 26 July amendment records Ponte Desk as the selected visual and behavioural implementation and rewrites section 5. |
| 1a | `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` | English-Only Interface and Multilingual Input Policy | **Approved 26 July 2026.** Interface and Ponte-controlled content are English only; multilingual input remains supported and may be interpreted and translated by AI; no parallel i18n interface is maintained. The `next-intl` and `[locale]` structure is legacy compatibility infrastructure, not future architecture. |
| 1b | `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` | Ponte Trade Deal Room Product Contract v1 | **Accepted 27 July 2026; effective on merge.** Governs the downstream Deal Room PROGRESS layer. Product definition only: no Design, code, schema, migration or production action is authorised. Within scope, ADR-0003 supplies separate Business Passport approval for Deal Room admission and supersedes the blanket Deal Room deferral. |
| 2 | `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` | Ponte Trade Master Implementation Brief v1 | **Imported and byte-verified on 25 July 2026.** Governs everything downstream of entry that the North Star and later accepted ADRs or product authorities do not restate. |
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

The SOP governs how product authority changes; it is not itself a product-design
authority. GitHub Issues remain proposal and backlog records until an owner
accepts a decision and the canonical records are updated.

## Governing rule

The Master Implementation Brief states that it is the single self-contained authority and that Codex must not assume any other document is available. It therefore governs when it conflicts with older material, except where the North Star entry authority, the Deal Room Product Contract within its scope, or a later accepted ADR explicitly supersedes a named decision, or where a verified live technical or legal constraint is discovered and reported.

The supporting source documents may be imported later for traceability and deeper reference. Their absence does not block the Phase 0 audit.

## Import integrity

The imported Master Implementation Brief was copied without rewriting. Its Git blob SHA is:

`0e1fe614ca0151a7ff009828ed5db439393989ab`

This matches the Git blob SHA calculated from the user-supplied Markdown file before import.
