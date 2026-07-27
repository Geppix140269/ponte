# Ponte Trade Deal Room Experience Design v1

- **Status:** Proposed for product-owner design approval
- **Design date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Source authorities:** Deal Room Product Contract v1, Detailed Product Definition v1, Starter Deal Room Access, Deal Passport
- **Implementation status:** Not started
- **Scope:** Experience and interaction design only; no code, schema, migration, billing or deployment

## 1. Design objective

The Deal Room must make a complex cross-border transaction feel controlled, legible and alive.

The user should never experience it as:

- a generic chat room;
- a document repository;
- a CRM record;
- a static checklist;
- a crowded project-management dashboard; or
- a decorative gamification layer.

The experience must make five things immediately clear:

1. **What Deal is this?**
2. **Where are we in the agreed procedure?**
3. **What is blocking progress?**
4. **What must happen next, and who owns it?**
5. **What evidence and decisions support the current state?**

The emotional outcome is:

> This Deal is under control. I know what matters, what changed and what happens next.

## 2. Design principles

### 2.1 Procedure before conversation

The procedure is the main organising structure. Conversation, evidence, decisions and tasks attach to procedure objects rather than existing as an unstructured stream.

### 2.2 One clear next action

Every active surface should identify the most important permitted next action. Secondary actions remain available but visually subordinate.

### 2.3 Calm momentum

Progress should feel motivating without becoming childish or manipulative. Use stage movement, milestone recognition, completion changes and resolved blockers—not points, coins, streaks or confetti.

### 2.4 Privacy is visible

Users must understand whether an item is visible to:

- everyone admitted to the master room;
- one private sub-room;
- selected organisations;
- Ponte only;
- the user's own organisation only.

Visibility is shown at the point of creation and review, not hidden in settings.

### 2.5 Evidence is never silently upgraded

Uploaded, reviewed, accepted for procedure and independently verified are visually different states. The interface never implies authenticity from upload alone.

### 2.6 Master room and sub-room remain distinct

The master room coordinates the Deal. A sub-room is a protected negotiation or workstream. The interface must not make them appear as ordinary tabs in one shared conversation space.

### 2.7 Starter is the real product

Starter Access uses the same core experience as paid rooms. Limits appear through duration, capacity and upgrade moments, not through a visibly inferior interface.

### 2.8 Mobile means prioritisation, not compression

Mobile does not reproduce a three-column desktop. It presents stage, next action, blockers and recent change first, with deeper objects accessible through focused screens.

## 3. Design language

The Deal Room extends the existing Ponte Desk direction rather than creating a new design system.

### 3.1 Visual character

- editorial and operational, not corporate-dashboard generic;
- generous white space around decisions and evidence;
- fine ruled structure for procedural facts;
- strong typographic hierarchy;
- restrained use of Brand v5 accent colours;
- subtle motion only when state meaning changes;
- no glassmorphism, neon, playful badges or consumer-marketplace cards.

### 3.2 Core visual metaphors

- **The Deal line:** a continuous visual path representing the agreed procedure.
- **The command desk:** the master-room overview where the user sees stage, progress, blockers and sub-room portfolio.
- **The protected chamber:** each sub-room has a visibly enclosed privacy boundary.
- **The evidence ledger:** evidence is structured, attributable and versioned.
- **The permanent record:** Deal Passport facts feel archival and earned.

### 3.3 State hierarchy

The design uses four levels of visual emphasis:

1. **Critical:** policy issue, lost entitlement, critical blocker, rejected evidence.
2. **Action required:** approval, clarification, overdue responsibility, invitation prerequisite.
3. **In progress:** active step, evidence under review, procedure proposed.
4. **Recorded:** completed milestone, accepted decision, closed outcome.

Colour is never the only state indicator. Every state has text and, where useful, a semantic icon.

## 4. Global information architecture

The authenticated workspace introduces a primary **Deal Rooms** destination beside the existing Workspace areas.

