# Ponte Trade Deal Room Detailed Product Definition v1

- **Status:** Proposed for product-owner approval
- **Proposal date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Source issues:** #51 and #54
- **Implementation status:** Not started
- **Scope:** Product definition only; no screen design, schema, migration, billing or runtime implementation

## 1. Purpose

This document completes the next substantive product-definition phase for the Ponte Trade Deal Room before Design.

It defines:

1. the end-to-end journey;
2. the MVP screen register;
3. the conceptual domain model;
4. the permission matrix;
5. the lifecycle and state machines;
6. the stable weighted progress model;
7. the Deal Passport generation model; and
8. the staged delivery plan.

The governing hierarchy remains:

```text
Structured Deal
  -> master Deal Room
       -> private counterparty sub-rooms
       -> private provider or adviser sub-rooms
       -> private internal workstreams
  -> attributable Deal Passport history
```

The master room coordinates one defined Deal. Sub-rooms protect each negotiation or workstream. Private facts never leak across sub-room boundaries.

---

# 2. End-to-End Journey

## 2.1 Entry routes

A master Deal Room may begin from:

- the owner of a published structured Deal;
- an interested counterparty opening a room around another member's Deal;
- a qualified direct member-to-member discussion;
- a Ponte-investigated Market Signal with a viable contact route;
- an imported existing transaction;
- an institutionally sponsored programme; or
- a Ponte-facilitated case.

A public signal, incomplete Deal, casual expression of interest or unqualified lead does not automatically create an active room.

## 2.2 Journey phases

### Phase A — Select or complete the Deal

The initiator selects an eligible structured Deal or completes the minimum Deal definition.

The Deal must identify:

- one market family;
- one family-valid intent;
- commercial subject;
- owner organisation;
- material scope facts;
- confidentiality boundary;
- current validity state.

Possible outcomes:

- Deal complete and eligible;
- missing facts;
- expired or withdrawn Deal;
- owner eligibility incomplete;
- Deal rejected under policy.

### Phase B — Choose room entitlement

The initiator chooses:

- Starter Deal Room where eligible;
- Portfolio subscription slot;
- Ponte Credits;
- institutional sponsorship;
- promotional entitlement; or
- authorised waiver.

The entitlement is reserved, not finally consumed.

Possible outcomes:

- entitlement reserved;
- payment required;
- Starter already used;
- no available subscription capacity;
- payment failed;
- entitlement rejected;
- sponsor changed.

### Phase C — Prepare the master room

The initiator defines:

- master-room title and reference;
- linked Deal and version snapshot;
- master-room purpose;
- sponsor and administrator;
- operating mode;
- proposed completion condition;
- room-wide confidentiality rules;
- initial private sub-room;
- required principal participant.

The master room remains proposed.

### Phase D — Invite principal participant

The first private sub-room is created for the intended principal counterparty.

The invitation reveals only:

- the inviting organisation;
- Deal subject at the permitted preview level;
- proposed role;
- room sponsor;
- admission requirements;
- applicable terms;
- invitation expiry.

It does not reveal protected room evidence or other sub-rooms.

### Phase E — Participant prerequisites

The invited participant must:

- authenticate;
- identify the organisation or declared capacity represented;
- satisfy the Deal Room-ready Business Passport threshold;
- declare the transaction role;
- declare participation authority;
- accept the Participation Agreement;
- accept NDA and confidentiality obligations;
- accept applicable room-specific rules.

Possible outcomes:

- admitted;
- prerequisite incomplete;
- clarification required;
- authority not accepted;
- terms declined;
- invitation declined;
- invitation expired;
- participant removed before admission.

### Phase F — Activation

The master room activates when:

- the minimum required principal participant is admitted;
- the applicable entitlement becomes active;
- no mandatory policy blocker remains.

Activation begins the Starter or credit-funded term where applicable.

Possible outcomes:

- active;
- payment failed after reservation;
- Starter consumed;
- reservation released;
- room rejected before activation;
- activation suspended pending policy review.

### Phase G — Procedure proposal

The authorised initiator or Ponte facilitator proposes:

- stages;
- steps;
- responsibilities;
- dependencies;
- deadlines;
- evidence requirements;
- approval requirements;
- conditions;
- completion definition.

