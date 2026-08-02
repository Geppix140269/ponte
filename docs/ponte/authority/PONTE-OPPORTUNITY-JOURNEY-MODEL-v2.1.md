# Ponte Opportunity and Journey Model v2.1

**Date:** 2 August 2026
**Author:** UX/UI Design Director
**Status:** APPROVED by Giuseppe on 2 August 2026. His four structural corrections are incorporated, and v2.1 additionally corrects the overstated claim that all fourteen decisions were closed.
**Supersedes:** v1 and v2 of the same date, and the withdrawn seven-screen funnel brief.

**Changed in v2.1:** section 14 no longer claims every decision is fully closed. `DECISION-11` is split into its closed part and its open commercial parameter. A new section 14b registers open commercial parameters, including draft retention, which was never decided and must not be promised in copy.

This is the canonical model. Journey flows, screens, schemas and build tickets all derive from it. Where any other Ponte document conflicts with this one, this one wins.

---

## 0. Identifier convention

Two series, renamed to remove the v1 collision. Use these identifiers in issues, code, commits and design files. Do not invent a third series.

| Series | Range | Meaning |
|---|---|---|
| `DOCTRINE-01` to `DOCTRINE-06` | Settled operating principles | Not reopened without a written decision |
| `DECISION-01` to `DECISION-14` | Commercial decisions | All fourteen decisions are taken. `DECISION-11` carries an open price parameter, see section 14b. |
| `PARAM-01`, `PARAM-02` | Open commercial parameters | Values not yet set. Section 14b. |

`D1` to `D6` and `D-1` to `D-14` from v1 are dead. Do not use them.

---

## 1. Doctrine

| ID | Decision |
|---|---|
| `DOCTRINE-01` | **Automated-first publishing.** Ponte does not promise manual review of every submission. Automated checks for completeness, quality and risk run before publication. Human intervention is exceptional. |
| `DOCTRINE-02` | **Free is not uncontrolled or unlimited.** Free publishing is coupled to effective moderation, which may be automated, risk-based and retrospective. "Unlimited" is never advertised as an entitlement. |
| `DOCTRINE-03` | **Direction belongs to the opportunity, not the person.** No permanent buyer or seller identity. |
| `DOCTRINE-04` | **Input doctrine.** Tap, guided selection and voice are the fastest path. Typing, search and correction are always available. Typing is never the only route for information that can reasonably be selected or spoken. |
| `DOCTRINE-05` | **Market Signals are a separate object** on a separate lifecycle. |
| `DOCTRINE-06` | **Three named commercial actions.** Publish a listing, free and public. Create a Deal Room, private and free to prepare. Activate a Deal Room, $79 for 30 calendar days. Activation never exposes room contents publicly. |

---

## 2. The four objects

| Object | Direction | Family | Visibility | Commercial action | Reference |
|---|---|---|---|---|---|
| **Member opportunity** | Need or offer | Product, trade service, distribution and representation | Public, with controlled private fields | Publish, free | `PT-####` |
| **Deal Room** | Not restricted to one direction | Transaction-specific | Private and permissioned | Build free, activate $79 | `DR-####` holding deal `PD-####` |
| **Market Signal** | Observed external intent | Product, trade service, distribution and representation | Public intelligence | Investigate, then convert | `PONTE-SUP-#######`, `EXT-######` |
| **Organisation and person** | May hold many roles at once | Not fixed | Profile level | Creates and participates | member and org ids |

### 2.1 The distinctions that must never blur

**A Market Signal is not a listing.** Nobody behind it is a Ponte member and nothing in it has been confirmed with the named party. It is an observation. A member acts on one only through investigation.

**A listing is not a Deal Room.** A listing advertises. A room transacts. A listing is public by design with controlled private fields inside it. A room is private by design.

**A Deal Room does not require a listing.** Journey C exists because a member may already hold their counterparty.

**A Deal Room may exist before a counterparty joins.** *(Correction 2, incorporated.)* A Deal Room may exist as a private draft before a counterparty joins. It becomes a transactional room when at least one counterparty accepts admission and it is activated.

**A person is not a role.** Roles and capacity attach to an opportunity, not to an account. See section 5.

---

## 3. The complete opportunity matrix

Three families, two directions, six core journeys. Each is first class. None is a variant of another.

