# Ponte Trade Deal Passport

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Implementation status:** Not started

## 1. Executive definition

The Deal Passport is Ponte's durable, evidence-backed record of an organisation's transaction history created through Deal Rooms.

It answers:

> What has this organisation actually done through structured commercial progression on Ponte?

It does not replace the Business Passport.

- The **Business Passport** records identity, organisation, capacity and verification evidence.
- The **Deal Passport** records attributable Deal Room participation, progress, outcomes and transaction evidence.

The two may be displayed together, but they must remain separate evidence classes.

## 2. Purpose

The Deal Passport turns each meaningful Deal Room into durable commercial memory.

It gives organisations a reason to continue using Ponte because their structured transaction history accumulates over time rather than disappearing when a room closes.

It gives authorised counterparties a clearer, evidence-specific view than a self-authored company profile or generic rating.

## 3. Source of truth

A Deal Passport fact must originate from one or more durable Deal Room objects, such as:

- participant admission and declared role;
- agreed procedure;
- completed step;
- evidence review;
- clarification and resolution;
- blocker and resolution;
- durable decision;
- milestone;
- closure classification;
- external evidence of a purchase order, contract, appointment, shipment or service engagement.

Every fact must retain:

- source room reference;
- organisation and role;
- event or evidence type;
- date;
- evidence state;
- limitations;
- visibility rule;
- correction and supersession history.

## 4. Candidate Deal Passport facts

Subject to provenance and permission, the Deal Passport may show:

### Participation

- Deal Rooms participated in;
- Deal Rooms sponsored;
- roles performed;
- counterpart organisation count without disclosing identities where confidential;
- countries and territories involved;
- market families and commercial categories involved.

### Progress

- procedures agreed;
- procedures completed;
- milestones reached;
- blockers resolved;
- attributable response or action timing;
- evidence supplied and accepted for procedure purposes.

### Outcomes

- ready-to-proceed outcomes;
- purchase orders evidenced;
- contracts evidenced;
- shipments evidenced;
- service engagements evidenced;
- distribution or representation appointments evidenced;
- qualified no-go decisions;
- withdrawals, expiries and unresolved closures where appropriate.

### Supporting ecosystem

- inspection participation;
- logistics participation;
- customs or compliance participation;
- finance or insurance participation;
- specialist-review participation.

## 5. Evidence language

The interface must use precise outcome language.

Examples:

- **Procedure completed** — all mandatory procedure steps were completed.
- **Ready to proceed** — required conditions were met or validly waived.
- **Purchase order evidenced** — Ponte received evidence meeting the defined standard.
- **Shipment evidenced** — shipment evidence was supplied and reached the required review state.
- **Qualified no-go** — the parties completed enough procedure to decide intentionally not to proceed.
- **Closed with unresolved matters** — the room closed while defined conditions remained unresolved.

Ponte must not convert one state into another through inference.

## 6. No generic reputation score at launch

The launch Deal Passport must not display:

- Trust Score;
- universal reliability score;
- star rating;
- popularity rank;
- generic success percentage;
- probability of closing future Deals.

The first release should show evidence-specific counts and statements.

Examples:

- 4 procedures completed;
- 2 purchase orders evidenced;
- active across 3 countries;
- 1 qualified no-go outcome;
- median response time from 18 attributable actions.

A later aggregate indicator requires transparent methodology, sufficient comparable history, owner approval and legal review.

## 7. Visibility model

### Private organisation view

May show the organisation's full authorised transaction portfolio, active and closed rooms, trends, limitations and internal analytics.

### Transaction-specific counterparty view

May show selected Deal Passport facts disclosed for a particular introduction or Deal Room.

### Public view

May show only explicitly approved, low-risk, evidence-backed facts. No Deal or counterparty identity becomes public automatically.

### Ponte operational view

May show the minimum required for administration, facilitation, safety, compliance and support under the applicable permissions.

## 8. Creation workflow

A Deal Passport entry is created or updated through this sequence:

```text
Deal Room reaches material milestone or closure
  -> classify outcome
  -> review supporting evidence
  -> obtain participant confirmation where required
  -> determine visibility
  -> create or update Deal Passport entry
  -> permit correction or challenge
```

The entry remains linked internally to its source room and evidence.

## 9. Starter Deal Room relationship

A Starter Deal Room can create the organisation's first Deal Passport entry when it reaches a genuine milestone or attributable outcome.

This is central to the Starter experience:

> The organisation is not only trying the software. It is beginning an evidence-backed commercial history.

Opening a room, inviting someone, sending messages or completing a product tour is not enough to generate a transaction achievement.

## 10. Correction and dispute

An authorised participant may challenge:

- an incorrect role;
- an inaccurate outcome;
- an unsupported evidence statement;
- an incorrect date or category;
- inappropriate visibility;
- an attribution error.

Ponte must preserve the original record, correction request, review decision and corrected or superseded statement.

## 11. Commercial role

The Deal Passport strengthens retention and monetisation because continued Deal Room use builds a durable commercial asset.

Potential future paid capabilities include:

- advanced Deal Passport analytics;
- controlled counterparty evidence packs;
- exportable reports;
- institution and programme reporting;
- enhanced evidence review;
- benchmark reporting;
- permissioned insurer or finance-provider views.

These are future allowed model families, not launch commitments.

Basic Deal Passport accumulation must not disappear merely because the organisation changes plan or its subscription lapses.

## 12. Product guardrails

- Keep Business Passport and Deal Passport distinct.
- Derive Deal Passport facts from durable evidence, not user marketing claims.
- Do not call a procedure-complete room a completed shipment or trade.
- Do not publish confidential transaction facts automatically.
- Do not allow payment to improve an outcome label.
- Do not reward clicks, messages or login activity as commercial achievement.
- Do not erase adverse or corrected history where retention is legally or procedurally required.
- Do not launch a universal score or success rate.

## 13. MVP recommendation

The smallest truthful Deal Passport MVP should include:

- private organisation Deal Passport view;
- entries generated from closed or materially progressed Deal Rooms;
- evidence-specific outcome labels;
- country, family, category and role summaries;
- milestone and procedure-completion history;
- controlled disclosure into another Deal Room;
- provenance and limitation display;
- correction-request workflow;
- no public score or public transaction directory.

## 14. Implementation boundary

This product authority does not authorise:

- schema or migrations;
- scoring algorithms;
- public profile design;
- automatic disclosure;
- historical backfill;
- analytics implementation;
- pricing or reports;
- production deployment.

The detailed domain model, permissions, evidence standards, screens, legal treatment and rollout require the remaining approved product process.

## 15. Related records

- `docs/decisions/ADR-0007-deal-passport.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`
- `docs/decisions/ADR-0006-starter-deal-room-access.md`
- GitHub issues #51 and #52
