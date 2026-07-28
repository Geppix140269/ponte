# ADR-0013 — Automated listing publication and one transactional email system

**Status:** Accepted
**Date:** 28 July 2026
**Owner:** Giuseppe Funaro
**Supersedes, within its scope:** the manual desk-approval step for Member
Opportunities established by the Master Implementation Brief's opportunity
review workflow and implemented in `app/[locale]/admin/listings/`.

## Context

Ponte's listing workflow required Giuseppe, or another administrator, to
approve every Member Opportunity before it became public. Approval was the
DEFAULT outcome path, not an exception path: a structurally complete listing
from a verified member sat in `submitted` until a person opened the admin queue.

Three consequences followed.

1. **Throughput was bounded by one person.** Every additional member made the
   queue longer. Nothing in the product could grow past the owner's reading
   speed, and a market with a publication latency measured in days is not a
   market that anybody uses twice.

2. **The notification system was the queue.** On submission the platform sent
   the desk an email whose body ended `review in /admin/listings`. It carried no
   listing URL, no review reason, no approval control and no indication of why
   this particular listing needed a person. It went out for every listing
   because every listing needed a person.

3. **The queue hid the exceptions.** A listing naming a restricted category and
   a listing that was simply complete arrived in the same inbox, looking the
   same. Reviewing everything is indistinguishable from reviewing nothing.

Two defects surfaced alongside this and share its root: work that a machine
should have done was left to a person, and work a person should have checked
was left to a template.

- The listing notification mapped the member's email address into the `name`
  field and the string `Marketplace listing PT-0102` into the `company` field.
  Both were the nearest string in scope at the point the object was built.
- The quantity control rendered `draft.quantity ?? 10000`. A member who accepted
  the "10,000" they were shown submitted a listing carrying no quantity at all,
  because the fallback lived in the render and only a stepper press wrote state.

## Decision

**Ponte is a self-publishing trade platform with automated eligibility
controls, not a manually moderated noticeboard.**

A Member Opportunity publishes automatically when, and only when, all of the
following hold:

1. the member holds a current, passing member-business verification with no
   unresolved sanctions candidate;
2. every mandatory field for that listing's market family is present and
   structurally valid;
3. the member has accepted the listing responsibility declaration;
4. no automated safety check has raised a high- or medium-severity flag.

Human review is **exception-based only**. `/admin/listings` becomes an
exception console, not a publication queue.

Three sub-decisions were taken explicitly because each could have gone the
other way:

**Verification remains blocking.** Automated publication does not lower the
member-business bar. An unverified member receives a blocking issue that routes
them to `/verify`, not a published listing. This preserves the L1–L4 trust model
and the "verified network" claim, and keeps this decision inside the existing
user-facing trust representation rather than changing it.

**The public qualification and limitations text survives, authored by the
member.** Publication gate condition 5 previously required desk-written public
text. Under automated publication the AI drafts it and the **member must
explicitly confirm it** before publication; the member is recorded as the
author. Ponte never publishes unattended model output, so `AGENTS.md`'s rule
that AI "must not silently publish" continues to hold.

**Completeness is a count, never a trust signal.** The completeness score drives
ranking, search visibility and improvement prompts. It is rendered as Basic /
Complete / Highly detailed. A listing may score 100 and be entirely untrue, and
no surface may imply that Ponte checked the commercial claims in it.

Separately, and as one coherent patch:

- The quantity model gains a **mode** (`exact`, `approximate`, `minimum`,
  `maximum`, `range`, `negotiable`, `on_request`), decimal support and
  separator-safe parsing. A displayed default that the form state does not hold
  is prohibited.
- **All** application-generated email moves to one shell derived from the
  approved Ponte Flow tokens, with a plain-text part on every message. No
  template invites a reply by email.

## Consequences

### Positive

- Publication latency for a complete, verified listing drops from days to the
  duration of one request.
- Operators see only cases a machine could not resolve, each carrying an
  explicit machine-readable reason.
- The email system has one visual constitution, one dispatch path and one
  observable outcome per send.
- Quantity can express what traders actually offer.

### Negative and accepted

- **The bottleneck moves rather than disappearing.** Verification is still a
  desk function, and `CURRENT-STATE.md` recorded zero listings with a passing
  bound member-business verification at the 26 July probe. Automated publication
  will not produce a single published listing until verification throughput
  improves. This is a deliberate trade: an unverified public board was judged
  the worse outcome.
- **Nobody reads a listing before it goes out.** The automated safety checks are
  structural — a term list, a link shape, a duplicate hash. They will miss a
  well-written misrepresentation that a human might have caught. Suspension,
  abuse reporting and the exception console are the compensating controls.
- **Automated flags will produce false positives.** Every one costs a member a
  delay and an operator a review. The member-facing copy is written on the basis
  that a flag is a hold and not an accusation.
- Legacy `submitted` rows are not bulk-published. They re-validate when next
  touched and remain visible as an exception backlog.

## Alternatives considered

**Keep manual approval, fix only the email.** Rejected: it would have produced a
well-designed notification for a workflow that does not scale, and the brief
that prompted this work called that out specifically.

**Drop verification as a publication requirement.** Rejected under the owner
decision recorded above. It would have removed the remaining bottleneck at the
cost of putting unverified parties on the public board — a change to
user-facing trust representation that `AGENTS.md` reserves for explicit owner
approval, and one that contradicts the product's core claim.

**Auto-generate the public qualification text without member confirmation.**
Rejected: it is precisely the "AI silently publishes" case that `AGENTS.md`
line 91 prohibits.

## Compliance and authority notes

- `AGENTS.md` — "AI ... must not silently publish": preserved. The member
  confirms the public text; the validator applies rules, it does not author
  claims.
- `AGENTS.md` — "Commercial fit precedes contact disclosure. Introductions must
  remain controlled and recorded": unchanged. Connection request and acceptance
  behaviour (Block D) is untouched, including disclosure on acceptance.
- `AGENTS.md` — "Gold is a brand signal, not a verification, warning, approval
  or review status": the email system uses gold for the brand signal only;
  status is carried by the approved positive, review and danger tokens and by a
  word in every case.
- Design Constitution — "Approved tokens are the sole colour source": the email
  tokens are imported from `design-system/ponte-flow/tokens/`. The retired
  layout's `#0F1E3C` and `#E8A020` appear in no approved token file and are
  gone; a regression test fails on any unapproved hex in a rendered email.
- The canonical brand line `Cross-border trade, with greater clarity.`
  (`docs/codex/00-START-HERE.md`) replaces the email-only line "The verified
  network for cross-border trade", which no authority carries.

## Implementation

See `docs/plans/active/automated-listing-publication-and-email-system.md`.

Migration: `supabase/migrations/20260728b_automated_listing_publication.sql`.
Not applied to production by this change set; production application requires
owner approval per `AGENTS.md`.
