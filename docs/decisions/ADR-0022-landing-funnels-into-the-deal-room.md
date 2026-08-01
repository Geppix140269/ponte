# ADR-0022: The landing page funnels into the Deal Room, and liquidity is how

- Status: ACCEPTED
- Date: 2026-08-01
- Owner decision, stated repeatedly in owner channels and finally recorded here.
- Supersedes: the landing composition portion of the 31 July North Star
  amendment merged with ADR-0021, insofar as it left the landing with nothing
  after the family crossing.

## The decision

**The platform exists to funnel members into creating and setting up Master Deal
Rooms.** The landing page's job is to make that transition flawless, and
**liquidity is the mechanism**: visible public commercial activity is what makes
a visitor fall naturally into a Deal Room rather than being asked to.

Two things therefore belong on the landing page and may not be removed without
an ADR that supersedes this one:

1. **The destination.** The landing must state that every route across ends in a
   private Deal Room, name what that room is for, and carry a route into it.
2. **The liquidity.** The landing must show what Ponte has actually read from
   public sources, with counts, sourced and dated.

## Why this is being written down now

On 31 July 2026, commit `0bf6e41` (PR #196) removed the closing band and the
Market Signals crossing from the landing. Both removals were reasoned and both
were wrong in effect, because between them they deleted the destination and the
liquidity — the two halves of the funnel — and replaced them with nothing. The
commit acknowledged the result in its own message:

> Known and deliberately not addressed: roughly 330px of empty paper now sits
> between the family crossing and the footer.

In production this reads as most of the viewport. The page has shipped in that
state since 31 July. Nine end-to-end tests in `e2e/landing-bridges.spec.ts` have
failed continuously since that commit, because they measure the bridge against
the section that used to follow it. **Those tests were correct.** They were the
only thing still reporting the regression, and the correct response is to
restore what the page lost, not to relax the tests.

The deeper cause is that the owner's landing recommendations existed only in
conversation. An agent reading `docs/` found ADR-0021's instruction to remove
and no statement of what must remain. This ADR closes that gap.

## The approved source

The composition is defined by the owner's design package, `Ponte trade Deal
Room.zip`, specifically:

- `Ponte Landing - Deal Room Integration A.html`
- `Ponte Landing - Deal Room Integration B.html`

Both carry the destination band and the Market Signals section. **Option B is
the approved composition**, because it draws the funnel as an explicit
progression rather than describing it in prose:

```
Three market families -> Explore or create an opportunity
                      -> Credible commercial interest
                      -> Private Deal Room
```

with the line: *"Every route across ends in the same place: a private room where
one agreed procedure is progressed, with evidence, decisions and blockers on the
record."*

## Binding content rules

- The room price shown on the landing is read from
  `lib/deal-room/pricing.ts` (`BASE_ROOM_PRICE_CENTS`). It is never a literal in
  a page or a translation string. ADR-0020 remains the pricing authority.
- The period is stated as **30 active days**, matching the propose page and the
  codex authorities.
- **Invited counterparties join free** is stated wherever the price is, because
  a price without it misrepresents the commercial model (ADR-0005).
- Signal counts are read from the live source. If they cannot be read, the
  section renders its honest unavailable state; it never shows a placeholder
  number. A figure on the entrance is a claim about the market.
- Every signal shown carries the source it was read from and the date it was
  read, and is labelled as evidence that activity exists rather than as a
  reviewed opportunity.

## Consequences

- The landing page ends with the Deal Room, not with empty paper.
- `e2e/landing-bridges.spec.ts` regains a real section beneath the bridge, so
  its nine failing assertions become meaningful again rather than being edited
  to accept the loss.
- Any future change that removes the destination or the liquidity from the
  landing must supersede this ADR explicitly. Removing them because a copy line
  is imprecise is not sufficient: the fix for wrong words is better words.
