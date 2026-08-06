# ADR-0028: The definitive commercial model. Free to publish, free to build, paid to activate

> **⚠ Amended by ADR-0029, 2 August 2026.** The instruction *"Do not issue a free
> Starter Deal Room entitlement"* is **withdrawn**, and item 4 of the programme,
> *"removal of the free Starter entitlement"*, is replaced by *"implementation of
> the first-activation waiver"*. The price structure stated in this ADR, $79,
> five included branches, $15 per additional branch and a $199 ceiling, is
> **unaffected and remains correct**. Everything else in this document stands,
> including that the entire pre-activation journey is free and that activation is
> a distinct, member-confirmed event.
>
> The sentence *"The paid entitlement is created only after webhook-confirmed
> payment"* remains true of paid activations and must not be read as forbidding a
> waived entitlement recorded at $0 due.

- Status: ACCEPTED
- Date: 2026-08-01
- Owner brief, received in full and recorded verbatim in substance.
- **Supersedes the pricing and gating clauses of ADR-0025, ADR-0026 and
  ADR-0027.** Those three were written from spoken fragments across one day and
  each was correct about part of this. Where they disagree with this document,
  this document wins.

## The one-line model

> Create the opportunity for free, publish the opportunity for free, privately
> build and experience the Deal Room for free, pay when the Deal Room is
> activated for external use.

## Three objects, and they must never be conflated

The single most important correction in the brief:

| | Object | Commercial rule |
| --- | --- | --- |
| **A** | The publicly visible commercial opportunity | free to create, free to publish |
| **B** | The privately prepared Deal Room draft | free to create, prepare, personalise and preview |
| **C** | The activated, externally usable Deal Room | **paid** |

A published opportunity is **not** an active Deal Room. A Deal Room draft is
**not** an activated room. Publishing the opportunity is never evidence that
the room is paid or active.

## The payment trigger, exactly

**The owner's explicit decision to activate a privately prepared Master Deal
Room for external sharing, invitation and protected commercial progression.**

It is **not** triggered by: creating an opportunity; publishing one; creating a
private room draft; editing the room; viewing its multilingual presentation;
uploading material privately while preparing; previewing an invitation;
exploring the workflow; or seeing how the room will appear to a counterparty.

Payment **is** required before the first externally operational action:
sending the first live invitation; generating a live external invitation link;
admitting an external participant; opening the first externally accessible
counterparty branch; sharing protected access.

**The previous rule is withdrawn.** Anything stating that payment begins only
after a counterparty accepts an invitation is wrong and must be removed.

The member must actively confirm the payment. **No silent activation or charge
is permitted.**

## Price

- `$79 USD` per Master Deal Room for 30 active days
- `5` concurrently active counterparty branches included
- `$15 USD` for each additional active branch in the period
- `$199 USD` maximum per Master Deal Room per period
- Multilingual operation included

Every one of these already exists in `lib/deal-room/pricing.ts` and must be
read from there, never typed into a surface.

## The private draft is a showroom, not a form

> The member should feel: "Ponte has turned my commercial opportunity into
> something professional that I am proud to present."

The draft must **not** be a crippled or artificial demo. It demonstrates real
product value using the member's **actual** opportunity, and must let them
experience the master-room presentation, the deal snapshot and its structured
facts, quantity and capacity, evidence and document areas, the procedure
preview, the branch structure, participant roles, the progress model, activity
history, all five languages including Arabic right to left, and a preview of
what an invited counterparty will see.

The activation screen comes **only after the value is tangible**. It must not
interrupt a member immediately after they enter basic product information.

Recognition uses the Professional Momentum model - action, recognition, value
created, progress preserved, next action - and never points, coins, streaks,
confetti or exaggerated praise.

## Two visibility modes, chosen at activation

Not "open" versus "closed": **open** wrongly implies anybody can enter.

- **Discoverable, open to applications.** A controlled showroom preview and a
  `Request to join` action. Never labelled merely "Join", because joining
  remains subject to acceptance, admission, authority declarations, agreements
  and branch creation.
- **Private, invitation only.** Not listed as accepting applications. The
  underlying opportunity may still be published for free.

Default is **discoverable**, but the owner must choose explicitly and see both
explained. **Never assign the mode silently.** Mode changes are recorded in the
activity history and never alter existing branches or permissions.

## Contact is gated, and publication does not open it

