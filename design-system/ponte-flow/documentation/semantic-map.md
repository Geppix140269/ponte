# Semantic map

What each key means, and what it may not be used to claim. This is the document to read before
choosing an icon. If the meaning you need is not here, do not repurpose the closest drawing —
raise it, and it gets designed or it gets text.

## Library C — navigation families

**`market.family.products`** — Products. Physical goods moving along a route — the HS universe below
> Prohibited: Navigation only. Must not appear inside an HS sector grid.

**`market.family.services`** — Trade services. The enabling layer that lets two sides connect
> Prohibited: Navigation only. Must not appear inside an HS sector grid.

**`market.family.distribution`** — Distribution & representation. One appointed point standing between two markets
> Prohibited: Navigation only. Must not appear inside an HS sector grid.

## Library C — HS sector families

**`hs.agri`** — Agriculture & live animals. Agriculture & live animals — HS 01–14, 5 groups · HS 01–14

**`hs.food`** — Food, beverages & tobacco. Food, beverages & tobacco — HS 15–24, 3 groups · HS 15–24

**`hs.min`** — Minerals, ores & fuels. Minerals, ores & fuels — HS 25–27, 3 groups · HS 25–27

**`hs.chem`** — Chemicals & pharmaceuticals. Chemicals & pharmaceuticals — HS 28–38, 3 groups · HS 28–38

**`hs.plas`** — Plastics & rubber. Plastics & rubber — HS 39–40, 2 groups · HS 39–40

**`hs.hide`** — Hides, leather & furs. Hides, leather & furs — HS 41–43, 1 group · HS 41–43

**`hs.wood`** — Wood, paper & pulp. Wood, paper & pulp — HS 44–49, 2 groups · HS 44–49

**`hs.tex`** — Textiles & apparel. Textiles & apparel — HS 50–63, 2 groups · HS 50–63

**`hs.foot`** — Footwear, headgear & accessories. Footwear, headgear & accessories — HS 64–67, 1 group · HS 64–67

**`hs.stone`** — Stone, ceramics & glass. Stone, ceramics & glass — HS 68–70, 2 groups · HS 68–70

**`hs.metal`** — Metals & metal products. Metals & metal products — HS 72–83, 3 groups · HS 72–83

**`hs.mach`** — Machinery & electronics. Machinery & electronics — HS 84–85, 2 groups · HS 84–85

**`hs.veh`** — Vehicles & transport. Vehicles & transport — HS 86–89, 2 groups · HS 86–89

**`hs.inst`** — Instruments, medical & precision. Instruments, medical & precision — HS 90, 1 group · HS 90

**`hs.misc`** — Miscellaneous, arms & art. Miscellaneous, arms & art — HS 93–97, 2 groups · HS 93–97

## Library C — trade services

**`service.freight`** — Freight & logistics. Freight & logistics

**`service.warehouse`** — Warehousing. Warehousing

**`service.customs`** — Customs. Customs

**`service.inspection`** — Inspection. Inspection

**`service.certification`** — Certification. Certification

**`service.insurance`** — Insurance. Insurance

**`service.finance`** — Trade finance. Trade finance

**`service.compliance`** — Compliance. Compliance

**`service.documentation`** — Documentation. Documentation

**`service.other`** — Other trade-enabling services. Other trade-enabling services

## Library C — distribution and representation

**`distribution.distributor`** — Distributor sought. Vacant slot in the chain — dashed because unfilled
> Prohibited: Dashed node means the position is unfilled. Must not be used for an appointed distributor.

**`distribution.agent`** — Agent sought. Acts beside the chain, not inside it
> Prohibited: Dashed node means the position is unfilled. Must not be used for an appointed agent.

**`distribution.representation`** — Commercial representation. An appointed party alongside the route

**`distribution.entry`** — Market-entry partner. A partner immediately beyond the boundary

**`distribution.broker`** — Broker or intermediary. Stands between two anchors, holding neither

**`distribution.route`** — Route-to-market. One route reaching a market boundary

**`distribution.local`** — Local partner. A point inside one bounded market

**`distribution.regional`** — Regional coverage. Several markets held under one arrangement

**`distribution.exclusive`** — Exclusive representation. One live link — the others are unavailable
> Prohibited: The dashed links state unavailability, not prohibition. Must not imply a legal restriction.

**`distribution.nonexclusive`** — Non-exclusive representation. Same structure, all links live

