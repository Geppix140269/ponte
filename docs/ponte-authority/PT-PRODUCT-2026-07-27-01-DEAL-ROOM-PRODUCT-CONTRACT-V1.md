# Ponte Trade Deal Room Product Contract v1

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Source issue:** #50
- **Implementation status:** Not started

## 0. Amendment — master Deal Room and private sub-rooms

The owner clarified and accepted the following hierarchy on 27 July 2026:

```text
Structured Deal
  -> paid master Deal Room for that Deal
       -> any number of private related sub-rooms
```

One master Deal Room consumes one commercial entitlement or subscription slot. Its private counterparty, provider, adviser and internal sub-rooms do not consume additional master-room slots. External guest organisations may consume included guest capacity or credits.

This amendment is governed in detail by ADR-0005 and `PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`. Where the remainder of this first-issued contract uses “Deal Room” without distinguishing the hierarchy, interpret it as the master Deal Room and its authorised sub-rooms under those later records.

## 1. Purpose and authority

This contract defines the accepted product foundation for the Ponte Trade Deal Room. It governs the downstream PROGRESS layer after credible commercial interest has been established.

It does not authorise screen design, database design, implementation, migrations, deployment or production action. Those require the remaining product-definition outputs, owner approval, Design approval and a separate implementation plan.

Within its scope this contract supersedes:

- the statement in `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` that Business Passport remains future architecture, only to the extent needed to define Deal Room admission; and
- the blanket deferral of full Deal Rooms in section 17 of `00-MASTER-IMPLEMENTATION-BRIEF.md`, only for product definition. Implementation remains separately deferred.

It does not supersede the rule that Ponte Trade is not primarily a Deal Room. The Deal Room is one downstream controlled-execution capability inside the wider product.

## 2. Executive definition

The Ponte Deal Room is a controlled multi-party workspace used to progress a credible cross-border transaction through an agreed procedure.

It begins after meaningful commercial interest has been established. It gives participants a structured environment in which to define:

- what the proposed transaction is;
- who is participating and in what capacity;
- what procedure the parties have agreed to follow;
- what each participant must do;
- what evidence is required;
- what conditions remain outstanding;
- what decisions have been made;
- what is blocking progress;
- who owns the next action; and
- whether the transaction is ready to proceed.

The Deal Room supports all three primary market families:

1. Products;
2. Trade services;
3. Distribution and representation.

It may include more than two parties. Principal commercial participants may be joined by intermediaries, logistics providers, inspectors, certification providers, customs specialists, finance providers, advisers and Ponte facilitators.

## 3. Position in Ponte

Ponte is understood through four operating verbs:

- **DISCOVER** — see Market Signals and Member Opportunities;
- **STRUCTURE** — turn a commercial objective into a usable requirement, offer, service capability or distribution intention;
- **CONNECT** — investigate, qualify and introduce relevant participants;
- **PROGRESS** — move a transaction through an agreed procedure inside the Deal Room.

The Deal Room is the downstream PROGRESS layer. It must not dominate the public entry experience before the user has a relevant transaction.

## 4. Entry conditions

A Deal Room is not created automatically from every signal, result or draft. It may be proposed only after credible commercial interest exists through one of these routes:

- an accepted controlled introduction;
- accepted participation in a Member Opportunity;
- a Market Signal that Ponte has investigated sufficiently to establish a viable commercial contact route;
- an existing qualified transaction imported by its participants;
- a Ponte-facilitated transaction; or
- a direct qualified member-to-member discussion that both principal parties wish to structure.

A public Market Signal, search result, expression of curiosity or incomplete draft does not create an active room.

An eligible principal participant or Ponte may propose a room. One party may prepare the room before the other accepts, but protected content and active transaction functions remain locked until the required principal participants are admitted.

## 5. Formal admission

Entering protected Deal Room content is a formal attributable act.

Every participant must:

1. authenticate as a Ponte member;
2. hold a Deal Room-ready Business Passport;
3. identify the business or declared capacity represented;
4. declare the transaction role;
5. accept the Ponte Deal Room Participation Agreement;
6. accept the applicable confidentiality and non-disclosure obligations;
7. accept any room-specific rules; and
8. declare authority to participate in the stated capacity.

Acceptance must be affirmative, versioned, timestamped and linked to the named individual, organisation or capacity and room.

The MVP may use rigorous click-to-accept evidence. It does not claim a qualified or advanced electronic signature. A separately executed NDA may be uploaded as a room condition where required. Non-circumvention is optional and room-specific, not automatic for every transaction.

## 6. Deal Room-ready Business Passport

A complete Passport is not required for entry. The accepted minimum is:

- authenticated individual;
- confirmed contact method;
- identified business or declared professional capacity;
- legal or trading name;
- jurisdiction;
- relationship to the business;
- transaction role declared;
- authority to participate declared; and
- any room-specific prerequisite completed.