| Family | Direction NEED | Direction OFFER |
|---|---|---|
| **Product** | Source a product | Supply a product |
| **Trade service** | Find a trade service | Offer a trade service |
| **Distribution and representation** | Find a distributor or representative | Offer distribution or representation |

### 3.1 Presentation of the choice

Two steps, with a persistent shortcut to the six for returning members. Step one: need or offer. Step two: product, trade service, or distribution. This is a hypothesis to be tested, not a settled conclusion. See section 15.

### 3.2 Distribution positions

*(Correction 1, incorporated. The v1 model wrongly mixed a capacity into the position list.)*

The distribution family carries a mandatory `position` attribute alongside direction. There are four, and they form two matching pairs.

| Position | Direction | Holds | Matches with |
|---|---|---|---|
| Principal or brand **seeks** a distributor or representative | NEED | The product or brand | Distributor or representative offers market coverage |
| Distributor or representative **offers** market coverage | OFFER | The market and the channel | Principal or brand seeks a distributor or representative |
| Principal or brand **offers** a territory or mandate | OFFER | The product or brand, and a defined territory to grant | Distributor or representative seeks brands or products |
| Distributor or representative **seeks** brands or products | NEED | The market and the channel | Principal or brand offers a territory or mandate |

Without this attribute, two listings that are each other's counterparty are indistinguishable from two listings that are peers, and the matching is wrong.

**Whether the creator is acting as principal, authorised representative or intermediary is a capacity, not a position.** It lives in section 5 and applies to all three families, not only to distribution.

---

## 4. Family schemas

One interface language and one visual system. Not one questionnaire.

Legend: **D** required to save a draft · **P** required to publish · **MP** minimum public dataset, cannot be made private · **PRIV** private by default, revealable on accepted interest · **NEVER** never public

### 4.1 Product

| Field | NEED variant | OFFER variant | Gate |
|---|---|---|---|
| Product and specification | What is sought | What is available | D, P, MP |
| HS classification | Inferred or selected | Inferred or selected | P, MP at chapter level |
| Quantity and unit | Required volume | Available volume | P, MP |
| Frequency | One-off or recurring | One-off or recurring | P, MP |
| Origin | Acceptable origins | Actual origin | P; MP for OFFER, PRIV for NEED |
| Destination | Actual destination | Acceptable destinations | P; PRIV for NEED, MP for OFFER |
| Delivery term | Sought | Offered | P, MP |
| Availability and validity | Needed by | Available until | P, MP |
| Target or indicative price | Optional | Optional | PRIV |
| Quality, certification, packaging | Optional | Optional | PRIV |
| Contact details | | | NEVER |

### 4.2 Trade service

| Field | NEED variant | OFFER variant | Gate |
|---|---|---|---|
| Service category and scope | What is needed | What is provided | D, P, MP |
| Countries, territories or trade lanes | Where | Where covered | P, MP |
| Mode or specialism | Sea, air, road, rail, multimodal, or the specialism | Same | P, MP |
| Capacity and availability | Volume and timing needed | Capacity offered | P, MP |
| Certifications and licences | Required of the provider | Held | P; MP for OFFER |
| Cargo or subject matter | What it applies to | What is handled | P, MP |
| Commercial basis | How the buyer expects to contract | Rate basis, retainer, success fee | P, PRIV |
| Validity | Needed by | Offer valid until | P, MP |
| Contact details | | | NEVER |

### 4.3 Distribution and representation

| Field | NEED variant | OFFER variant | Gate |
|---|---|---|---|
| Position, section 3.2 | Required | Required | D, P, MP |
| Product or sector | To be distributed, or sought to carry | To be carried | D, P, MP |
| Territory | Coverage needed | Coverage held or granted | P, MP |
| Channels and customer access | Required | Held | P, MP |
| Exclusivity | Sought | Offered | P, MP |
| Existing capabilities | Warehousing, licences, sales force, after-sales | Same | P |
| Proposed commercial relationship | Agency, distribution, commission, licence | Same | P, PRIV |
| Term and volume expectation | Optional | Optional | PRIV |
| Contact details | | | NEVER |

### 4.4 The threshold rule

**A listing requires enough to be credible and searchable. It does not require the procedural detail of a Deal Room.** Everything marked P is the publication threshold. What a room needs beyond that is collected inside the room, free, at the user's pace, and inherited from the listing where it exists. **No information is ever entered twice.**

