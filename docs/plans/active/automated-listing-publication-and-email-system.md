# ExecPlan — Automated listing publication and unified transactional email

**Status:** Implementation complete on branch; not merged, not deployed.
**Authority:** ADR-0013 (Accepted, 28 July 2026).
**Owner decisions taken:** verification stays blocking; AI drafts the public
text and the member confirms it.

## 1. Purpose and user outcome

A member with a verified business who completes a listing sees it live in the
time one request takes, instead of waiting for Giuseppe to open a queue. A
member who is missing something is told exactly what, on the screen and in an
email. A listing that trips an automated safety check is held, and an operator
gets an alert that says why and links straight to it.

## 2. Authority consulted

- `AGENTS.md` in full — non-negotiable product rules, engineering rules, stop
  conditions.
- `docs/codex/00-START-HERE.md` — authority order, canonical brand line.
- `docs/codex/SOURCE-OF-TRUTH-SOP.md` — decision states, PR discipline.
- `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — §3.5 Business
  Evidence, workflow/approval and messaging capability sections.
- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` — colour rules, token
  authority, "there is no amber", status treatments, mobile review.
- `design-system/ponte-flow/tokens/ponte-flow-tokens.json` — the colour source.
- ADR-0001 (market families), ADR-0002 (Design Constitution).
- `docs/codex/CURRENT-STATE.md`, `DATABASE-STATE.md`.

## 3. Current implementation discovered

Reused rather than replaced:

- `lib/listings/publication-gate.ts` — already the central gate. Composed, not
  rewritten. Its six conditions still decide verification, required facts,
  public text and validity.
- `lib/listings/approval-minimum.ts` — updated to read quantity through the new
  model so `on_request` stops registering as a missing fact.
- `lib/listings/material-change.ts` — untouched. It still decides whether an
  edit is material; only the destination of a revalidation changed.
- `lib/email.ts` — kept as the named surface. Its private `layout()` and seven
  inline templates were replaced by `lib/email/`.

Constraints found:

- `listings.quantity` was already `numeric`; decimals needed no conversion.
- `listings.frequency` is free text holding member-visible labels ("Monthly").
  It is normalised on read and never rewritten.
- RLS already prevented a member writing `approved`. That property is preserved
  and extended to the new states.
- Two status check constraints once coexisted (`listings_status_check` and a
  stale `listings_status_check1`); both are dropped defensively.

## 4. Scope

**Included:** listing submission, validation, publication and status; the
quantity model end to end; every application-generated email; the member
completion screen; lifecycle telemetry; the migration.

**Excluded, explicitly:**

- Applying the migration to production (owner action, `AGENTS.md` stop
  condition).
- Supabase Auth templates — provider-side, documented in
  `docs/email-provider-template-configuration.md`.
- The `/admin/listings` console rebuild as an exception-first surface with
  filtering by flag reason, severity and report count. The data and indexes
  land here; the screen does not. See §11.
- Digest scheduling. The template and send path exist; no cron drives them.
- Abuse reporting as a member-facing feature. `abuseReportCount` is read by the
  validator; nothing writes it yet.

## 5. Product rules

- A listing publishes only on all four conditions in ADR-0013.
- Human review is exception-based. `submitted`, `needs_information`, `flagged`
  and `suspended` are the exception states.
- A safety flag is a HOLD, not a finding. Member-facing copy never accuses.
- Completeness is a count. No surface may render it as verification.
- A quantity read from a document is not stated until the member confirms it.
- No email invites a reply. Connection acceptance remains the one template that
  discloses a contact, per Block D and its test 22.

## 6. Technical design

| Concern | Module |
|---|---|
| Quantity model, parsing, formatting | `lib/listings/quantity.ts` |
| Lifecycle states and transitions | `lib/listings/status.ts` |
| Automated safety checks | `lib/listings/safety.ts` |
| The central validator | `lib/listings/eligibility.ts` |
| Server-side publication | `lib/listings/publish.ts` |
| Email tokens | `lib/email/tokens.ts` |
| Content model, HTML + text | `lib/email/blocks.ts` |
| Shell, header, footer | `lib/email/shell.ts` |
| Identity mapping | `lib/email/identity.ts` |
| Templates | `lib/email/templates.ts` |
| Render entry point | `lib/email/render.ts` |
| Dispatch and observability | `lib/email/send.ts` |
| Application surface | `lib/email.ts` |

