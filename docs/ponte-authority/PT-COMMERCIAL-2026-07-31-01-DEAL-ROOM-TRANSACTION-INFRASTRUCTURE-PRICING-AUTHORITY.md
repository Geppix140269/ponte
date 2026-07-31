# Ponte Deal Room Transaction Infrastructure Pricing Authority

- **Authority ID:** `PT-COMMERCIAL-2026-07-31-01`
- **Canonical name:** Deal Room Transaction Infrastructure Pricing Authority
- **Short reference:** Deal Room-Only Pricing Authority
- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 31 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Implementation status:** Authority only; implementation not authorised by this file
- **Currency:** USD only
- **Amendments:** Amendment 1, 31 July 2026 — see below

## Amendment record

### Amendment 1 — a broker's branch counts (31 July 2026)

**Owner decision, closing OD-012.**

Section 7 condition 1 said a billable branch is a "principal-counterparty Deal
Branch", which reads as the principal alone. Section 4, listing what a Master
Deal Room may contain, gives as one of its own examples "a broker acting for a
disclosed or controlled principal". In the Deal Room schema a broker is an
`intermediary`, not a `principal`, so the two sections pointed different ways and
the difference decided what a member is charged.

**The owner has decided that a broker's branch counts.** Section 7 condition 1
is amended above to say so explicitly, so the authority no longer contradicts its
own section 4.

The reasoning: a broker fronting a real principal is a live counterparty
negotiation consuming the same controlled-progression product as any other, and
the alternative reading would make **every brokered negotiation free** — an
obvious incentive to route negotiations through an intermediary.

**Unchanged by this amendment:** `provider`, `adviser`, `ponte_facilitator` and
`observer` participants never make a branch billable, and provider, adviser and
internal workspaces remain unlimited and free under section 5. The prices, the
cap, the included five and every other rule are untouched.

**Effect on implementation:** none. `BILLABLE_PARTICIPANT_CLASSES` in
`lib/deal-room/pricing.ts` already held `["principal", "intermediary"]` pending
this decision, pinned by a named test. The amendment confirms the reading rather
than changing behaviour.

## 1. Executive owner decision

Ponte Deal Room is the only paid product and the sole day-one monetisation engine of Ponte Trade.

Everything upstream of protected Deal Room progression remains free.

> Ponte is free for discovering opportunities and establishing credible interest. Ponte earns revenue when counterparties move from interest into controlled transaction execution.

The only public commercial product is:

> **Ponte Deal Room — $79 USD for 30 active days.**

The base price includes up to five concurrently active private counterparty Deal Branches.

Additional concurrently active Deal Branches cost:

> **$15 USD each for the current 30-day Master Deal Room period.**

The total room-period charge is capped at:

> **$199 USD per Master Deal Room per 30-day period.**

Applicable taxes may be added where legally required.

## 2. Commercial positioning

Ponte does not sell access to a marketplace. Ponte sells controlled transaction infrastructure after genuine commercial interest exists.

The price is for:

- one structured commercial opportunity;
- confidential parallel counterparty negotiations;
- controlled admission and participation;
- agreed commercial procedure;
- evidence, clarification, blockers and decisions;
- deterministic transaction progression;
- durable multilingual records and audit history;
- permanent read-only continuity after expiry or closure.

The price is not linked to transaction value, quantity, revenue, commercial success or the number of people participating.

## 3. One opportunity equals one Master Deal Room

A **Master Deal Room** represents one defined commercial opportunity.

Examples include:

- supply of 100,000 kg of sugar;
- supply of 70 containers of corn;
- one freight-forwarding requirement;
- one Spanish distribution mandate;
- one representation opportunity for a defined brand or product range.

Separate commercial opportunities are billed as separate Master Deal Rooms.

A materially different lot, mandate, territory, legal entity or procurement process may require a separate Master Deal Room where it represents a genuinely separate commercial scope.

## 4. One counterparty negotiation equals one private Deal Branch

A **Deal Branch** is one isolated potential transaction with one principal counterparty under a Master Deal Room.

A Master Deal Room may therefore contain several simultaneous confidential branches, such as:

- Buyer A discussing part of an available quantity;
- Buyer B discussing another quantity;
- Buyer C discussing the full opportunity;
- a broker acting for a disclosed or controlled principal;
- a distributor proposing a recurring arrangement.

