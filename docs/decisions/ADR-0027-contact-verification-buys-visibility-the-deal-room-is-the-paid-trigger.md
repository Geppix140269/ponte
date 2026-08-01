# ADR-0027: Contact verification buys visibility. The Deal Room is the paid trigger

- Status: ACCEPTED
- Date: 2026-08-01
- Owner statement, recorded the same day.

## The decision, in the owner's words

> You can publish whatever you want, but we will not give anyone visibility
> over your details. So you have to give us your details. We have to know who
> you are: your email, your name, surname, telephone number, and the verified
> email address. Or a verified WhatsApp number that we can verify.
>
> That verification process, which is the minimum, is not - we're not verifying
> the company or who you really are, we don't have your passport. This is the
> first step. Now this is what gives you the visibility to your request or your
> offer.
>
> When this becomes serious and you want to either investigate a real offer
> that has been published, or you want to open a Deal Room for people to -
> because you want to invite them - that's the trigger. And that's when you
> pay.

## There are two verifications, and they were being treated as one

**Contact verification.** Name, surname, telephone number, and a **verified
email address or a verified WhatsApp number**. It is explicitly NOT identity
verification: no passport, no company registry, no claim that the person is who
they say they are. It establishes only that a real, reachable human stands
behind the record.

**Business verification.** The existing member-business check. Unchanged, and
not what this ADR is about.

Everything the product currently calls "verification" in the publication path
is the second one. The owner has now named the first, and it is the one that
matters at this stage of the funnel.

## What each one buys

| Act | Requires |
| --- | --- |
| Publishing an offer or requirement | the field minimum of ADR-0026. Free. |
| **Your details being visible to anyone** | **contact verification** |
| Investigating a real published offer | the Deal Room, and therefore payment |
| Opening a Deal Room to invite someone | payment |

A record can be published without contact verification. It simply carries no
route to its author, which makes it inert: visible as a statement, unreachable
as an opportunity. The member is not blocked, they are unreachable, and the
remedy is entirely in their hands.

## This answers the question ADR-0026 left open

ADR-0026 flagged that business verification still blocked publication and asked
whether the owner wanted it moved. This is the answer, and it is better than
either option offered there:

**Business verification should not gate publication.** Contact verification
gates VISIBILITY OF CONTACT DETAILS, which is a different and lighter thing,
and it is the correct trade: give us a way to reach you and we will let people
reach you.

That correction has not been implemented yet. It is the next piece of work, and
it needs a contact-verification model that does not exist: a verified phone
number, a verified WhatsApp number, and the states around them.

## Why the Deal Room keeps earning its price

The owner raised the obvious objection himself and answered it:

> Once someone has created a Deal Room and finds out who the counterparty is,
> they will next time not use the Deal Room. Which is not necessarily true,
> though, because the Deal Room becomes a very useful tool.

The reasons it stays used, which are product requirements and not marketing
copy:

1. **It is multilingual, natively.** Documents, history and record in Chinese,
   Russian, Arabic, English, Spanish. A shared workspace two parties can each
   read in their own language is not something WhatsApp and email provide.
2. **It stores documents, with a history.** The record of what was agreed, when
   and by whom, survives the deal.
3. **It is a repository across deals**, including repeat deals with the same
   counterparty. Track what you have done and who you have dealt with.
4. **It replaces WhatsApp and email** as the place a deal actually lives.

The retention argument is the multilingual durable record. Any change that
weakens the language support or the document history attacks the reason the
room is bought a second time.

## What must not be built from this

**A passport, registry or KYC step presented as contact verification.** The
owner was explicit that this tier does not verify the company or the person.
Asking for more than name, surname, phone and one verified channel breaks the
lightness that makes it acceptable at this point in the funnel.

**A block on publication for missing contact details.** The record publishes.
It is the contact route that is withheld until verified.

**A charge anywhere before the Deal Room.** Publishing is free, contact
verification is free, being found is free.

## Open, and to be confirmed by the owner

1. What exactly is hidden before contact verification: the member's name and
   company as well as their phone and email, or only the direct contact
   channels?
2. Is "investigate a published offer" the same paid event as opening a room, or
   a separate smaller one? The wording groups them under one trigger.
3. Does a verified WhatsApp number alone satisfy the requirement, or is an
   email address always needed as well for Ponte's own correspondence?