No procedural percentage is shown before agreement. The room shows a named state such as `Procedure proposed`.

### Phase H — Procedure agreement

Required principal approvers may:

- approve;
- request amendment;
- object;
- seek clarification.

The procedure becomes governing only after all required approvals.

A material change creates a new version.

### Phase I — Active progression

Participants work through:

- assigned steps;
- evidence requests and submissions;
- clarification cycles;
- conditions;
- decisions and approvals;
- blockers;
- invitations to supporting providers;
- milestones;
- next actions.

Each participant sees only the master-room facts and sub-room facts permitted to them.

### Phase J — Blocked, paused or expired

#### Blocked

A blocker must identify:

- description;
- category;
- affected step or condition;
- owner;
- resolution requirement;
- due date where relevant;
- escalation path;
- resolution, waiver or closure decision.

Progress already earned remains visible.

#### Paused

Pause requires:

- initiator;
- reason;
- effective date;
- deadline effect;
- resumption condition.

#### Entitlement expired

After the applicable grace rule, the master room and sub-rooms become read-only. No history is deleted. Upgrade or restoration resumes the same room.

### Phase K — Ready to proceed

A room reaches `Ready to proceed` when:

- all mandatory procedure steps are complete;
- all mandatory conditions are met or validly waived;
- required evidence has reached the necessary procedural state;
- required approvals are recorded;
- no critical blocker remains;
- required principal parties confirm readiness.

This does not prove that a contract, payment or shipment has occurred.

### Phase L — Completion and closure

Possible closure outcomes include:

- ready for external contracting;
- purchase order evidenced;
- contract execution evidenced;
- service engagement agreed;
- distribution appointment agreed;
- inspection or sample phase completed;
- qualified no-go;
- withdrawn;
- expired;
- blocked and unable to proceed;
- completed transaction evidence supplied later.

Closure records:

- outcome;
- closure reason;
- approving participants;
- final procedure version;
- unresolved matters;
- final evidence and decision states;
- Deal Passport eligibility;
- retention and reopening rules.

## 2.3 Exception paths

### Declined invitation

- reservation released;
- Starter entitlement not consumed;
- no protected content disclosed;
- sponsor may invite another eligible principal under the anti-abuse policy.

### Missing required participant

- room remains proposed or `Awaiting principal participant`;
- procedure cannot become agreed;
- entitlement is not finally consumed before activation;
- invitation may be corrected or replaced.

### Participant removed after activation

- access revoked immediately;
- prior attributable actions remain in audit history;
- unresolved responsibilities become unassigned or reassigned;
- room may become blocked if the removed participant was mandatory.

### Organisation changes representative

- new representative completes admission;
- organisation role persists;
- prior individual actions remain attributable;
- authority declaration is renewed.

### Material Deal change

Changes to product, lot, territory, quantity, mandate, legal entity or procedure may require:

- new Deal version;
- new procedure version;
- renewed participant approval;
- separate master room where scope is materially distinct.

### Competing counterparties

- each receives a private sub-room;
- no counterparty can infer another branch;
- master-room sponsor sees aggregate status without automatically sharing terms across branches.

---

# 3. MVP Screen Register

The register defines product surfaces, not visual design.

