# Ponte Trade
## Master Implementation Brief

**Version:** 1.0  
**Date:** 24 July 2026  
**Owner:** Giuseppe Funaro  
**Repository:** `Geppix140269/ponte`  
**Status:** Governing implementation handoff  
**Primary audience:** Claude Code, Claude Design, product owner, engineering and operations  

---

# 0. Read this first

This is the single self-contained implementation authority for the next Ponte Trade development cycle.

It consolidates the decisions previously distributed across:

- Master Product, Experience and Agentic Architecture v3;
- Brand Book v5 / Final Brand System;
- Messaging and Screen Copy Pack;
- Definitive 1 August Claude Code Brief and repository lifecycle authorities;
- End-to-End Process and Experience Blueprint;
- Experience Architecture and Emotional Design Blueprint v2;
- Master Route Atlas and Screen Register v1;
- the approved interactive landing implementation and subsequent correction.

Claude Code must not assume that any other document is available. This brief therefore contains the product logic, experience rules, route register, truth model, implementation sequence, technical boundaries and acceptance rules needed to proceed.

When this brief conflicts with an older repository document, this brief governs unless a live technical or legal constraint is discovered and reported.

---

# 1. Immediate operating instruction

## 1.1 Do not begin an app-wide repaint

Do not start by changing global colour tokens, Tailwind aliases, shared component styling or all application pages.

The current inner application reflects an older marketplace-first information architecture. Applying Brand v5 globally before the product journeys are corrected risks preserving the wrong structure under a new visual skin.

Brand v5 must be applied as each complete journey is implemented. The remaining global repaint happens only after the core journeys are approved.

## 1.2 Do not redesign by extrapolation

Do not infer missing product behaviour merely because a component exists in the Brand Book or a prototype contains an illustrative screen.

A prototype validates a direction. It does not silently authorise:

- a database model;
- a permission rule;
- a new lifecycle;
- contact disclosure;
- automatic publication;
- automatic verification;
- a payment obligation;
- an external AI action.

## 1.3 Do not change verification tiers yet

Preserve existing L1-L4 fields, enums and stored values temporarily for backward compatibility.

Do not make numbered tiers or a 0-100 Trust Score the principal user-facing trust representation.

Do not remove, rename or migrate the existing fields until the repository and production-schema gap analysis identifies every dependency.

The intended user-facing model is evidence-specific:

- Member declaration
- Identity confirmed
- Business information checked
- Role declared
- Authority sighted
- Opportunity reviewed
- Under review
- Not confirmed
- Source unavailable
- Expired
- Blocked

Every evidence statement must show, where relevant:

- what was checked or supplied;
- source or evidence category;
- date;
- result;
- limitation;
- expiry or recheck status.

Gold is a brand signal, never a trust or pending-review status.

## 1.4 Current Claude question

For the question:

> How should the L1-L4 verification tiers be expressed in Brand v5?

Choose **Other** and use:

> Preserve the existing L1-L4 data model temporarily for compatibility, but do not redesign or migrate it now. Do not expose numbered tiers or a Trust Score as the primary user-facing trust model. Include every L1-L4 dependency in the repository-to-architecture gap report and propose a safe compatibility mapping to evidence-specific labels, dates, sources and limitations. Stop for approval before changing verification data, copy or UI.

## 1.5 Current repository state

PR #15, **“Replace the homepage with the `What's your deal?` gateway (v1.1 handoff)”**, has been merged into `main`.

It implemented:

- the new cream, ink and gold homepage;
- voice and natural-language entry;
- deterministic intent routing;
- four route shortcuts;
- scoped Brand v5 styling on `/`;
- handoff to the existing production routes.

It deliberately did not redesign the downstream application.

Therefore the current product has a visual and architectural seam:

- the new intelligent public entrance;
- the older inner application and route structure.

Do not pretend that PR #15 delivered the complete product. Treat it as an implemented entry surface that may be retained and adapted as the connected journeys are built.

---

# 2. Product definition

## 2.1 Category

Ponte Trade is a **commercial intelligence and controlled-execution layer for cross-border trade**.

It is not primarily:

- a listings marketplace;
- a public lead directory;
- a trade-data terminal;
- a generic CRM;
- a social network;
- a chatbot;
- a deal room;
- a consultancy website;
- an AI dashboard.

## 2.2 Brand line

> **Cross-border trade, with greater clarity.**

## 2.3 Product promise

> Tell Ponte what your business is trying to achieve. Ponte monitors the relevant evidence, explains what matters and prepares the next action—while you remain in control of every external commitment.

## 2.4 The operating spine

Every significant feature must connect to:

> Business identity → Commercial Mission → Observed evidence → Company-specific interpretation → Recommended action → Human approval where required → Execution → Recorded outcome → Better mission memory

## 2.5 The unit of value

The primary unit of value is a **Commercial Development**, not a listing, result or AI answer.

A Commercial Development explains:

1. what changed;
2. why it matters to this business and mission;
3. the evidence used;
4. what remains unknown;
5. the recommended next action;
6. whether approval is required;
7. how the user can correct or dismiss it.

Example structure:

