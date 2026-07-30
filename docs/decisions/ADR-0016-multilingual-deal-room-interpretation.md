# ADR-0016 — Multilingual Deal Room interpretation is a launch requirement

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 30 July 2026
- **Owner:** Giuseppe Funaro
- **Amends:** ADR-0009's definition of a launch-usable Deal Room
- **Related proposal:** GitHub issue #109
- **Launch classification:** LB-009
- **Does not supersede:** the English-only general interface policy in `AGENTS.md` and `LANGUAGES.md`

## Context

Ponte Trade is a cross-border commercial intelligence and controlled-execution product. The Deal Room is the point at which participants move from observed interest into protected discussion, procedure agreement, document exchange, term clarification and commercial progression.

A Deal Room that requires every participant to negotiate in English excludes otherwise credible counterparties and creates a material risk that commercially important meaning is lost, simplified or misunderstood. Automatic message translation alone does not solve that problem. It can hide ambiguity, overwrite evidential source language and give participants false confidence that two differently worded positions are equivalent.

The product owner has decided that multilingual Deal Room participation is required from day one. It is not a later convenience and not dependent on completing full-site localisation.

## Decision

> The launch-usable Ponte Deal Room must allow supported-language participants to communicate in their own language while Ponte preserves the original evidence, presents a participant-specific translation, interprets proposed commercial meaning into one canonical deal state and requires confirmation before that interpretation changes the deal.

The initial supported Deal Room language set is:

- English;
- Spanish;
- Russian;
- Simplified Chinese (`zh-CN`);
- Modern Standard Arabic (`ar`).

English remains the canonical language for database objects, workflow states, permissions, schemas, internal operations and the language-independent structured deal record. This ADR does not reactivate a general Spanish, Russian, Chinese or Arabic site interface.

## Product contract

### 1. Original language remains evidence

Every multilingual Deal Room message or participant-authored commercial statement must retain:

- the exact original text;
- the detected or declared source language;
- the author and room or sub-room identity;
- the creation timestamp;
- the translation status and target language;
- sufficient translation provenance to reproduce or explain the displayed result.

A translation must never replace or mutate the original. Every translated display must offer access to the original text.

### 2. Translation is participant-specific presentation

Participants may read the same authorised message in their own preferred supported language. A translated representation is a derived view of the original message, not a second message and not a new commercial commitment.

Translation storage, caching, notifications, summaries and AI context must obey the same room membership and sub-room isolation rules as the source material. No translation service may receive content that the requesting participant is not authorised to read.

### 3. Ponte interprets commercial meaning, not only words

Ponte may propose structured facts from multilingual discussion, including product or service, specification, quantity, unit, frequency, price basis, currency, Incoterm, location, delivery period, documentation, payment condition, exclusivity, territory, unresolved question and party position.

The interpretation is a proposal. It must not silently alter the canonical deal state, mark a term accepted, resolve a disagreement or advance the Deal Room procedure.

A participant with the relevant authority must confirm or reject a proposed structured change. Where the parties state different positions, Ponte preserves both and identifies the disagreement rather than merging them into a false consensus.

### 4. Ambiguity must be visible

The experience must distinguish:

- translated successfully;
- translation pending;
- translation failed;
- source language uncertain;
- commercially ambiguous wording;
- interpretation requiring confirmation;
- participant-corrected translation or meaning.

Low-confidence or materially ambiguous interpretation must not be presented as settled meaning. The product should ask a concrete clarification question where the ambiguity affects a commercial fact or decision.

### 5. Standard trade language is controlled

HS codes, Incoterms, currency codes, units, container codes, company names, listing references and other internationally standard identifiers are preserved rather than creatively translated. Ponte language glossaries govern supported trade terminology and known false friends.

Automatically translated content is not described as certified translation, legal advice, an electronic signature or a governing translated contract. Legal originals remain governed by the existing English-language policy unless a separately approved professional translation process is adopted.

## Launch-blocker boundary

LB-009 is removed only when a real invited participant can complete this minimum cross-language loop:

1. set or have a supported preferred Deal Room language;
2. author a message in that language;
3. allow another authorised participant with a different preferred language to read a translated representation;
4. inspect the original text;
5. receive a visibly failed or ambiguous state rather than a fabricated translation when the system cannot translate safely;
6. have Ponte propose at least one structured commercial fact from the discussion;
7. confirm or reject that proposal before the canonical deal state changes;
8. see the resulting audit evidence and deal state consistently after resume.

The loop must work within the existing Deal Room admission, agreement, participant, sub-room and RLS boundaries. Arabic message presentation must support right-to-left text and mixed Arabic/Latin commercial identifiers without corrupting codes, quantities or reading order.

## Explicit exclusions from LB-009

The following remain separate work unless independently promoted:

- full-site interface localisation;
- locale-prefixed public routes and general language switching;
- translated SEO programmes and localised acquisition pages;
- translated admin interfaces;
- certified or governing legal-document translation;
- every possible language or country-specific Arabic variant;
- automatic acceptance of AI-extracted terms;
- replacement of the canonical English domain and workflow model.

## Consequences

- A launch-usable Deal Room now requires a multilingual message, translation and interpretation contract in addition to the progression loop in ADR-0009.
- The implementation spans data, permissions, AI services, UI states, notifications, audit evidence and supported-language testing, so it requires the active ExecPlan at `docs/plans/active/multilingual-deal-room-launch.md`.
- Any production migration, new external translation provider, secret, feature flag, deployment or production activation remains a separate owner gate.
- General interface localisation remains demand-led and must not delay the minimum Deal Room cross-language loop beyond the scope accepted here.

## Verification

Closure evidence must include:

- access-control tests proving translated and derived content cannot cross room or sub-room boundaries;
- original-text immutability and translation-provenance tests;
- confirmation-gate tests proving interpretation cannot change canonical terms silently;
- failure and ambiguity-state tests;
- English, Spanish, Russian, Simplified Chinese and Arabic fixtures;
- mixed RTL/LTR rendering evidence at 390 × 844 and desktop;
- resume and audit-trail verification;
- `npm run verify`, with any pre-existing repository failure recorded separately;
- production acceptance evidence after separately authorised activation.

No implementation, migration, provider selection, secret, feature flag, deployment or production action is authorised merely by this ADR.
