# ExecPlan: verification journey into Brand v5

**Status:** implemented, pending review
**Raised:** 26 July 2026

## 1. Purpose and user outcome

A member who completes a deal in Start a Deal and reaches the last blocker,
business verification, is thrown out of the cream editorial product into the
old black-and-lime application. Same session, same task, different product.
After this, verification looks and behaves like the rest of Ponte Trade, so the
last step of a deal is not the one that makes the member doubt where they are.

## 2. Authority consulted

- `AGENTS.md`: "Apply Brand v5 journey by journey. Do not begin an app-wide
  repaint." This is one journey: the verification request.
- `components/ChromeGate.tsx`, which already records the rule being applied:
  "A public route that renders inside this obsidian chrome is now the exception
  and should be treated as a migration still outstanding."
- `components/shell/PonteShell.tsx`: the one shell every public route mounts,
  and explicitly "a shared component, not a pattern to copy".
- `components/find/find.css`: the heritage-light token block and the shared
  control classes (`fbtn`, `fphead__*`, `eyebrow`, `serif`).
- North Star entry architecture and the Master Implementation Brief for what
  verification is allowed to claim.

## 3. Current implementation discovered

Three files render the journey, all in the obsidian style:

- `app/[locale]/verify/page.tsx` (207 lines): purpose choice, signed-out state,
  disclaimer. Uses `glass`, `text-white`, `text-gray-2`, `btn-gold`, `pill`.
- `components/VerifyForm.tsx` (543 lines, ~62 styling sites): balance and cost,
  the request fields, the member-business attestation, the candidate
  disambiguation list, and the three result states.
- `app/[locale]/verification/page.tsx` (265 lines): the public explainer, which
  `/verify` links to, so migrating only the first leaves the jolt one click away.

None of them is in ChromeGate's bared list, so they also carry the legacy
obsidian header, footer and bottom bar.

The logic is sound and is not being rewritten: purposes, the attestation gate,
credit cost and balance, the 401/402/429 paths, candidate selection resuming
the paid case, and the disclaimer all stay exactly as they are.

## 4. Scope

Included: the three files above, their entry in `ChromeGate`, and a small
`components/verify/verify.css` for the pieces the shared classes do not already
cover.

Excluded: the verification pipeline, API routes, credits, the admin surfaces,
`/pricing`, and any change to what a verification means or claims.

## 5. Product rules

- Verification language does not change. A clean check sets "Business checked";
  nothing here introduces a score, a tier or a badge the pipeline does not
  grant.
- `VERIFICATION_DISCLAIMER` stays rendered in full and stays prominent.
- Gold remains a brand signal. Verified, review and failed keep the reserved
  semantic colours (`--pos`, `--review`, `--neg`), never gold.
- The member-business attestation stays a deliberate, unticked checkbox that
  blocks submission.
- Value before authentication: the signed-out state still explains the service
  rather than only demanding a login.

## 6. Technical design

- Both pages mount `PonteShell` and are added to `ChromeGate.rendersOwnChrome`,
  which is what removes the obsidian header, footer and bottom bar.
- Headings reuse `fphead__eb` / `eyebrow` / `fphead__h` / `fphead__def`, as
  Find and Structure do.
- Buttons reuse `fbtn`, `fbtn--ghost`, `fbtn--lg`, `fbtn--block`, which
  PonteShell's stylesheet supplies. Form controls are defined in this journey's
  own sheet rather than borrowed from the signals sheet, which this page does
  not import (see section 12).
- New in `verify.css`, following the journey's no-boxes rule (structure from
  rules and whitespace, not cards): the two purpose choices, the balance row,
  the candidate list, the result block and the disclaimer well.
- `lucide-react` icons are dropped in favour of the journey's typographic
  treatment: a number, a rule and a heading. The outcome states the class in
  words and in a reserved left status rule, never by colour or icon alone.

## 7. Migration plan

No database or API change. Rollback is reverting the pull request.

## 8. Experience states

Covered explicitly: signed out, no balance / insufficient credits, idle,
sending, verified, in review, failed, several candidates matched, a candidate
with no registration number, an error from each status code, and start over.
Mobile reviewed at 390 x 844 before desktop, per `AGENTS.md`. Focus states come
from the `.ponte-find` focus ring; reduced motion is unaffected as nothing here
animates.

## 9. Validation

`npm run verify`, plus a live pass through the journey in the browser covering
the states in section 8 that do not require spending a credit.

## 10. Rollout and safe-disable

No flag. The change is presentational; reverting the PR restores the previous
appearance with no data consequence.

## 11. Progress log

- **26 July 2026** — Journey audited, plan written, migration completed. All
  three files moved onto PonteShell, both routes bared in ChromeGate, and
  `components/verify/verify.css` added. Verified in the browser at 948px and at
  390 x 844: the shell renders cream, no `glass`, `btn-gold` or `pill` survives
  on either route, no horizontal overflow at 390, and the form controls sit on
  hairline rules.

## 12. Decisions and discoveries

- The composer's "Verify my business" control, added 26 July 2026, is what made
  this reachable mid-flow and therefore visible. The control is correct; the
  destination was the problem.
- Migrating only `/verify` was considered and rejected: its own explainer link
  would still open the obsidian design one click later.
- **Caught in review:** the first pass styled the form by reusing the signals
  journey's `sigsheet__*` classes, which this page never imports. Every input
  therefore fell through to the obsidian application's global input styling and
  rendered dark grey on cream. The controls are now defined in the journey's own
  sheet. A borrowed class from a stylesheet the page does not load is not a
  reuse; it is a silent dependency on another route's imports.

## 13. Final evidence

- `npm run verify` green: tests, `tsc`, message and encoding checks, `next build`.
- Browser pass on `/verify`, `/verify?for=business` and `/verification` at
  desktop and at 390 x 844, checking computed styles rather than appearance
  alone: `.ponte-find` surface `#fcfbf7`, the only header is `fnav`, and a
  selector sweep for `.glass`, `.btn-gold` and `.pill` returns nothing.
- **Limitation, stated rather than glossed:** the signed-in form was rendered
  behind a temporary local patch, since local development has no member session.
  The reverted patch is not in the diff. The three outcome states (verified, in
  review, failed) and candidate selection were not exercised against a live
  verification, because doing so spends credits against production. Their markup
  and styling are covered by the same stylesheet as the states that were seen.