> **Potential increase in Indian pistachio demand**
>
> Three recent buyer requirements indicate approximately 1,200 MT for delivery into Mundra and Nhava Sheva during the next 90 days. Two are unconfirmed Market Signals; one is connected to an identified participant and is under review.
>
> This crosses the business's 500 MT threshold and matches its approved origins and delivery window.

Available actions may include:

- Watch
- Ask Ponte to investigate
- Prepare a response
- Request a controlled introduction
- Compare supporting evidence
- Dismiss and improve the Mission

---

# 3. Factual classes and truth model

Ponte must never blur objects that carry different evidential meaning.

## 3.1 Qualified Opportunity

A current buy requirement, sell offer or trade-related service that:

- was submitted to or directly reconfirmed by Ponte;
- is connected to an identified participant;
- was reviewed before publication;
- carries a last-confirmed date;
- shows limitations;
- follows an explicit lifecycle and expiry/reconfirmation policy.

Primary external action:

> Request a controlled introduction

A review is not a transaction guarantee.

## 3.2 Market Signal

A recent external indication of buyer demand or seller availability that Ponte has not independently confirmed.

It must not be presented as:

- a deal;
- a mandate;
- a confirmed buyer or seller;
- a Qualified Opportunity;
- a verified commercial requirement.

Primary action:

> Ask Ponte to investigate

Public Market Signals must not expose:

- third-party identity;
- contact information;
- source URL;
- copied source prose;
- private provenance;
- unsupported claims.

A confirmed signal creates or links a normal Qualified Opportunity. It does not become qualified merely by changing its badge.

## 3.3 Trade Movement

A historical movement derived from shipment, customs or other licensed data.

It may establish:

- product;
- origin;
- destination;
- date or period;
- quantity or value;
- source and coverage limitations.

It does not establish current buyer demand, available supply or permission to contact a party.

## 3.4 Price Observation

A sourced price, range or index with:

- basis;
- currency;
- unit;
- geography;
- source;
- timestamp;
- observation type.

Price is not mandatory for the first agentic proof. Quantity can be the primary variable.

## 3.5 Business Evidence

A dated statement about a legal entity, member-business relationship or authority, derived from:

- member declaration;
- public registry;
- sanctions source;
- reviewed document;
- human review;
- other named evidence.

## 3.6 Ponte Inference

A conclusion derived from one or more observations.

It must:

- be labelled as inference or analysis;
- cite supporting evidence;
- state material gaps;
- never be described as an observed transaction or confirmed intention.

## 3.7 Commercial Development

A private Mission-specific synthesis combining facts and clearly labelled inference.

This is the agent's principal user-facing output.

---

# 4. Identity, Passport and permissions

## 4.1 Separate the person from the business

The domain model must distinguish:

- **Member:** authenticated individual;
- **Business:** legal or trading organisation;
- **Team Membership:** the person's relationship, role and permissions;
- **Business Passport:** reusable evidence-aware business identity.

The launch may support one person and one business operationally, but the schema must not permanently merge them.

## 4.2 Minimum account boundary

Registration collects only what is required for the current action:

- person name;
- business name;
- country;
- confirmed email or configured identity method.

Do not require a complete Business Passport at registration.

## 4.3 Business Passport

The Passport grows progressively through useful work.

Potential content:

**Identity**
- trading and legal names;
- jurisdiction;
- registration identifiers;
- address;
- website;
- year established;
- countries of operation;
- team and roles.

**Commercial profile**
- products and services;
- HS codes;
- origins and destinations;
- quantities/capacity;
- certifications;
- facilities;
- Incoterms;
- payment parameters;
- languages;
- approved descriptions.

**Evidence**
- member declarations;
- public-source checks;
- reviewed documents;
- role/authority evidence;
- dates, expiry and limitations.

**Reusable assets**
- logos;
- company description;
- catalogue;
- presentation;
- product images;
- approved credentials;
- signature block.

## 4.4 Vault

Reusable documents and assets must be:

- private by default;
- versioned;
- access-controlled;
- purpose-selected;
- malware-scanned where implemented;
- shared through an explicit approval event;
- auditable.

An uploaded document is not automatically authentic, checked or approved.

## 4.5 Permission principle

The AI may:

- observe;
- structure;
- compare;
- explain;
- recommend;
- draft;
- suggest an asset.

The workflow and permission engine determines whether an action can execute.

No external identity, document, payment, message or commercial representation leaves the business without the required recorded approval.

---

# 5. Commercial Missions and the agent

## 5.1 Definition

A Commercial Mission is a persistent, structured objective assigned to Ponte by a business.

Examples:

- Find Indian buyers for North American almonds.
- Monitor pistachio demand above 500 MT into India.
- Watch changes in Californian almond export quantities.
- Investigate credible requirements at Mundra and Nhava Sheva.
- Prepare a weekly management report on selected routes.

## 5.2 Mission setup

Mission setup begins with natural language.

Example:

> We trade almonds and pistachios from North and South America into India. Quantity matters more than price. Alert us when credible demand exceeds 500 MT.

Ponte proposes editable structured criteria:

- business side and role;
- target counter-intent;
- products and HS mappings;
- included/excluded specifications;
- origins;
- destinations and ports;
- quantity, unit and frequency;
- significance threshold;
- time horizon;
- evidence classes;
- priority variables;
- notification cadence;
- actions Ponte may prepare;
- actions requiring approval.

Ask only the next decisive missing question.