| ID | Screen or surface | Purpose | Primary actions | Required data | Permission boundary | Empty, blocked or error treatment | Mobile treatment |
|---|---|---|---|---|---|---|---|
| DR-01 | Deal Room entry decision | Explain Starter, subscription and credits and select entitlement | Choose Starter, use slot, use credits, cancel | Deal eligibility, organisation eligibility, entitlement state | Deal owner or eligible initiator | Show exact reason when unavailable; preserve Deal | Single-column choice cards; sticky primary action |
| DR-02 | Proposed master room builder | Define master-room purpose and first sub-room | Confirm scope, sponsor, operating mode, completion condition | Linked Deal snapshot, sponsor, room mode | Initiator and authorised internal users | Missing facts listed explicitly; no silent defaults | Progressive sections; summary drawer |
| DR-03 | Invitation preview | Show what invitee will receive | Send, edit, cancel | Preview facts, role, terms, expiry | Initiator or authorised sub-room admin | Invalid recipient or duplicate organisation warning | Compact preview and confirmation |
| DR-04 | Invitation landing | Let invitee understand and respond | Accept, decline, sign in | Inviter, Deal preview, role, requirements | Invite token holder only | Expired, revoked or already accepted state | No app chrome; clear trust and privacy explanation |
| DR-05 | Admission checklist | Complete prerequisites | Business Passport, role, authority, terms, NDA | Participant, organisation, required documents and terms | Invitee only; Ponte where authorised | Show incomplete item and consequence | Step-by-step checklist |
| DR-06 | Master-room portfolio | Show all master Deals and room states | Open, filter, create, upgrade | Master rooms, entitlement, next action, stage | Organisation users according to role | No rooms: show Starter CTA; over-capacity: show restoration path | Cards prioritising next action |
| DR-07 | Master-room command view | Coordinate one Deal across sub-rooms | Review status, create sub-room, manage procedure, close | Deal overview, stage, progress, milestones, sub-room summaries | Sponsor team; limited master facts for admitted participants | Blocked and read-only banners | Prioritise next action, stage and blocker |
| DR-08 | Sub-room workspace | Conduct one private negotiation or workstream | Comment, add evidence, complete tasks, propose decision | Participants, procedure subset, evidence, decisions | Admitted sub-room participants only | No cross-room inference; explicit access-denied state | Tabbed or segmented core objects, not dense desktop replica |
| DR-09 | Procedure builder | Propose or revise procedure | Add stages, steps, dependencies, evidence, approvers | Procedure template, participants, completion condition | Authorised proposer | Cannot activate percentage before approval | Ordered step editor; simplified dependency treatment |
| DR-10 | Procedure approval | Review and approve a version | Approve, object, request amendment | Proposed version and changes | Required approvers only | Show missing approvers and unresolved objections | Diff-first review |
| DR-11 | Step and condition detail | Complete one unit of work | Submit, assign, clarify, approve, block | Owner, due date, evidence, dependencies | Relevant participants | Explain why action unavailable | Focused task page with bottom action bar |
| DR-12 | Evidence register | Manage evidence and disclosure | Upload, request, review, clarify, supersede | Evidence metadata, visibility, linked object | According to evidence ACL | Distinguish no evidence, inaccessible evidence and failed upload | List with state and owner; defer complex preview where needed |
| DR-13 | Evidence detail | Review one item | Accept for procedure, reject, request clarification | File/version, provenance, review history | Selected viewers and reviewers | Never imply authenticity from upload | Mobile metadata-first; secure preview where supported |
| DR-14 | Decisions and approvals | Create durable decisions | Propose, approve, object, amend | Decision text, approvers, linked evidence | Named participants | Pending approver and conflict states | Decision cards with clear status |
| DR-15 | Blocker centre | Make impediments visible and owned | Create, assign, resolve, waive, escalate | Blocker category, owner, linked objects | Relevant room participants | No blockers: positive neutral state | Prioritised blocker list |
| DR-16 | Participant and access centre | Manage roles and visibility | Invite, revoke, change role, inspect acceptance | People, organisations, roles, states, terms versions | Admins; limited self-view for participants | Missing required participant warning | Organisation-grouped list |
| DR-17 | Entitlement and usage | Show room access, time and capacity | Upgrade, buy credits, restore | Starter, subscription, credits, guest use, expiry | Sponsor and billing admins | Payment failure and read-only restoration | Usage summary and direct actions |
| DR-18 | Activity and recap | Explain what changed | Filter, acknowledge, generate recap | Attributable events and AI summaries | Permission-filtered | Never summarise inaccessible content | Chronological concise feed |
| DR-19 | Closure review | Confirm outcome and Passport treatment | Close, choose outcome, confirm visibility | Final procedure, conditions, outcomes, evidence | Required principal approvers or authorised admin | Cannot claim completion without required evidence | Guided closure checklist |
| DR-20 | Deal Passport | Show evidence-backed organisation history | Review, disclose, dispute, withdraw voluntary fact | Passport facts, provenance, confidence/limitation, visibility | Organisation owner; viewers per fact | No history: explain how it is earned | Fact cards grouped by evidence category |
| DR-21 | Read-only room | Preserve history after expiry or closure | Review, export permitted summary, upgrade or reopen | Frozen room and permission state | Existing permitted participants | Explain why actions are disabled | Same information hierarchy with actions removed |

