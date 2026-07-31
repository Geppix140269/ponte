# ExecPlan — Persistent navigation and unsaved-work protection

**Status:** In progress. Slice 1 (shared foundation + clearest violations +
error resilience) implemented on branch. Journey-by-journey wiring enumerated
below as remaining.
**Owner authorisation:** 2026-07-30. The repository owner authorised the full
brief, chose to extend the existing `DiscardWarning` precedent for the new
components rather than hold for a fresh design authority, and chose the honest
"Sign in to save" behaviour for anonymous users (no fabricated draft promise).
**Audit:** `docs/codex/audits/navigation-unsaved-work/AUDIT-2026-07-30.md`.

## 1. Purpose and user outcome

Every Ponte screen must give an obvious, consistent, safe way to go back one
step, return home, and leave a form without losing completed work. A member must
never feel trapped, never have to interpret a bare arrow icon, and never lose
entered work by clicking the logo, Back, a nav item, or refreshing.

## 2. Authority consulted

- Development brief "Persistent Navigation and Unsaved-Work Protection"
  (2026-07-30).
- `AGENTS.md` — Launch Mode classification, stop conditions, ExecPlan and
  validation rules, English-only interface policy.
- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` — icon law (section 7: a
  missing registry icon is a gap to escalate, not a licence to hand-draw one),
  interaction states (13), accessibility (9), mobile-first review.
- Existing precedent: `components/structure/ClassifyStep.tsx` `DiscardWarning`
  (the one explicit unsaved-work confirmation already in the app).

## 3. Current implementation discovered

- Two shells already render a persistent, clickable, labelled home logo on
  essentially every route (`SiteHeader`/`ChromeGate`; `PonteShell`/`DeskShell`/
  `FindChrome`/`LegalPage` via `PonteLockup`). Requirement 1 is largely met.
- Back within composers is already logical (stack/step pop); no `router.back()`/
  `history.back()` anywhere in `app/`.
- Draft persistence + resume already exists for `/structure`
  (`lib/structure/draft.ts`, `lib/structure/resume.ts`; drafts are listing rows
  with `draft:true`). `ProductIntake` and `ListingForm` use `sessionStorage`.
- No `beforeunload`/route-change guard existed anywhere. The Ponte Flow icon
  registry has no back/arrow key.

## 4. Scope

**In scope (Slice 1, this branch):**
- Shared, reusable primitives: `JourneyBack`, `UnsavedChangesDialog`,
  `useUnsavedGuard`, plus `lib/nav/dirty.ts` and `components/ponte/nav/nav.css`.
- Replace the two icon-only Back controls (`StructureComposer`,
  `CheckComposer`) with the labelled control.
- Guard the Structure composer's exit-to-home against losing a part-built draft
  (dialog + `beforeunload`).
- Branded error boundaries: `app/[locale]/error.tsx`, `app/global-error.tsx`.
- Tests + i18n + this plan + audit + state records.

**Remaining (subsequent slices, enumerated in section 11):** wiring the guard
and (where drafts persist) the three-action dialog into `marketplace/new`,
`find/o/[ref]`, and the heavy Deal Room and admin forms; the two missing
Deal Room "Back to the room" controls; the `/learn/*` double-`<main>` and the
not-found CTA fixes; full desktop + 390x844 + screen-reader evidence per journey.

**Explicit exclusions:** no production migration, no feature-flag change, no
schema change, no new draft store (reuse the listing-row draft). No app-wide
repaint; the shells already carry the logo.

## 5. Product rules

- Show the dialog only when leaving would destroy real work (`structureDirty`
  ignores the one-tap family/intent entrance). Never nag.
- Anonymous users are told the truth: "Sign in to save this as a draft and
  continue later." No `Save as draft` is offered where it cannot persist.
- The safe action ("Continue editing") is focused on open and is what Escape and
  a backdrop click resolve to. The destructive action is never the default.

## 6. Technical design

- `components/ponte/nav/JourneyBack.tsx` — labelled Back; button (logical step)
  or Link (previous page); decorative CSS chevron, never an SVG, never alone.
- `components/ponte/nav/UnsavedChangesDialog.tsx` — `role="alertdialog"`,
  aria-modal, focus trap, return focus, three actions, honest save options;
  `t`-as-prop for testability.
- `components/ponte/nav/useUnsavedGuard.tsx` — `beforeunload` while dirty +
  `guard(proceed)` that holds in-app navigation behind the dialog.
- `lib/nav/dirty.ts` — pure `structureDirty(draft)`.
- `components/ponte/nav/nav.css` — imported once via `app/globals.css`; all
  `--pf-*` tokens.
- Error boundaries as above.

## 7. Migration plan

None. No schema, data or production reconciliation. Draft persistence reuses the
existing listing-row mechanism.

## 8. Experience states

- Mobile-first: 44px min touch targets on Back and every dialog action; dialog
  is a full-width sheet under 480px and a row-reversed action bar above it.
- Reduced motion: the dialog's entrance animation is gated behind
  `prefers-reduced-motion: no-preference`.
- Accessibility: labelled Back (no icon-only), alertdialog semantics, focus trap,
  focus return, keyboard reachable, visible focus rings.
- Error/loading: branded segment error page and a self-contained global error
  page, each with Try again + Return to Ponte Trade.

## 9. Validation

- `lib/nav/__tests__/dirty.test.ts` — 12 assertions (clean vs dirty).
- `components/ponte/nav/__tests__/nav-ui.test.tsx` — 11 assertions (labelled
  Back, guard decisions, dialog structure and honest save options).
- Both wired into `npm test`.
- `npm run verify` before completion.
- Preview: desktop + 390x844 evidence to be captured for the wired journeys.

## 10. Rollout and safe-disable

No feature flag: the controls are additive and degrade to prior behaviour if a
surface does not adopt them. `beforeunload` attaches only while a draft is dirty.

## 11. Progress log

**2026-07-30 — Slice 1 implemented on branch.**
Done: audit; shared foundation (`JourneyBack`, `UnsavedChangesDialog`,
`useUnsavedGuard`, `lib/nav/dirty.ts`, `nav.css`); labelled Back in
`StructureComposer` and `CheckComposer`; guarded exit-to-home in the Structure
composer; `error.tsx` + `global-error.tsx`; i18n `journey` namespace; tests;
this plan and the audit.

**2026-07-30 — Slice 2 implemented on branch (same PR #118).**
The server-action form pages, which hold no React state to ask, get a different
mechanism: `components/ponte/nav/UnsavedFormGuard.tsx`, a client wrapper that
reads dirtiness from the form DOM (snapshot on mount, re-snapshot on input, via
the pure `lib/nav/form-dirty.ts`), attaches `beforeunload` while dirty, and
intercepts leave-navigation with a capture-phase click listener that opens the
shared dialog and performs the navigation only on "Leave". A real submission
clears the guard so the action's own redirect is never intercepted. `display:
contents` wrapper, so page layout is unchanged.

Wired with the guard: Deal Room `propose`, `invitation/[token]/admission` (the
authority declaration), `blockers`, `evidence`, `evidence/[evidenceId]`
(clarification); admin `listings` and `verifications` (decision notes). Added
the two missing labelled backs: "Back to the room" on `[roomId]/activity` and
the workspace hub. Test: `lib/nav/__tests__/form-dirty.test.ts` (7 assertions),
wired into `npm test`.

Remaining (next slices), by route:
- `marketplace/new` (`ListingForm`): guard exits; wire its existing preview
  `Save as draft` into the dialog's authenticated save option.
- `find/o/[ref]`: add a labelled "Back to results/Find"; guard the
  `RequestIntroduction` composer; the breadcrumb is currently inert text.
- `/learn/*` double-`<main>` fix; `not-found.tsx` second-CTA label/target fix.
- Anonymous "Sign in and save" wiring where a journey supports resume-after-auth.
- Desktop + 390x844 + screen-reader evidence per wired journey.

## 12. Decisions and discoveries

- The Ponte Flow registry has no back/arrow icon; per the Constitution the Back
  control is text (a visible label satisfies the brief; the arrow is decorative
  CSS). No new authored SVG was introduced, so the icon-law ratchet is unmoved.
- The shared components take translations as props (`t`-as-prop), matching
  `ClassifyStep`, so they are testable through the project renderer, which has
  no intl context.

## 13. Final evidence

To be completed at PR: commit(s), PR link, `npm run verify` result, and the
per-journey visual evidence for the wired surfaces.
