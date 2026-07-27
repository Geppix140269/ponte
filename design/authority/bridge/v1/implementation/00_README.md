# Ponte Bridge — Implementation Handoff v1

Issued 27 July 2026. This package is the authoritative design source for the Ponte bridge interaction system. It contains no earlier brand versions, historical homepage prototypes or prior handoffs.

## Authoritative scope

| # | Component | Engine |
|---|---|---|
| 1 | Ponte Family Bridge | `PB.route()` |
| 2 | Ponte Action Bridge | `PB.route()` |
| 3 | Ponte Task Completion Bridge and compact header | `PB.progress()` / `PB.header()` |
| 4 | Ponte Commercial Journey Bridge | `PB.journey()` |
| 5 | Ponte Counterparty Connection | `PB.connection()` |
| 6 | Ponte Multi-Party Deal Room Bridge | `PB.dealroom()` |

It also governs mobile elevation, reduced motion and the headline emphasis `Global trade, from *signal to deal.*`.

## Not authorised to change

Existing production navigation, authentication, routes, data and business logic remain authoritative and must be preserved.

- Header items remain Market Signals, Start a deal, How Ponte works, and the correct Sign in / Your records account state.
- This package does not authorise Qualified Opportunities or Join the network as replacements.
- Routing, session handling, data fetching and business rules are untouched.
- The landing reference composition is not a whole page to port. Take only the family/action bridge module and approved headline typography.

## Fonts

Playfair Display 400, 500, 600 and italic 400; Inter 300–700; JetBrains Mono 400, 500, 600. Use the production-approved loading mechanism.

## Verification at approval

- reviewed documents opened with zero console errors;
- no malformed SVG paths;
- no known label collisions in the delivered component instances and 390px frames;
- no known WCAG AA text failures in the reviewed compositions;
- keyboard interaction uses one tab stop per selectable bridge, roving tabindex and arrow-key traversal;
- focus survives re-render.

## Source files

- `source/ponte-bridge.css` — approved visual and motion rules
- `source/ponte-bridge.js` — approved framework-neutral rendering engine
- `implementation/01_IMPLEMENTATION_NOTES.md` — integration and non-negotiable rules

Reference screenshots are visual evidence, not pixel sources. Production must render from approved components, tokens and data.