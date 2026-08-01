# ADR-0026: A listing publishes itself above a named minimum, and carries its completeness

- Status: ACCEPTED
- Date: 2026-08-01
- Owner statement, recorded the same day it was made.

## The decision, in the owner's words

Stated twice, because the first version was not acted on:

> I cannot review every submission myself. It would be a lie and is not
> scaleable.

> I will never be able to review personally every entry. Let the entry go live
> with the % completion and remind the user that an incomplete entry has less
> chances to be invited to a Deal Room.

And then made precise, which is the part that matters:

> If you wanna go out with just saying cherries, then maybe we're gonna say no,
> we have to have a minimum of things that need to be put in the offer. If you
> don't arrive to at least the minimum - let's say quantity, destination or
> origin, Incoterm, payment terms, validity and role - these are the details
> that are absolutely necessary. Otherwise you cannot publish. The publishing
> of this offer is free.

## The minimum, exactly

A product listing publishes when it states all of:

1. **the side** — offer or requirement;
2. **the product**;
3. **quantity** — a basis, not necessarily a figure. "Negotiable" and "on
   request" are answers a counterparty can act on;
4. **origin or destination** — at least one end of the route;
5. **Incoterm**;
6. **payment terms** — or an explicit "to be agreed", which is a position;
7. **validity** — standing, or dated with a date;
8. **the submitter's role** — and, for a broker or intermediary, the chain.

That is the whole gate. Nothing else withholds a listing.

Trade services and distribution have no shipped quantity, no route and no
Incoterm, and are never asked for them. Their equivalents are the scope of what
is offered and the territory it covers, which the family rules already hold.

## Everything above the minimum is a percentage, not a gate

A record that clears the minimum goes live immediately, carrying its completion
percentage. HS classification, images, documents, specifications, indicative
value, certifications, the second end of the route, shipment frequency: all of
these raise the percentage and none of them holds a record back.

The member is told why the percentage matters in the terms the owner set:
**an incomplete entry is less likely to be invited into a Deal Room.** That is
the incentive, and it is a true statement about how counterparties choose, not
a threat and not a fee.

## What this removes, and it is the point

**The desk-written public text stops blocking publication.** The gate required
`desk_version.qualification` and `desk_version.limitations` — text a human at
Ponte writes for each record. That requirement IS the manual review the owner
says cannot scale and will not pretend to do. It is the reason PT-0108, PT-0109
and PT-0110 sat at "IN REVIEW". It is removed as a blocker.

Its purpose survives without it. A published record shows the member's own
statements as the member's statements, and the public trust labels
(`lib/listings/public-labels.ts`) already emit "Opportunity reviewed" only when
desk text genuinely exists. So a reviewed record still reads as reviewed, and an
unreviewed one no longer pretends to be, or waits forever to become one.

**"Submitted" stops being a queue.** It was already meant to be transient. Now
nothing routine lands in it.

## What still withholds a record, and always will

- **Unlawful or abusive content**, via the automated safety checks.
- **An unresolved sanctions screening** on the submitter's business.
- **The member's own declaration** that the information is accurate and that
  they are authorised to submit it. This is the member's signature, not Ponte's
  review, and it is collected in the composer at the moment of submission.

## Left unchanged, and now answered by ADR-0027

**Business verification still blocks publication.** This section asked the
owner whether he wanted that moved. He answered the same day, and the answer is
better than either option offered here: see **ADR-0027**. Business verification
should NOT gate publication. A lighter **contact verification** - name,
surname, telephone, and a verified email address or WhatsApp number - gates
whether anybody can see how to reach you.

That correction is not implemented yet. It needs a contact-verification model
that does not exist. Until it does, the paragraph below still describes the
running code, and it is the most likely thing holding a real listing.

**Business verification still blocks publication.** The owner decision of 28
July 2026 was that automated publication does not lower the member-business
bar, and nothing said on 1 August overrides it: the minimum quoted above is a
list of RECORD fields, and verification is not one. It is also automated, so it
is not the personal review the owner is refusing to pretend to do.

This is called out because it is the most likely thing still holding a real
listing: the probe of 26 July 2026 recorded zero members with a passing bound
member-business verification. If the owner wants a record to publish before its
business is verified, that is one line here and one line in the validator.

## Why this document exists at all

The first version of this decision was confirmed in conversation on 1 August
2026 with the words "nothing structural — anything with a product and a side
goes live". That was too permissive, and the owner corrected it within the hour
with the explicit list above. Both readings are recorded so the correction
cannot be lost the way the original decision was.
