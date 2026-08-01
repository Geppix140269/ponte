# ADR-0023: Members choose. They do not type.

- Status: ACCEPTED
- Date: 2026-08-01
- Owner decision. Stated repeatedly in owner channels over two weeks and recorded
  here on the day it was raised for roughly the fifteenth time.

## The decision

**A member is never asked to type a value the product already knows.**

If a field has a set of possible answers, the field offers that set and the
member picks one. Typing is reached only when the member says the set does not
cover them, and for prose they choose to add.

Free text is permitted in exactly two places:

1. **A note the member chooses to write**, to clarify or qualify. Always
   optional, never a prerequisite.
2. **A value with no answer set**: a number, a date, a name, a reference.

Everything else is a choice. Where a member's need is not in the list, the list
carries a final option that reveals a text box: the escape hatch is offered, not
the default.

## Why this keeps happening, and what actually stops it

Three of the fields that provoked this were **Incoterm**, **Unit** and
**Origin** — an eleven-item international standard, an eight-item code list, and
a country list. All three vocabularies were already in this repository:
`lib/listing-terms.ts`, `lib/countries.ts`, `lib/deal-room/glossary.ts`. The
review screen rendered a blank box for each of them anyway.

That is worth being precise about, because it was not a missing-data problem. It
was a component that treated every term identically, and nothing in the build
objected.

So the rule is not enforced by this document. It is enforced by
`scripts/check-member-choice.mjs`, which fails the build when a surface where
members state facts adds a bare text input for a field that has a known answer
set. A ratchet, like the icon law in Constitution section 7: the current count is
recorded, new ones are refused, and the number only goes down.

**A rule that lives only in a conversation gets rebuilt away.** That is the
lesson of ADR-0022 and it is the lesson here. The check is the decision; this
document explains it.

## What this is not

Not an argument against text. A member who wants to write three sentences about
their cargo should be able to, and the note field exists for that.

Not an argument for a dropdown on everything. A quantity is a number. Validity is
a date range. `lib/products/term-options.ts` records which terms have a
vocabulary, which do not, and — for those that do not yet — that inventing one in
a component would be worse than a text box, because the product would then teach
a vocabulary it does not hold.

## Consequences

- `pricingBasis`, `paymentStructure` and `contractTerm` remain typed. They are
  the terms that most deserve a vocabulary next; that vocabulary is a product
  decision, not a component decision, and belongs in an ADR of its own.
- Any new surface that collects facts from members starts from
  `lib/products/term-options.ts`, or extends it.
- A field that must be free text where the checker expects a choice is declared
  in the checker's allowlist, with the reason, in the same commit.