## 3.1 Global product states

Every relevant screen must handle:

- loading;
- no data;
- access denied;
- invitation expired;
- participant suspended;
- entitlement expired;
- payment failed;
- read-only;
- room blocked;
- room paused;
- conflicting update;
- deleted or superseded evidence;
- offline or retryable failure.

No action may appear available if the participant lacks permission or entitlement.

---

# 4. Conceptual Domain Model

This section defines objects and relationships, not tables or SQL.

## 4.1 Core objects

### Organisation

A legal or declared business entity participating in Ponte.

### Person

An authenticated individual acting for an organisation or declared professional capacity.

### Business Passport

Evidence and declarations about identity, organisation, relationship, role and eligibility.

### Structured Deal

The upstream commercial object describing one requirement, offer, service, distribution or representation intention.

### Deal Version

An immutable snapshot of the Deal at a material point in time.

### Master Deal Room

The entitled parent workspace for progressing one defined Deal.

### Sub-room

A permission-isolated workspace beneath the master room for one counterparty, provider, adviser or internal group.

### Participation

The relationship between a person, organisation, master room or sub-room, including role, state, permissions and acceptance records.

### Invitation

A time-bound request to join a master room or sub-room in a stated role.

### Agreement Acceptance

Versioned acceptance of Participation Agreement, NDA, rules or authority declaration.

### Entitlement

The commercial right enabling active room progression: Starter, subscription slot, credits, sponsored, promotional or waived.

### Procedure

The governing plan for progressing the Deal.

### Procedure Version

An immutable approved or proposed version of the procedure.

### Stage

A meaningful grouping of steps within the procedure.

### Step

A defined unit of required work with owner, dependencies, evidence and completion rules.

### Condition

A requirement that must be met or waived before a stated outcome.

### Evidence Item

A file, structured declaration, external reference or recorded fact supplied for a procedure purpose.

### Evidence Version

An immutable version of an evidence item.

### Disclosure Grant

A permission allowing selected participants to access evidence or information.

### Clarification Request

A structured question linked to evidence, step, condition or decision.

### Decision

A durable proposed or agreed determination.

### Approval

A participant response to a procedure, evidence state, decision, waiver or closure.

### Blocker

An impediment that prevents or materially delays progression.

### Milestone

A meaningful earned event generated by defined completion conditions.

### Progress Snapshot

A stable calculation of procedural completion for a specific procedure version and object state.

### Activity Event

An attributable event describing what changed, by whom and when.

### Closure Record

The final or interim room outcome and retention state.

### Deal Passport Fact

An evidence-backed historical fact derived from a Deal Room event or outcome.

### Dispute Record

A challenge to a Deal Passport fact, evidence state, participant action or outcome attribution.

## 4.2 Relationships

```text
Organisation
  -> has Persons
  -> has Business Passport
  -> owns or participates in Structured Deals
  -> sponsors or participates in Master Deal Rooms
  -> accumulates Deal Passport Facts

Structured Deal
  -> has Deal Versions
  -> has zero or more Master Deal Rooms

Master Deal Room
  -> references one Deal Version
  -> has one Entitlement at a time
  -> has Participants
  -> has one or more Sub-rooms
  -> has Procedure Versions
  -> has Activity Events
  -> closes through a Closure Record

Sub-room
  -> has Participants
  -> exposes a permitted subset of Procedure, Steps and Conditions
  -> contains private Evidence, Clarifications, Decisions and Blockers

Closure Record and attributable events
  -> may generate Deal Passport Facts
```

## 4.3 Object invariants

- A master room references exactly one defined Deal scope at a time.
- A sub-room belongs to exactly one master room.
- A participant sees no sub-room without explicit admission or inherited authorised access.
- A procedure version never changes after approval; amendments create another version.
- Evidence acceptance for procedure purposes does not prove authenticity.
- A progress snapshot is reproducible from the same approved procedure version and object states.
- A Deal Passport fact always retains provenance and visibility rules.
- Payment never changes commercial decision authority.

---

# 5. Permission Matrix

## 5.1 Roles

