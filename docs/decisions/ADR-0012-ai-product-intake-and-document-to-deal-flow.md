# ADR-0002 — AI product intake and document-to-deal flow

- **Status:** Owner approved; implementation pending
- **Date:** 2026-07-28
- **Decision owner:** Giuseppe Funaro
- **Scope:** Product-family Start a Deal flows for both supply offers and sourcing requirements
- **Authority:** This ADR is binding once merged to `main`. It must be implemented under the authority order in `AGENTS.md`, including the North Star Entry Architecture, Master Implementation Brief and Ponte Design Constitution.

## Owner authorisation

Giuseppe Funaro authorises the replacement of the current product-selection entry with the product-intelligence flow defined below.

This applies whenever a user chooses either:

1. **Offer a product** / create a supply offer; or
2. **Receive offers for a product** / create a sourcing requirement.

The present behaviour, in which users are expected to find an exact catalogue label or know an HS classification before Ponte can understand the product, is rejected.

## Decision

Users describe or upload what they trade. Ponte identifies, structures and classifies it. Users must not be blocked because they do not know Ponte's taxonomy, the exact catalogue wording or an HS code.

The product intake must support three entry methods in this order:

1. **Describe the product naturally** — typed or spoken in any language.
2. **Upload a trade document** — including PDF, Word, spreadsheet, image, email export, ICPO, SCO, FCO, LOI, specification sheet or similar offer/requirement document.
3. **Browse product categories** — retained for users who prefer manual navigation.

Category browsing is not the default route. HS classification is not an entry prerequisite.

## Required behaviour

### A. Natural-language product resolution

The product entry must use semantic product resolution rather than exact keyword matching.

For example, terms such as `gas oil`, `gasoil`, `EN590`, `EN 590`, `ULSD`, `10 ppm diesel`, `automotive gasoil` and similar commercial expressions must resolve to the same relevant product family when context supports that interpretation.

The resolver must return ranked candidate products rather than failing silently. Each candidate must include:

- normalised Ponte product name;
- synonyms and commercial terminology;
- category path;
- key distinguishing attributes;
- confidence or explanatory rationale;
- a route to confirm, refine or choose another product.

Ambiguity must produce a clarification state, not an empty result.

### B. Document-to-deal extraction

When a document is uploaded, Ponte must:

1. detect whether it contains one product or multiple products;
2. extract commercial intent: offer to supply or requirement to source;
3. identify and normalise each product independently;
4. extract relevant structured terms, including where present:
   - product name and specification;
   - grade, standard and technical attributes;
   - quantity and unit;
   - recurrence or delivery schedule;
   - origin;
   - destination;
   - Incoterm;
   - pricing basis;
   - payment structure;
   - contract term;
   - availability and validity dates;
   - named counterparties and signatories;
5. distinguish extracted claims from verified facts;
6. present a review screen before any listing is created or published.

If several products are found, Ponte must recommend separate product records because each product may have different buyers, specifications, customs classifications and search demand. The user may instead choose a combined multi-product programme when commercially intentional.

### C. Example acceptance case

The EnerGiants document reviewed on 2026-07-28 contains three separate products:

- Gasoil 10 ppm / ULSD / EN 590;
- D6 Virgin Fuel Oil / residual or heavy fuel oil;
- Jet A-1 aviation fuel.

The correct outcome is not one generic `gas oil` record. Ponte must identify the three products, extract the shared and product-specific commercial terms, and ask whether to create three offers or one multi-product supply programme.

### D. Structured product model

Each resolved product must preserve at least these layers:

- original user wording;
- normalised Ponte product;
- synonyms and trade terminology;
- Ponte category hierarchy;
- technical attributes;
- candidate customs classification, where available;
- search representation for semantic and lexical retrieval.

The HS code is a suggested downstream classification subject to confirmation. It must not block product intake unless a later compliance action genuinely requires confirmation.

### E. Human control and publication boundary

