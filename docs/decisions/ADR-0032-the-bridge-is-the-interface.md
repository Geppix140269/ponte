# ADR-0032: The bridge is the interface

- **Status:** ACCEPTED
- **Date:** 2026-08-06
- **Owner approval**, 6 August 2026, on five working prototypes.
- **Supersedes the visual treatment** of the Set 1 and Set 2 design references. Their state coverage, copy and structure stand. Their surface language does not.
- **Does not touch** `ADR-0002` design constitution, `ADR-0020`, `ADR-0029` or `ADR-0030`.

---

## Why this exists

The constitution said what was forbidden: no boxes, no cards, no rounded rectangles, no shadows. It never said what fills a screen. A rule set that only forbids produces a wireframe, and it did: nine surfaces of type on cream with hairlines, which the owner rejected as having no character.

Two things were missing and neither was a rule violation. **The brand was absent**, and **nothing moved.**

---

## The direction

**Ponte means bridge. The bridge is structure, not decoration.**

It appears at three scales and carries a different job at each:

| Scale | What the span is |
|---|---|
| **Landing** | One iconic crossing, drawn on load |
| **Signed in** | One small span per opportunity, showing how far across it is |
| **Inside a room** | The procedure, with each counterparty branch its own crossing from the same pier |

At the third scale it also enforces `ADR-0020` sections 4 and 11 physically: **a counterparty sees one span, theirs. Only the administrator sees the fan.** The disclosure rule is what the layout contains, not a note in a document.

**During the publish path the span draws itself as the member answers.** It is the only progress indicator. No numerals in a progress role.

## The surface

- **Dark ink ground** for building and for the room. **Cream** for the public market and for reversed panels. Restraint on cream reads unfinished; the same restraint on ink reads considered.
- **Fine paper grain** over everything, barely visible. It is what stops flat fields looking like a wireframe.
- **Bronze does one job:** the live edge, the eyebrow, completed nodes, the accent italic. Nowhere else.
- **Scale carries the drama.** Question serif at 38 to 52px with an italic accent. Mono labels at 9 to 10px, tracked wide.
- **Motion is passage, not decoration.** Content arrives staggered. A chosen row indents, lights its hairline and slides out. The next question rises into the space. `prefers-reduced-motion` respected throughout.
- **The member's own record is always visible and always growing.** In the publish path it is a reversed cream ledger rising from the bottom. That is what stops people leaving at the third screen: by then something of theirs exists.

**Every rule in the constitution is intact.** No boxes, no cards, no shadows. Structure comes from typography, scale, whitespace, full-width hairlines and tone.

## What is approved

Five prototypes at `docs/ponte/design-reference/bridge/`, working, at 390px:

| File | Surface |
|---|---|
| `ponte-landing.html` | The public front door |
| `ponte-bridge.html` | The publish path opening |
| `ponte-signed-in.html` | What a member sees on sign-in |
| `ponte-deal-room.html` | The room, administrator and counterparty views |
| `ponte-activation.html` | Activation, the only screen that takes money |

**They are the specification, not production code.** Copy in them is provisional except where it restates an existing authority.

## What this decides that was previously undecided

- **A signed-in member has no dashboard. They have crossings.** The signed-in home leads with what is waiting on them, then the portfolio of spans, then what the desk read for them.
- **Ponte Integrity is a named surface**, shown identically to both parties, listing what Ponte checked **and** what Ponte did not. It is the most distinctive thing the product has and it had been left in a doctrine document.
- **Activation argues before it charges.** What it opens, then the bill in full including the $199 ceiling, then the exact expiry instant, then two confirmations, then a real unpunished exit.

## Consequences

- Set 1 and Set 2 references are retained as the record of structure and states, and are **no longer the visual authority.**
- `B01` and `B02` are rebuilt first, against `ponte-bridge.html`.
- Sets 5 to 7, the room interior, were never drawn. `ponte-deal-room.html` and `ponte-activation.html` are their starting point.
- Roughly thirty-five surfaces remain undesigned in this language, including the market signals board, the signal detail, business verification and every empty, loading and error state.
- The Set 2 `B01` revision logged under the mapping correction is absorbed here.