Each branch must remain isolated. A participant in one branch must not be able to discover:

- that another branch exists;
- the number of competing branches;
- the identity of another counterparty;
- prices, quantities or terms discussed elsewhere;
- documents, evidence, procedure or progress in another branch;
- a total billing amount where that amount would reveal branch count.

The Master Deal Room administrator may see the complete branch structure where authorised.

## 5. Supporting workspaces remain included

Provider, adviser and internal workspaces do not create additional branch charges.

The following remain included under the Master Deal Room price:

- legal workspaces;
- logistics workspaces;
- inspection workspaces;
- insurance workspaces;
- finance workspaces;
- customs workspaces;
- internal approval workspaces;
- several participants from the same commercial party;
- lawyers, advisers, service providers and invited specialists;
- documents, messages, evidence, procedure steps and private sub-rooms supporting one branch.

Only concurrently active principal-counterparty Deal Branches affect the branch-count price.

## 6. Canonical pricing constants

All monetary values must be stored and calculated as integer cents.

```ts
currency = "usd"
baseRoomPriceCents = 7900
includedActiveBranches = 5
additionalBranchPriceCents = 1500
maximumRoomPeriodPriceCents = 19900
activePeriodDays = 30
```

The full 30-day period price is:

```ts
Math.min(
  19900,
  7900 + Math.max(0, activeBranchCount - 5) * 1500,
)
```

| Concurrent active branches | Price for 30 days |
| -------------------------: | ----------------: |
|                        1–5 |           $79 USD |
|                          6 |           $94 USD |
|                          7 |          $109 USD |
|                          8 |          $124 USD |
|                          9 |          $139 USD |
|                         10 |          $154 USD |
|                         11 |          $169 USD |
|                         12 |          $184 USD |
|                 13 or more |  $199 USD maximum |

The cap does not create a technical maximum of 13 branches. Subject to security, anti-abuse and reasonable-use controls, additional branches above 13 do not increase the room-period charge beyond $199 USD.

There is no cross-room volume discount at launch.

## 7. What counts as an active Deal Branch

A branch counts for pricing only when all of the following are true:

1. it is a principal-counterparty Deal Branch — **including a branch whose
   admitted counterparty is an intermediary acting for a disclosed or controlled
   principal**, per section 4 (see Amendment 1);
2. the intended counterparty has accepted the invitation;
3. admission and required participation agreements are complete;
4. the branch has become write-enabled for protected commercial progression;
5. the branch is not closed, declined, withdrawn, expired or archived.

Commercially live states such as active, paused, blocked, or outcome-reached-but-not-formally-closed continue to count.

The following do not count:

- draft branches;
- invitations merely prepared or sent;
- invitations awaiting acceptance;
- declined or expired invitations;
- failed admission attempts;
- closed or archived read-only branches;
- provider, adviser or internal workspaces.

Closing a branch releases one concurrent branch slot. It does not generate a refund for the current room period. The released slot may be reused during that paid period without an additional branch charge.

## 8. Free pre-activation journey

No payment is required to:

- browse Market Signals and Member Opportunities;
- search and explore Ponte;
- create and publish an eligible opportunity;
- create and prepare a draft Master Deal Room;
- create draft Deal Branches;
- send, resend or correct invitations;
- receive or accept an invitation;
- authenticate;
- declare role, organisation and authority;
- accept required participation agreements;
- prepare the room and branch for activation.

An unanswered, declined or expired pre-activation invitation must never generate a charge.

Ponte must not issue a public free Starter Deal Room entitlement. Historical Starter-compatible schema values may remain for safe migration and audit purposes, but no new public Starter room is part of this commercial model.

## 9. Activation trigger

Payment begins only when at least one credible counterparty branch is ready to enter protected, write-enabled transaction progression.

The activation offer must state:

> **Activate this Deal Room — $79 USD**
>
> Includes 30 active days and up to five concurrent private counterparty branches.

Creating the room and inviting counterparties remains free.

The room becomes paid and write-enabled only after a verified, idempotent server-side payment confirmation. A browser return from a payment provider is not authoritative.

## 10. Additional branches during an active period

The base room purchase includes five concurrently active Deal Branches.

When authorised activation would exceed purchased branch capacity:

