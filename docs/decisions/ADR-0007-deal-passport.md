# ADR-0007 — Deal Passport as the durable transaction-history layer

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source:** Dedicated Deal Room product-definition conversation
- **Supersedes within scope:** Any model that treats Deal Room outcomes as disposable workspace history, or that presents unsupported aggregate reputation claims without evidence

## Context

Ponte's Deal Room creates structured, attributable evidence of how a business participates in commercial transactions: admission, roles, agreed procedures, evidence exchange, decisions, blockers, milestones, closure and outcome.

That history should not disappear when a room closes. It should contribute to a durable commercial record that gives future counterparties a clearer picture of what the organisation has actually done on Ponte.

The product owner has accepted the customer-facing concept **Deal Passport**.

Ponte already uses the concept **Business Passport** for identity, organisation and eligibility evidence. The two must remain distinct:

- **Business Passport** answers: who is this organisation and what has been evidenced about it?
- **Deal Passport** answers: what transaction history has this organisation accumulated through Deal Rooms?

## Decision

Ponte adopts the **Deal Passport** as the durable, evidence-backed transaction-history layer created from completed or materially progressed Deal Rooms.

A Deal Passport is not a self-authored profile, generic reputation score, social badge or guarantee of future performance.

It is a permission-controlled record derived from actual room events and outcome evidence.

## Core contents

A Deal Passport may include, where supported by the room record and permitted for disclosure:

- number of Deal Rooms participated in;
- number of Deal Rooms sponsored;
- number of procedures completed;
- number of qualified no-go outcomes;
- countries and territories involved;
- product, service and distribution categories involved;
- roles performed in rooms;
- milestones reached;
- response and action timeliness based on attributable room events;
- evidence supplied and accepted for procedure purposes;
- inspection, logistics, finance or specialist participation;
- transaction stage reached;
- closure outcome;
- externally evidenced shipment, appointment, purchase order, service engagement or contract event where the evidence standard is met;
- disputes, withdrawals, unresolved blockers or limitations where disclosure rules require them.

Every displayed fact must retain provenance to the originating room, event, evidence class, date and visibility rule.

## Outcome language

Ponte must distinguish:

- procedure completed;
- ready to proceed;
- contract or purchase order evidenced;
- shipment evidenced;
- service engagement evidenced;
- distribution appointment evidenced;
- qualified decision not to proceed;
- withdrawn;
- expired;
- closed with unresolved matters.

The Deal Passport must never describe a shipment, payment, contract or completed trade unless the required evidence exists.

## No generic success score at launch

The first release must not show a single numerical success rate, reliability score or trust score.

A success rate is misleading unless Ponte has a stable denominator, consistent outcome definitions, comparable deal types and sufficient history.

Instead, Ponte should show evidence-specific transaction history, for example:

- 4 procedures completed;
- 2 purchase orders evidenced;
- 3 countries involved;
- 1 qualified no-go decision;
- median response time based on 18 attributable actions;
- 2 active Deal Rooms.

A later composite indicator requires a separate owner-approved authority, transparent methodology and legal review.

## Visibility

The Deal Passport has layered visibility:

- **private organisation view** — full authorised history and internal analytics;
- **counterparty view** — selected evidence-backed facts disclosed for a specific Deal Room or introduction;
- **public view** — only explicitly approved, low-risk facts with sufficient provenance;
- **Ponte operational view** — only where required for administration, facilitation, safety, compliance or support.

No room history becomes public automatically.

The organisation may not suppress facts that customer terms, dispute resolution, law or safety policy require Ponte to retain or disclose, but ordinary commercial confidentiality remains protected.

## Relationship to the Deal Room

Each qualifying Deal Room outcome creates a candidate Deal Passport entry.

The entry is generated from durable room objects rather than manual profile claims.

Closing a room should trigger:

1. outcome classification;
2. evidence review;
3. participant confirmation where required;
4. visibility decision;
5. Deal Passport entry creation or update;
6. later correction, challenge or supersession process.

The Deal Passport must link back to the source room internally, while external viewers receive only the permitted evidence summary.

## Relationship to Starter Access

A Starter Deal Room may contribute to the Deal Passport if it reaches a genuine attributable milestone or closure outcome.

This is part of the Starter product's emotional value: the organisation is not merely testing software; it is beginning its durable transaction history on Ponte.

Starter access must not create inflated achievements merely for opening a room or clicking through setup.

## Commercial consequence

The Deal Passport increases retention because every serious room improves the organisation's evidence-backed commercial record.

Paid value is not only continued software access. It includes the accumulation, preservation and controlled use of transaction history.

The Deal Passport may support later paid capabilities such as:

- advanced portfolio analytics;
- evidence packs for counterparties;
- institution-sponsored trade records;
- enhanced verification or review;
- benchmark and performance reporting;
- exportable Deal Passport reports;
- insurer, finance-provider or programme views where lawful and authorised.

These are permitted future model families, not approved launch charges.

## Correction and challenge

Participants must be able to challenge an inaccurate outcome or attributable fact.

The system must preserve:

- original event history;
- correction request;
- reviewer;
- decision;
- corrected or superseded statement;
- date and reason.

Corrections must not erase the audit trail.

## Guardrails

- Do not merge Business Passport and Deal Passport into one ambiguous score.
- Do not allow users to self-certify completed transactions without evidence.
- Do not equate room completion with shipment, payment or commercial success.
- Do not publish room-derived facts without permission and provenance.
- Do not hide materially adverse outcomes where policy or law requires retention or disclosure.
- Do not reward room creation, clicks or message volume as transaction achievement.
- Do not display a generic Trust Score, success rate or reliability score at launch.
- Do not let payment purchase a better Deal Passport outcome.
- Do not delete Deal Passport history merely because a subscription lapses.

## Implementation boundary

This ADR defines product authority only. It does not authorise:

- public profile design;
- scoring algorithms;
- schema or migrations;
- analytics implementation;
- data backfill;
- automated public disclosure;
- pricing;
- external reports;
- production deployment.

The detailed data model, permissions, evidence standards, challenge workflow, screen design and rollout require the remaining approved product process.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-03-DEAL-PASSPORT.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0006-starter-deal-room-access.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`
- GitHub issues #51 and #52
