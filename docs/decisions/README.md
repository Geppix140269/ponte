# Ponte Trade architecture decision records

Architecture Decision Records (ADRs) preserve durable product and technical
decisions, their rationale, alternatives and consequences.

## Status values

- **Proposed** — awaiting owner decision.
- **Accepted** — approved and binding after merge to `main`.
- **Deferred** — intentionally postponed.
- **Rejected** — deliberately not adopted.
- **Superseded** — replaced by a later accepted ADR.

## Rules

1. Use an ADR when a decision changes the domain model, authority hierarchy,
   lifecycle, permissions, privacy, routes, system boundaries, production data
   contract or a principle that future contributors might otherwise reopen.
2. Record the owner decision and date.
3. Update the ADR rather than erasing history. A replacement ADR must identify
   what it supersedes.
4. Update `docs/codex/DECISION-LOG.md`, affected authorities, schemas and
   `docs/codex/CURRENT-STATE.md` in the same pull request.
5. An ADR is not proof that its implementation is complete or deployed.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-0001](ADR-0001-unified-trade-market.md) | Unified trade market with three primary families | Accepted by owner; effective on merge |
| [ADR-0002](ADR-0002-ponte-design-constitution.md) | Binding Ponte Design Constitution and Bridge System authority | Accepted by owner; effective on merge |
| [ADR-0003](ADR-0003-deal-room-product-contract.md) | Deal Room as the controlled PROGRESS layer | Accepted by owner; effective on merge |
| [ADR-0004](ADR-0004-deal-room-monetisation-boundary.md) | Master Deal Room as Ponte's primary monetisation boundary | Accepted by owner; **partly superseded by ADR-0020** (entitlement sources, Ponte Desk layer, per-branch pricing) |
| [ADR-0005](ADR-0005-free-deals-and-counterparty-room-branches.md) | Free structured Deals with paid master Deal Rooms and private sub-rooms | Accepted by owner; **partly superseded by ADR-0020** (unlimited free principal-counterparty sub-rooms only) |
| [ADR-0006](ADR-0006-starter-deal-room-access.md) | Starter Deal Room access before ongoing paid use | **Superseded by ADR-0020.** There is no Starter Deal Room |
| [ADR-0007](ADR-0007-deal-passport.md) | Deal Passport as the durable evidence-backed transaction-history layer | Accepted by owner; effective on merge |
| [ADR-0008](ADR-0008-detailed-deal-room-product-definition.md) | Detailed Deal Room product definition | Accepted by owner |
| [ADR-0009](ADR-0009-deal-room-technical-architecture.md) | Deal Room technical architecture | Accepted as amended, 29 July 2026 |
| [ADR-0010](ADR-0010-constitution-led-interface-rebuild.md) | Constitution-led rebuild of the complete interface | Accepted by owner; effective on merge |
| [ADR-0011](ADR-0011-complete-market-discoverability-and-category-first-journeys.md) | Complete Market Signal discoverability and category-first Trade Services and Distribution journeys | Accepted by owner; effective on merge |
| [ADR-0012](ADR-0012-ai-product-intake-and-document-to-deal-flow.md) | AI product intake and document-to-deal flow | Owner approved; implementation pending |
| [ADR-0013](ADR-0013-automated-listing-publication.md) | Automated listing publication and one transactional email system | Accepted by owner; effective on merge |
| [ADR-0014](ADR-0014-family-specific-downstream-commercial-procedures.md) | Family-specific downstream commercial procedures for the shared composer (completes ADR-0011) | Accepted 29 July 2026 |
| [ADR-0015](ADR-0015-contrast-and-colour-remediation.md) | Contrast and colour remediation: strengthened paper with a blue interaction family (amends the Constitution to v1.1) | Accepted by owner; effective on merge |
| [ADR-0016](ADR-0016-multilingual-deal-room-interpretation.md) | Multilingual Deal Room interpretation is a launch requirement | Accepted by owner |
| [ADR-0017](ADR-0017-authentication-and-operational-email.md) | Authentication and operational transactional email: generated Supabase templates, a strict document reader, sender identity and no tracking (extends ADR-0013) | Accepted 30 July 2026 |
| [ADR-0018](ADR-0018-member-business-verification-is-free.md) | Member-business verification is free and commercially separate from a counterparty check | Accepted 30 July 2026 |
| [ADR-0019](ADR-0019-bridge-station-category-marker.md) | Bridge station category marker | Accepted by owner |
| [ADR-0020](ADR-0020-deal-room-only-pricing-authority.md) | Ponte Deal Room is the only paid product, at $79 USD per 30 active days, five included principal-counterparty branches, $15 USD each thereafter, capped at $199 USD (supersedes ADR-0004/0005/0006 within their commercial scope) | Accepted 31 July 2026; effective on merge. **Nothing implemented** |
| [ADR-0021](ADR-0021-deal-room-entry-verification-and-navigation-depth.md) | Deal Room entry: either principal may open, verification gates admission, the room is within three steps | Accepted 31 July 2026. **Ruling 4 partly superseded by ADR-0036** |
| [ADR-0023](ADR-0023-members-choose-they-do-not-type.md) | Members choose; they do not type | Accepted by owner |
| [ADR-0024](ADR-0024-the-ponte-trade-journey-has-two-parts.md) | The journey has two parts and a defined end | Accepted 1 August 2026. **Open question closed by ADR-0038** |
| [ADR-0025](ADR-0025-the-deal-room-is-a-showroom-you-build-free-and-pay-to-publish.md) | The Deal Room is a showroom: build free, pay to activate | Accepted by owner |
| [ADR-0026](ADR-0026-a-listing-publishes-itself-above-a-named-minimum.md) | A listing publishes itself above a named minimum | Accepted by owner |
| [ADR-0027](ADR-0027-contact-verification-buys-visibility-the-deal-room-is-the-paid-trigger.md) | Contact verification buys visibility; the Deal Room is the paid trigger | Accepted by owner |
| [ADR-0028](ADR-0028-the-definitive-commercial-model-free-to-publish-free-to-build-paid-to-activate.md) | The definitive commercial model: free to publish, free to build, paid to activate | Accepted 1 August 2026 |
| [ADR-0029](ADR-0029-the-first-activation-waiver.md) | The first activation waiver | Accepted by owner |
| [ADR-0030](ADR-0030-the-waiver-is-not-a-launch-requirement.md) | The waiver is not a launch requirement | Accepted by owner |
| [ADR-0031](ADR-0031-migration-assurance-replaces-the-second-reviewer.md) | Migration assurance replaces the second reviewer | Accepted by owner |
| [ADR-0032](ADR-0032-the-bridge-is-the-interface.md) | The bridge is the interface (+ [Amendment 1](ADR-0032-AMENDMENT-1.md), [Amendment 2](ADR-0032-AMENDMENT-2.md)) | Accepted 6 August 2026. **Screen identifiers amended by ADR-0039** |
| [ADR-0033](ADR-0033-market-classification-implementation-contract.md) | The market classification contract, as implemented (implements ADR-0011) | Proposed; awaiting owner review. **Renumbered from ADR-0012, 7 Aug 2026** |
| [ADR-0034](ADR-0034-STAGE-2-interaction-tokens.md) | The blue interaction token family (Stage 2 of ADR-0015) | Proposed; awaiting owner review. **Renumbered from ADR-0015, 7 Aug 2026** |
| [ADR-0035](ADR-0035-mobile-action-hierarchy-and-completion-bridge.md) | Mobile action hierarchy, review structure, and the universal Task Completion Bridge | **Accepted 7 August 2026 (OD-H)** where it conforms to the Constitution. **Renumbered ADR-0016 → ADR-0018 → ADR-0035** |
| [ADR-0036](ADR-0036-deal-rooms-may-be-publicly-explained.md) | Deal Rooms may be publicly named, explained and demonstrated | Accepted 7 August 2026 (OD-A). Supersedes the closed public-surface list |
| [ADR-0037](ADR-0037-convergence-and-the-accepted-introduction.md) | The convergence rule, and what an accepted introduction does | Accepted 7 August 2026 (OD-B) |
| [ADR-0038](ADR-0038-the-canonical-journey-lifecycle.md) | The canonical journey lifecycle | Accepted 7 August 2026 (OD-C). Closes ADR-0024's open question |
| [ADR-0039](ADR-0039-screen-identifier-namespaces.md) | Canonical route-family letters are reserved; local screens are namespaced | Accepted 7 August 2026 (OD-D) |
| [ADR-0040](ADR-0040-rollout-flags-are-not-security-boundaries.md) | Rollout flags are not security boundaries | Accepted 7 August 2026 (OD-E) |
| [ADR-0041](ADR-0041-market-signals-remain-a-public-landing-surface.md) | Market Signals remain a public landing surface | Accepted 7 August 2026 (OD-G). Amends the 31 July removal |

