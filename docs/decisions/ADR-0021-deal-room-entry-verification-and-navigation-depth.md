# ADR-0021 — Deal Room entry: either principal may open, verification gates admission, and the room is within three steps

- **Status:** **Accepted by the product owner; effective when merged.** Drafted by
  Claude Code on 31 July 2026 from rulings the owner gave verbally in session,
  then accepted by the owner on 31 July 2026 on review of this draft.
- **Decision date:** 31 July 2026
- **Owner:** Giuseppe Funaro
- **Drafted by:** Claude Code, at the owner's instruction ("draft both")
- **Implementation status:** **Nothing is implemented.** No migration, no route,
  no gate, no navigation change and no production action exists for any ruling
  below. This ADR records decisions and authorises planning only.

## Context

The Deal Room is now the platform's only paid product and its sole day-one
monetisation engine (ADR-0020, accepted 31 July 2026). It is also, today,
unreachable: no surface anywhere in the product links to it, its feature flag has
never been set, and its allowlist is empty. That gap is recorded as **LB-001** in
`docs/launch/LAUNCH-BLOCKERS.md` — *"A member who reached credible commercial
interest had nowhere to go inside Ponte, so the core journey could not be
completed at all."*

Designing the door surfaced four questions the merged record does not answer, and
one it answers differently from the running code. The owner ruled on all five in
session on 31 July 2026. This ADR records those rulings so the next agent does
not need the conversation.

**A dating fact that explains most of the friction.**
`00-NORTH-STAR-ENTRY-ARCHITECTURE.md` is dated 26 July 2026. The entire Deal Room
corpus — the product contract, the branching model and the experience design —
begins on 27 July 2026, and the commercial authority making the Deal Room the
sole paid product is dated 31 July 2026. The North Star was authored the day
before the Deal Room existed as a product, and the two have never been
reconciled. See ADR section 5 and the companion amendment to the North Star.

## Decision

### 1. Either principal may open a master Deal Room

`PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` section 5 already
says so:

> An eligible interested participant may also open and sponsor a master Deal
> Room around another member's posted Deal and invite the Deal owner into a
> private sub-room.

`PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` section 4 agrees:
*"An eligible principal participant or Ponte may propose a room."*

The running code does not. `deal_room_propose`, in the copy applied to
production (`supabase/migrations/20260731b_deal_room_propose_initiator_capacity.sql`),
refuses any caller who does not own the listing:

```sql
if v_l.user_id <> auth.uid() then
  raise exception 'Only the owner of a Deal can take it into a Deal Room'
    using errcode = '42501';
end if;
```

**Ruled:** the authority stands and the implementation is the outlier. The
function is to be widened so that either principal party to a credible
commercial interest may propose and sponsor a master room. This is a correction
toward an accepted authority, not a new product decision.

The role separation in the branching model section 5 is unaffected: the party
that pays acquires no ownership of the posted Deal and no unilateral authority
over another participant. Deal owner, master-room initiator, sponsor,
administrator and principal participant remain distinct roles.

### 2. A minimum verification threshold gates Deal Room admission

**Ruled:** no member may open a Deal Room, and no member may be admitted to one,
without having completed a minimum verification. A member who pays for a room
must not have that payment wasted on a counterparty who was never admissible.

The threshold is **not new** and must not be invented here. It is
`PT-PRODUCT-2026-07-27-01` section 6, *Deal Room-ready Business Passport*, which
already states the anti-friction rule the owner restated in session:

> A complete Passport is not required for entry.

and then lists the accepted minimum: authenticated individual; confirmed contact
method; identified business or declared professional capacity; legal or trading
name; jurisdiction; relationship to the business; transaction role declared;
authority to participate declared; and any room-specific prerequisite completed.

Two properties of that section are load-bearing and are hereby affirmed rather
than restated:

- **Evidence-specific, never numerical.** Section 6: *"The user-facing model must
  remain evidence-specific rather than numerical."* No score, no percentage, no
  completeness bar. States such as *identity confirmed*, *business information
  checked*, *role declared*, *authority sighted*, *under review*.
- **Staged against the deal, not front-loaded.** The threshold above admits a
  member to a room. Later stages of a transaction may require further evidence.
  A member is never asked for everything at the start.

**This costs the member nothing.** ADR-0018 (accepted) made `member_business`
verification free and separated it from the paid `counterparty_check`. The gate
therefore adds no paywall and no charge: it requires only that a free step has
been taken. An invited counterparty is a sponsored guest under the branching
model section 6 and pays nothing to become admissible.

**Implementation status of this gate today: absent.** `deal_room_propose` checks
listing ownership, listing status, family facts and the Starter entitlement, and
checks no verification state at all. Admission accepts four agreements and
declares a capacity, and checks no verification state either. The word
"Passport" appears once in the Deal Room schema, in a comment about a different
object. Nothing currently prevents a paid room from being opened around an
entirely unverified counterparty.

### 3. The Deal Room is within three steps of the landing, and sign-in is not a step

**Ruled:** from the landing page, a member is never more than **three steps**
from a Deal Room. **Authenticating does not count as a step.**

**This rule did not previously exist.** A full search of the North Star, the
Design Constitution, every ADR, every `PT-*` authority, `AGENTS.md`, the decision
log, the launch records and the ExecPlans found no click-depth or step-count rule
of any kind, and no definition of "step". It is new, and it binds only when this
ADR is accepted and merged.

