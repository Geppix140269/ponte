# ADR-0002 — Ponte Design Constitution and Bridge System authority

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Supersedes:** Any interpretation of Ponte design documents as optional inspiration, and any implementation practice that permits silent visual simplification

## Context

Ponte has approved brand, iconography, motion and interface work, but implementation has repeatedly drifted toward generic SaaS cards, plain typography and locally invented treatments. Technical validation could pass while distinctive approved identity disappeared.

The root problem is not absence of design work. It is absence of a binding repository authority and enforcement contract.

## Decision

`design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` is the binding authority for every Ponte-controlled production interface.

The owner-approved Bridge System under `design/authority/bridge/v1/` is authoritative for family selection, action selection, task completion, commercial journey, counterparty connection, multi-party Deal Room progress, mobile bridge behaviour, reduced motion and the approved landing headline treatment.

Visual conformity is part of correctness.

No contributor may silently:

- simplify an approved treatment;
- replace an approved component with a generic equivalent;
- create page-specific visual conventions;
- invent icons, colours, fonts, radii, shadows or motion;
- flatten editorial gold italic emphasis;
- substitute cards, tabs or a generic stepper for an approved bridge;
- treat a successful build as design approval.

Where authority is missing or conflicting, work stops and the issue is escalated.

Exceptions require explicit written approval from Giuseppe Funaro and a versioned amendment.

## Authority hierarchy

Within visual and interaction scope:

1. a later accepted owner-approved ADR explicitly amending the Constitution;
2. the Ponte Design Constitution;
3. approved packages under `design/authority/`;
4. approved Ponte Flow tokens, registry, icons and motion;
5. approved reference renders;
6. non-conflicting page implementation briefs;
7. implementation reality as a constraint, not a design authority.

## Consequences

- All agents and developers must read the Constitution before UI work.
- Authority files and core design-system paths require owner review.
- Governance checks require the Constitution, Bridge manifest and approval record.
- UI pull requests must complete the Design Constitution checklist and attach visual evidence.
- Mobile at 390 × 844 and reduced-motion behaviour are mandatory review surfaces.
- Historical prototypes and superseded design exports are non-authoritative.
- The approved system can evolve only through controlled, versioned amendments.

## First implementation implication

After this authority change is merged, a separate implementation PR may replace the temporary landing family/action card grid with the approved Family and Action Bridges and restore the authorised gold italic headline emphasis. That PR must preserve production navigation, authentication, routes, data and business logic.

## Rejected alternatives

### Keep the Brand Book advisory

Rejected because optional reference material did not prevent repeated design drift.

### Rely on developer memory or prompts

Rejected because context fragments across tools and conversations.

### Perform an uncontrolled app-wide repaint

Rejected. The Constitution governs everything, but implementation remains journey-by-journey through scoped PRs.

## Related records

- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
- `design/authority/bridge/v1/README.md`
- `design/authority/bridge/v1/APPROVAL.md`
- `design-system/ponte-flow/README.md`
- `AGENTS.md`
- `docs/codex/00-START-HERE.md`
- `docs/codex/DECISION-LOG.md`
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`
- `scripts/check-governance.mjs`