## Library E1 — semantic step icons

**`deal.product`** — Product. A single commercial unit

**`deal.service`** — Service. A supporting layer, not a good

**`deal.category`** — Category. Position in the taxonomy

**`deal.spec`** — Specification. The stated properties of the goods

**`deal.origin`** — Origin. Where the goods start

**`deal.destination`** — Destination. Where the goods are needed

**`deal.quantity`** — Quantity. How much, in stated units

**`deal.price`** — Price. Stated value, currency chosen separately

**`deal.delivery`** — Delivery terms. Where responsibility changes hands

**`deal.payment`** — Payment terms. Value moving against goods

**`deal.timing`** — Timing. A point on the trade calendar

**`deal.role`** — Role in the deal. Which side of the route you stand on

**`deal.evidence`** — Supporting evidence. Named evidence attached at points

**`deal.public`** — Public information. Leaves the member’s boundary

**`deal.private`** — Private information. Held inside the member’s boundary
> Prohibited: Must not be drawn as a padlock or paired with security language.

**`deal.preview`** — Preview. The assembled record, before anything is sent

**`deal.save`** — Save privately. Contained; nothing is shared

**`deal.submit`** — Submit for review. Crossing into review — not approval
> Prohibited: Must not be paired with approval language. Submission is not a decision.

## Library E2 — field support icons

**`field.unit`** — Unit. Built from primitive: span

**`field.currency`** — Currency. Built from primitive: token

**`field.minorder`** — Minimum order. Built from primitive: stack + span

**`field.frequency`** — Frequency. Built from primitive: span, repeated

**`field.place`** — Port or named place. Built from primitive: token on a lane

**`field.packaging`** — Packaging. Built from primitive: stack, wrapped

**`field.grade`** — Grade or quality. Built from primitive: span, stepped

**`field.duration`** — Duration. Built from primitive: span on a timeline

**`field.notes`** — Notes. Built from primitive: ruled panel

## Library E — construction primitives

**`primitive.span`** — Measured span. Two end ticks and a rule between them

**`primitive.token`** — Value token. A ring holding a value the text names

**`primitive.stack`** — Stack. Repetition or accumulation

## Library F — profile information

**`profile.account`** — Account. The person signed in

**`profile.professional`** — Professional profile. The person’s stated trade context

**`profile.company`** — Company profile. A legal record, not a building

**`profile.orgrole`** — Organisation role. Which party the member is

**`profile.markets`** — Markets served. Named places, on one baseline

**`profile.products`** — Products handled. Declared goods, not verified goods

**`profile.services`** — Services offered. Declared services

**`profile.contact`** — Contact information. A reachable party

**`profile.document`** — Supporting document. Supplied, not yet reviewed

**`profile.reference`** — Commercial reference. A third party speaking about the member

**`profile.drafts`** — Drafts. Unsent, unconfirmed

**`profile.saved`** — Saved activity. Held inside the member’s boundary

**`profile.submitted`** — Submitted deals. Across the threshold, awaiting review

**`profile.completion`** — Profile completion. Information provided — never verification
> Prohibited: Must never carry a verified label at 100%.

## Library F — participation boundaries

**`participation.registration`** — Registration required. A gate, not a wall — the member can act
> Prohibited: Must not be used for verification boundaries — registration is a gate the member can pass now.

**`participation.boundary`** — Participation boundary. The next stage exists and is reserved
> Prohibited: Must not be used where the member can act immediately.

**`participation.commsoff`** — Communication unavailable. The link does not exist yet

**`participation.commson`** — Communication enabled. The link is live

## Library F — evidence and review

**`evidence.evprov`** — Evidence provided. Supplied by the member, attached to a point

**`evidence.evreview`** — Evidence under review. A person must decide — the point is halted

**`evidence.infocomplete`** — Information complete. Every requested field is present

## Keys that deliberately do not exist

- `profile.verified` / `profile.trusted` — no such state exists in the product.
- `opportunity.safe`, `counterparty.score`, `trust.level` — Ponte makes no such claim.
- `hs.71`, `hs.91`, `hs.92` — those chapters are `unassigned` in the taxonomy. No icon is drawn
  for a category the product does not have. See `product-authority-notes.md` finding F4.
- Per-value keys for currencies, units, frequencies and Incoterms — see `rejected-icons.md`.