Do not turn Mission setup into a visible chatbot transcript.

## 5.3 Mission lifecycle

- `draft`
- `confirming`
- `active`
- `learning`
- `paused`
- `needs_attention`
- `archived`

## 5.4 Mission memory

Durable memory may include:

- confirmed criteria;
- structured feedback;
- approved business facts;
- developments already shown;
- actions prepared or executed;
- approached counterparties;
- outcomes;
- rejected markets or terms;
- preferences.

Raw conversations, external content and AI assumptions do not silently become authoritative memory.

## 5.5 Feedback

Store a structured reason, not only a thumbs-up or thumbs-down:

- Relevant—show more like this
- Relevant—prepare next action
- Watch only
- Wrong product
- Quantity too small
- Wrong market
- Wrong timing
- Already known
- Dismiss

A material Mission change must be proposed and approved.

---

# 6. Experience rules

## 6.1 Use before explanation

The visitor should understand Ponte by doing something useful.

Experience sequence:

> Recognise intent → take one simple action → receive a useful result → understand evidence → continue with control

## 6.2 Value before authentication

A visitor may begin and receive useful value before registration.

Authentication appears only when Ponte must:

- save;
- submit;
- disclose;
- spend;
- perform a material external action.

## 6.3 Preserve intent and work

At an account boundary:

- preserve the objective;
- preserve entered facts;
- preserve filters and selected object;
- preserve draft answers;
- resume the original action once;
- do not ask the user to start again;
- make retries idempotent.

## 6.4 One continuous working canvas

When a user is refining one objective, prefer a continuous canvas over:

- a generic dashboard;
- a feature-card menu;
- a chatbot transcript;
- a large multi-step form revealed prematurely.

## 6.5 Mobile first

Every journey must be reviewed at 390 × 844 before desktop approval.

Desktop expands the mobile experience; it does not replace it with an unrelated dashboard.

## 6.6 Required state set

Every meaningful screen or state must account for:

- default;
- loading;
- empty;
- incomplete;
- ambiguous;
- error;
- blocked;
- resumed;
- completed;
- offline where relevant;
- reduced motion;
- accessible announcements.

## 6.7 Workspace principle

The logged-in Home answers:

> What changed, and what should I do now?

Order:

1. Do now
2. Waiting on others
3. New intelligence
4. Active Missions
5. Recent outcomes

Do not label an item “Needs your attention” when the user cannot act.

---

# 7. Brand v5 implementation rules

## 7.1 Visual foundation

Core palette:

- Heritage cream: `#FCFBF7`
- Raised paper: `#FFFFFF`
- Sunken cream: `#F2EFE6`
- Ledger rule: `#E5DFD2`
- Press ink: `#0F0F0E`
- Secondary ink: `#3A3733`
- Muted stone: `#9A958A`
- Heritage gold: `#C9973A`
- Accessible gold text: approximately `#8A6520`
- Evidence positive: `#0F6E3D`
- Under review: `#4E6472`
- Blocked/danger: `#B4402A`

## 7.2 Typography

- Playfair Display: editorial and selected institutional headings;
- Inter: UI, controls, navigation and body;
- JetBrains Mono: dates, quantities, codes, references, countries and tabular facts.

Operational interfaces must remain compact and legible.

## 7.3 Gold rule

Gold represents the Ponte signal and restrained editorial emphasis.

Gold never means:

- pending;
- warning;
- uncertainty;
- risk;
- verification;
- approval;
- compliance status.

## 7.4 Prohibited visual patterns

Do not use:

- lime;
- violet;
- cyan;
- neon glow;
- rainbow gradients;
- crypto-style luminous status rings;
- red for “sell”;
- a generic blue SaaS aesthetic;
- a full dark application;
- colour alone to communicate meaning;
- fake activity or trust scores;
- generic handshake or container-ship stock imagery.

## 7.5 Qualified Opportunities versus Market Signals

They must be distinguishable across the room through:

- title language;
- content type;
- metadata hierarchy;
- evidence treatment;
- action;
- limitations;
- card/detail structure.

Do not create a blended “All” feed that obscures the type.

## 7.6 Migration of visual system

Apply Brand v5 journey by journey.

A global cleanup follows only after:

- the core vertical journeys are approved;
- remaining legacy pages have a known role;
- obsolete pages are retired or remapped.

---

# 8. Copy and claims

## 8.1 Tone

Ponte sounds:

- informed, not inflated;
- direct, not abrupt;
- selective, not theatrical;
- human, not casual;
- precise about uncertainty;
- confident about process and modest about outcome.

## 8.2 Writing rules

- Lead with the commercial point.
- State what happened, what it means and what happens next.
- Name evidence or source category when making a trust claim.
- Use exact dates where material.
- Use “Not stated”, “Not confirmed” or “Under review”.
- Separate declaration, check, review and guarantee.
- Avoid artificial urgency and generic superlatives.

## 8.3 Prohibited claims

Do not use:

- Verified counterparties. Real deals.
- Every listing vetted.
- Every deal papered.
- Documents are verified before anything is circulated.
- Verified deal.
- Trusted buyer or trusted seller.
- Numerical Trust Score.
- Percentage match score.
- Guaranteed.
- Risk-free.
- Safe counterparty.
- Bankable.
- Confirmed buyer/seller for a Market Signal.
- Active mandate without evidence.
- Uploaded document is authentic.
- Registration check proves solvency, authority or performance.