The user-facing model must remain evidence-specific rather than numerical.

Possible states include:

- identity confirmed;
- business information supplied;
- business information checked;
- role declared;
- authority declared;
- authority sighted;
- under review; and
- not confirmed.

Deal Room-ready status does not prove solvency, product ownership, document authenticity, commercial reliability or authority to execute a final contract.

## 7. Participants, roles and authority

The Deal Room is multi-party and role-based.

Participant classes include:

- principal commercial party;
- intermediary or representative;
- supporting service provider;
- adviser;
- Ponte facilitator; and
- observer where specifically authorised.

Every participant has:

- a named individual;
- an organisation or declared capacity;
- a transaction role;
- an invitation state;
- an admission state;
- a visibility level;
- permissions;
- declared authority; and
- a record of who invited them.

Participation authority and binding-decision authority are separate. A person may contribute information without being authorised to approve commercial terms or execute an agreement.

## 8. The agreed procedure

The procedure is the central Deal Room object.

The room creator, a principal participant or Ponte may propose the initial procedure. It becomes agreed only after approval by every designated principal approver.

The procedure defines:

- ordered steps;
- responsible and supporting participants;
- dependencies;
- deadlines;
- required evidence;
- required approvers;
- blockers;
- completion conditions; and
- amendment history.

Supporting providers approve only the responsibilities and decisions assigned to them. Material changes create a new procedure version and require renewed approval from affected principal participants.

No participant may silently change another participant's responsibility, a mandatory condition, an evidence requirement, an approval requirement or the completion definition.

Ponte may suggest templates, but it must not impose one universal procedure on all cross-border transactions.

## 9. Evidence, disclosure and decisions

Evidence is private by default and always carries an explicit visibility rule.

Supported visibility concepts include:

- private draft;
- one organisation only;
- selected participants;
- principal parties only;
- all admitted room participants;
- Ponte only;
- disclosure requested;
- disclosure approved; and
- access withdrawn.

Evidence states must distinguish:

- uploaded;
- received;
- under review;
- clarification required;
- accepted for the agreed procedure;
- rejected;
- superseded; and
- independently verified.

Accepted for the procedure does not mean authentic.

Material decisions are durable objects rather than messages. They record the proposer, required approvers, approvals and objections, linked evidence, effective date, effect on the procedure and amendment history.

## 10. Progress and gamification

The Deal Room should feel like an important shared mission progressing towards a clear objective. Engagement comes from genuine commercial movement, not from manufactured activity.

The system distinguishes four concepts.

### 10.1 Commercial stage

Named stages such as Participants pending, Procedure proposed, Procedure agreed, Evidence in progress, Conditions in progress, Blocked, Ready to proceed and Completed.

### 10.2 Procedural completion

A stable weighted percentage based on meaningful completed work.

Rules:

- show no percentage before meaningful procedural progress;
- never display 0%;
- normally begin between 18% and 25%;
- use irregular weighted increments;
- show the same value for the same completed state;
- give more weight to consequential requirements; and
- reach 100% only when the agreed procedure is complete.

The percentage does not represent trust, value, risk, commercial quality, probability of closing or transaction success.

### 10.3 Milestones

Recognise meaningful achievements such as principal participants confirmed, NDA accepted by all required participants, procedure agreed, core evidence supplied, first blocker resolved, conditions substantially met and ready to proceed.

### 10.4 Momentum

Indicate whether the transaction is moving, waiting or inactive without presenting a probability of success.

The MVP must not include points, coins, public leaderboards, popularity badges, random rewards, artificial countdowns or penalties for legitimate due diligence.

The deal is the game, but verified procedural progress is the scoring system.

## 11. Ponte and AI authority

Every room declares one operating mode:

- software-only;
- Ponte-observed;
- Ponte-facilitated;
- Ponte-managed procedure; or
- institutionally sponsored.

AI may summarise activity, identify missing steps, suggest procedure templates, identify inconsistencies, draft clarification requests, compare versions, recommend next actions, translate communications and prepare recaps.

AI may not admit participants, accept evidence, waive conditions, approve procedure changes, make binding decisions, disclose documents, negotiate autonomously, claim document authenticity or represent a participant externally without approval.

Human Ponte participation occurs only where the room mode or a separately agreed scope authorises it.

## 12. Lifecycle

The accepted room lifecycle is:

1. Credible commercial interest;
2. Room proposed;
3. Entry prerequisites pending;
4. Participation agreement pending;
5. Awaiting required principal participants;
6. Active, procedure not yet agreed;
7. Procedure proposed;
8. Procedure agreed;
9. Conditions and evidence in progress;
10. Blocked or paused where applicable;
11. Ready to proceed;
12. Completed; and
13. Closed.