The block model is the mechanism that makes "every email has a plain-text
part" true rather than aspirational: a template returns blocks, and both bodies
are rendered from the same list, so they cannot drift and one cannot be omitted.

## 7. Migration plan

`supabase/migrations/20260728b_automated_listing_publication.sql`. Additive and
idempotent. Adds four lifecycle states, the quantity mode and bounds, the
declaration, the extraction-confirmation pair, safety flag columns, the
completeness score, the `listing_events` table and three indexes; restates the
member RLS policies.

**No bulk publication.** Legacy `submitted` rows stay put and re-validate when
next touched. A migration cannot run the validator — it needs live verification
state, adjacent counts and the safety pass — so publishing by status alone
would put unvalidated listings on the public board.

Rollback: the migration is additive, so reverting the application code restores
prior behaviour with the new columns unread. The status constraint would need
re-narrowing only if rows had reached a new state.

## 8. Experience states

- **Published:** live confirmation, listing link, detail level, disclaimer.
- **Needs information:** exact blocking issues on screen and in the email, with
  a route back to the form.
- **Flagged:** neutral wording, no accusation, operator alerted separately.
- **Draft:** unchanged; nothing validated, nothing emailed.
- **Error:** the listing is saved even when publication fails; it remains
  visible as an exception.
- **Mobile:** email verified at 390 × 844 with no horizontal overflow; the
  primary button measures 47px tall.
- **Accessibility:** status carried by a word as well as a colour; the
  decorative tick is `aria-hidden`; every link and button names its action.

## 9. Validation

- `npm test` — full suite green, including three new files (23 quantity, 23
  eligibility, 19 email).
- `tsc --noEmit` — clean for all application code.
- `npm run messages:check` — 1075 strings valid.
- `npm run email:preview` — 18 fixtures rendered, HTML and text.
- Browser measurement of two rendered emails at 390 × 844.

**Not run:** `next build` and the Playwright evidence suite. `@playwright/test`
is not installed in this worktree, which is a pre-existing environment gap, not
a repository failure. Recorded separately per `AGENTS.md`.

**Not done:** no production migration, no deployment, no production test.

## 10. Rollout and safe-disable

No feature flag. The change is a behaviour replacement rather than an addition,
and a flag would mean maintaining both the queue and the validator.

Safe-disable path if publication misbehaves after deployment: revert the
application code. The columns and events remain and are simply unread.

## 11. Progress log

**28 July 2026 — complete on branch**

- Parts A, B, C, D, E, F implemented.
- Part G: member completion screen done. Admin exception console NOT done —
  the data, statuses and indexes exist, the screen still presents the old
  queue.
- Part I: `listing_events` and the send observer exist and are written by the
  publication path. No analytics sink is wired.
- Part J: unit and integration coverage added; the preview utility exists. No
  end-to-end test drives a real submission.

## 12. Decisions and discoveries

- **The brief's premise was slightly off.** There is no `pending_admin_approval`
  status. The real bottleneck state is `submitted`. Nothing needed migrating
  away from a status that never existed.
- **The retired email tagline is not in any authority.** "The verified network
  for cross-border trade" existed only in `lib/email.ts`. The canonical line is
  "Cross-border trade, with greater clarity."
- **The retired email palette is not in any token file.** `#0F1E3C` and
  `#E8A020` are an email-only navy and amber; the Constitution states there is
  no amber in the system.
- **"Ivory Coast" matched the restricted term "ivory".** Found by a test written
  to assert the opposite. Left unfixed it would have held every cocoa listing
  out of Côte d'Ivoire for manual review.
- **One overreach corrected mid-implementation.** Contact disclosure was removed
  from the connection-accepted email on general "do not expose personal data"
  grounds. That is deliberate Block D behaviour pinned by test 22, and outside
  this brief's scope. Restored.

## 13. Final evidence

Branch: `fix/automated-listings-email-system`. Not merged.
Migration written, not applied.
Provider templates documented, not applied.