## 8.4 Canonical terminology

Use:

- Qualified Opportunity
- Market Signal
- Business information checked
- Role declared
- Authority sighted
- Opportunity reviewed
- Controlled introduction
- Ponte Desk
- Member
- Opportunity owner
- Last confirmed

Use “listing” only where required internally by the existing schema.

---

# 9. Master route and screen register

Screen IDs identify user-perceivable states, not necessarily separate URLs.

## 9.1 Intelligent entry — E

| ID | State | Purpose |
|---|---|---|
| E01 | Intelligent working canvas | Receive natural-language or voice objective |
| E02 | Objective resolving | Display only extracted facts |
| E03 | Decisive clarification | Ask one high-value missing question |
| E04 | Ambiguous route | Let the user correct the interpretation |
| E05 | Unsupported or unsafe request | Explain limits and offer a safe continuation |

## 9.2 Find demand/supply — F

| ID | State | Purpose |
|---|---|---|
| F01 | Contextual first results | Deliver useful evidence for the objective |
| F02 | Qualified Opportunity detail | Assess reviewed commercial intent |
| F03 | Market Signal detail | Assess unconfirmed indication and unknowns |
| F04 | Refine results | Adjust criteria without losing context |
| F05 | No current qualified match | State what was and was not found |
| F06 | Saved/watch state | Confirm an internal watch |

## 9.3 Structure and submit — S

| ID | State | Purpose |
|---|---|---|
| S01 | Rough requirement canvas | Receive pasted, typed or dictated information |
| S02 | Structured facts and gaps | Separate supplied facts, gaps and inconsistencies |
| S03 | Progressive completion | Resolve approval-critical gaps |
| S04 | Public/private/reviewer preview | Show who sees exactly what |
| S05 | Save/submit decision | Save a draft or submit for review |
| S06 | Submission received | Show reference, status and next action |

## 9.4 Check and verify — K

| ID | State | Purpose |
|---|---|---|
| K01 | Company identification | Collect name and jurisdiction |
| K02 | Candidate legal entities | Resolve ambiguity |
| K03 | Check-purpose choice | Verify my business or check a counterparty |
| K04 | Own-business verification preview | Explain evidence, consequences and limits |
| K05 | Private counterparty-check preview | Explain privacy and no badge effect |
| K06 | Source-check progress | Show deterministic source progress |
| K07 | Evidence receipt/result | Show dated findings and gaps |
| K08 | More information needed | Request precise correction/document |
| K09 | Source unavailable/not confirmed | Distinguish absence, mismatch and failure |

## 9.5 Market Signal investigation — I

| ID | State | Purpose |
|---|---|---|
| I01 | Investigation objective | Define what must be established |
| I02 | Role and capability | Capture commercial relevance |
| I03 | Proposed investigation | Show known, unknown and proposed route |
| I04 | Investigation received | Record reference and initial state |
| I05 | Scope proposed | Deliverables, exclusions, timing and fee |
| I06 | Investigation progress | Safe status without provenance leakage |
| I07 | Investigation outcome | Confirmed, current/no permission, unavailable or not confirmed |

## 9.6 Commercial Missions — M

| ID | State | Purpose |
|---|---|---|
| M01 | Mission preview | Convert current objective into persistent monitoring |
| M02 | Mission criteria | Confirm products, routes, quantities, evidence and cadence |
| M03 | Permission policy | Define internal versus approval-required actions |
| M04 | Mission active | Explain monitoring start and next events |
| M05 | Mission detail/health | Inspect criteria, sources, feedback and runs |
| M06 | Mission correction | Propose and approve material changes |
| M07 | Pause/archive | Stop monitoring while preserving history |

## 9.7 Intelligence and developments — D

| ID | State | Purpose |
|---|---|---|
| D01 | New intelligence list | Show threshold-crossing developments |
| D02 | Commercial Development | Explain change, relevance, evidence and recommendation |
| D03 | Evidence chain | Inspect facts and inference separately |
| D04 | Watch/dismiss feedback | Capture structured learning |
| D05 | Daily/weekly briefing | Provide management synthesis and limitations |

## 9.8 Prepared action, approval and execution — X

| ID | State | Purpose |
|---|---|---|
| X01 | Select next action | Watch, investigate, prepare response or request introduction |
| X02 | Prepared action | Assemble confirmed facts, text and suggested assets |
| X03 | Exact disclosure preview | Show recipient, purpose, identity, text and versions |
| X04 | Approval request | Edit, approve or decline the specific action |
| X05 | Execution progress | Execute one approved idempotent action |
| X06 | Execution completed | Record named outcome and next owner |
| X07 | Execution failed | Preserve approval/content and offer safe retry |

## 9.9 Authentication and resumption — G

| ID | State | Purpose |
|---|---|---|
| G01 | Contextual account boundary | Explain exactly why an account is needed |
| G02 | Authentication method/email | Begin authentication |
| G03 | Code/identity confirmation | Authenticate without losing work |
| G04 | Minimum person and business | Collect only minimum identity |
| G05 | Resuming your action | Restore and execute intended action once |
| G06 | Authentication/recovery failure | Preserve work and allow precise retry |

