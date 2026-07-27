# Ponte Trade Starter Deal Room Access

- **Status:** Product principle accepted; launch limits proposed for owner approval
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Implementation status:** Not started

## 1. Purpose

Ponte must let a new organisation experience the Deal Room before asking it to commit to ongoing paid capacity.

The Starter Deal Room is the product's acquisition and conversion experience. It must let users feel the momentum, structure and satisfaction of progressing a real commercial Deal while preserving the Deal Room as Ponte's primary monetised product.

Public-facing language should use **Starter Deal Room** or **Starter Access**. The product should not headline the internal commercial term "freemium".

## 2. Position in the commercial ladder

```text
Free Market Access
  -> publish or discover a complete structured Deal
  -> activate one Starter Deal Room
  -> experience the core progress loop
  -> upgrade to Portfolio subscription or Ponte Credits
  -> add paid agent, Ponte Desk or specialist services when needed
```

Free Market Access remains upstream. Starter Access is the limited first experience of the paid value-bearing environment.

## 3. Recommended launch entitlement

### Eligibility

- one Starter Deal Room entitlement per verified organisation;
- organisation-level enforcement rather than per-user enforcement;
- no credit card required;
- the organisation must satisfy the Deal Room-ready Business Passport threshold;
- the master room must be linked to one complete structured Deal;
- invited sponsored participation in another organisation's room does not consume the invitee's own Starter entitlement.

### Capacity

- 1 master Deal Room;
- up to 3 private sub-rooms directly related to that Deal;
- up to 2 admitted external guest organisations;
- up to 2 internal organisation users;
- up to 3 named participants within each admitted external organisation where operationally appropriate.

### Duration

- the 30-day active term begins only when the first required external principal participant completes admission;
- proposed-room preparation and a pending invitation do not start the 30-day term;
- a pending invitation expires after 14 days unless renewed under the final lifecycle policy;
- after the 30-day active term, the master room and sub-rooms become read-only unless upgraded.

### Included core experience

The Starter Deal Room must include the features that create real product value and excitement:

- formal participant admission;
- Business Passport eligibility;
- Participation Agreement and NDA acceptance;
- one master-room overview;
- private sub-rooms;
- procedure proposal and agreement;
- responsibilities and next actions;
- evidence upload and review;
- clarification requests;
- conditions and blockers;
- durable decisions and approvals;
- named commercial stage;
- stable weighted procedural completion;
- milestone recognition;
- basic activity recap and basic AI-assisted summary;
- pause, close and read-only history.

The Starter product must be capable of reaching a genuine milestone. It must not be a static tour or empty mock workspace.

## 4. Excluded from Starter Access

Starter Access does not include:

- a second master Deal Room;
- more than 3 private sub-rooms;
- more than 2 external guest organisations;
- more than 2 internal users;
- more than the approved basic AI allowance;
- Ponte-facilitated or Ponte-managed procedure;
- founder or Ponte Desk investigation;
- specialist services;
- custom evidence or reporting work;
- contractual, legal, financial or trade-execution support;
- transaction settlement, escrow or trade finance.

Human assistance requires a separately accepted paid scope.

## 5. Activation and consumption

The recommended sequence is:

```text
Complete or select a structured Deal
  -> choose Starter Deal Room
  -> prepare the master room and initial sub-room
  -> invite the required external principal participant
  -> participant completes Business Passport, role, NDA and admission
  -> Starter entitlement is consumed
  -> 30-day active term begins
```

The entitlement is not consumed when:

- the invited principal declines;
- the invitation expires before admission;
- the sponsor cancels before activation;
- Ponte rejects the room before activation for eligibility or policy reasons.

The organisation may correct or replace the pending invite before activation under the final anti-abuse policy.

Once activated, the entitlement is considered used even when:

- the commercial discussion fails;
- the parties close early;
- the sponsor withdraws;
- no contract or transaction results.

## 6. Upgrade experience

Upgrade must feel like continuing the same Deal, not restarting.

The organisation may upgrade to:

- Deal Room Portfolio subscription; or
- Ponte Credits for pay-as-you-go continuation.

Upgrade must preserve:

- the master room;
- all sub-rooms;
- participants and permissions;
- NDA and acceptance records;
- procedure versions;
- evidence and disclosure history;
- decisions, blockers and milestones;
- activity and audit history.

No participant should have to re-register, reaccept unchanged terms or re-upload evidence solely because the sponsor upgrades.

## 7. Upgrade moments

The product should show calm, explicit upgrade prompts when the organisation reaches a natural limit:

- **Keep this Deal moving** — active term approaching expiry;
- **Open another Deal Room** — second Deal required;
- **Add another private workstream** — fourth sub-room required;
- **Invite another organisation** — third external organisation required;
- **Bring in your team** — third internal user required;
- **Ask Ponte to help** — human or specialist support requested.

The product must not interrupt an unsafe moment, conceal existing information or manufacture urgency merely to force payment.

## 8. Expiry and read-only state

When Starter Access ends:

- no data is deleted;
- the room remains visible in read-only form;
- participants retain access according to their existing visibility permissions;
- new evidence, procedure changes, decisions and invitations are disabled;
- the sponsor can upgrade and resume the same room;
- a basic closure or audit summary remains available;
- retention remains subject to the final customer terms and legal policy.

## 9. Anti-abuse principles

- one Starter entitlement per verified organisation, not per email address;
- duplicate personal accounts do not create additional free rooms;
- company-domain, registration and Business Passport evidence may be used to associate users with an organisation;
- Ponte may block repeated or deceptive attempts to recreate Starter eligibility;
- genuine invited guests retain their own future Starter entitlement when they later sponsor their own first master Deal Room;
- owner-approved promotional or sponsored entitlements remain separately auditable.

## 10. Commercial rationale

The Starter Deal Room solves four problems:

1. It lets the user feel the product before paying.
2. It demonstrates the complete emotional and procedural loop rather than marketing claims.
3. It feeds more invited organisations into Ponte without charging every participant.
4. It creates natural conversion when the organisation needs scale, duration, concurrency or assistance.

The free limit is therefore based on **one real experience**, not an arbitrary number of clicks or messages.

## 11. Recommended launch limits awaiting approval

| Dimension | Starter proposal |
|---|---:|
| Price | €0 |
| Credit card | Not required |
| Entitlement frequency | Once per verified organisation |
| Master Deal Rooms | 1 |
| Active term | 30 days from first principal admission |
| Private sub-rooms | 3 |
| External guest organisations | 2 |
| Internal users | 2 |
| Core workflow | Included |
| Basic AI recap | Included within fair-use limit |
| Human Ponte Desk | Not included |
| Expiry state | Read-only; upgrade to resume |

## 12. Implementation boundary

This document does not authorise:

- runtime code;
- database schema or migration;
- identity-enforcement implementation;
- AI usage quotas;
- pricing-page publication;
- Stripe configuration;
- production activation;
- charging;
- deployment.

The numerical limits require explicit owner approval. Implementation then requires the full product, commercial, Design, technical, legal, tax, entitlement and rollout process.

## 13. Related records

- `docs/decisions/ADR-0006-starter-deal-room-access.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- GitHub issues #51 and #52