- Deal owner administrator
- Master-room sponsor administrator
- Principal participant approver
- Principal participant contributor
- Intermediary or representative
- Supporting provider
- Adviser
- Internal organisation member
- Ponte facilitator
- Ponte platform administrator
- Observer
- Invited but not admitted person
- Removed or suspended participant

## 5.2 Core permissions

Legend: `A` allowed; `C` conditional; `N` not allowed.

| Capability | Deal owner admin | Sponsor admin | Principal approver | Principal contributor | Intermediary | Provider/adviser | Ponte facilitator | Observer | Invited not admitted | Removed/suspended |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| View public Deal | A | A | A | A | A | A | A | A | C | C |
| View protected master facts | A | A | A | A | C | C | C | C | N | N |
| View all sub-room portfolio metadata | C | A | N | N | N | N | C | N | N | N |
| Enter one sub-room | C | C | A | A | C | C | C | C | N | N |
| Create sub-room | C | A | N | N | C | N | C | N | N | N |
| Invite participant | C | A | C | N | C | N | C | N | N | N |
| Revoke participant | C | A | N | N | N | N | C | N | N | N |
| Propose procedure | C | A | C | C | C | C for assigned scope | A | N | N | N |
| Approve procedure | C | C | A | N | C if designated | C if designated | C if designated | N | N | N |
| Complete assigned step | C | C | A | A | A | A | C | N | N | N |
| Upload evidence | C | C | A | A | A | A | C | N | N | N |
| View selected evidence | C | C | C | C | C | C | C | C | N | N |
| Change evidence visibility | C | C | C if owner | C if owner | C if owner | C if owner | C | N | N | N |
| Accept evidence for procedure | C | C | A if reviewer | C if reviewer | C if reviewer | C if reviewer | C if authorised | N | N | N |
| Propose decision | C | C | A | C | C | C for assigned scope | C | N | N | N |
| Approve binding room decision | C | C | A | N | C if authorised | C if authorised | C if authorised | N | N | N |
| Create or resolve blocker | C | C | A | A | A | A | C | N | N | N |
| Pause room | C | A | C | N | N | N | C | N | N | N |
| Close room | C | C | A if required | N | C if authorised | N | C | N | N | N |
| Manage entitlement | C | A | N | N | N | N | N unless sponsor | N | N | N |
| View Deal Passport private facts | A for own org | C for own org | C for own org | C for own org | C | C | C by authority | N | N | N |
| Publish Deal Passport fact | A for own org | N unless same org | C if authorised | N | N | N | N | N | N | N |

## 5.3 Permission rules

- Organisation role does not automatically grant access to every sub-room.
- The Deal owner does not automatically see a counterparty-sponsored independent master room.
- The sponsor does not automatically own the Deal.
- Ponte facilitator access must match the declared operating mode and accepted scope.
- Platform administrators may access only under documented operational, security or legal authority.
- Removed participants retain no current access but their prior actions remain attributable.
- Evidence visibility is more specific than room membership.
- AI operates only on information available to the requesting user and may not bridge permission boundaries.

---

# 6. Lifecycle and State Machines

## 6.1 Master-room states

```text
Draft
  -> Proposed
  -> Awaiting principal admission
  -> Activation pending
  -> Active / Procedure not agreed
  -> Active / Procedure agreed
  -> Blocked | Paused | Read-only
  -> Ready to proceed
  -> Completed
  -> Closed
```

Alternative terminal states:

- declined before activation;
- cancelled before activation;
- rejected by Ponte;
- expired before activation;
- withdrawn;
- closed as blocked;
- closed as qualified no-go.

### State rules

- Draft and Proposed do not expose protected progression.
- Active requires valid entitlement and minimum participant admission.
- Blocked and Paused preserve progress.
- Read-only preserves access but disables mutation.
- Completed means the agreed procedure completion condition was met.
- Closed means the room is no longer actively progressing.

## 6.2 Sub-room states

```text
Draft
  -> Invitation pending
  -> Awaiting admission
  -> Active
  -> Blocked | Paused
  -> Outcome reached
  -> Closed
```

A sub-room may close while the master room remains active.

## 6.3 Participant states

```text
Invited
  -> Prerequisites pending
  -> Terms pending
  -> Admitted
  -> Active
  -> Suspended | Removed | Withdrawn
```

Declined and expired are terminal for one invitation but do not prevent a later new invitation.

