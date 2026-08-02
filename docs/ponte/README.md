# Ponte authority and design reference

Drop this whole folder into the repository as `docs/ponte/`.

## authority/
The decision record. `PONTE-CANONICAL-AUTHORITY-v5.2.md` is canonical and wins over
every other document here. It carries `DOCTRINE-01`–`06`, `AUTH-01`–`05`,
`DECISION-01`–`27` and `PARAM-01`–`03`.

| File | What it is |
|---|---|
| `PONTE-CANONICAL-AUTHORITY-v5.2.md` | **Canonical.** All doctrine, authority, decisions, parameters. Section 9 is a dated status appendix and is not authority. |
| `PONTE-CODE-WORK-ORDER-v3.md` | WO-1 to WO-5, including the `DECISION-22` export boundary and the PR #53 audit-and-supersede sequence |
| `PONTE-P2-DECISION-COPY.md` | P2, five decisions landing on live code. P2-1 credits withdrawal is a six-step sequence, not a delete. |
| `PONTE-BUILD-1-LISTING-PATH.md` | Build 1. Replaces the live `/deal-rooms/propose` and `/structure`. |
| `PONTE-OPPORTUNITY-JOURNEY-MODEL-v2.1.md` | Four objects, six opportunity types, family schemas (section 4), lifecycles, conversion paths |
| `PONTE-JOURNEY-FLOWS-ACE-v2.1.md` | Node-level flows with gates and failure branches |
| `PONTE-DESIGN-BRIEF-SET-3.md` | For context on what Design is producing next |

## design-reference/
The approved Set 1 and Set 2 implementations, both themes, 390px.
**These are the specification for Build 1, not production code.** Take the structure,
the tokens, the state coverage and the copy verbatim; build them properly in the app.

- `Ponte Set 1 - Three Patterns.html` — 3 reusable patterns, 23 states
- `Ponte Set 2 - Publish a Listing.html` — 6 surfaces, 31 states

Open either file directly in a browser. Both are self-contained apart from the
stylesheets included alongside them.
