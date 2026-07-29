# Ponte Design Constitution v1.1

**Status:** APPROVED — AUTHORITATIVE  
**Owner:** Giuseppe Funaro  
**Approval date:** 27 July 2026  
**Amended:** 29 July 2026 (v1.1, contrast and colour remediation — ADR-0015)  
**Scope:** Every Ponte-controlled production interface, component, icon, animation, document surface and interaction.

## Amendment record

Amendments are listed newest first. Each must satisfy section 3 in full.

### v1.1 — 29 July 2026 — Contrast and colour remediation

- **Rules affected:** section 6 (colour law), section 15 (surfaces and rule
  weight), section 18 (approved contrast levels, previously unquantified) and
  section 22 (two items added to the pull-request design gate, so the new rules
  are enforced rather than merely stated). Sections 6, 15 and 18 gain subsections
  rather than losing text: no existing sentence in the Constitution was deleted
  or weakened by this amendment.
- **Reason:** Accepted focus-group finding that members cannot reliably
  distinguish surfaces, modules, controls and states, worst at 390 × 844. The
  audit at `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`
  measured 163 pairs and found 96 short of target, including every control
  boundary in the product and the Bridge deck at 1.42:1.
- **What changed:** structural token values strengthened; a gold structural-rule
  token added; a blue interaction family added as a second semantic colour
  family; numeric contrast targets written into section 18; an 11px floor for
  structural mono captions below 860px.
- **What did not change:** the warm paper identity, the meaning of gold, Bridge
  geometry, motion, typography families, iconography, spacing, or any other
  section.
- **Authority:** ADR-0015, accepted by Giuseppe Funaro on 29 July 2026.
- **Migration and rollback:** two stages, recorded in ADR-0015 and in
  `docs/plans/active/contrast-and-colour-remediation.md`.

## 1. Constitutional authority

The Ponte visual and interaction system is a binding product authority, not inspiration.

Every developer, designer, AI agent and contributor must follow this Constitution. Functional correctness does not override design correctness. A successful build does not constitute design approval. Absence of objection is not approval.

Where an approved rule, component or reference exists, it must be used. Where the system is silent, work stops and the missing decision is escalated. Contributors may not improvise a substitute.

## 2. Authority order

Within visual and interaction scope, use this order:

1. A later owner-approved ADR that explicitly amends this Constitution.
2. This Constitution.
3. Approved packages under `design/authority/`, including the Bridge System.
4. Approved Ponte Flow tokens, registry, icons and motion assets under `design-system/ponte-flow/`.
5. Approved desktop and mobile reference renders.
6. Page-specific implementation briefs that do not contradict the above.
7. Existing implementation reality, only as a constraint to be reconciled rather than a design authority.

Historical prototypes, old brand books, screenshots, conversations and private handovers are non-authoritative unless incorporated here through an approved amendment.

## 3. Amendment and exception law

No silent exception is permitted.

Any amendment must record:

- the rule affected;
- the reason;
- the exact components and routes affected;
- mobile, accessibility and reduced-motion impact;
- migration or rollback implications;
- explicit written approval by Giuseppe Funaro;
- the new Constitution version.

An implementation convenience, technical preference or deadline is not sufficient reason to override an approved design rule.

## 4. Core Ponte identity

Ponte is editorial, precise, restrained and commercially serious. It must not look like a generic SaaS dashboard, AI-generated card grid, consumer marketplace, social network or gaming product.

The recurring identity is created by:

- warm paper surfaces;
- ink-led typography;
- disciplined serif, sans and mono hierarchy;
- one deliberate gold editorial emphasis;
- the bridge as structural interaction language;
- Ponte Flow line icons;
- restrained motion that communicates state;
- visible evidence boundaries and factual distinctions.

## 5. Typography

Use only approved Ponte font families and approved type roles.

- Serif is used for principal editorial headings and major record titles where specified.
- Sans is used for interface copy, controls and operational reading.
- Mono is used for labels, references, classifications, metadata and procedural notation.
- Page-level font substitutions are prohibited.
- Arbitrary weight, tracking and line-height inventions are prohibited.

### Editorial emphasis

A principal sentence may contain one deliberate differentiated phrase using the approved serif italic and AA-safe gold text token.

For the landing headline the authorised structure is:

`Global trade, from <em>signal to deal.</em>`