## 6.4 Entitlement states

```text
Eligible
  -> Reserved
  -> Active
  -> Grace
  -> Expired / Suspended
  -> Restored
  -> Closed
```

Starter adds:

```text
Starter eligible
  -> Starter reserved
  -> Starter active
  -> Starter expired read-only
  -> Upgraded
```

## 6.5 Procedure states

```text
Draft
  -> Proposed
  -> Amendment requested
  -> Approved
  -> Superseded
  -> Completed
```

Only one approved procedure version governs at a time.

## 6.6 Step states

```text
Not ready
  -> Ready
  -> In progress
  -> Evidence submitted
  -> Review required
  -> Clarification required
  -> Completed
```

Alternative states:

- blocked;
- waived;
- not applicable;
- cancelled through approved amendment.

## 6.7 Condition states

```text
Open
  -> Evidence pending
  -> Under review
  -> Met
```

Alternative states:

- clarification required;
- waived;
- rejected;
- expired;
- superseded.

## 6.8 Evidence states

```text
Draft
  -> Uploaded
  -> Disclosed to selected viewers
  -> Under review
  -> Accepted for procedure
```

Alternative states:

- clarification required;
- rejected;
- superseded;
- withdrawn;
- independently verified.

`Accepted for procedure` and `independently verified` are distinct.

## 6.9 Decision and approval states

Decision:

```text
Draft
  -> Proposed
  -> Pending approvals
  -> Approved
```

Alternative states:

- objected;
- amendment required;
- rejected;
- superseded;
- withdrawn.

Approval:

```text
Required
  -> Pending
  -> Approved | Objected | Clarification requested | Abstained where allowed
```

## 6.10 Blocker states

```text
Open
  -> Owned
  -> Resolution proposed
  -> Resolved
```

Alternative states:

- waived;
- escalated;
- causes closure.

## 6.11 Deal Passport fact states

```text
Candidate
  -> Provenance complete
  -> Organisation review
  -> Private accepted fact
  -> Shared or public where authorised
```

Alternative states:

- disputed;
- corrected;
- withdrawn from public view;
- superseded;
- revoked for invalid provenance.

---

# 7. Stable Weighted Progress Model

## 7.1 Purpose

Progress measures completion of the agreed procedure. It does not measure trust, value, risk or likelihood of closing.

## 7.2 Display layers

The interface displays separately:

1. commercial stage;
2. procedural completion percentage;
3. milestones;
4. momentum;
5. blockers.

## 7.3 Calculation rules

- No percentage before the first procedure version is approved.
- The first approved procedure displays a baseline between 18% and 25% because participant admission, terms and procedure agreement are meaningful completed work.
- Each mandatory step and condition receives a weight.
- Weights are set in the procedure template or proposal and approved with the procedure.
- Consequential work receives more weight than administrative work.
- Optional steps do not increase the denominator unless adopted into the approved procedure.
- Waived mandatory items may earn their weight only through the required waiver approval.
- Blocked items retain previously earned progress.
- Reopening a completed item may reduce progress only if a durable approved state change invalidates its completion.
- The same approved procedure version and object states always produce the same percentage.
- Display rounds to a whole percentage but stores sufficient precision for stability.
- 100% is available only when the agreed completion condition is met.

## 7.4 Recommended weight bands

| Component | Typical weight |
|---|---:|
| Principal admission, terms and NDA | 8–12% |
| Procedure agreement | 10–14% |
| Commercial specification or scope | 8–15% |
| Counterparty capability evidence | 8–15% |
| Regulatory or documentary condition | 8–15% |
| Inspection, logistics or service procedure | 8–15% |
| Commercial terms confirmation | 10–18% |
| Critical blocker resolution | 5–12% |
| Final readiness approvals | 8–15% |
| Closure condition | remaining weight to 100% |

The exact allocation must total 100%.

## 7.5 Master and sub-room progress

- Every sub-room may have its own procedure subset and progress.
- Master-room progress is based on the governing master procedure, not an average of private sub-room percentages.
- A master procedure may reference required outcomes from selected sub-rooms.
- Private sub-room details remain hidden; the master may show only authorised aggregate states such as `Buyer branch: evidence pending`.
- Competing optional counterparty branches do not all need completion. The master procedure identifies which branch or outcome becomes governing.