```text
Deal Rooms
  ├── Portfolio
  ├── Proposed
  ├── Active
  ├── Needs attention
  ├── Read-only / closed
  └── Deal Passport
```

Within one master room:

```text
Master Deal Room
  ├── Command
  ├── Procedure
  ├── Sub-rooms
  ├── Evidence
  ├── Decisions
  ├── Blockers
  ├── Participants
  ├── Activity
  └── Room terms / entitlement
```

Within one sub-room:

```text
Private sub-room
  ├── Overview
  ├── Procedure items
  ├── Evidence
  ├── Decisions
  ├── Blockers
  ├── Participants
  └── Activity
```

The master-room navigation never exposes the existence of private sub-rooms to a participant without permission.

## 5. Desktop shell

### 5.1 Master-room layout

Desktop uses a controlled three-zone layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Global header / breadcrumb / room reference                 │
├───────────────┬──────────────────────────────┬───────────────┤
│ Room rail     │ Main working surface         │ Context panel │
│               │                              │               │
│ Command       │ Stage + procedural content   │ Next action   │
│ Procedure     │                              │ Blockers      │
│ Sub-rooms     │                              │ Participants  │
│ Evidence      │                              │ Entitlement   │
│ Decisions     │                              │               │
└───────────────┴──────────────────────────────┴───────────────┘
```

The context panel is not permanent on every screen. It appears only where it contributes the next action, relevant blocker or object metadata.

### 5.2 Master-room command view

The first screen contains:

1. Deal identity strip;
2. commercial stage;
3. stable procedural completion;
4. momentum statement;
5. primary next action;
6. critical blocker if present;
7. milestone line;
8. private sub-room portfolio visible to the authorised sponsor;
9. recent attributable changes;
10. entitlement or Starter status where relevant.

The upper composition is:

```text
Deal: 500,000 MT Brazilian refined sugar
Room reference: DR-2026-0048

Evidence and conditions in progress                       58%
Moving — three material actions completed this week

NEXT ACTION
Inspection provider to propose revised sampling point
Due 31 July · Owner: Atlântico Inspection Ltd