The emphasis must not be flattened into plain black text, replaced by a gradient, used repeatedly in one heading or applied decoratively to unrelated copy.

## 6. Colour law

Approved tokens are the sole colour source.

- Gold is the Ponte brand signal and moving point. It is not verification, warning, approval, review or success.
- Icons are ink by default and inherit `currentColor`.
- Warning is slate.
- Danger or blocked is red.
- Evidence-backed or checked uses the approved positive token.
- Under review uses the approved review token.
- Declared or unconfirmed uses the approved declared token and dashed treatment.
- Colour is never the only carrier of meaning.

Hard-coded hexadecimal, RGB, HSL or named interface colours outside the approved token files are prohibited unless an accepted amendment records the need.

### 6a. Gold and blue are two different systems (v1.1)

Ponte has exactly two semantic colour families beyond ink and the state colours.
They do not overlap and they may not be substituted for one another.

**Gold is exclusively:**

- the Ponte signal;
- movement across an approved Bridge;
- an arrived or selected Bridge destination;
- approved editorial emphasis.

**Blue is exclusively interaction:**

- links;
- navigational emphasis;
- selected controls that are **not** journey positions;
- active and expanded controls;
- active form boundaries;
- keyboard focus, through the existing focus semantics.

Blue must never mean verification, success, warning, review, commercial
completion or Bridge arrival.

Where the two meet, the Bridge wins: **a chosen Bridge family or station is an
arrived destination and stays gold**, even though it is also a selected control.
Blue takes selected controls that are not journey positions — chips, segmented
controls, tabs, rows, tiles and expanded modules. Every journey slice in which a
Bridge appears beside a selected control must state that this boundary was
checked.

`--pf-focus` is not a general interaction token. It means keyboard focus and
nothing else, and it must remain visually distinct from the interaction border so
that a focused control and a selected control never look the same.

### 6b. Gold as text and gold as a line are different tokens (v1.1)

Gold at brand saturation does not carry a 1px rule or a small state marker.

- `--pf-gold-ink` is gold **as text**.
- `--pf-gold-rule` is gold **as a structural line, cap, bar or state marker**.
- `--pf-gold` is the brand fill, for large marks and full control fills only,
  where the contrast that matters is the label against the fill.

A rule, a cap, a progress fill, a selection bar or a state dot drawn in
`--pf-gold` is a defect, not a style choice.

### 6c. Recession is expressed in colour, not in container opacity (v1.1)

`opacity` on a subtree that contains text multiplies the contrast of every
descendant, so a recessed module becomes an unreadable one. Recession, disabled
state and unavailability are expressed with token colour at full opacity.

Opacity may still be applied to a single non-text mark — a node, a pier, a
rule — where the resulting composited value is measured and meets its target.

## 7. Icon law

All production interface icons must come from the approved Ponte Flow registry.

Prohibited:

- ad hoc SVG interface icons;
- emojis as interface icons;
- third-party substitutions where a Ponte icon exists;
- local redraws or modified proportions;
- page-specific stroke widths;
- hard-coded icon colours.

A missing icon is a design gap to escalate, not permission to invent one.

## 8. Bridge System law

The approved Bridge System under `design/authority/bridge/v1/` is authoritative for:

- Ponte Family Bridge;
- Ponte Action Bridge;
- Task Completion Bridge;
- Commercial Journey Bridge;
- Counterparty Connection;
- Multi-party Deal Room Bridge;
- compact journey headers;
- mobile bridge behaviour;
- reduced-motion bridge behaviour.

The bridge is a structural interaction system, not decoration. Generic cards positioned around an ornamental arch do not satisfy the rule.

Where the approved bridge applies, it may not be replaced by a card grid, tabs, generic stepper or page-specific navigation treatment.

## 9. Progress law

Before meaningful action, show a neutral state and no percentage.

Ponte must never display 0%.

After the first meaningful action, the first visible completion value normally begins between 18% and 25%.

Progress values must:

- be deterministic and stable for the same completed state;
- result from weighted completed work;
- use irregular, non-mechanical increments;
- avoid equal ladders such as 20, 40, 60, 80;
- reach 100% only when the defined task or agreed procedure is complete.

Completion percentage never means probability of success, credibility, risk, transaction value, verification or likelihood of closing.

Commercial stage uses named milestones and remains distinct from task completion.

## 10. Motion law

Motion must communicate a real state change: selection, crossing, connection, active work, waiting, blocking or completion.

