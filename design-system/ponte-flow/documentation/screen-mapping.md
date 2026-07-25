# Screen mapping

Required · Recommended · Optional · **No icon required**.

"No icon required" is a real answer and appears deliberately. An icon that adds nothing costs
scanning time.

## Landing page
| Element | Asset | Status |
|---|---|---|
| Route anchors (Find / Structure / Check / Investigate) | none — numbered typographic anchors | No icon required |
| Voice prompt affordance | product control, not a library icon | No icon required |
| Explore families teaser | `market.family.products` · `market.family.services` · `market.family.distribution` @48 | Recommended |

## Market-signal cards
| Element | Asset | Status |
|---|---|---|
| Classification badge | Library D `signal` @16 | Required |
| Sector tag | `hs.*` reduced @16 | Recommended |
| Origin → destination | `deal.origin` / `deal.destination` reduced @16 | Optional |
| Date and source line | none — mono text | No icon required |

## Market-signal detail
| Element | Asset | Status |
|---|---|---|
| Classification header | Library D `signal` @24 | Required |
| Detection state | H08 (two cycles, then rest) | Optional |
| Sector | `hs.*` @24 | Recommended |
| "Investigate" action | `deal.evidence` @20 | Recommended |
| Provenance | never shown — product rule | No icon required |

## Explore
| Element | Asset | Status |
|---|---|---|
| Three family entry points | `market.family.*` @48 | Required |
| HS sector grid | `hs.*` @24 | Required |
| Trade service grid | `service.*` @24 | Required |
| Distribution grid | `distribution.*` @24 | Required |
| Entry animation | H02 (entry and broad filter only) | Optional |
| Search in progress | H04 | Recommended |
| No direct match | H12 | Required |
| Filter chips | none — text + selection state | No icon required |

## Start a Deal
| Element | Asset | Status |
|---|---|---|
| Journey entry | Library B `deal` @32 | Required |
| Source / supply / service choice | Library B `source` · `supply` · `service` @32 | Required |
| Assembly moment | H03 | Recommended |

## Deal Composer
| Element | Asset | Status |
|---|---|---|
| Field rows | `deal.*` reduced @20 | Required |
| Field-support rows | `field.*` reduced @20 | Recommended |
| Frequency / currency / unit / Incoterm values | parent icon + **text options** | No icon required |
| Completeness | H01 (`Opportunity completeness`) | Required |
| Public / private marker | `deal.public` · `deal.private` @20 | Required |
| Category drill-down | Reveal + `hs.*` @24 | Recommended |

## Preview
| Element | Asset | Status |
|---|---|---|
| Preview header | `deal.preview` @24 | Required |
| Assembly | H03 | Recommended |
| Field summary rows | `deal.*` reduced @16 | Optional |

## Save privately
| Element | Asset | Status |
|---|---|---|
| Action | `deal.save` @20 | Required |
| Confirmation | H06 + "Saved privately. Nothing has been shared." | Required |
| Saved list | `profile.saved` @20 | Recommended |

## Submit for review
| Element | Asset | Status |
|---|---|---|
| Action | `deal.submit` @20 | Required |
| Readiness | H01 (`Submission readiness`) | Required |
| Confirmation | H07 + "Submitted for review. No decision has been made." | Required |
| Submitted list | `profile.submitted` @20 | Recommended |

## Registration boundary
| Element | Asset | Status |
|---|---|---|
| Gate notice | `participation.registration` @24 | Required |
| Reason sentence | none — text is the message | No icon required |
| Account, once created | `profile.account` @20 | Recommended |

## Profile completion
| Element | Asset | Status |
|---|---|---|
| Completion component | H01 (`Professional profile`) | Required |
| Section rows | `profile.*` reduced @20 | Required |
| Strengthening moment | H11 | Optional |
| Verified badge | **does not exist** | No icon required |

## Evidence upload
| Element | Asset | Status |
|---|---|---|
| Document row | `profile.document` reduced @20 | Required |
| Supplied state | `evidence.provided` @20 + declared pill (dashed) | Required |
| Private marker | `deal.private` @16 | Recommended |

## Evidence review
| Element | Asset | Status |
|---|---|---|
| Under review | `evidence.under-review` @20 + slate pill — **static** | Required |
| Reviewed row | `evidence.provided` @20 + checked pill + source and date | Required |
| Layers becoming legible | H09 (on opening a reviewed record) | Optional |
| Not established | none — `--pf-ink-3` pill and a sentence | No icon required |

## Participation eligibility
| Element | Asset | Status |
|---|---|---|
| Unavailable stage | `participation.boundary` @20 (reserved route, no point) | Required |
| Condition sentence | none — text is the message | No icon required |
| Eligible action | the action's own icon, enabled | Recommended |

## Communication state
| Element | Asset | Status |
|---|---|---|
| Unavailable | `participation.communication-unavailable` @20 | Required |
| Enabled | `participation.communication-enabled` @20 | Required |
| What would open it | none — text | No icon required |