Free publication gives the **opportunity** visibility. It does not give the
public visibility over the publisher's email, telephone, WhatsApp, private
company contact, private documents, unpublished evidence, internal notes, or
any other branch.

The publication identity threshold is an authenticated account, first and last
name, verified email, telephone or WhatsApp where requested, verification of
the required channel, acceptance of terms, and a truthful declaration of
entitlement to publish.

**The interface must never call this full verification.** Use the specific
states: contact confirmed; email confirmed; telephone confirmed; business
information supplied; business verification not completed; commercial authority
declared but not independently verified. Never combine them into one "verified"
badge.

No public scrapeable contact directory may be created. Applications must not
carry attachments, images or arbitrary rich text, and free text must be
screened for ordinary and obfuscated contact details across all five languages.
A detector that finds nothing is never proof that nothing is there.

## Entitlement

**Do not issue a free Starter Deal Room entitlement.** A private draft needs no
entitlement because it is not externally operational. The paid entitlement is
created only after webhook-confirmed payment. Expiry moves the room to
read-only continuity. **The room is never deleted.**

## State model

```
Opportunity: draft -> publishable -> published
             -> paused / expired / withdrawn / closed

Master Deal Room: draft -> preparing -> readiness_incomplete
             -> ready_to_activate -> payment_pending -> active
             -> read_only -> reactivation_pending -> active
             -> completed / closed
```

Counterparty branches have their own independent lifecycle. Commercial status
is read from explicit states, never inferred from scattered timestamps.

## The publication minimum is family-specific

ADR-0026 fixed a product minimum. This brief confirms the shape and requires
that it be **derived from the accepted market family and intent**, never
imposed. Trade services are not asked for quantity, HS code or Incoterm.
Distribution is not pushed through a physical-product contract. A genuinely
inapplicable fact is never required, and filler must not satisfy a required one.

Completion percentage communicates development. The publication minimum is the
threshold for appearing publicly. Deal Room readiness is a later and stronger
standard. **A percentage alone must never decide eligibility.**

## The Deal Document and Evidence Register

A structured, stage-aware document framework, building on the existing Evidence
Register rather than replacing it. Its governing rule:

> There is no single universal set of documents that every international trade
> Deal must possess at room creation.

Applicability is derived from family, product or service, origin, destination,
territory, role, regulated status, payment method, financing, Incoterm,
transport mode, customs requirements, procedure stage and the parties' agreed
controls.

Ponte must never demand a bill of lading before a shipment exists, proof of
funds from every applicant, a phytosanitary certificate for an unrelated
product, or an HS code from a service provider. **An upload is never a
verification.**

Applicability states: required now; required before a named step; required
before readiness or closure; requested by a participant; recommended;
available; expected later; not yet produced; not applicable; waived by
authorised decision.

Review states: not supplied; requested; uploaded; translation pending; under
review; clarification required; superseded; expired; accepted for this
procedure; rejected for this procedure; withdrawn; access restricted.

"Accepted for this procedure" does not mean authentic, legally valid,
independently verified, approved by Ponte, or evidence the transaction will
complete.

Progressive gates: A private preparation requires no uploaded trade document;
B activation requires identity or capacity declarations, terms, sufficient deal
definition, declared authority and explicit acknowledgement of missing
documents; C branch admission requires participant-specific items; D procedure
approval is where the parties agree what is required, from whom and by when;
E commercial milestones require the documents attached to them.

Translations never replace originals. Originals are immutable. Documents never
cross branch boundaries.

## What this is, and what has been built

The brief is a **programme**, not a change. As of this ADR the following are
specified and **not built**:

1. the three-state object model and its lifecycle states;
2. the private draft room and its preview of the counterparty experience;
3. activation as a distinct, confirmed, paid event;
4. removal of the free Starter entitlement;
5. discoverable and private visibility modes;
6. the request-to-join application journey and its inbox;
7. contact-information screening across five languages;
8. the Deal Document and Evidence Register, its taxonomy and applicability
   engine;
9. the readiness questionnaire;
10. family-specific publication minimums for services and distribution;
11. the contact-verification tier from ADR-0027.

What **is** built as of today is the public walkthrough at `/deal-rooms/inside`,
which states this model to a visitor in seven stages and reads every price from
`pricing.ts`. It is the only surface currently telling the truth about the
commercial model, and it was written from this brief.

The full test list the brief specifies is recorded there and is not yet
implemented; it should be lifted into the relevant suites as each numbered item
above is built.