## 7.6 Worked example: sugar Deal

Approved procedure:

| Item | Weight | State | Earned |
|---|---:|---|---:|
| Principal admission and NDA | 10 | Complete | 10 |
| Procedure agreed | 12 | Complete | 12 |
| Product specification | 10 | Complete | 10 |
| Packaging agreement | 6 | Complete | 6 |
| Capacity declaration | 10 | Accepted for procedure | 10 |
| Inspection procedure | 12 | In progress | 0 |
| Documentary requirements | 10 | Complete | 10 |
| Commercial terms | 14 | In progress | 0 |
| Critical blockers | 6 | One open | 0 |
| Final readiness approvals | 10 | Pending | 0 |

Earned: 58 of 100.

Display:

- Commercial stage: `Evidence and conditions in progress`
- Procedural completion: `58%`
- Momentum: `Moving`
- Blocker: `Inspection sampling method unresolved`
- Next action: `Inspection provider to propose revised sampling point`

When the inspection procedure is approved and blocker resolved, progress becomes 76%, not a random increase.

## 7.7 Reversion example

If capacity evidence previously accepted for procedure is superseded by a new statement that invalidates the earlier capacity claim:

- capacity step returns to review;
- its 10% is removed;
- progress falls from 76% to 66%;
- the activity record explains why;
- no punitive animation or language is used.

## 7.8 Milestones

Recommended MVP milestones:

- Principal participants admitted
- NDA accepted by all required participants
- Procedure agreed
- First evidence supplied
- First clarification resolved
- First blocker resolved
- Core conditions met
- Commercial terms agreed
- Ready to proceed
- Procedure completed
- First Deal Passport fact earned

Milestones never imply transaction success beyond their defined fact.

---

# 8. Deal Passport Generation Model

## 8.1 Purpose

The Deal Passport is the durable evidence-backed commercial history generated through Deal Rooms.

It answers:

> What has this organisation demonstrably done through Ponte?

## 8.2 Relationship to Business Passport

- Business Passport: identity, organisation, authority and evidence about who the organisation is.
- Deal Passport: attributable procedural and commercial history generated by Deal Room participation.

Neither is a universal trust score.

## 8.3 Candidate facts

MVP candidate fact categories:

- participated as buyer, seller, provider, distributor, representative or adviser;
- completed a defined procedure stage;
- supplied evidence accepted for a stated procedure;
- resolved a clarification;
- resolved a blocker;
- reached Ready to proceed;
- purchase order evidenced;
- contract execution evidenced;
- inspection completed and evidenced;
- shipment evidenced;
- service engagement evidenced;
- distribution appointment evidenced;
- qualified no-go completed;
- countries and markets involved;
- product or service categories involved;
- response timing derived from attributable room events.

## 8.4 Fact creation rules

A Deal Passport fact requires:

- source master room and sub-room where relevant;
- source activity, decision, evidence or closure record;
- organisation role;
- event date;
- fact category;
- exact wording;
- limitation statement;
- visibility state;
- dispute state;
- evidence provenance;
- identity of the approving or confirming party where required.

## 8.5 Visibility

Possible fact visibility:

- organisation private;
- selected counterparties;
- Ponte operational view;
- shareable by link;
- public profile where explicitly authorised.

Private room evidence is not automatically public merely because a fact is generated.

## 8.6 Starter Deal Room

A Starter room may generate the first Deal Passport fact only after a genuine attributable event such as:

- procedure agreed;
- evidence accepted for procedure;
- clarification resolved;
- blocker resolved;
- Ready to proceed;
- qualified no-go completed.

Opening a room, sending invitations or uploading unreviewed documents does not earn a Passport fact.

## 8.7 Excluded launch claims

Do not launch with:

- success rate;
- reliability score;
- Trust Score;
- star rating;
- transaction value total unless consistently evidenced and authorised;
- shipment count based only on self-declaration;
- response-time ranking without adequate comparable data;
- “verified trader” based solely on Deal Room use.

## 8.8 Disputes and corrections

An organisation or affected counterparty may dispute a fact.

The dispute process must:

- preserve original provenance;
- record the challenge;
- temporarily restrict public visibility where appropriate;
- allow correction, supersession or revocation;
- never silently rewrite historical evidence.

