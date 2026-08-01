# ADR-0025: The Deal Room is a showroom. You build it free, and pay to publish it

- Status: ACCEPTED
- Date: 2026-08-01
- Owner statement, recorded within minutes of being made.

## The decision, in the owner's words

> Opening a deal room doesn't mean that you publish the deal room. Actually
> it's a good idea to let people open a deal room.
>
> Once you have done and you've seen what the deal room can do, you have your
> own language, you're Chinese, you're Russian, you've played with it, we got
> them engaged into creating the deal room so that at that moment they feel
> like, oh wow, now I want to go out and show the world how beautiful my deal
> room is. Because that's what it's all about. The psychology is that we give
> them this tool for them to present their deal, either buying, their offering,
> they're asking for distribution, whatever it is. It is a showcase, it is a
> showroom, it is something they're gonna be proud of.
>
> And then the process begins when we do the verification. When everything is
> ready, then we say: okay, now if you want to publish this, if you want to go
> and share this and invite people into your deal room, now you pay.

## What this decides

**Creating a room is free, unlimited, and encouraged.** It is the engagement
mechanism, not the conversion event. A member who has not published anything,
has not verified, and has not paid may still open a room and build it.

**The room is a presentation surface before it is a workspace.** Previous
records treat it only as the place a transaction is conducted. That is what it
becomes; it is not what earns it. What earns it is that a member is PROUD of it
and wants to show it. The room is where a member presents their deal, whichever
side they are on: buying, offering, or seeking distribution.

**It is theirs, in their language.** A Chinese or Russian member builds and
reads their room in their own language. This is not a translation feature bolted
on at the end; it is part of what makes the room feel like theirs.

**The crescendo has four steps, and money is at the end.**

1. **Open.** Free. No verification, no published listing, no payment.
2. **Build.** Free. The member composes the room until it is something they
   want to show.
3. **Verify.** The point at which it gets serious. Verification is required
   before a room can be shown to anybody, because what is being shown becomes a
   claim about a real business.
4. **Publish, share, invite.** The paid event.

**The charge attaches to publication and invitation, not to creation.** Nothing
is charged for a room that is never shown. This is what `STARTER_LIMITS_PROPOSED`
already half-encodes - the active term begins "when the first invited principal
is admitted rather than when you create the room" - and this ADR makes it the
whole rule rather than a detail of one entitlement.

## What this supersedes and contradicts

**The propose flow contradicts every step above.** Today
`/deal-rooms/propose` requires a **published, eligible Deal** before it will
open anything, and requires an identified counterparty, their role and a stated
objective in the same form. That is step 4 asked as step 1. Under this ADR the
opening act is empty: a member opens a room and fills it in, and the
counterparty is named at the moment of invitation.

**"Exploring, publishing and preparing a room stay free" is now wrong.** It is
on the entrance today. Preparing is free; publishing is precisely where the
member pays.

**ADR-0024 is amended, not replaced.** It holds that the Deal Room begins part
two of the journey. That is still true of a PUBLISHED room. An unpublished room
is a discovery-half object: it is the member preparing what they will show. The
hinge is publication, not creation.

**The listing publication model is a separate decision.** The owner's
instruction of the same day - that member entries go live automatically carrying
a completion percentage rather than waiting for personal review - governs
listings. It is not the same event as publishing a Deal Room, and the two must
not be collapsed into one gate because one is free and the other is charged.

## What must not be built from this

**A room that is shown before its owner is verified.** Step 3 is not optional
and not reorderable. The whole value of a showroom is that the thing on display
is real, and Ponte's only means of saying so is verification.

**A paywall that appears earlier than invitation.** Any charge, credit prompt,
plan chooser or price shown during steps 1 to 3 breaks the mechanism this ADR
exists to protect. A member must be able to reach the moment of pride without
having been asked for money.

**A room that pretends to be published when it is not.** An unpublished room is
visible to its author and to nobody else, and says so.

## Open, and to be confirmed by the owner

1. Does an unpublished room appear in the member's own room list, or somewhere
   separate, until it is published?
2. Is the price still the room price already in `lib/deal-room/pricing.ts`,
   charged once at publication, or does sharing and inviting price separately?
3. May a member publish a room built on a Deal that is not itself published, or
   does publication of the room require publication of the underlying record?

The shape above is fixed. These three are not, and are written down so they can
be answered in a line rather than discovered during a rebuild.

## Why this document exists at all

Three times on 1 August 2026 an owner decision that lived only in conversation
was lost and rebuilt wrongly. This one arrived while the previous model was
being implemented, and was written before that implementation continued.

The rule this shares with ADR-0022, ADR-0023 and ADR-0024: **if it matters, it
is in `docs/decisions/`, and it says what must remain, not only what to change.**
