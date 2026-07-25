# Complete semantic inventory — Libraries C, E and F

Generated 26 July 2026 from the approved sources. This inventory reconciles exactly with the
files in `icons/`: **89 semantic keys, 89 standard SVGs, 37 reduced SVGs, 126 icon files in total.**
No file is undocumented and no entry points at a missing file.

Sizes column: default rendered size / minimum. Where a reduced drawing exists it is mandatory
below 21px — see `sizing-and-grid.md`.

## Library C — navigation families

Route grammar is permitted here and nowhere else in C. Rendered one step heavier than any sector icon.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `market.family.products` | `market-family-products.svg` | `market-family-products-reduced.svg` | 48 / 20 | H02 | Physical goods moving along a route — the HS universe below | — |
| `market.family.services` | `market-family-services.svg` | `market-family-services-reduced.svg` | 48 / 20 | — | The enabling layer that lets two sides connect | — |
| `market.family.distribution` | `market-family-distribution.svg` | `market-family-distribution-reduced.svg` | 48 / 20 | — | One appointed point standing between two markets | — |

## Library C — HS sector families

Extracted from TAX in ponte-structure.js: 15 families, 34 groups. Subject-led, never bridge-stamped.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `hs.agri` | `hs-agri.svg` | `hs-agri-reduced.svg` | 24 / 16 | — | Agriculture & live animals — HS 01–14, 5 groups | — |
| `hs.food` | `hs-food.svg` | `hs-food-reduced.svg` | 24 / 16 | — | Food, beverages & tobacco — HS 15–24, 3 groups | — |
| `hs.min` | `hs-min.svg` | `hs-min-reduced.svg` | 24 / 16 | — | Minerals, ores & fuels — HS 25–27, 3 groups | — |
| `hs.chem` | `hs-chem.svg` | `hs-chem-reduced.svg` | 24 / 16 | — | Chemicals & pharmaceuticals — HS 28–38, 3 groups | — |
| `hs.plas` | `hs-plas.svg` | `hs-plas-reduced.svg` | 24 / 16 | — | Plastics & rubber — HS 39–40, 2 groups | — |
| `hs.hide` | `hs-hide.svg` | `hs-hide-reduced.svg` | 24 / 16 | — | Hides, leather & furs — HS 41–43, 1 group | — |
| `hs.wood` | `hs-wood.svg` | `hs-wood-reduced.svg` | 24 / 16 | — | Wood, paper & pulp — HS 44–49, 2 groups | Earlier concentric-ring drawing read as a target; replaced with a plank and grain. Do not reinstate rings. |
| `hs.tex` | `hs-tex.svg` | `hs-tex-reduced.svg` | 24 / 16 | — | Textiles & apparel — HS 50–63, 2 groups | Earlier crossing-strands drawing read as a close/delete X at 16px; replaced with a spool. |
| `hs.foot` | `hs-foot.svg` | `hs-foot-reduced.svg` | 24 / 16 | — | Footwear, headgear & accessories — HS 64–67, 1 group | — |
| `hs.stone` | `hs-stone.svg` | `hs-stone-reduced.svg` | 24 / 16 | — | Stone, ceramics & glass — HS 68–70, 2 groups | — |
| `hs.metal` | `hs-metal.svg` | `hs-metal-reduced.svg` | 24 / 16 | — | Metals & metal products — HS 72–83, 3 groups | Earlier coil drawing read as a UI toggle; replaced with an I-beam. |
| `hs.mach` | `hs-mach.svg` | `hs-mach-reduced.svg` | 24 / 16 | — | Machinery & electronics — HS 84–85, 2 groups | — |
| `hs.veh` | `hs-veh.svg` | `hs-veh-reduced.svg` | 24 / 16 | — | Vehicles & transport — HS 86–89, 2 groups | — |
| `hs.inst` | `hs-inst.svg` | `hs-inst-reduced.svg` | 24 / 16 | — | Instruments, medical & precision — HS 90, 1 group | — |
| `hs.misc` | `hs-misc.svg` | `hs-misc-reduced.svg` | 24 / 16 | — | Miscellaneous, arms & art — HS 93–97, 2 groups | — |

## Library C — trade services

Ten categories. Sub-icons are deferred until a canonical services constant exists (see F5).

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `service.freight` | `service-freight.svg` | — | 24 / 16 | — | Freight & logistics | Earlier arc-plus-container drawing read as a handbag; replaced with a divided container on a lane. |
| `service.warehouse` | `service-warehouse.svg` | — | 24 / 16 | — | Warehousing | — |
| `service.customs` | `service-customs.svg` | — | 24 / 16 | — | Customs | — |
| `service.inspection` | `service-inspection.svg` | — | 24 / 16 | — | Inspection | — |
| `service.certification` | `service-certification.svg` | — | 24 / 16 | — | Certification | — |
| `service.insurance` | `service-insurance.svg` | — | 24 / 16 | — | Insurance | — |
| `service.finance` | `service-finance.svg` | — | 24 / 16 | — | Trade finance | — |
| `service.compliance` | `service-compliance.svg` | — | 24 / 16 | — | Compliance | — |
| `service.documentation` | `service-documentation.svg` | — | 24 / 16 | — | Documentation | — |
| `service.other` | `service-other.svg` | — | 24 / 16 | — | Other trade-enabling services | — |