---

# 9. MVP Delivery Plan

## 9.1 First release — Core Starter Deal Room

Goal: prove the complete controlled-progression loop for one real Deal.

Include:

- one eligible structured Deal to master-room flow;
- Starter entitlement and one paid entitlement path at product level;
- one master room;
- private counterparty sub-rooms;
- participant admission, Business Passport threshold, role and authority;
- Participation Agreement and NDA acceptance;
- procedure proposal and approval;
- steps, conditions and responsibilities;
- evidence upload, visibility and review;
- clarification requests;
- decisions and approvals;
- blockers;
- stable weighted progress;
- milestones and next action;
- essential in-product and email notifications;
- closure and read-only history;
- candidate Deal Passport fact creation in private review state;
- audit events and minimum analytics.

## 9.2 Second release — Portfolio and multi-party depth

Include:

- five-room Portfolio management;
- credits and overflow entitlement;
- multiple provider and adviser sub-rooms;
- more advanced permission administration;
- procedure templates by Deal family;
- improved evidence comparison and versioning;
- richer AI recap and next-action assistance;
- Deal Passport sharing controls;
- participant replacement and organisation representative changes;
- institutional sponsorship;
- exports and formal closure summaries.

## 9.3 Later possibilities

- specialist marketplace attached to rooms;
- integrated electronic signatures;
- tariff and documentation intelligence;
- escrow or finance integrations subject to separate legal architecture;
- controlled contract generation;
- institution dashboards;
- advanced Deal Passport benchmarking after sufficient evidence;
- external verification providers;
- API access;
- transaction-related or success fees;
- cross-room portfolio intelligence;
- anonymised market analytics derived from permission-safe aggregates.

## 9.4 Explicit exclusions from first release

- autonomous negotiation;
- generic real-time chat;
- public leaderboards;
- points or coins;
- universal Trust Score;
- escrow;
- trade settlement;
- letters of credit execution;
- customs filing;
- automated authenticity claims;
- full CRM;
- unrestricted document repository;
- human Ponte work bundled into free or base software entitlement;
- public Deal Passport claims without explicit provenance and visibility approval.

## 9.5 Delivery gates

### Gate 1 — Product approval

Owner approves this document and the numerical commercial model.

### Gate 2 — Design

Design produces flows and screen designs based on the approved register and states.

### Gate 3 — Technical architecture

Technical design defines schemas, RLS, entitlement enforcement, event model, audit, storage, notifications, billing integration and migration plan.

### Gate 4 — Pre-implementation approval

Owner reviews Design, technical plan, legal terms, pricing and rollout.

### Gate 5 — Implementation

Work proceeds through reviewed pull requests and feature flags.

### Gate 6 — Production activation

Requires explicit owner approval after verification of security, billing, lifecycle, data retention, permissions and customer terms.

---

# 10. Product Acceptance Tests

The detailed product model is coherent when:

1. One verified organisation can start one real Starter Deal Room without a card.
2. A declined invitation consumes no Starter or paid entitlement.
3. A master room can contain isolated buyer and provider sub-rooms.
4. One counterparty cannot infer another branch.
5. The sponsor can see permitted portfolio status without leaking private details.
6. Participants cannot act before admission and NDA acceptance.
7. The procedure cannot govern before required approval.
8. Progress is reproducible from approved weights and states.
9. A blocker remains visible without erasing earned progress.
10. Evidence accepted for procedure is not presented as authentic unless independently verified.
11. Entitlement expiry creates read-only access without deleting history.
12. Upgrade resumes the same room without re-upload or re-admission to unchanged terms.
13. Closure distinguishes procedural completion from shipment, payment or contract completion.
14. Deal Passport facts cannot exist without attributable provenance.
15. AI cannot access or summarise information outside the requesting participant's permissions.

---

# 11. Approval and Stop Boundary

Approval of this document completes the product-definition gate before Design.

It does not authorise:

- visual or interaction design;
- database tables;
- SQL or migrations;
- RLS policies;
- runtime code;
- Stripe or billing configuration;
- pricing publication;
- legal terms publication;
- production charging;
- deployment;
- public Deal Passport disclosure.

After approval, the next authorised phase is Design, followed by technical architecture and a separate implementation plan.