---

## 5. Actors and capacity

Capacity attaches to an opportunity, not to an account. One organisation may hold a product requirement, a service offer and a distributor search simultaneously.

| Capacity | Meaning | Consequence |
|---|---|---|
| Principal, own company | Acting as buyer or seller itself | Standard verification |
| Authorised representative | Acting for own company under delegated authority | Authority declaration |
| Broker or intermediary | Acting for a third-party principal | Authority declaration, and intermediary status disclosed publicly |
| Service provider | Offering own capability | Certification and licence evidence where the category requires it |
| Exploring | Reading signals, no opportunity yet | Nothing demanded, no publication possible |

**How it is collected.** Never as an opening question. Inferred from family and direction, confirmed once in a single line before publication, stored on the profile so it is not asked twice.

**Public consequence.** Principal versus intermediary status is material commercial information and is part of the minimum public dataset, in all three families. It is not a private field.

---

## 6. Three lifecycles

### 6.1 Member opportunity

```
draft → screening → published → expired → archived
          ↓            ↓  ↑        ↑          ↓
   needs information   │  │        │      reopened
          ↓            │  │        │
      withdrawn   suspended/removed ┘
```

| State | Meaning |
|---|---|
| `draft` | Being built, autosaved, private |
| `screening` | Automated completeness, quality, duplicate and risk checks. Seconds, not days. |
| `needs information` | A check failed in a fixable way. System asks, creator answers. |
| `published` | Public and searchable, until its stated validity date |
| `paused` | Creator has taken it out of public view temporarily |
| `suspended` | Removed from public view pending resolution, post-publication moderation |
| `removed` | Terminated for policy breach |
| `expired` | Stated validity date reached. Becomes private and archived. |
| `archived` | Private, retained, reopenable |
| `reopened` | Requires the creator to reconfirm accuracy, then fresh automated screening |
| `withdrawn` | Creator took it down |
| `closed` | Requirement fulfilled, creator closed it |

**A listing does not expire on day 31.** It expires at its stated validity date. Default 60 calendar days, maximum 90 for v1. `DECISION-01`, `DECISION-12`.

The listing is not consumed by creating a Deal Room from it. `DECISION-04`.

### 6.2 Deal Room

```
draft (free) → active (paid, 30 calendar days) → expiring → read-only
                        ↓                                      ↓
                    concluded                          renewed / archived
```

| State | Meaning | Price |
|---|---|---|
| `draft` | Room exists privately. Procedure being built. Counterparty may be invited and may accept, with limited rights. See `DECISION-06`. Building is free and no activation period begins until payment. **Draft retention and inactivity handling follow a separate retention rule, `PARAM-02`, which is not yet set. No interface copy promises unlimited or indefinite draft storage.** | Free |
| `active` | 30 consecutive calendar days from activation. Full function. | $79 |
| `expiring` | Final seven days. Persistent in-room warning. | |
| `read-only` | Activation period ended. No messaging, uploads, approvals or procedural progress. Full history remains readable. | |
| `concluded` | Deal closed, room sealed as a record | |
| `archived` | Read-only retention under the published retention policy | |
| `renewed` | A further 30 calendar days | $79 |

**Retention.** Expiry never deletes transaction history. Retention is governed by Ponte's published legal and data-retention policy. **Do not promise "permanent" storage unconditionally in any interface copy.** `DECISION-01`.

### 6.3 Market Signal

```
read → published as intelligence → investigated → confirmed → converted, conditionally
                                        ↓              ↓
                                    discarded      unconfirmed
```

Signals are never created by members. A member acts on one only through investigation. **The signal itself does not change state because a member looked at it**, beyond accumulating interest counts, which are useful liquidity evidence.

---

## 7. Conversion paths

*(Correction 3 is incorporated in the Market Signal rows. This is the integrity line of the product.)*