Alternative terminal outcomes include declined, withdrawn, expired, closed as blocked, closed as not commercially viable, successful procedure completion and qualified no-go.

A blocker records description, classification, owner, affected steps, resolution requirement, due date where relevant, escalation path and final resolution, waiver or closure decision.

A paused room records reason, initiator, effect on deadlines and conditions for resumption.

Ready to proceed requires all mandatory steps complete, all mandatory conditions met or validly waived, required evidence at the necessary procedural state, required approvals recorded, no critical blocker remaining and principal-party confirmation.

Ready to proceed does not guarantee a contract, payment, shipment or successful transaction.

## 13. Completion and closure

Each room defines its completion condition when the procedure is agreed.

Possible outcomes include readiness for formal contracting, a purchase order, a supply or service agreement executed externally, a distribution appointment, a completed sample or inspection phase, a qualified no-go decision, withdrawal or expiry.

Procedural completion is not automatically commercial success.

The closure record states closure reason, outcome, approving authority, unresolved matters, final procedure version, final evidence and decision states, and retention and continuing-access rules.

Closed rooms preserve an auditable history. Reopening requires recorded authority, a stated reason and a new procedure version where material work resumes.

## 14. MVP boundary

The first coherent release must support:

- room creation from a qualifying transaction;
- principal and supporting participant invitations;
- Passport eligibility and formal admission;
- versioned terms, NDA and room-rule acceptance;
- deal overview;
- procedure proposal, approval, steps, responsibilities, dependencies and due dates;
- conditions and blockers;
- evidence upload, versioning, visibility, review and clarification;
- durable decisions and approvals;
- comments attached to structured objects;
- named commercial stages;
- stable weighted procedural completion;
- milestones, current owner, next action and what-changed summary;
- pause, resume, expiry, withdrawal, completion and closure;
- basic in-product and essential email notifications; and
- durable transaction history.

The first release excludes:

- Ponte-built electronic signatures;
- full contract generation;
- autonomous negotiation;
- escrow;
- payments between trading parties;
- trade-finance execution;
- customs filing;
- tariff calculation;
- quality or payment guarantees;
- automatic document-authenticity claims;
- advanced organisational hierarchies;
- public reputation rankings;
- Trust Scores;
- points, coins or public leaderboards;
- blockchain or smart contracts;
- real-time video;
- complex chat;
- general-purpose CRM functionality; and
- automatic external invitations or disclosures.

Commercial entitlement for master Deal Room activation is required conceptually under ADR-0004 and ADR-0005. Exact prices and production charging remain separately unapproved.

## 15. MVP acceptance standard

The MVP is coherent only when:

1. principal participants enter through the formal admission gate;
2. participants agree a procedure;
3. responsibilities and evidence requirements are visible;
4. at least one evidence item is reviewed;
5. at least one clarification request is resolved;
6. at least one blocker is assigned and resolved or waived;
7. progress remains stable and truthful;
8. every participant can see their next action;
9. the transaction reaches Ready to proceed or an intentional closure; and
10. the complete history remains understandable without the originating emails or conversation.

The later accepted branching authority additionally requires the first release to distinguish the free structured Deal, the paid master Deal Room and its private related sub-rooms.

## 16. Reference prototype

The first prototype uses a fictional transaction for 500 metric tonnes of refined cane sugar from a Brazilian manufacturer to a Spanish importer, with an independent inspection provider and Ponte facilitator.

The prototype must prove accepted commercial interest and Deal Room creation; formal participant admission; procedure proposal and amendment; evidence upload and review; a clarification request involving an old certificate of analysis; admission of a limited-visibility inspection provider; a blocker concerning sampling and packaging integrity; blocker resolution through a revised inspection procedure; irregular stable progression such as 22%, 41%, 57%, 74%, 88%, 96%, 100%; Ready to proceed; and closure for formal contracting outside Ponte without claiming that payment, shipment or the final transaction has completed.

Prototype organisations and data must be explicitly fictional or illustrative.

## 17. Product guardrails

Every proposed Deal Room feature must help the parties agree what must happen, assign responsibility, organise evidence, record a decision, expose a blocker, clarify the next action or preserve the transaction history.

When it does none of these, challenge whether it belongs in the Deal Room.

The Deal Room must not imply more verification than occurred, hide risk behind celebration, reward excessive disclosure, shame legitimate due diligence or use artificial urgency.

## 18. Remaining product-definition work

Before Design begins, issue #51 must complete and obtain owner approval for:

- the detailed end-to-end journey;
- the screen register;
- the conceptual domain and data model;
- the permission matrix;
- the lifecycle and state machine;
- the weighted progress-calculation model; and
- the MVP delivery plan.

Design begins only after those product authorities are approved. The Claude Code implementation brief begins only after Product and Design are approved.

## 19. Related records

- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- GitHub issues #50, #51 and #52