AI may extract, structure, compare, explain and recommend. It must not silently:

- publish the opportunity;
- assert verification;
- select a product when material ambiguity remains;
- invent missing commercial terms;
- make a commercial commitment.

The review state must visually distinguish:

- extracted from the uploaded document;
- confirmed by the member;
- verified by Ponte;
- missing or unresolved.

The original document must remain attached as supporting evidence, subject to access and privacy controls.

## Required journey

The same intake architecture applies to both product intents:

### Offer a product

`Start a Deal → Products → Offer a product → Describe / Upload / Browse → AI product resolution → Review extracted product and terms → Confirm or edit → Create draft offer`

### Receive offers for a product

`Start a Deal → Products → Receive offers → Describe / Upload / Browse → AI product resolution → Review requirement and terms → Confirm or edit → Create draft requirement`

After intent selection, the interface may adapt language and required fields, but product identification must use one shared resolver and taxonomy.

## Design Constitution — mandatory implementation rules

This journey is a Ponte Flow and must comply with `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` and approved assets under `design/authority/` and `design-system/ponte-flow/`.

Non-negotiable implementation requirements:

- use the approved Bridge System; do not substitute generic cards, tabs or a generic stepper;
- use only approved Ponte tokens, components, icons and motion;
- preserve approved arches, flows, transitions, progress and reward motion;
- do not introduce page-specific colours, fonts, icons, radii, shadows or animation;
- preserve approved gold italic editorial emphasis where the authority requires it;
- do not create raw interface SVGs outside the Ponte Flow registry;
- design and approve mobile at 390 × 844 before desktop approval;
- include reduced-motion behaviour;
- provide loading, analysing, ambiguous, incomplete, error, blocked, resumed and completed states;
- attach visual evidence and complete the PR Design Constitution check.

Functional correctness does not override design correctness.

## Engineering and implementation requirements

Before coding, the developer must inspect the existing product flow, product taxonomy, AI services, document-upload services and lifecycle gates. Reuse proven services where appropriate; do not bolt a disconnected demo flow onto the application.

The implementation PR must update, as applicable:

- `docs/codex/CURRENT-STATE.md`;
- `docs/codex/DECISION-LOG.md`;
- this ADR if implementation discoveries require clarification;
- relevant contracts under `docs/schemas/`;
- relevant taxonomy and normalisation code under `lib/taxonomy/`;
- the active ExecPlan, because this work spans multiple states, services and routes.

No production migration, feature-flag change or merge is authorised by this ADR alone. Those actions remain subject to the stop conditions in `AGENTS.md`.

## Minimum acceptance criteria

1. Entering `gas oil` never produces a silent no-op.
2. The user receives ranked, relevant candidates that include EN 590 / ULSD where context supports it.
3. Uploading a document containing EN 590, D6 and Jet A-1 identifies three products.
4. The user can create separate product drafts or an intentional multi-product programme.
5. Both supply-offer and sourcing-requirement journeys use the same product resolver.
6. No HS code is required before Ponte has understood the product.
7. Extracted claims are not represented as Ponte-verified facts.
8. The user reviews and confirms all material fields before draft creation or publication.
9. The implementation uses the approved Bridge/Flow design system and passes the Design Constitution review.
10. Mobile, reduced-motion, ambiguity, upload failure, extraction failure, resume and completion states are demonstrated.
11. Existing service/distribution category rules remain unchanged; this ADR governs the Products family only.
12. `npm run verify` passes, or any environmental failure is recorded separately with evidence.

## Rejected approach

The following approach is explicitly rejected:

- exact catalogue lookup as the primary product-identification method;
- forcing users to navigate categories before they can describe the product;
- requiring an HS code at the beginning of the journey;
- treating an uploaded multi-product document as one generic listing;
- silently accepting the first AI guess;
- using generic UI cards or steppers instead of the approved Ponte Bridge/Flow system.