Prohibited:

- decorative motion without meaning;
- bouncing, particles, glowing trails or game-like effects;
- permanent looping after a state is already understood;
- animation that delays the user's action;
- motion used as the only state carrier.

Every motion component must define trigger, start state, end state, duration, easing, interruption behaviour, reverse behaviour and reduced-motion fallback.

## 11. Navigation law

Navigation, account controls and journey progress are different systems and must not be blended.

- The journey rail carries journey state only and is never global navigation.
- The landing shows no journey rail before a journey begins.
- Authentication controls must reflect session state truthfully.
- A sign-in page must not display a duplicate sign-in control.
- Existing approved production destinations may not be silently renamed or rerouted by a design implementation.

## 12. Buttons and actions

Use approved button and action primitives only.

- Primary, secondary, destructive, disabled and loading states must use approved semantics.
- Disabled actions require an understandable reason where the user may expect them to work.
- Focus indicators may not be removed.
- Local button styling and one-off hover behaviours are prohibited.
- Gold hover or movement does not convert an action into an approval or status.

## 13. Forms and fields

Use approved form primitives for labels, inputs, text areas, selectors, validation and help text.

- Labels remain visible and explicit.
- Placeholder text is not a substitute for a label.
- Input, error, disabled, pending and success states must be designed.
- Authentication must preserve and resume the user's intended route and work.
- A form correction may not restyle unrelated brand elements.

## 14. Records, evidence and status

Market Signals and Member Opportunities remain visually and linguistically distinct.

Records must show only facts supported by the underlying record. Missing facts read `Not stated` or the approved equivalent; they are never inferred to complete a composition.

Evidence, declaration, review, verification and approval are separate states. No single generic verified treatment may collapse them.

## 15. Surfaces and containers

Use approved surfaces, rules, radii and shadows.

Prohibited:

- panels inside panels without an approved structural reason;
- generic SaaS card grids as a default page composition;
- arbitrary rounded rectangles;
- page-specific radii and shadows;
- blue-grey or glass surfaces that contradict the warm Ponte paper system;
- visual empty space created only to force equal card heights.

Unequal content may use natural height. Artificial symmetry must not damage hierarchy or clarity.

### 15a. A surface boundary is drawn, not implied (v1.1)

Two adjacent surfaces are never separated by their fills alone. Warm paper cannot
carry enough luminance difference between a page ground, a working surface and a
sunken well to make a fill the boundary, and attempting it produces the blue-grey
SaaS surfaces this section already prohibits.

Every adjacent surface pair therefore carries **both**:

- a fill difference of at least 1.15:1, and
- a rule at `--pf-rule-strong` or stronger, meeting 3:1 against both surfaces.

There are two rule weights and they are not interchangeable:

- `--pf-rule` is a divider **inside** a module — a row separator, a hairline
  between facts. It is not a component boundary and owes 1.5:1, not 3:1.
- `--pf-rule-strong` is the boundary **of** a module or a control — a panel edge,
  an input, a button, a chip, a tile, a segmented control. It owes 3:1.

A control whose boundary is drawn in `--pf-rule` is using the wrong token.

## 16. Spacing and layout rhythm

Spacing must derive from approved tokens or approved component rules.

- Do not invent page-local spacing scales.
- Align content by hierarchy, not by forcing unrelated modules to equal height.
- Preserve editorial breathing room without stranding content in empty pages.
- Desktop expansion must not create arbitrary long lines.
- Mobile must not create horizontal page overflow.

## 17. Responsive and mobile law

Every changed interface must be reviewed at 390 × 844 before desktop approval is considered complete.

Mobile may adapt composition but must preserve Ponte identity, hierarchy, meaning and interaction. A bridge may transform into an approved compact or vertical treatment only as defined in the Bridge System.

Desktop-only design approval is invalid.

## 18. Accessibility law

Every approved component must remain understandable:

- by keyboard;
- with visible focus;
- with reduced motion;
- without relying on colour alone;
- with meaningful screen-reader labels;
- in greyscale where practical;
- at approved contrast levels.

Duplicated animation elements must be hidden from assistive technology. Reduced motion removes non-essential movement rather than merely slowing it.

### 18a. Approved contrast levels, stated numerically (v1.1)

This section previously required "approved contrast levels" without naming one,
which meant the rule could not be failed. The approved levels are:

| What is being drawn | Minimum | Basis |
|---|---|---|
| Text, at every size this product uses | 4.5:1 | WCAG SC 1.4.3. Ponte sets structural captions in mono at small sizes, so the large-text exemption is not claimed anywhere |
| The boundary of a control | 3:1 | WCAG SC 1.4.11 |
| A state indicator, including a selection mark | 3:1 | WCAG SC 1.4.11 |
| A focus indicator | 3:1 | WCAG SC 1.4.11 |
| A Bridge deck, pier, cap or node | 3:1 | Section 8 makes the Bridge structural, so it is a state indicator and not decoration |
| A divider inside a module | 1.5:1 | Ponte rule, not a WCAG duty |
| Two adjacent surface fills | 1.15:1, plus a 3:1 rule | Ponte rule, not a WCAG duty. See section 15a |

Measured against the **darkest surface the value is ever drawn on**, not the
lightest. A value solved against white and then used in the sunken well fails
there, which is the specific error the 29 July audit found repeatedly.

Composited values are measured after compositing. An `opacity` or a
`color-mix()` is not a contrast reduction of the same size and must be flattened
before it is checked.

### 18b. Structural captions have a size floor on mobile (v1.1)

Below 860px, mono text carrying structural or factual information — a
classification, a reference, a station name, a field label, a country or HS
code — is set at **no less than 11px**.

Contrast is a multiplier on legibility, not a substitute for size. A two-letter
country code at 8px on a phone in daylight is not rescued by any ratio.

This is a floor, not a licence to set everything at 11px.

## 19. State completeness

Every meaningful journey or shared component must account for applicable:

- loading;
- empty;
- incomplete;
- ambiguous;
- error;
- blocked;
- waiting;
- resumed;
- completed;
- expired;
- withdrawn states.

A happy-path-only component is not complete.

## 20. Component ownership

Approved shared primitives must be implemented centrally and reused.

Pages may compose approved primitives. They may not copy, fork or locally restyle them.

Core design primitives, token files, icon registries and authority files require owner review. A change made for one route must not silently alter the system everywhere.

## 21. Visual regression and evidence

Relevant UI pull requests must provide desktop and 390 × 844 evidence against approved references.

Automated or manual visual comparison must cover the states changed. Technical tests alone are insufficient.

Unexpected differences in typography, emphasis, iconography, bridge geometry, spacing, colour, motion or component structure must be treated as regressions unless explicitly approved.

## 22. Pull-request design gate

Every UI pull request must confirm:

- approved Ponte components used;
- approved tokens used;
- approved icons used;
- contrast measured against section 18a, for every value the change introduces or alters, against the darkest surface it is drawn on;
- gold and blue used within their section 6a meanings, and the Bridge boundary checked where a Bridge appears beside a selected control;
- no generic substitute introduced;
- editorial typography preserved;
- bridge language preserved where applicable;
- desktop reference reviewed;
- mobile 390 × 844 reference reviewed;
- reduced motion reviewed;
- accessibility states reviewed;
- no page-specific visual convention introduced;
- no silent simplification;
- visual evidence attached;
- explicit design approval recorded.

## 23. Prohibited substitutions

Without a versioned owner-approved amendment, contributors may not:

- replace the Bridge System with cards, tabs or a generic stepper;
- flatten gold italic editorial emphasis;
- use an unapproved icon set;
- introduce a new colour, typeface, radius, shadow or motion language;
- create a custom Google sign-in imitation;
- replace factual evidence boundaries with marketing claims;
- redesign navigation while implementing an unrelated component;
- treat a prototype as authority over production behaviour;
- claim visual completion from build or unit-test success alone.

## 24. Stop conditions

Stop and request owner approval when:

- authorities conflict;
- an approved component does not support the required state;
- a required icon is missing;
- a design reference conflicts with truthful production data or behaviour;
- accessibility requires a visible design change not covered by the authority;
- implementation would alter navigation, authentication, routing, data or permissions beyond the approved scope;
- any exception to this Constitution is proposed.

## 25. Enforcement

This Constitution is enforced through:

- mandatory repository entry-point references;
- ADR-0002;
- CODEOWNERS protection;
- governance checks;
- the pull-request design gate;
- approved token and component use;
- visual evidence and regression review;
- explicit owner approval before merge.

The system may evolve through controlled amendments. It may not drift.