| From | To | Allowed | Condition and what carries |
|---|---|---|---|
| Market Signal | Investigation | Yes | Product, HS chapter, quantity, origin or destination, delivery term, read date, source |
| Investigation, confirmed | **Member opportunity** | **Conditionally** | Only if (a) the external party joins Ponte or authorises the opportunity, or (b) a member publishes their own genuine need or offer arising from the investigation. Investigation alone does not transfer ownership and does not imply member endorsement. |
| Investigation, confirmed | Deal Room draft | Yes | Established facts, plus the counterparty if identified and willing |
| Investigation, confirmed | Confirmed investigation result | Yes, default | Where neither condition above is met, it remains an investigation result. It is not a member opportunity and must never be displayed as one. |
| Investigation, unconfirmed | Nothing | Terminates | Recorded so the same signal is not re-investigated blindly |
| Market Signal | Member opportunity, directly | **No** | Hard constraint. Publishing an unconfirmed observation as a member listing would launder it into an apparent member offer. |
| Member opportunity | Deal Room draft | Yes | Every schema field, plus the interested party |
| Member opportunity | Several Deal Rooms | Yes | Each with its own participants, permissions, procedure, payment and lifecycle. `DECISION-04`. |
| Deal Room | Member opportunity | No | A private transaction does not become a public advertisement |
| Deal Room draft | Active Deal Room | Yes, on payment | Everything |
| Expired listing | Reopened listing | Yes | Everything, after the creator reconfirms accuracy and fresh screening passes |

---

## 8. The five journeys

| Journey | Name | Object created | Price |
|---|---|---|---|
| **A** | Publish a free listing | Member opportunity | Free |
| **B** | Convert a listing into a Deal Room | Deal Room | Free to build, $79 to activate |
| **C** | Create a Deal Room directly | Deal Room | Free to build, $79 to activate |
| **D** | Start from a Market Signal | Investigation, then A or C | Investigation priced separately, `DECISION-11` |
| **E** | Respond to someone else's listing | Expression of interest, then B | Free to respond |

Journeys A, C and E are specified at flow level in `PONTE-JOURNEY-FLOWS-ACE-v2.md`. B is a subset of C entered from E. **D is blocked only on `PARAM-01`, the investigation price. Its structure is not in dispute.**

---

## 9. Entry points

| Entry point | Lands in | Carries |
|---|---|---|
| Home | A or C, by choice | Nothing |
| A Market Signal | D | Signal facts, source, read date |
| Search results | A or E | Search terms as product or service scope |
| Ask Ponte to investigate | D | Signal or query |
| Invitation from another party | Room admission | Room, deal, inviter |
| Saved draft | Where it was left | Everything |
| Existing Deal Room | The room | Everything |
| Direct shared link | The object shared | Everything public on it |
| Expiry notification | Renewal or reopening | Everything |

**No entry point may dead-end into a generic home page.** Context survives every transition, including sign-in.

---

## 10. Screening

| Tier | What it does | Speed | Blocking | Applies to |
|---|---|---|---|---|
| 1. Completeness | Publication-threshold fields present and internally consistent | Instant | Yes | Every submission |
| 2. Quality and duplicate | Intelligible, not a duplicate, plausible against the catalogue and the member's history | Seconds | Yes, resolvable | Every submission |
| 3. Policy and risk | Prohibited goods, sanctions and restricted-party exposure, jurisdiction flags, fraud patterns, authority claims | Seconds | Yes where hard-flagged | Every submission |
| 4. Exceptional human review | A person looks | Hours | Only the flagged item | Tier 3 hard flag, member report, or risk threshold |

**Rate limits** sit alongside tier 2 and scale with verification level, not with payment. `DECISION-10`.

**Post-publication moderation** is first class: suspend, request information, remove, notify. This is what makes `DOCTRINE-02` safe.

**Ask Ponte to investigate is a service, not a control.** It is requested by a member, is about a third party or a signal, and is not part of the publication path. It must never share interface language with screening, or members will believe every listing has been investigated.

---

## 11. Identity, verification and authority

| Moment | Required |
|---|---|
| Browse, search, read signals | Nothing |
| Start a draft, listing or room | Nothing |
| **Save a draft** | Sign in. First gate, and the natural one, because the user now has something to lose. |
| Publish a listing | Verified contact, business identity declared, capacity declared, authority declaration if representative or intermediary |
| **Express interest in a listing** | Sign in and verified contact only. Business verification is NOT required. `DECISION-09`. |
| Reveal sensitive private fields to a respondent | Listing owner may require the respondent's business verification |
| Admit a respondent to a Deal Room | Listing owner may require business verification |
| Invite a counterparty to a room | Verified contact |
| **Activate a room, $79** | Business verification of the paying party, and normally at least one counterparty accepted into admission. `DECISION-07`. |
| High-risk category, jurisdiction or value | Enhanced checks, triggered by tier 3, never applied universally |