- the exact additional capacity and charge must be shown before payment;
- each required slot costs $15 USD;
- the client must never determine the amount;
- the charge must never be silent;
- no branch identity or competing negotiation must be exposed in the billing explanation.

At launch, an additional branch slot lasts until the current room period ends. There is no proration.

Once total paid room-period value reaches $199 USD, additional branch activations during that same period do not require another charge.

## 11. Billing sponsor and commercial authority

The payer is the **billing sponsor**.

The billing sponsor may be:

- the Deal owner;
- an authorised counterparty;
- an authorised institution or programme;
- Ponte through a separately authorised administrative waiver.

Payment never grants additional commercial, procedural, ownership, disclosure or approval authority.

The payer is not automatically the Deal owner, room administrator, principal, required approver or owner of another participant's documents.

Only authorised Master Deal Room administrators may view the complete active-branch count, purchased capacity and total room billing breakdown.

## 12. Renewal, expiry and reactivation

Day-one billing is a one-time purchase of a fixed 30-day active period.

There is no general Ponte membership subscription and no silent auto-renewal at launch.

At renewal, calculate the next 30-day price from the billable branches selected to remain active.

When payment expires:

- nothing is deleted;
- participants are not removed;
- agreements, evidence, translations and activity remain intact;
- the Master Deal Room and its branches become read-only;
- existing branch isolation and permissions remain enforced;
- authorised participants retain access to their historical record;
- reactivation creates a new paid 30-day period.

A room with no branch selected for resumption remains readable without payment.

The commercial record must never be held hostage behind a continuing subscription.

## 13. Multilingual Deal Room is included

Native multilingual Deal Room operation is included in the standard price for:

- English;
- Spanish;
- Russian;
- Simplified Chinese;
- Modern Standard Arabic.

There is:

- no multilingual plan;
- no translation surcharge;
- no translation credits;
- no per-word or per-message fee;
- no separate Arabic, Chinese, Russian or Spanish tier.

Each contribution must preserve:

1. the immutable original participant-authored content;
2. the source language;
3. clearly labelled participant-specific translations;
4. confirmed canonical commercial meaning before a structured term changes Deal state.

Translation must never silently alter the commercial record.

Participants must be able to see the original, see the translation, report ambiguity or inaccuracy, request clarification and confirm intended meaning before a binding commercial action is recorded.

Arabic must support right-to-left presentation while preserving left-to-right trade identifiers such as HS codes, Incoterms, currency codes, quantities, units, container codes and company names.

All canonical money records remain in USD. Use `USD` where `$` alone could be ambiguous. Do not perform automatic currency conversion.

### Scoped language-policy effect

This authority creates a scoped exception to the existing English-only interface policy for authenticated Deal Room participant surfaces and Deal Room transactional notices.

It does not authorise a general multilingual public website. Public upstream surfaces remain governed by the existing language authority unless separately superseded.

## 14. Included without additional charge

The Deal Room price includes, subject to reasonable-use and security controls:

- one Master Deal Room for one commercial opportunity;
- included private counterparty branches;
- all permitted supporting private workspaces;
- participants from the commercial organisations;
- lawyers, advisers and invited specialists;
- structured proposals and procedures;
- agreements and acceptance records;
- evidence, clarification, blockers and decisions;
- full activity and audit history;
- reasonable document storage;
- supported-language translations;
- permanent read-only archive after closure or expiry.

There must be no ordinary per-user, per-document, per-message, per-workspace, per-gigabyte or translation charge.

## 15. Monetisation Ponte must not use

Ponte must not publicly charge for or reintroduce:

- membership subscriptions;
- Starter, Pro, Portfolio or Enterprise plans;
- listing or publishing fees;
- paid Market Signal access;
- paid visibility or promoted offers;
- credit packs, room credits, tokens or usage currency;
- paid verification or verification badges;
- public Ponte Desk packages;
- retainers;
- transaction commissions or success fees;
- percentages of Deal value;
- per-seat charges;
- per-document or per-message charges;
- separate sub-room charges;
- translation charges;
- feature tiers that weaken the core Deal Room integrity process.

Ponte is paid for controlled transaction infrastructure, not for acting as a broker or claiming part of the underlying trade.

## 16. Quantity and allocation control

A divisible opportunity may complete through several successful branches.