## 9.10 Home and Workspace — H

| ID | State | Purpose |
|---|---|---|
| H01 | Home agent briefing | Show what changed and matters |
| H02 | Do now | Show actions the member can perform |
| H03 | Waiting on others | Show correctly owned pending work |
| H04 | My opportunities | Draft, review, live and expiry states |
| H05 | Checks and business status | Own-business and private checks |
| H06 | Investigations and Ponte Desk | Requests, scopes and outcomes |
| H07 | Recent outcomes/activity | Immutable commercial history |

## 9.11 Business Passport, Vault and team — B

| ID | State | Purpose |
|---|---|---|
| B01 | Passport overview | Completion through useful work |
| B02 | Passport field editor | Edit versioned fact and visibility |
| B03 | Vault | Store reusable assets |
| B04 | Asset detail/version | Inspect status, expiry and sharing |
| B05 | Asset sharing selection | Approve purpose-specific use |
| B06 | Team and roles | Manage members and permissions |
| B07 | Agent/action permissions | Govern material-action approval |
| B08 | Notifications/preferences | Cadence, language and delivery |

## 9.12 Owned opportunities and introductions — O

| ID | State | Purpose |
|---|---|---|
| O01 | Owned opportunity detail | Manage lifecycle |
| O02 | Reconfirmation/change | Keep the opportunity current |
| O03 | Interest request list | Show structured requests |
| O04 | Owner review | Accept, decline or ask for clarification |
| O05 | Request introduction | Collect role-adapted commercial fit |
| O06 | Introduction prerequisites | Show blockers |
| O07 | Introduction completed | Record disclosure and unlock thread |

## 9.13 Communication and public service surfaces — T/P

| ID | State | Purpose |
|---|---|---|
| T01 | Opportunity-specific thread | Communicate after completed introduction |
| T02 | Ponte Desk thread | Communicate about a check, investigation or engagement |
| T03 | Deliberate document share | Preview and approve asset disclosure |
| P01 | Founding invitation | Explain invitation without changing permissions |
| P02 | Ponte Desk overview | Explain human services and boundaries |
| P03 | Desk enquiry | Structure objective, role and desired outcome |
| P04 | How Ponte works | Explain publication, investigation and introductions |

## 9.14 Admin and reviewer — A

| ID | State | Purpose |
|---|---|---|
| A01 | Priority operations home | Order risk and member-blocking work |
| A02 | Verification case | Decide from facts and evidence |
| A03 | Opportunity review | Request information, approve, reject or withdraw |
| A04 | Market Signal review | Approve safe public version, expire or withdraw |
| A05 | Investigation case | Triage, scope, outreach and resolve |
| A06 | Introduction blocker | Resolve verification/disclosure prerequisites |
| A07 | Agent/action exception | Inspect preparation or execution failure |
| A08 | Source/notification failure | Restore source or delivery |
| A09 | Decision/audit confirmation | Confirm transition and notification |

## 9.15 Shared system states — SYS

All route families must reuse consistent system behaviours for:

- loading;
- no data;
- source unavailable;
- permission denied;
- session expired;
- offline;
- partial failure;
- duplicate action;
- stale object;
- retry;
- inaccessible object;
- maintenance;
- account closure/withdrawal;
- reduced motion and accessible announcements.

---

# 10. Named end-to-end journeys

## J01 — Intelligent entry

1. Visitor types or speaks an objective.
2. Ponte preserves the original words.
3. Ponte extracts only supplied facts.
4. Ponte displays the interpreted role, counter-intent, product, quantity and market.
5. Ponte asks only the next decisive question when required.
6. Ponte continues directly into the correct route.
7. Useful value appears before registration.

## J02 — Create and activate a Commercial Mission

1. Begin from an interpreted objective or result.
2. Show Mission preview.
3. Confirm criteria and thresholds.
4. Confirm evidence classes.
5. Confirm cadence.
6. Set permissions for internal and external actions.
7. Authenticate only when saving/activating.
8. Resume and activate.
9. Show the named outcome and Workspace record.

Named outcome:

> Mission active

## J03 — Receive and act on a Commercial Development

1. Evidence crosses a Mission threshold.
2. Ponte creates a cited Development.
3. User sees change, relevance, evidence, unknowns and recommendation.
4. User watches, dismisses, investigates or prepares an action.
5. Feedback updates structured Mission memory.
6. External/material action moves through exact preview and approval.
7. Outcome appears in Workspace.

## J04 — Find and request a Qualified Opportunity

1. Objective is interpreted.
2. Results separate Qualified Opportunities and Market Signals.
3. Search context remains visible.
4. User opens a Qualified Opportunity.
5. First viewport shows decisive commercial facts.
6. User begins role-adapted commercial-fit questions before authentication.
7. Passport facts are reused where approved.
8. User previews owner-facing information.
9. Required account/verification boundary appears.
10. Request submits and enters Workspace.

Named outcome:

> Introduction request sent · awaiting owner review

## J05 — Structure and submit

1. User supplies rough information.
2. Ponte separates supplied facts, gaps, authority/evidence and private information.
3. User resolves high-value gaps.
4. Passport/Vault information is reused.
5. User previews public, private and reviewer views.
6. Save/submit triggers the account boundary.
7. Review begins.