Compliance workstream, gating publication and starting now: prohibited goods, sanctions and restricted-party screening, document authenticity, authority to represent a third party. Each needs an owner and a source of truth.

---

## 12. Visibility, two separate models

### 12.1 Listing disclosure

What a stranger sees, and what an interested party unlocks.

| Layer | Content |
|---|---|
| Always public, cannot be made private | The MP fields for the family, section 4. Plus: country, commercial capacity, principal or intermediary status, relevant profile facts, accurate verification level, member history where appropriate. |
| Revealed on accepted interest, mutually | Company identity of both parties, plus the PRIV fields the creator marked revealable |
| Never public | Contact details, internal notes, documents |

**Company identity is reveal-on-accepted-interest by default**, with an explicit option for the creator to show it publicly. `DECISION-08`. This protects commercially sensitive requirements, brokers and principals, and reduces off-platform circumvention. **Disclosure after accepted interest is mutual.** Neither party sees the other's identity without giving their own.

**The minimum public dataset cannot be overridden.** A listing that is entirely private is not a listing. Users may add to what is public. They may not subtract from it.

### 12.2 Deal Room permissioning

Among people already inside, who sees what.

| Layer | Content |
|---|---|
| All admitted participants | The deal, the procedure, shared evidence |
| Branch scoped | Content limited to a branch, for example an inspection provider sees only the inspection branch |
| Room creator only | Notes, drafts, unshared evidence |
| Staged | Content that becomes visible on reaching a procedural stage |
| Ponte only | Exceptional compliance and support access, disclosed in terms, never silent |

**Activation never makes a room public**, and the interface must say so at the activation moment. See `PONTE-P1-COPY-FIXES.md`.

---

## 13. Vocabulary, locked

| Never use | Use |
|---|---|
| Publish, for the paid room action | **Activate Deal Room** |
| 30 active days | **30 calendar days from activation** |
| Market family | Family, or nothing |
| Route across | Nothing |
| Intake | Nothing |
| Structured draft | What Ponte understood |
| Procedural completion | Steps done |
| Commercial stage | Stage |
| Workspace | Branch |
| Vetted, reviewed, approved, for the standard path | Checked |
| Unlimited listings | Nothing. Never advertise it. |

Three public actions, said the same way everywhere: **Publish a listing, free. Create a Deal Room, free. Activate it, $79 for 30 calendar days.**

---

## 14. Resolved decisions

All fourteen decisions are taken and are specification, not proposals. One of them, `DECISION-11`, carries a price that is still an open parameter. See section 14b.