## Numbering collisions: resolved 7 August 2026

Recorded 28 and 31 July 2026, resolved under Recovery Mode by owner decision
**OD-I**. Three numbers had each been issued twice, and the index above did not
describe the directory.

**The rule now applied:** every ADR has a unique permanent identifier. Where a
number was issued twice, the **accepted** decision keeps it — it is the one
binding authorities cite — and the **proposed** one moves. Historical
cross-references are preserved by an identifier note inside each moved file,
never by rewriting history.

| Was | Now | Subject | Keeps the old number |
|---|---|---|---|
| ADR-0012 | **ADR-0033** | Market classification contract, as implemented | `ADR-0012-ai-product-intake-and-document-to-deal-flow.md` |
| ADR-0015 | **ADR-0034** | The blue interaction token family (Stage 2) | `ADR-0015-contrast-and-colour-remediation.md` |
| ADR-0018 | **ADR-0035** | Mobile action hierarchy and the Task Completion Bridge | `ADR-0018-member-business-verification-is-free.md` |

**Also corrected here:** the index linked `ADR-0012-automated-listing-publication.md`,
which does not exist — the file is `ADR-0013-automated-listing-publication.md` —
and omitted `ADR-0012-ai-product-intake-and-document-to-deal-flow.md` entirely.
Eleven accepted decisions (ADR-0008, 0009, 0016, 0018, 0019, 0021, 0023–0032)
had no row. All are now listed.

**ADR-0035 has been numbered three times** — drafted as ADR-0016, moved to
ADR-0018 on 30 July 2026, and to ADR-0035 now. The 30 July renumber was never
propagated into the code, which is why several files still cite `ADR-0016` for
the Task Completion Bridge. Those citations mean ADR-0035, not
`ADR-0016-multilingual-deal-room-interpretation.md`, and are queued for
correction.

**Full mapping, per-citation disambiguation rules and the queued code changes:**
`docs/codex/CANONICAL-ID-RECONCILIATION.md`.

**Why it recurred, and what would stop it.** Nothing checked. A duplicate-number
check in `npm run check` would have caught all three pairs on the day they were
created; an index-integrity check would have caught the broken link. Both are
recorded as observations in the reconciliation record. Neither is authorised.
