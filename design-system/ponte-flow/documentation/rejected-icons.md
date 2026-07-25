# Rejected icons

Seven proposals from the original brief were deliberately not drawn. This list exists to stop
icon inflation during implementation: if one of these appears in a ticket, it is out of scope
until the stated test is met.

| Proposal | What it was | Why it was rejected |
|---|---|---|
| One-off, Trial, Monthly, Quarterly, Annual, Multi-year | Six frequency values | One parent Frequency icon plus text options with selection state. Six near-identical timeline glyphs would be read as decoration and would not survive 16px. |
| Individual currencies | USD, EUR, GBP, … | One Currency token. Currency is named in text; a drawn glyph per currency implies a supported list that the product does not maintain. |
| Individual units | MT, kg, litre, container, … | One Unit span. The unit is the text; drawing it twice adds no information. |
| Individual Incoterms | FOB, CIF, DAP, EXW, … | One Delivery-terms icon. Incoterms are legal codes — abbreviating them into pictograms invites misreading of the transfer point. |
| Continue editing | Composer action | A text button. It is a return to the current state, not a distinct concept. |
| Deal-composer “HS code” | Field icon | Reuses Category. The code is the taxonomy position rendered as text; a second icon would compete with it. |
| Profile “verified participant” | Status | Deliberately not drawn. No such state exists in the product, and one shared verified visual across eight different truths is the failure this library was built to prevent. |

## The standing rule

Draw an option icon only where testing shows it **materially improves comprehension**. Until
then: one parent icon, a text label, and selection state.

Applied to the composer this means:

- **Frequency** — one `field.frequency` icon, options as text chips (One-off, Monthly, Quarterly, Annual, Multi-year, Trial).
- **Currency** — one `field.currency` token, the code as text (USD, EUR, …).
- **Unit** — one `field.unit` span, the unit as text (MT, kg, litre, container, …).
- **Incoterms** — one `deal.delivery` icon, the three-letter code as text. Incoterms are legal
  codes with precise transfer points; a pictogram invites the reader to guess where risk passes.

## Also not drawn

- **Continue editing** — a text button. It returns to the current state; it is not a concept.
- **HS code** — reuses `deal.category`. The code is the taxonomy position rendered as text.
- **Verified participant** — the state does not exist. One shared "verified" visual across eight
  different truths is the exact failure Library F was built to prevent.