| ID | Decision |
|---|---|
| `DECISION-01` | **Expiry.** A listing expires at its stated validity date, not on a fixed day count. Expired listings become private, archived and reopenable; reopening requires the creator to reconfirm accuracy followed by fresh automated screening. A Deal Room becomes read-only after its 30-day activation period: no messaging, uploads, approvals or procedural progress. Expiry never deletes transaction history. Retention follows Ponte's published legal and data-retention policy, and no interface copy promises permanent storage unconditionally. |
| `DECISION-02` | **Expiry warnings.** Persistent in-room warning from seven days before expiry. Creator, activator and room administrators warned by email and in product at 7, 3 and 1 day. Other admitted participants at 3 and 1 day. **Every warning states the exact expiry date and time, never only "three days remaining".** |
| `DECISION-03` | **Renewal.** $79 for a further 30 calendar days. No renewal discount in v1. Manual by default; automatic renewal only on explicit opt-in. Renewed before expiry, the new period begins at the existing expiry time. Renewed after expiry, it begins when payment succeeds. "One tap" means one confirmation against a saved payment method, never an unexplained automatic charge. |
| `DECISION-04` | **Several rooms per listing.** One listing may generate multiple independent Deal Rooms with different counterparties. Each has its own participants, permissions, procedure, payment and lifecycle, and each is separately activated for $79. Creating a room does not consume or close the listing. The creator may pause or close the listing when the requirement is fulfilled. |
| `DECISION-05` | **The paid period is 30 consecutive calendar days from activation.** "30 active days" is retired. Interface wording: "Activate this Deal Room for $79. Full functionality remains available for 30 calendar days from activation." The exact expiry date and time is displayed before payment. |
| `DECISION-06` | **Counterparty access before activation.** A counterparty may be invited to an unactivated room. Before activation they may view the deal summary and proposed procedure, see participants and relevant verification status, accept or decline the invitation, and propose corrections to the deal facts. They may not execute, approve or complete procedural steps, upload transaction evidence, use unrestricted room messaging, invite additional participants, or access staged or restricted documents. Activation unlocks transactional functions for all admitted participants. |
| `DECISION-07` | **Who pays.** The creator or any admitted counterparty may activate. One $79 payment activates the whole room and is not charged per participant. The paying party must complete business verification. No split payment in v1. Activation normally requires at least one counterparty to have accepted admission. |
| `DECISION-08` | **Public identity.** Company identity is reveal-on-accepted-interest by default, with an explicit option to show it publicly. Publicly shown regardless: country, commercial capacity, principal or intermediary status, relevant profile facts, accurate verification level, and member history where appropriate. After interest is accepted, identity disclosure is mutual. |
| `DECISION-09` | **Expressing interest.** Sign-in and verified contact only. Business verification must not be required to send an initial expression of interest. The response carries a short structured statement covering capacity, relevance and what the respondent can fulfil. Rate limiting and spam detection apply. The listing owner may require business verification before revealing sensitive private fields, admitting the respondent to a Deal Room, or continuing into a higher-risk transaction. |
| `DECISION-10` | **Publication limits, v1.** Contact-verified: 3 new listings per rolling 24 hours, 10 concurrently published. Business-verified: 25 new listings per rolling 24 hours, 100 concurrently published. Above the business threshold: risk-based review or an account-specific limit increase, never an unexplained rejection. Drafts and ordinary edits do not count. Duplicates are blocked independently of these limits. **These numbers are configuration, not product doctrine.** |
| `DECISION-11` | **Closed:** Ask Ponte to investigate is a paid service, priced separately from the $79 and never bundled into publication. **Open:** the price itself, tracked as `PARAM-01`. Journey D is blocked on that parameter and on nothing else. |
| `DECISION-12` | **Listing validity.** Default 60 calendar days, maximum 90 for v1, editable by the creator within that maximum. Appears in Journey A, so it is blocking and it is now decided. |
| `DECISION-13` | **No responses.** At expiry, offer reopening, offer a change to the terms Ponte believes are limiting it, or offer conversion to an investigation. |
| `DECISION-14` | **Expired room access.** The counterparty retains read-only access to the room and its evidence, subject to the published retention policy. |

---

## 14b. Open commercial parameters

Values not yet set. Each is tracked separately from the decisions so that a decision is never recorded as closed while a number it depends on is missing.

| ID | Parameter | What it blocks | Consequence while open |
|---|---|---|---|
| `PARAM-01` | The price of "Ask Ponte to investigate" | Journey D only. The structure of D is agreed. | Journey D is not specified at flow level and no investigation pricing appears in any interface |
| `PARAM-02` | Draft retention and inactivity handling, for both listing drafts and Deal Room drafts | Nothing in the journey architecture | **No interface copy may promise unlimited or indefinite draft storage.** Approved wording for the free room draft is "Building the room is free. No activation period begins until payment." Nothing further is claimed. |

`PARAM-02` also governs the pre-sign-in local draft described in the flows document. Until it is set, a local draft is described to the user as held in this browser, with no claim about how long.

---

## 15. Evidence plan

Open hypotheses. None blocks the model. All should be instrumented before we optimise a single screen.

| Hypothesis | How it gets settled |
|---|---|
| Two-step choice beats six direct choices on mobile | Task test, 8 to 12 traders, both variants, time to first correct selection and error rate |
| Voice intake is used and is accurate enough for technical trade terminology | Instrument attempt, completion and per-field correction rates |
| Showing inference confidence increases trust rather than undermining it | A/B on the confirm step, measured on completion and correction |
| Free listings generate enough response volume to justify the model | Responses per listing, not listings published |
| The $79 activation converts from free room drafts | Draft-to-activation rate by journey. C should convert far above B. If it does not, the price is on the wrong object. |
| Reveal-on-interest identity does not suppress response volume | Response rate on listings that opt into public identity versus those that do not |

The v1 claim that no competitor shows inference confidence was unsupported and is withdrawn. A competitor review should run in parallel, because "best in class" is a measurable position, not a design opinion.
