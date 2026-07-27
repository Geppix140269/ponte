# ADR-0003 — Deal Room as the controlled PROGRESS layer

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source issue:** #50
- **Supersedes within scope:**
  - the statement in `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` that Business Passport
    remains future architecture, only for Deal Room admission product definition;
  - the blanket deferral of full Deal Rooms in section 17 of
    `00-MASTER-IMPLEMENTATION-BRIEF.md`, only for Deal Room product definition.

## Context

Ponte already defines discovery, structured commercial intent, investigations,
controlled introductions, evidence-specific verification and approval-governed
external action. It did not yet have an accepted downstream product contract for
progressing a credible multi-party transaction after the parties had established
commercial interest.

Cross-border transactions frequently stall because the parties follow different
procedures, exchange information through disconnected channels, do not assign
responsibility, do not distinguish uploaded from reviewed evidence, disagree
about what was accepted and cannot identify the next action or blocker.

The prior authorities treated Business Passport and full Deal Rooms as future or
deferred architecture. The owner has now approved a focused Deal Room foundation
without authorising implementation.

## Decision

Ponte Trade adopts the Deal Room as its downstream **PROGRESS** layer: a
controlled multi-party workspace used after credible commercial interest to move
a cross-border transaction through an agreed procedure.

The procedure is the central product object. It records ordered steps,
responsibilities, dependencies, due dates, evidence requirements, approvals,
conditions, blockers, completion criteria and amendment history.

An active Deal Room requires the relevant principal participants to complete a
formal admission gate. Each admitted participant must:

- authenticate;
- hold a Deal Room-ready Business Passport;
- identify the represented organisation or capacity;
- declare the transaction role and participation authority;
- accept a versioned Deal Room Participation Agreement;
- accept the applicable confidentiality/NDA obligations; and
- accept room-specific rules.

The MVP may record rigorous click-to-accept evidence but must not misrepresent it
as a qualified or advanced electronic signature.

The room is multi-party and role-based. Participation authority, information
access and binding-decision authority are separate.

Evidence is private by default and must distinguish uploaded, received, under
review, clarification required, accepted for the agreed procedure, rejected,
superseded and independently verified. Acceptance for a procedure does not mean
authenticity.

Material decisions and approvals are durable objects, not outcomes buried only
in chat.

The Deal Room uses progress-based gamification to make genuine transaction
movement visible and motivating. It separates:

- named commercial stage;
- stable weighted procedural completion;
- meaningful milestones; and
- momentum.

Procedural completion never represents trust, value, risk, probability of
closing or commercial success. The product must not use points, coins, public
leaderboards, popularity badges, random rewards, artificial countdowns or
penalties for legitimate due diligence.

AI remains subordinate to workflow and participant authority. It may structure,
summarise, compare, translate, identify gaps, draft clarifications and recommend
next actions. It may not admit participants, waive conditions, accept evidence,
approve procedure changes, make binding decisions, disclose documents, negotiate
autonomously or claim document authenticity.

## Consequences

- The Deal Room becomes a separately governed downstream product capability, not
  a primary landing route or the category definition of Ponte Trade.
- Business Passport receives separate product approval only to the extent needed
  to define Deal Room-ready admission. Implementation remains unapproved.
- The Deal Room must support Products, Trade services, and Distribution and
  representation.
- A public Market Signal or casual expression of interest cannot automatically
  create an active room.
- The product must support principal parties, intermediaries, supporting
  providers, advisers and Ponte facilitators rather than assuming a two-party
  buyer/seller chat.
- Procedure, conditions, evidence, decisions, blockers and next action are core
  product objects.
- Communication is subordinate to structured transaction objects; the MVP does
  not become a complex real-time chat platform.
- Formal contracting, escrow, payments, trade-finance execution, electronic
  signature infrastructure, automatic document authentication and autonomous
  negotiation remain outside the MVP.
- Closed rooms retain durable, permission-controlled history.
- Ready to proceed and 100% procedural completion do not mean that a contract,
  payment, shipment or successful transaction has occurred.

## Implementation boundary

This ADR records product authority only. It does not authorise:

- screen design;
- technical architecture;
- code changes;
- database schema or migration;
- feature flags;
- production action;
- deployment;
- external communication; or
- merge without owner review.

Issue #51 tracks the remaining product-definition outputs. Design may begin only
after they are approved. Implementation requires Product and Design approval, a
repository and production-state audit, an ExecPlan and a separate owner-approved
pull request.

## Rejected alternatives

### Generic post-introduction chat

Rejected because conversation alone does not assign responsibility, organise
evidence, record approvals or expose blockers.

### M&A-style data room

Rejected because the core need is procedural progression of trade transactions,
not a passive folder hierarchy for due diligence.

### Universal fixed trade procedure

Rejected because products, services, distribution relationships and transaction
structures require different procedures.

### Progress as close probability or Trust Score

Rejected because procedural completion cannot prove commercial success,
credibility or risk.

### Mandatory complete Passport before any admission

Rejected because it creates unnecessary friction. Deal Room-ready status should
be purpose-specific and progressive while remaining clear about limitations.

### Electronic-signature platform in the MVP

Rejected because versioned attributable acceptance provides the required initial
gate without expanding the first release into a signature product.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- GitHub issues #50 and #51
