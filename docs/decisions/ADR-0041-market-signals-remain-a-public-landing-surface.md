# ADR-0041: Market Signals remain a public landing surface

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-G during
  Recovery Mode.
- **Amends** the 31 July 2026 amendment to
  `00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, section 5 landing composition, item 5.
- **Does not touch** ADR-0011, the separation of Market Signals from Qualified
  Opportunities, or the no-fabricated-traction rule.

---

## Why this exists

On 31 July 2026 the owner instructed that the Market Signals band be removed
from the landing. The North Star amendment recorded the removal **and its
reasoning**, so that it would not be re-litigated:

> **Market Signals (5).** The demand and supply crossing is drawn again one step
> later, inside Explore, where the member has already chosen a family and the two
> sides mean something specific to them. Asking the demand-or-supply question
> before the family question put the second question first.

The band is on the landing again. `components/bridge/BridgeLanding.tsx` carries
a *"Market Signals, read recently"* section and a *"What a Market Signal is"*
explanation, and the global navigation links to `/market-signals`. It was
reinstated during the Bridge rebuild without amending the authority that
recorded its removal.

This ADR resolves that honestly: the owner has decided the band stays, so the
authority changes rather than the page.

## The decision

**Market Signals remain on the landing as a public intelligence surface.**

**They must always be explicitly represented as unconfirmed Market Signals, and
never as Qualified Opportunities or as verified demand.**

## Why the 31 July reasoning no longer applies

The July objection was not to Market Signals on the landing. It was to the band
as then composed, which asked a demand-or-supply question ahead of the family
question and so taught the product's model in the wrong order.

The current band does not ask that question. It presents recently read signals
as intelligence, beside a plain statement of what a Market Signal is and is not.
The ordering defect the removal was aimed at is absent, so the removal's reason
is spent while its record stood.

## What this binds

Every representation of a Market Signal on a public surface must carry, without
the member having to look for it:

- that it was **read from a named public source** and republished as printed;
- that it is **not confirmed** with the party named;
- that the party named is **not a member of Ponte**;
- its **source and date**, where shown at all.

These are not new. `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` section 3.3, ADR-0011
and the Master Brief's truth model already require them. This ADR restates them
because the band now sits on the most-read public surface Ponte has.

**A Market Signal must never be styled, labelled, counted or sorted as though it
were a Qualified Opportunity.** The Master Brief section 7.5 governs the visual
separation and is unchanged.

**No fabricated traction.** The 23 July 2026 decision stands in full: member
counts, live traders, volume and activity are never manufactured, and thin
inventory is described honestly. An empty band says so plainly — as the current
implementation does, with *"Nothing has been read recently."*

## Consequences

- The North Star section 5 divergence table is corrected: item 5 reads
  **present**, by this ADR, rather than *"removed, 31 July 2026"*.
- Items 4, 6 and 7 of that table remain never-built and are unaffected.
- Item 8, *Bring a record to the desk*, remains removed. Its removal had a
  separate and still-valid reason: it named the product as three things a member
  brings to a desk, which is neither the three canonical families nor the seven
  intents, and its control led to bare `/structure`.

## Alternatives rejected

**Remove the band again to match the record.** Rejected by the owner. The signal
inventory is real product content and the landing is where it does the most
work.

**Leave the divergence unrecorded.** Rejected on principle. An authority that
describes a page which does not exist is the condition Recovery Mode was called
to end.