Named outcome:

> Opportunity submitted for review

## J06 — Check or verify a business

1. User enters company and country.
2. Ponte resolves candidate legal entities.
3. User chooses own-business verification or private counterparty check.
4. Source-by-source evidence appears with dates and limits.
5. Relevant account/credit boundary appears only when required.
6. Result is recorded in the correct private history or Passport context.

## J07 — Investigate a Market Signal

1. User opens a signal or supplies an external lead.
2. Ponte separates known, unknown and restricted provenance.
3. Ponte proposes an investigation route.
4. User states question, role and capability.
5. Account/scope boundary appears.
6. Review or Ponte Desk performs the agreed work.
7. A confirmed case creates or links a Qualified Opportunity.

## J08 — Controlled introduction

1. Requester provides structured commercial fit.
2. Owner reviews without unnecessary identity disclosure.
3. Required checks and blockers resolve.
4. Owner accepts in principle.
5. Required disclosure approval occurs.
6. Contact details are disclosed and recorded.
7. Opportunity-specific thread opens.
8. Documents are shared only through explicit selection and approval.
9. Workspace records the outcome and next owner.

## J09 — Workspace return

The member sees:

1. Do now
2. Waiting on others
3. New intelligence
4. Active Missions
5. Recent outcomes

## J10 — Admin/reviewer operation

Queue priority:

1. security and sanctions;
2. blocked disclosures;
3. member responses;
4. business verification;
5. opportunity review;
6. investigations and Ponte Desk;
7. Market Signal quality and expiry;
8. agent/action failures;
9. source and notification failures.

No one-click AI approval.

---

# 11. Technical architecture

## 11.1 Existing stack to preserve unless a documented reason requires change

- Next.js App Router;
- TypeScript;
- Tailwind/CSS;
- Supabase authentication, PostgreSQL and storage;
- Stripe credits where active;
- Resend transactional email;
- Anthropic-backed current AI functions;
- Netlify deployment;
- `next-intl`;
- PWA/service worker where currently supported.

## 11.2 Required service boundaries

**Experience API / orchestrator**
- preserve session and pending action;
- route objectives;
- return experience states rather than raw rows;
- compose deterministic facts with labelled interpretation;
- enforce tenant and permissions;
- maintain idempotency.

**Identity, Business and Passport**
- authentication;
- members, businesses and team memberships;
- Passport fields and visibility;
- purpose-separated checks;
- roles and permissions.

**Evidence and Vault**
- evidence items and receipts;
- source/date/result/limitations;
- secure asset metadata;
- versions and disclosure.

**Opportunity, Signal and Observation**
- distinct object types and lifecycles;
- public/private versions;
- review/publication gates;
- expiry/reconfirmation;
- provenance;
- SEO-safe public models.

**Mission engine**
- structured criteria;
- threshold evaluation;
- duplicate/novelty handling;
- mission health;
- feedback and cadence.

**Agent runtime**
- interpret retrieved evidence;
- generate cited Developments;
- recommend actions;
- prepare drafts;
- never bypass workflow/permission.

**Workflow, policy and approval**
- lifecycle transitions;
- Work Items;
- action ownership;
- Approval Requests;
- idempotent execution;
- timeout/reminders;
- human review;
- audit events.

**Messaging and notification**
- in-product notifications;
- email;
- digests;
- post-introduction and Desk threads;
- delivery status;
- sensitive disclosure.

**Admin and Ponte Desk**
- verification;
- opportunity and signal review;
- investigations;
- disclosure blockers;
- agent/action exceptions;
- source failures;
- document review;
- moderation and audit.

## 11.3 Minimum domain objects

Claude Code must map current tables and APIs to these conceptual objects before proposing schema changes:

- Member
- Business
- Team Membership
- Business Passport Field
- Vault Asset
- Evidence Item
- Evidence Receipt
- Verification Case
- Qualified Opportunity
- Market Signal
- Trade Movement
- Price Observation
- Commercial Mission
- Mission Criteria
- Mission Permission Policy
- Commercial Development
- Work Item
- Prepared Action
- Approval Request
- Execution
- Introduction Request
- Investigation
- Ponte Desk Engagement
- Conversation Thread
- Activity Event
- Outcome
- Mission Memory

Do not automatically create one table per conceptual object. First inspect what can be safely mapped to existing structures.

---

# 12. Repository and migration safety

## 12.1 Source of truth

The canonical repository is `Geppix140269/ponte`, with `main` as the production source of truth.

Before work:

- read `docs/platform/SOURCE-OF-TRUTH.md`;
- read `docs/platform/APPLY-PENDING.md`;
- read `docs/platform/VERSIONS.md`;
- read `docs/platform/RUNBOOK.md`;
- read `docs/platform/EVOLUTION-INVENTORY.md`;
- inspect current `CLAUDE.md`, `AGENTS.md` and obsolete instructions;
- report contradictions.

## 12.2 Production-schema rule

Before any migration:

1. inspect the live schema;
2. confirm tables, columns, types, constraints, indexes, functions, triggers, RLS and buckets;
3. compare production with repository migrations;
4. identify the migration ledger and interruptions;
5. use additive, idempotent changes;
6. prove post-migration behaviour;
7. provide rollback or safe-disable instructions.

