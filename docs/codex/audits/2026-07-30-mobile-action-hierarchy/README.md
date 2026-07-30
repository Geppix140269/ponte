# Structure / Review — mobile action hierarchy and visual identity

**Session type:** design decision + authority drafting (no production change, no merge)
**Date:** 30 July 2026
**Baseline:** `origin/main` at `dd28a89`, ADR-0015 Stage 1 merged (`21b4ee4`)
**Owner decisions, 30 July 2026:**
- **Direction B — paper with interaction blue — approved.**
- **Universal Task Completion Bridge** across all three families and both sides. See ADR-0016.
- Open the authority work (ADR-0015 Stage 2 + ADR-0016) for review; do not implement; do not merge.

Files in this folder:
- [`prototypes.html`](prototypes.html) — current + A/B/C, six mobile states each at 390×844,
  interaction-state strip, desktop adaptation.
- [`completion-bridge.html`](completion-bridge.html) — the Task Completion Bridge, three
  families, seven states each, mobile + desktop, with weight maps.
- [`TECHNICAL-REVIEW.md`](TECHNICAL-REVIEW.md) — the engine/applicability/Bridge review.
- The two authority documents live in `docs/decisions/`.

## Audit, and why Stage 1 did not fix it

`components/products/intake/ReviewPanel.tsx` + `intake.css`. The register (`.prev`) is a
`border-top` on the page ground — not a drawn surface; all 13 shared terms render
unconditionally (`TERM_KEYS.map`, 306); a missing term shows `Not stated` (value) + `NOT STATED`
(provenance) + `Add`; the action `.prow__e` (intake.css:248) is an 11px gold text underline with
no fill, box or tap target. Everything sits at one typographic altitude on one cream sheet.

Stage 1 was a token-value change: it made each element pass its WCAG ratio. Hierarchy is not
legibility — it is the difference in weight between elements and their grouping into surfaces,
neither of which is a token value. Passing the divider ratio does not create a surface; gold-ink
passing AA as text is not the same as reading as a button. ADR-0015's own alternatives table
anticipated this: Direction A "has nothing to spend on affordance" because §6 bars gold from
meaning "act here." Blue is the authorised affordance channel — hence Direction B.

## The system (shared by all directions; B adds the blue)

- **Surfaces:** page ground `--pf-surface`; white working surfaces `--pf-raised` bounded by
  `--pf-rule-strong` (§15a: fill step + 3:1 rule, never a fill alone, never a card grid);
  `--pf-rule` hairlines inside panels; a distinct commit zone. No new radius/shadow (§23).
- **Rows:** name-over-value; provenance re-weighted to LEVEL 4 as marker + concise label, the
  five §14 states kept distinct; missing facts leave the register and become a "details Ponte
  still needs" list, each with one action; optional/contract terms behind a disclosure.
- **Actions (B):** blue = Add/Edit/Expand; ink = Confirm (commit); gold = signal/Bridge/one
  editorial italic. Labels name the result (`Add destination`), never a bare `Add`.
- **Progress:** the Task Completion Bridge (below), a gold signal advancing along the deck —
  gold in its lawful meaning (movement across a Bridge, §6a).

Governance, tokens, accessibility, copy, scope and the completion schemas are decided in the two
authority documents:
- `docs/decisions/ADR-0015-STAGE-2-interaction-tokens.md`
- `docs/decisions/ADR-0016-mobile-action-hierarchy-and-completion-bridge.md`
