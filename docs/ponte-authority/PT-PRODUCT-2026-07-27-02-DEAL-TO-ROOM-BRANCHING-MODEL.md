# Ponte Trade Deal-to-Room Branching Model

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Implementation status:** Not started

## 1. Core model

Ponte separates the upstream commercial object from the downstream transaction workspace.

```text
Structured Deal
  -> zero, one or many counterparty-specific Deal Rooms
  -> each room progresses one isolated commercial path
```

A structured Deal is a member-created requirement, offer, trade-service intention, distribution intention or representation intention. It may be published and remain available without payment for a Deal Room.

The Deal Room begins only when a participant chooses to progress a specific commercial path with a specific counterparty or set of authorised participants.

## 2. Free Deal posting

Creating and publishing a complete structured Deal is part of Ponte's liquidity layer and does not require a Deal Room entitlement.

Free does not mean unstructured or automatically published. The Deal must still satisfy the applicable product discipline:

- one accepted market family;
- one family-valid intent;
- all mandatory commercial facts for that family and intent;
- correct public/private separation;
- truthful evidence and limitations;
- member identity and submission requirements;
- review, publication, expiry and reconfirmation rules;
- no fabricated facts or unsupported trust claims.

Physical-product Deals may require HS classification where appropriate. Trade services and Distribution and representation use their own accepted taxonomies and must not be forced through an HS-product flow.

Operational anti-abuse, quality and publication limits may apply, but Ponte does not charge a Deal Room fee merely to publish an eligible Deal.

## 3. One Deal, multiple transaction branches

A single Deal may be progressed with several potential counterparties.

Every counterparty-specific progression path is a separate Deal Room. If five counterparties are being evaluated or negotiated with, the Deal has five linked rooms.

The product may group those rooms privately for the Deal owner, but they remain separate permission and commercial objects.

Each room has its own:

- reference;
- initiator;
- sponsor and entitlement;
- principal and supporting participants;
- admission records;
- Participation Agreement and NDA acceptance;
- procedure and versions;
- conditions;
- evidence and disclosure rules;
- decisions and approvals;
- blockers;
- commercial stage and procedural completion;
- outcome and retention history.

## 4. Who may open the room

The Deal owner may open a room and invite a prospective counterparty.

An eligible interested participant may also open and sponsor a room from someone else's posted Deal and invite the Deal owner into it.

The party that opens or pays for the room does not acquire ownership of the parent Deal or unilateral authority over another participant.

The room roles are distinct:

| Role | Meaning |
|---|---|
| Deal owner | Controls and updates the posted Deal |
| Room initiator | Creates the proposed room |
| Room sponsor | Supplies the subscription slot, credits or other entitlement |
| Room administrator | Manages permitted room configuration and invitations |
| Principal participant | Acts as a commercial party |
| Supporting participant | Provides an authorised service or advice |
| Payer | Funds the entitlement where payment is used |

## 5. Guest principle

The room sponsor covers the invited external participants permitted by the plan or credit entitlement.

An invited counterparty may enter as a sponsored guest without purchasing a subscription or credits merely to participate in that room.

A guest must still:

- authenticate;
- satisfy the Deal Room-ready Business Passport threshold;
- declare organisation, role and authority;
- accept the room Participation Agreement and NDA;
- comply with the same permission and conduct rules.

Sponsored access removes payment friction. It does not weaken identity, admission, confidentiality or authority requirements.

## 6. Branch privacy

Counterparty branches are isolated.

A participant may not infer or inspect another branch's:

- existence;
- participants;
- proposed or agreed commercial terms;
- documents or evidence;
- procedure;
- progress;
- blockers;
- decisions;
- outcome.

Only the Deal owner sees the private branch portfolio for their Deal. Ponte sees linkages only where its operational role and permissions permit it.

No interface should display labels such as “four other buyers are negotiating” unless the Deal owner has explicitly chosen to disclose that fact and the disclosure is lawful and appropriate.

## 7. Duplicate and parallel rooms

The default is one active room for the same parent Deal and the same pair of principal organisations.

A parallel room between the same organisations requires a distinct recorded scope, such as:

- a different product or lot;
- a different territory;
- a different legal entity;
- a different distribution mandate;
- a different procurement process;
- a separate commercial or compliance procedure.

## 8. Relationship between room and parent Deal

A room is linked to a snapshot and current version of the parent Deal, but it does not silently rewrite the public Deal.

When a branch progresses materially, Ponte should request an explicit Deal review where relevant, including:

- available quantity or capacity;
- remaining territories;
- exclusivity;
- timing and expiry;
- whether the Deal remains open;
- whether other branches should continue.

The parent Deal may have states such as open, partially allocated, paused, fully allocated, expired, withdrawn or closed. The detailed lifecycle remains to be approved in the later product-definition package.

## 9. Commercial counting rule

Each active branch consumes one active-room entitlement.

Therefore:

- five branches of one Deal use five room slots;
- one branch across five unrelated Deals also uses five room slots;
- proposed rooms do not consume a final paid entitlement until the accepted activation event;
- declined, cancelled or expired pre-activation proposals release reserved entitlement according to the launch policy;
- every additional admitted external organisation consumes the applicable guest allowance or credit entitlement.

## 10. Product success test

The model succeeds when:

- a member can publish a complete Deal without paying for a room;
- either side can sponsor the next step;
- an invited counterparty can join without buying its own plan;
- one Deal can support several isolated commercial paths;
- no counterparty learns about another branch;
- each active branch creates clear recurring or pay-as-you-go value for Ponte.

## 11. Implementation boundary

This authority defines product behaviour only. It does not authorise screen design, database design, migrations, payment collection, Stripe, runtime implementation, deployment or production action.

## 12. Related records

- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- GitHub issues #51 and #52