Do not execute a migration merely because a file exists.

Do not touch deferred legacy-table drops unless explicitly approved.

## 12.3 Security and privacy

Required:

- tenant isolation on private queries;
- server-side authorisation;
- least privilege;
- explicit disclosure events;
- private storage for sensitive assets;
- signed access where appropriate;
- no public private-object URLs;
- complete audit for material decisions;
- external text treated as untrusted input;
- schema-validated model output;
- allowlisted tools;
- external actions fail closed;
- idempotent retry;
- minimal sensitive context.

## 12.4 Stripe

Do not expand credit sales or new paid in-app functions until fulfilment replay safety is verified.

Required tests:

- duplicate event grants once;
- partial failure cannot double-grant;
- out-of-order events cannot add credits incorrectly.

---

# 13. Implementation programme

The programme is organised around complete journeys, not groups of similarly styled pages.

## Phase 0 — Repository-to-architecture gap report

**No implementation. No migration. No global style change.**

Deliver:

1. current route inventory;
2. current major component inventory;
3. current database/API inventory;
4. map to every route family and conceptual domain object;
5. classify each item as:
   - aligned;
   - partially aligned;
   - reusable infrastructure;
   - obsolete;
   - missing;
   - unsafe or contradictory;
6. identify visual debt separately from workflow/data debt;
7. identify every L1-L4 and Trust Score dependency;
8. assess the merged landing implementation;
9. identify schema drift and migration hazards;
10. propose a thin vertical-slice implementation plan;
11. list assumptions and questions;
12. stop for approval.

## Phase 1 — First agentic vertical slice

Build the smallest truthful version of:

> Mission setup → meaningful Development → evidence chain → recommended action → prepared response or investigation → exact preview → human approval → recorded Workspace outcome

Primary screen IDs:

- E01-E03 as needed from the current landing;
- M01-M04;
- D01-D04;
- X01-X07;
- G01-G06;
- H01-H03 and H07.

Use the Balcorp-style proof:

- almonds and pistachios;
- Americas into India;
- quantity primary;
- threshold such as 500 MT;
- Qualified Opportunities, Market Signals and any available trade movements kept distinct;
- one alert;
- one prepared action;
- one approval;
- one recorded outcome.

A thin test dataset may be used, but it must be clearly illustrative or safely derived from approved data.

**Acceptance**

A member can say:

> Ponte understands what quantity matters, explains the evidence, prepares the right next action and does not commit the business without approval.

## Phase 2 — Discovery and opportunity request

Implement:

- F01-F06;
- F02 Qualified Opportunity detail;
- F03 Market Signal detail;
- O05-O07 minimum;
- the relevant authentication/resumption path;
- truthful no-result and saved-watch states.

**Acceptance**

A visitor sees separate content classes, receives useful value before joining and can submit a controlled-introduction request without losing work.

## Phase 3 — Structure and submit

Implement:

- S01-S06;
- progressive facts/gaps;
- public/private/reviewer preview;
- Passport reuse where available;
- human review entry;
- H04;
- A03 minimum.

**Acceptance**

A rough requirement becomes a truthful, reviewable submission without invented facts or premature publication.

## Phase 4 — Business check and verification compatibility migration

Implement:

- K01-K09;
- own-business versus counterparty purpose separation;
- evidence receipt;
- compatibility mapping from existing L1-L4 fields;
- no primary Trust Score;
- H05;
- B01/B02 minimum;
- A02 minimum.

Any database migration requires separate approval after the Phase 0 dependency report.

**Acceptance**

The user understands exactly what was checked, when, from which source, what remains unknown and what the result does and does not mean.

## Phase 5 — Market Signal investigation and Ponte Desk

Implement:

- I01-I07;
- P02-P03;
- T02;
- H06;
- A05;
- safe provenance and status handling.

**Acceptance**

A request can be received, scoped, investigated and resolved without leaking source identity or implying that unconfirmed information is false.

## Phase 6 — Business Passport and Vault

Implement:

- B01-B08;
- progressive completion;
- asset versioning;
- purpose-specific selection;
- team and approval permissions.

**Acceptance**

Ponte reuses approved business facts and one selected asset in a prepared action without re-entry or uncontrolled sharing.

## Phase 7 — Controlled introductions and messaging

Implement:

- O01-O07 complete;
- T01 and T03;
- disclosure blockers;
- post-introduction thread;
- document sharing;
- A06.

**Acceptance**

Commercial fit precedes contact, disclosure is recorded and communication opens only at the correct stage.

## Phase 8 — Admin, resilience and operations

Complete:

- A01-A09;
- source failures;
- notification failures;
- agent/action exceptions;
- operational SLAs;
- audit export;
- system states and recovery.

## Phase 9 — Remaining content, account and Brand v5 convergence

Only after the complete journeys are approved:

- repaint or replace remaining legacy pages;
- About;
- How It Works;
- legal;
- account;
- pricing/credits where active;
- email templates;
- remaining admin surfaces;
- external brand assets;
- remove obsolete style aliases and dead routes.

---

# 14. First Claude Code assignment

Claude Code must receive this exact instruction after this file is committed:

> Read `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` in full before taking any action.
>
> Do not implement the app-wide rebrand. Do not change L1-L4, the Trust Score, global tokens, migrations or routes.
>
> Inspect the current `main`, including merged PR #15, and produce the Phase 0 repository-to-architecture gap report defined in section 13.
>
> Map every current route, major component, API and relevant database structure to:
>
> - the Route Atlas IDs;
> - the conceptual domain objects;
> - the end-to-end journeys;
> - the approved Brand v5 and copy rules.
>
> Separate:
>
> - reusable engineering infrastructure;
> - visual debt;
> - product-flow debt;
> - data-model gaps;
> - security or migration risk;
> - obsolete routes/components.
>
> Explicitly identify:
>
> - all L1-L4 and Trust Score dependencies;
> - all places Qualified Opportunities and Market Signals are blended or confused;
> - all authentication boundaries that lose user work;
> - all external actions lacking deterministic approval or idempotency;
> - all routes that PR #15 currently hands off to;
> - all conflicts between repository documentation and this brief.
>
> Assess the merged homepage as retain, revise or replace within the connected journey, but do not modify it yet.
>
> Then propose the smallest Phase 1 vertical slice with:
>
> - exact route/state IDs;
> - existing files to reuse;
> - files likely to change;
> - proposed schema/API additions;
> - migrations that may eventually be required;
> - test plan;
> - risks;
> - rollback/safe-disable plan;
> - unresolved decisions.
>
> Stop after the report. Do not create a branch, commit, PR or migration unless Giuseppe explicitly approves implementation.

---

# 15. Delivery protocol for later implementation phases

For every approved phase:

1. Create one dedicated branch.
2. State scope and exclusions before coding.
3. Read the relevant sections of this brief.
4. Inspect production schema before migrations.
5. Reuse existing infrastructure where safe.
6. Keep changes additive and reversible.
7. Test mobile first.
8. Use a deploy preview.
9. Stop with:
   - changed files;
   - schema changes;
   - tests;
   - build results;
   - manual checks;
   - environment changes;
   - migration application status;
   - rollback/safe-disable;
   - remaining known gaps.
10. Do not start the next phase without approval.

A phase should be a complete, reviewable journey slice—not a large collection of unrelated screens.

---

# 16. Core acceptance suite

## 16.1 Product truth

- Qualified Opportunities and Market Signals are always distinct.
- Trade Movements are never described as buyer demand.
- Inference is labelled and cited.
- Missing facts remain missing.
- No unsupported trust or transaction claims.
- No public provenance leakage.

## 16.2 Authentication and resumption

- Visitor receives value before account creation.
- Account gate explains the exact reason.
- Work survives authentication.
- Original intended action runs once.
- Retry is safe and idempotent.

## 16.3 Verification

- Own-business and counterparty checks are separate.
- A private counterparty check does not change the member's public/business status.
- No Trust Score is the principal user-facing result.
- Evidence shows source, date, result and limitation.
- Source unavailable is not treated as a negative finding.

## 16.4 Opportunities

- Imported data cannot become a Qualified Opportunity automatically.
- Publication requires the correct human gate.
- Expired records leave public surfaces.
- Changes requiring review cannot bypass it.
- Structured interest precedes contact disclosure.

## 16.5 Market Signals

- Public signal has safe facts only.
- Mandatory unconfirmed meaning is clear.
- Investigation does not reveal identity.
- Confirmed case produces a normal Qualified Opportunity.
- No response means not confirmed, not false.

## 16.6 Agent and actions

- Development cites evidence and unknowns.
- Recommendation is proportionate.
- Exact preview shows recipient, purpose, identity, content and assets.
- External action requires recorded approval.
- Execution is idempotent.
- Failure preserves the approved content and allows safe retry.
- Outcome is recorded in Workspace.

## 16.7 Workspace

- Do now contains only actions the user can perform.
- Waiting on others has the correct owner.
- Notifications map to stored events.
- AI does not invent tasks or states.
- Recent outcomes are immutable/auditable.

## 16.8 Security and operations

- Private queries are tenant-scoped.
- Sensitive files are not public.
- Disclosure is explicit and logged.
- Admin sees source facts beside AI assistance.
- No one-click AI approval.
- Email failure is visible operationally.
- Stripe fulfilment is replay-safe before sales expansion.

## 16.9 UX and accessibility

- 390 px mobile has no horizontal overflow.
- Desktop is an adaptation, not a different product.
- Keyboard access works.
- Focus is visible.
- Motion has reduced-motion behaviour.
- Status does not rely on colour alone.
- Important dynamic changes are announced accessibly.
- Mixed-direction and multilingual content are tested where supported.

---

# 17. Explicitly deferred

Do not introduce without a later architecture decision:

- open public member chat or Agora;
- generic direct messaging;
- full deal rooms;
- autonomous outreach;
- autonomous document sharing;
- automatic publication;
- automatic verification rejection;
- white-label networks;
- affiliate commission dashboards;
- subscription expansion;
- success-fee automation;
- large-scale thin SEO pages;
- unsupported “live market” claims;
- agent actions outside the workflow engine.

---

# 18. Definition of success

The product succeeds when a member can say:

> Ponte understands what my business is trying to achieve. It watches the right evidence, separates facts from signals and inference, tells me what matters, prepares the next action using information I have already approved, and never commits my business without my control.

This is the build standard.