## Library C — distribution and representation

Distinguished by line law, not by badges.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `distribution.distributor` | `distribution-distributor.svg` | — | 24 / 16 | — | Vacant slot in the chain — dashed because unfilled | — |
| `distribution.agent` | `distribution-agent.svg` | — | 24 / 16 | — | Acts beside the chain, not inside it | — |
| `distribution.representation` | `distribution-representation.svg` | — | 24 / 16 | — | An appointed party alongside the route | — |
| `distribution.entry` | `distribution-entry.svg` | — | 24 / 16 | — | A partner immediately beyond the boundary | — |
| `distribution.broker` | `distribution-broker.svg` | — | 24 / 16 | — | Stands between two anchors, holding neither | — |
| `distribution.route` | `distribution-route.svg` | — | 24 / 16 | — | One route reaching a market boundary | — |
| `distribution.local` | `distribution-local.svg` | — | 24 / 16 | — | A point inside one bounded market | — |
| `distribution.regional` | `distribution-regional.svg` | — | 24 / 16 | — | Several markets held under one arrangement | — |
| `distribution.exclusive` | `distribution-exclusive.svg` | — | 24 / 16 | — | One live link — the others are unavailable | Differs from non-exclusive only by line law. Never ship one without a text label. |
| `distribution.nonexclusive` | `distribution-non-exclusive.svg` | — | 24 / 16 | — | Same structure, all links live | Differs from exclusive only by line law. Never ship one without a text label. |

## Library E1 — semantic step icons

Major concepts and stages. Must be recognisable away from their own label.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `deal.product` | `deal-product.svg` | — | 20 / 16 | — | A single commercial unit | Sits close to service-freight. Product is a single unit with one rule; freight is a divided container on a lane. |
| `deal.service` | `deal-service.svg` | — | 20 / 16 | — | A supporting layer, not a good | — |
| `deal.category` | `deal-category.svg` | `deal-category-reduced.svg` | 20 / 16 | — | Position in the taxonomy | — |
| `deal.spec` | `deal-specification.svg` | `deal-specification-reduced.svg` | 20 / 16 | — | The stated properties of the goods | — |
| `deal.origin` | `deal-origin.svg` | — | 20 / 16 | — | Where the goods start | — |
| `deal.destination` | `deal-destination.svg` | — | 20 / 16 | — | Where the goods are needed | — |
| `deal.quantity` | `deal-quantity.svg` | `deal-quantity-reduced.svg` | 20 / 16 | — | How much, in stated units | — |
| `deal.price` | `deal-price.svg` | — | 20 / 16 | — | Stated value, currency chosen separately | — |
| `deal.delivery` | `deal-delivery.svg` | — | 20 / 16 | — | Where responsibility changes hands | — |
| `deal.payment` | `deal-payment.svg` | — | 20 / 16 | — | Value moving against goods | — |
| `deal.timing` | `deal-timing.svg` | `deal-timing-reduced.svg` | 20 / 16 | — | A point on the trade calendar | — |
| `deal.role` | `deal-role.svg` | — | 20 / 16 | — | Which side of the route you stand on | Sits close to distribution-representation. Role marks a position on the route; representation stands beside it. |
| `deal.evidence` | `deal-evidence.svg` | `deal-evidence-reduced.svg` | 20 / 16 | — | Named evidence attached at points | — |
| `deal.public` | `deal-public.svg` | `deal-public-reduced.svg` | 20 / 16 | — | Leaves the member’s boundary | — |
| `deal.private` | `deal-private.svg` | — | 20 / 16 | — | Held inside the member’s boundary | — |
| `deal.preview` | `deal-preview.svg` | `deal-preview-reduced.svg` | 20 / 16 | H03 | The assembled record, before anything is sent | — |
| `deal.save` | `deal-save.svg` | `deal-save-reduced.svg` | 20 / 16 | H06 | Contained; nothing is shared | — |
| `deal.submit` | `deal-submit.svg` | — | 20 / 16 | H07 | Crossing into review — not approval | — |

## Library E2 — field support icons