BLOCKER
Sampling point is not yet accepted by both principal parties
```

### 5.3 Sub-room cards

Authorised sponsor view shows one card per private workstream:

- neutral internal reference, not necessarily counterparty name where internal concealment is chosen;
- purpose;
- stage;
- branch progress;
- next action;
- blocker state;
- last material change;
- participants visible to the sponsor;
- no private terms in the portfolio card unless explicitly permitted.

Cards are operational summaries, not conversation previews.

## 6. Mobile shell

Mobile begins with a compact room header and four priority blocks:

1. stage and progress;
2. next action;
3. blockers;
4. recent change.

A bottom navigation provides:

- Command;
- Procedure;
- Workspaces;
- Evidence;
- More.

`More` contains decisions, participants, activity, entitlement and room terms.

Detailed actions use a sticky bottom action bar. Dense tables become ordered cards. Evidence preview opens full screen.

## 7. Screen-by-screen design

### DR-01 — Deal Room entry decision

**Purpose:** Convert a complete Deal into protected progression.

**Composition:**

- Deal summary at top;
- headline: `Take this Deal forward`;
- three entitlement choices shown as equal product paths rather than pricing-table tiers;
- Starter path appears first when eligible;
- exact eligibility and usage state below each option;
- explanatory line: `The invited party can join without buying a plan.`

**Starter card:**

- `Your first Deal Room`;
- real core workflow;
- one master Deal;
- clear proposed limits;
- `No card required`;
- CTA: `Open Starter Deal Room`.

**Paid cards:**

- Portfolio: `For organisations progressing several Deals`;
- Credits: `For one Deal or occasional use`.

Unavailable options remain visible with the exact reason and remedy.

### DR-02 — Proposed master-room builder

A progressive single-page builder with four sections:

1. Deal scope;
2. room purpose and completion definition;
3. sponsor and operating mode;
4. first private sub-room and principal participant.

A live summary remains visible on desktop and becomes a review step on mobile.

No field is silently inferred. Ponte may propose wording, but the user confirms it.

### DR-03 — Invitation preview

The sender sees the exact external invitation before sending:

- inviter;
- permitted Deal description;
- proposed role;
- room sponsor;
- admission requirements;
- NDA requirement;
- expiry;
- information explicitly not disclosed yet.

CTA: `Send protected invitation`.

### DR-04 — Invitation landing

No standard app chrome. The screen must establish legitimacy quickly.

Order:

1. Ponte identity;
2. inviting organisation;
3. purpose of invitation;
4. Deal preview;
5. proposed role;
6. privacy statement;
7. required admission steps;
8. accept or decline.

Decline is visible and respectful. The page never pressures the recipient with fabricated urgency.

### DR-05 — Admission checklist

A vertical checklist with five sections:

- account;
- organisation;
- role and authority;
- Business Passport evidence;
- Participation Agreement and NDA.

Each item shows:

- complete/incomplete;
- why it is required;
- who can see it;
- action.

Final CTA: `Enter private Deal Room`.

### DR-06 — Master-room portfolio

The portfolio is organised around action, not chronology.

Top filters:

- Needs attention;
- Active;
- Proposed;
- Read-only;
- Closed.

Each row or card shows:

- Deal subject;
- stage;
- progress;
- next action;
- blocker;
- active sub-room count;
- entitlement label;
- last material change.

Starter users see one discreet capacity indicator and an upgrade path only when relevant.

### DR-07 — Master-room command view

This is the central signature screen.

**Above the fold:**

- Deal identity;
- stage and percentage;
- momentum sentence;
- one primary next action;
- critical blocker where present;
- milestone path.

**Below:**

- procedure snapshot;
- private sub-room portfolio for authorised sponsors;
- evidence and decisions needing attention;
- recent material activity;
- Deal Passport facts becoming eligible.

The command view does not show a generic message feed.

### DR-08 — Private sub-room workspace

A visibly protected environment.

The header states:

- sub-room purpose;
- participating organisations;
- visibility boundary;
- branch stage;
- branch progress;
- next action.

Primary content is organised by current procedure item. Conversation appears contextually under a task, evidence item, decision or blocker.

A lightweight `Discussion` action may exist on objects, but not as the dominant navigation destination.

### DR-09 — Procedure builder

The procedure editor uses ordered stages and step cards.

Each step card includes:

- title;
- owner role;
- weight;
- mandatory/optional;
- dependency;
- required evidence;
- required approver;
- due-date rule;
- visibility.

A right-side summary shows total weight and unresolved structural errors. The system prevents approval when mandatory weights or approvers are invalid.

### DR-10 — Procedure approval

Approval is diff-first.

Users see:

- what changed;
- why;
- impact on responsibilities;
- impact on progress;
- impact on evidence and deadlines.

Actions:

- Approve version;
- Request amendment;
- Object with reason;
- Ask for clarification.

### DR-11 — Step and condition detail

Focused screen with:

- requirement;
- owner;
- due date;
- dependencies;
- evidence requirement;
- discussion and clarification history;
- decision state;
- one primary action.

The screen explains why an action is unavailable rather than merely disabling it.

### DR-12 — Evidence register

Evidence is grouped by procedural purpose, not file type.

Filters:

- Required;
- Submitted;
- Under review;
- Clarification required;
- Accepted for procedure;
- Superseded;
- Independently verified.

Each entry shows:

- title;
- provider;
- date;
- linked step or condition;
- visibility;
- current state;
- reviewer;
- limitation where relevant.

### DR-13 — Evidence detail

The top of the page states the evidence claim and its current status.

Metadata appears before preview:

- provider;
- source;
- version;
- date;
- linked requirement;
- visibility;
- review history;
- limitations.

Review actions are explicit and separate:

- Accept for procedure;
- Request clarification;
- Reject for procedure;
- Mark superseded;
- Record independent verification.

### DR-14 — Decisions and approvals

Decision cards use formal language and show:

- proposal;
- scope;
- required approvers;
- evidence relied upon;
- current responses;
- objections;
- effective state;
- superseded version where applicable.

Approved decisions appear as durable records, not chat messages.

### DR-15 — Blocker centre

Blockers are ranked by commercial impact:

- Critical;
- Material;
- Operational.

Each blocker shows:

- what is prevented;
- owner;
- affected procedure item;
- resolution requirement;
- due date;
- escalation path;
- latest material change.

Resolving a blocker produces a recorded resolution event and may trigger milestone or progress change.

### DR-16 — Participant and access centre

Participants are grouped by organisation and sub-room.

The sponsor sees:

- role;
- authority declaration;
- admission state;
- terms version;
- room visibility;
- last access state;
- revoke or change-role action where permitted.

External users see only themselves, their organisation and participants sharing an authorised room.

### DR-17 — Entitlement and usage

This screen is factual and calm.

Starter example:

```text
Starter Deal Room
18 active days remaining
2 of 3 private sub-rooms used
2 of 2 external organisations admitted
```

Upgrade is framed around continuity:

> Keep this Deal moving. Upgrade without losing the room, evidence or history.

Payment failure and read-only states explain exactly what remains accessible.

### DR-18 — Activity and recap

The activity feed includes only attributable material events:

- participant admitted;
- procedure version approved;
- evidence submitted or reviewed;
- blocker created or resolved;
- decision approved;
- milestone reached;
- room paused or resumed.

Routine page views and minor edits do not create noise.

AI recap is clearly labelled and permission-filtered. It cites the source events it summarises.

### DR-19 — Closure review

A guided closure sequence asks:

1. What outcome occurred?
2. What evidence supports it?
3. Which required participants confirm it?
4. What remains unresolved?
5. Which Deal Passport facts are eligible?
6. What visibility applies?

The interface distinguishes `Ready for external contracting`, `Purchase order evidenced`, `Contract evidenced`, `Qualified no-go` and other outcomes.

### DR-20 — Deal Passport

The Deal Passport is an evidence ledger, not a reputation leaderboard.

Sections:

- Roles performed;
- Markets and countries;
- Procedure milestones;
- Evidenced commercial outcomes;
- Service or distribution appointments;
- Qualified no-go decisions;
- Response and procedural behaviour where sufficiently defined.

Each fact card displays:

- precise claim;
- date;
- organisation role;
- evidence source;
- provenance state;
- visibility;
- limitation;
- dispute status.

There is no overall score.

### DR-21 — Read-only room

The closed or expired room retains the same information architecture, but creation and modification actions are removed.

A persistent banner explains:

- why the room is read-only;
- what remains visible;
- who can restore it;
- whether upgrade, renewal or reopening is available.

## 8. Progress and milestone design

### 8.1 Progress presentation

Show progress as:

```text
Evidence and conditions in progress                         58%
```

The percentage is supported by a short explanation:

> 6 mandatory procedure items complete · 3 in progress · 1 critical blocker

Users can open `How progress is calculated` to see the approved weighted procedure. No opaque AI score is used.

### 8.2 Milestone line

Use a horizontal line on desktop and vertical line on mobile.

Example milestones:

- Room activated;
- Procedure agreed;
- Product specification agreed;
- Capacity evidence accepted;
- Inspection process agreed;
- Commercial readiness confirmed.

Milestones are quiet but satisfying: a brief state transition, changed label and timestamp. Avoid celebratory animation for routine compliance events.

### 8.3 Momentum

Momentum is a plain-language descriptor derived from material activity and unresolved blockers:

- Moving;
- Waiting on participant;
- Blocked;
- Paused;
- Ready for decision;
- Ready to proceed.

It is never a score.

## 9. Starter conversion design

### 9.1 Principle

The product earns payment by demonstrating control and momentum before presenting an upgrade.

### 9.2 Upgrade moments

Upgrade appears when the user attempts to:

- continue after the Starter term;
- open another master room;
- create a fourth sub-room;
- admit a third external organisation;
- add a third internal user;
- request premium AI, Ponte Desk or specialist support.

### 9.3 Upgrade panel

The upgrade panel states:

- what limit has been reached;
- what remains safe and accessible;
- what the paid option unlocks;
- that no data or room history will be lost;
- available subscription or credit paths.

It never blocks access to existing evidence before the stated expiry rule.

## 10. Empty, blocked and error states

### No rooms

Headline: `Take your first Deal forward.`

Explain the Starter room and show eligible structured Deals.

### No procedure

Headline: `Agree how this Deal will move.`

Primary CTA: `Propose procedure`.

No percentage is shown.

### No evidence

Do not say `Nothing here`. Show the exact evidence expected by the procedure and who owns it.

### Blocked room

The blocker appears above routine progress. The interface states what cannot proceed and what resolves it.

### Access denied

Do not reveal the existence or identity of another private sub-room. Use:

> You do not have access to this workspace.

### Expired entitlement

Explain read-only status, preserved history and restoration options.

### Failed upload

Keep metadata draft and let the user retry. Never imply evidence was submitted successfully.

### AI unavailable

Core workflow remains usable. Explain that recap or assistance is temporarily unavailable without blocking deterministic actions.

## 11. Notification design

Notifications are generated only for material responsibilities and state changes.

Priority classes:

- action required;
- deadline approaching;
- blocker created or escalated;
- approval requested;
- evidence clarification requested;
- milestone reached;
- entitlement action required.

Email notifications contain the minimum permitted Deal context. Sensitive evidence and private terms are never embedded in email.

## 12. Accessibility

- full keyboard operation;
- visible focus states;
- semantic headings and landmarks;
- state labels independent of colour;
- text alternatives for progress and milestone graphics;
- minimum touch targets on mobile;
- no essential information hidden behind hover;
- confirmation for irreversible actions;
- motion respects reduced-motion preferences;
- evidence preview has download or accessible alternative where permitted.

## 13. Design acceptance criteria

The design is acceptable only when:

1. A user can identify stage, next action and blocker within five seconds of opening a room.
2. A private participant cannot infer other sub-rooms from navigation, counts, activity or notifications.
3. No screen presents upload as verification.
4. No progress percentage appears before procedure approval.
5. Master progress can be explained from the approved weighted procedure.
6. Starter users experience the real core workflow.
7. Upgrade preserves continuity and never suggests the Deal will be deleted.
8. Mobile surfaces prioritise action over dense overview.
9. AI recaps visibly cite permission-filtered source events.
10. Deal Passport facts display provenance and limitations.
11. Generic chat never becomes the dominant room structure.
12. Read-only rooms preserve the same factual hierarchy.
13. No screen introduces a Trust Score, success score or public ranking.
14. The visual language remains recognisably Ponte Desk and Brand v5.
15. Human Ponte assistance is never implied as included without an explicit paid scope.

## 14. Prototype sequence

The first clickable prototype should cover one complete sugar Deal:

1. select Deal and Starter entitlement;
2. build proposed master room;
3. preview and send protected invitation;
4. recipient admission and NDA;
5. room activation;
6. procedure proposal and approval;
7. master command view at 22%;
8. evidence submission and clarification;
9. blocker creation;
10. blocker resolution;
11. milestone transition;
12. progress at 58%;
13. Starter limit reached and upgrade panel;
14. continuation after upgrade;
15. closure and first Deal Passport fact.

Prototype must include desktop and 390px mobile for:

- entry decision;
- invitation landing;
- admission checklist;
- command view;
- private sub-room;
- procedure approval;
- evidence detail;
- blocker state;
- upgrade panel;
- Deal Passport.

## 15. Implementation boundary

This design authority does not authorise:

- React or application code;
- component creation;
- routes;
- database schema or migration;
- storage or evidence infrastructure;
- Stripe, billing or tax configuration;
- AI model selection or quotas;
- production feature flags;
- deployment;
- charging;
- public release.

After design approval, the next phase is technical architecture and implementation planning, followed by explicit implementation approval.