The Master Deal Room may show, to authorised administrators:

- total available or required quantity;
- total quantity under discussion;
- provisionally reserved quantity;
- firmly allocated quantity;
- remaining available quantity.

Quantity under discussion may exceed total availability because competing negotiations can run in parallel.

Firm allocation must not exceed the opportunity's available quantity or capacity.

Quantity control affects commercial integrity, not price. Ponte must not charge according to quantity, containers, cargo value or accepted commercial price.

## 17. Launch-partner credits

The public price remains $79 USD from the beginning.

For a limited number of selected launch transactions, Ponte may issue an auditable 100% promotional waiver or voucher.

The checkout and record should preserve the value anchor, for example:

```text
Ponte Deal Room                 $79 USD
Launch partner credit          -$79 USD
Amount due                       $0 USD
```

A promotional waiver does not create a second public tariff, free-room plan or permanent founder entitlement.

## 18. Superseded commercial authorities

Within its scope, this owner decision supersedes every earlier proposal or accepted statement providing for:

- a free Starter Deal Room;
- Portfolio subscriptions;
- Ponte Credits or credit-funded rooms;
- paid counterparty or member verification;
- paid verification certificates or badges;
- public Ponte Desk retainers, packages or success fees;
- commission or percentage-of-transaction pricing;
- euro-denominated Deal Room pricing;
- unlimited commercially active principal-counterparty branches for one flat room price;
- multilingual Deal Room surcharges or quotas;
- a requirement that every private sub-room is commercially free regardless of principal-counterparty branch use.

This includes, without deleting their historical record:

- `PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`;
- `PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`;
- `PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`;
- `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`;
- ADR-0004, ADR-0005 and ADR-0006 where their commercial rules conflict with this authority;
- any pricing page, account page, Stripe, credits, verification or Ponte Desk copy that conflicts with this decision.

The core branching principle remains valid:

> One commercial opportunity creates one Master Deal Room, with several private and isolated negotiations beneath it.

## 19. Required public pricing statement

The canonical public position is:

> **One opportunity. Multiple confidential negotiations. Five languages.**
>
> A Ponte Deal Room costs **$79 USD for 30 active days** and includes up to five active private counterparty branches.
>
> Additional active branches cost **$15 USD each**, with a maximum charge of **$199 USD per Master Deal Room per 30-day period**.
>
> English, Spanish, Russian, Simplified Chinese and Modern Standard Arabic are included.

Supporting statement:

> Browsing, publishing opportunities, receiving invitations, participants, advisers, documents, translations and permanent read-only history carry no additional charge.

The pricing page must present one product and one formula. It must not use a multi-plan comparison grid.

## 20. Implementation and production boundary

This authority records the owner decision. It does not by itself authorise:

- database migrations;
- production-data changes;
- Stripe product, Price or webhook configuration;
- production secrets or environment changes;
- enabling charging;
- deploying billing code;
- changing production feature flags;
- sending production payment notifications;
- processing a real charge;
- issuing a production waiver;
- production tax configuration.

Implementation must begin with repository verification and an authority-reconciliation pull request.

Before runtime implementation, the repository must create an accepted ADR and update the authority manifest, start page, current state, decision log, relevant Deal Room authorities, active plan, database state, feature flags, launch records and operations records as applicable.

Historical authorities and financial records must be preserved and marked superseded rather than rewritten or deleted.

## 21. Required implementation sequence

Unless verified repository architecture requires a safer equivalent, use separate reviewed slices:

1. authority reconciliation, inventory and executable plan;
2. domain model, branch-counting contract and pure pricing engine;
3. billing records, Stripe checkout, webhook and entitlement lifecycle;
4. public pricing, Deal Room billing surfaces, multilingual notices and commercial ratchet;
5. production preflight, migrations, Stripe catalogue, environment and rollback runbook.

Each production-changing category requires separate explicit owner approval.

## 22. Canonical implementation references

Any Claude Code, Codex, ChatGPT or human implementation brief must cite this exact file first:

`docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md`

The implementation agent must treat this document as the commercial decision authority while also reading the repository's current operating rules, Design Constitution, Deal Room product contract, branching authority, accepted ADRs, live schema record and open pull requests.

Conversation text, pasted prompts and local notes may explain the decision but must not replace this merged repository authority.