Each is one of three declared primitives, modified.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `field.unit` | `field-unit.svg` | — | 20 / 16 | — | Built from primitive: span | — |
| `field.currency` | `field-currency.svg` | — | 20 / 16 | — | Built from primitive: token | — |
| `field.minorder` | `field-minimum-order.svg` | `field-minimum-order-reduced.svg` | 20 / 16 | — | Built from primitive: stack + span | — |
| `field.frequency` | `field-frequency.svg` | `field-frequency-reduced.svg` | 20 / 16 | — | Built from primitive: span, repeated | — |
| `field.place` | `field-place.svg` | — | 20 / 16 | — | Built from primitive: token on a lane | — |
| `field.packaging` | `field-packaging.svg` | — | 20 / 16 | — | Built from primitive: stack, wrapped | — |
| `field.grade` | `field-grade.svg` | `field-grade-reduced.svg` | 20 / 16 | — | Built from primitive: span, stepped | — |
| `field.duration` | `field-duration.svg` | — | 20 / 16 | — | Built from primitive: span on a timeline | — |
| `field.notes` | `field-notes.svg` | `field-notes-reduced.svg` | 20 / 16 | — | Built from primitive: ruled panel | — |

## Library E — construction primitives

Exported for reference and for building future field icons. Not intended for direct UI use.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `primitive.span` | `primitive-span.svg` | — | 24 / 16 | — | Two end ticks and a rule between them | — |
| `primitive.token` | `primitive-token.svg` | — | 24 / 16 | — | A ring holding a value the text names | — |
| `primitive.stack` | `primitive-stack.svg` | — | 24 / 16 | — | Repetition or accumulation | — |

## Library F — profile information

Information supplied and profile completion. Never verification.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `profile.account` | `profile-account.svg` | — | 20 / 16 | — | The person signed in | — |
| `profile.professional` | `profile-professional.svg` | `profile-professional-reduced.svg` | 20 / 16 | — | The person’s stated trade context | — |
| `profile.company` | `profile-company.svg` | `profile-company-reduced.svg` | 20 / 16 | — | A legal record, not a building | Must not drift back towards a building — that silhouette belongs to Warehousing. |
| `profile.orgrole` | `profile-organisation-role.svg` | — | 20 / 16 | — | Which party the member is | — |
| `profile.markets` | `profile-markets.svg` | `profile-markets-reduced.svg` | 20 / 16 | — | Named places, on one baseline | Earlier two-arc drawing read as a face; replaced with named places on a baseline. |
| `profile.products` | `profile-products.svg` | — | 20 / 16 | — | Declared goods, not verified goods | — |
| `profile.services` | `profile-services.svg` | — | 20 / 16 | — | Declared services | — |
| `profile.contact` | `profile-contact.svg` | — | 20 / 16 | — | A reachable party | — |
| `profile.document` | `profile-document.svg` | `profile-document-reduced.svg` | 20 / 16 | — | Supplied, not yet reviewed | — |
| `profile.reference` | `profile-reference.svg` | — | 20 / 16 | — | A third party speaking about the member | — |
| `profile.drafts` | `profile-drafts.svg` | `profile-drafts-reduced.svg` | 20 / 16 | — | Unsent, unconfirmed | — |
| `profile.saved` | `profile-saved.svg` | — | 20 / 16 | — | Held inside the member’s boundary | — |
| `profile.submitted` | `profile-submitted.svg` | — | 20 / 16 | H07 | Across the threshold, awaiting review | — |
| `profile.completion` | `profile-completion.svg` | — | 20 / 16 | H01 | Information provided — never verification | — |

## Library F — participation boundaries

A gate, a reservation, a missing link, a live link.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `participation.registration` | `participation-registration.svg` | — | 20 / 16 | — | A gate, not a wall — the member can act | — |
| `participation.boundary` | `participation-boundary.svg` | — | 20 / 16 | — | The next stage exists and is reserved | — |
| `participation.commsoff` | `participation-communication-unavailable.svg` | — | 20 / 16 | — | The link does not exist yet | Differs from enabled only by dash and fill. Always paired with the sentence explaining why. |
| `participation.commson` | `participation-communication-enabled.svg` | — | 20 / 16 | — | The link is live | — |

## Library F — evidence and review

The halted point does the work.

| Key | File | Reduced | Sizes | Motion | Meaning | Ambiguity risk |
|---|---|---|---|---|---|---|
| `evidence.evprov` | `evidence-provided.svg` | `evidence-provided-reduced.svg` | 20 / 16 | — | Supplied by the member, attached to a point | Shares the attached-point primitive with deal-evidence. Same drawing, different library context — keep the labels. |
| `evidence.evreview` | `evidence-under-review.svg` | `evidence-under-review-reduced.svg` | 20 / 16 | — | A person must decide — the point is halted | — |
| `evidence.infocomplete` | `evidence-information-complete.svg` | — | 20 / 16 | — | Every requested field is present | — |

## Reconciliation

| Library | Standard | Reduced | Total files |
|---|---|---|---|
| C | 38 | 18 | 56 |
| E | 30 | 12 | 42 |
| F | 21 | 7 | 28 |
| **Total** | **89** | **37** | **126** |
