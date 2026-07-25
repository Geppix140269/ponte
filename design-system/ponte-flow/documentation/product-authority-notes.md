# Ponte Trade — Product Authority Notes
Design-system record of decisions binding on the product repository.
Last updated 25 July 2026 · Owner: design · Status: approved

## Source of truth
The shared HS taxonomy constant (`TAX`, currently in `ponte-structure.js`) is the single source of truth
for the market universe: **15 category families, 34 groups**. The icon library follows it; it never leads it.

---

## F2 · Coffee label mismatch — APPROVED FOR PATCH
| | |
|---|---|
| HS code | `0901.11` |
| Canonical taxonomy label | **Coffee, not roasted** |
| Non-canonical label found | "Green coffee" (recently-used shortcut list) |
| Action | Change the shortcut label to the canonical taxonomy label |
| Delivery | Small, separate consistency correction in the product repository |

The icon library and all design documentation use the canonical wording only.

---

## F3 · Find and Explore must import the taxonomy — PRODUCT REQUIREMENT
> Find and Explore must import the shared taxonomy constant. They must never restate or copy it.

**Implementation note:** any Find or Explore taxonomy written independently of the shared constant is a
defect, regardless of whether its contents happen to match at the time of writing.

The shared constant must expose, at minimum:

- stable key
- display label
- HS chapter or code coverage
- parent family
- sort order
- icon reference
- reduced-icon reference where applicable

---

## F4 · Uncovered HS chapters — TAXONOMY DECISION REQUIRED BEFORE EXPLORE SHIPS
The current family map is incomplete: `misc` begins at Chapter 93, leaving three chapters outside the
market universe.

| Chapter | Scope | Status |
|---|---|---|
| 71 | Natural or cultured pearls, precious or semi-precious stones, precious metals and related articles | `unassigned` |
| 91 | Clocks and watches and parts | `unassigned` |
| 92 | Musical instruments and parts | `unassigned` |

**Rules until the decision is made**

- Retain the gap report; do not close it silently.
- Do not invent icons for unassigned chapters.
- Mark these chapters `unassigned` (or equivalent) in the canonical inventory.
- Aggregation checks must be able to detect uncovered chapters.
- Records in these chapters must not disappear silently from search results or counts.
- Do not place them in an existing family for visual convenience.

The later decision must either create an approved family or explicitly assign each chapter to an
existing one. An icon is drawn only after that decision.

---

## F5 · Trade Services and Distribution constants — REQUIRED BEFORE EXPLORE IMPLEMENTATION
The icon sets are approved from the brief, but no canonical constants exist. Create shared typed
taxonomies for:

1. **Trade Services**
2. **Distribution and Representation**

These constants — not component copy — are the source of truth for: route slugs · labels ·
descriptions · sort order · icons · filters · counts · search mappings · record classifications.

The Explore screen, search logic and the Start-a-Deal composer must not maintain separate enumerations.

---

## Standing visual-truth rules (from Brand Book v5 and the Flow system)
- Gold is the brand signal and the moving point only. Never a status.
- Progress never starts at 0%. No invented percentage where progress is not measurable.
- 100% completeness is not verification. Submission, review and verification are three separate states.
- Warning is slate. Danger is red. There is no amber.
- Never colour alone: shape, line treatment, position and a text label carry every state.
- Sector icons are ink by default and take colour only from interface state.
- No "verified" visual is reused across information supplied, evidence reviewed, registration,
  eligibility, identity verification or communication availability.
- Do not animate a review or verification process unless the platform has actually started it.