**Definition, for this rule to be testable.** A *step* is one member-initiated
navigation that changes route. Authentication is excluded. Redirects the product
performs on the member's behalf are not steps.

**What it does not license.** The rule governs the **authenticated product**. It
does not create a landing entrance, and it does not override section 4 below.
Depth is satisfied through navigation the member reaches after signing in.

### 4. The door goes in the authenticated workspace, not on the public landing

**Ruled:** the Deal Room becomes central as the destination and the sole paid
product, and it is reached from the authenticated product. It is not added to the
public landing as a primary route.

This is not a compromise; it is what four accepted records already require, and
the owner's own model of the product is consistent with them:

- `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` section 1: *"The platform has two primary
  entry journeys, and no others: 1. Explore the market 2. Start a deal.
  Everything else is contextual and downstream."*
- ADR-0003: the Deal Room is *"not a primary landing route."*
- `PT-PRODUCT-2026-07-27-01` section 3: *"It must not dominate the public entry
  experience before the user has a relevant transaction."*
- `PT-DESIGN-2026-07-27-01` section 4, which already specifies the destination:
  *"The authenticated workspace introduces a primary **Deal Rooms** destination
  beside the existing Workspace areas."*

The permitted placements are therefore the global command bar, which the North
Star section 2 says *"carries all product navigation"*; the accepted-introduction
surface, which is entry route one of product contract section 4; and `/pricing`,
where `PT-COMMERCIAL-2026-07-31-01` section 19 **requires** the Deal Room to be
named and where it currently is not.

**No dead doors.** North Star section 3.5 forbids any interface promising a
capability that is not *"implemented, enabled, reachable and complete"*, and
section 10 forbids dead buttons. Every door added under this ADR is therefore
gated on the same condition as its destination, and appears only when a member
can actually arrive.

### 5. The North Star governs entry; the Deal Room is the conversion layer

**Ruled:** the North Star is not overturned. It is an **entry** architecture that
stops before conversion, because conversion did not exist when it was written.

```text
LIQUIDITY  (free, public)          three families -> signals and opportunities
                                   the North Star's two journeys, unchanged
        |
        v
CONVERSION (paid, authenticated)   a Deal either triggers a master Deal Room
                                   or it does not
```

The North Star already anticipates this shape in its own words, deferring
*"everything downstream of entry that this document does not restate"* to other
authorities.

So *"everything converges on the Deal Room"* is a statement about the **funnel**,
not about navigation. It resolves the apparent contradiction between ADR-0020's
*"sole day-one monetisation engine"* and the product contract's *"must not
dominate the public entry experience"*: the Deal Room is the destination and the
only paid product, and the public entrance remains the market.

The companion amendment to `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` records this
inside that authority rather than beside it.

## Consequences

**Requires a migration, not yet written and not to be applied without approval.**
Widening `deal_room_propose` changes a `security definer` function that is
granted to `authenticated` in three applied migrations, so the signature and ACL
are a real event. Under `AGENTS.md` a production schema change is owner-approved
and separate from merging this ADR.

**Requires the verification gate to be built.** Ruling 2 is currently
unenforced. Until it exists, a paid room can be opened around an unverified
counterparty, which is the precise commercial risk the ruling exists to remove.

**Closes LB-001 when implemented.** The door is the missing edge that record
describes.

**Does not resolve LB-014.** `/pricing` still publishes retired engagements and
does not name the Deal Room, contrary to `PT-COMMERCIAL-2026-07-31-01` section
19. That classification remains the owner's.

**Does not amend the pre-acceptance identity boundary.** An introduction is still
decided by the owner without seeing the requester's identity; disclosure remains
a controlled act. This ADR adds a door after acceptance and changes nothing
before it.

**Leaves DR-01's composition retired.** `PT-DESIGN-2026-07-27-01` section DR-01
specifies the entry screen's purpose and position, which stand; its three
entitlement cards were retired by ADR-0020 and are not revived here.

## Open, and deliberately not decided here

- **Where identity disclosure sits inside the room.** The owner has described the
  Deal Room as the place identity is revealed. The record is more granular:
  admission requires declaring organisation, role and authority, and product
  contract section 9 has an explicit *disclosure requested* then *disclosure
  approved* sequence. Whether payment alone discloses identity, or whether
  disclosure remains a separate controlled act inside the room, is not settled
  and is not settled here.
- **Messaging, e-signature and the in-room agent.** All three are described in the
  product record and none is built. Agreements today are *acceptances*, not
  signatures. `lib/deal-room/messages.ts` exists and is imported by nothing.
  There is no in-room AI. Each needs its own record before it is built.

## Related records

- `PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` sections 3, 4, 5, 6
- `PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` sections 1, 2, 5, 6
- `PT-DESIGN-2026-07-27-01-DEAL-ROOM-EXPERIENCE-DESIGN-V1.md` sections 4, DR-01
- `PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` sections 8, 9, 19
- `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` sections 1, 2, 3.5, 5, 10, and its 31 July 2026 amendment
- ADR-0003, ADR-0009, ADR-0018, ADR-0020
- `docs/launch/LAUNCH-BLOCKERS.md` LB-001, LB-014
