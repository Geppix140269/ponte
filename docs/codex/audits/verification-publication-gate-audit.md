# Audit — the verification requirement in the live member journey

**Date:** 28 July 2026
**Scope:** ADR-0013 requires a current member-business verification before a
listing publishes. This audit traces that requirement through the real member
journey and reports where it holds, where it is invisible, and where it cannot
currently be completed.
**Instruction:** verification is NOT to be removed as a publication
requirement. The goal is to make it visible, actionable and testable.

---

## Summary

The requirement is **correctly enforced and correctly bound**. The data model
distinguishes a member-business verification from a private counterparty check
rigorously, and the binding between a passing check and the publication gate is
real, live-read and tested.

Two problems were found. One was a dead end in the member journey and is fixed
in this PR. The other is an environmental dependency that cannot be confirmed
from the repository and needs an owner check before the release is called
successful.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | A member whose only blocker was verification was told to "complete your listing" and sent to a form that could not fix it | High | **Fixed in this PR** |
| 2 | End-to-end completion depends on registry API keys whose production state cannot be read from here | High | **Documented; owner check required** |
| 3 | Verification costs 2 credits; signup grants 3 | Low | No action. Confirmed workable |
| 4 | The business/counterparty distinction is strong in data and in UI | — | No action |

---

## 1. Where an unverified member is sent

**Before this PR:** nowhere useful.

The validator returned a correct blocking issue
(`business_verification_required`, field `verification`, message "Complete your
business verification…"), but both surfaces that consumed it treated every
blocking issue identically:

- the completion screen's button was `Complete your listing` → `/marketplace`;
- the email's CTA was `Complete your listing` → the composer.

A member whose listing was complete and whose only gap was verification was
therefore routed to a form containing nothing that could resolve their block,
with the word "verification" appearing only inside one bullet in a list. The
screen also said *"a few required details are missing"*, which was false: the
listing was finished.

This is the most likely single blocker in practice. `CURRENT-STATE.md` records
**zero** members with a passing bound member-business verification at the
26 July probe, so under ADR-0013 this dead end would have been the default
experience of automated publication.

**After this PR.** `resolutionRoute()` in `lib/listings/eligibility.ts`
classifies the blocking set as `verification`, `listing` or `both`, and:

| Route | Screen | Email |
|---|---|---|
| `verification` | "Your offer is ready. Your business is not verified yet." Primary button **Verify your business** → `/verify?for=business` | Subject *Verify your business to publish your Ponte offer*; button **Verify your business** |
| `listing` | "Your offer is saved, but a few required details are missing." → composer | *Complete your Ponte offer to publish it* → composer |
| `both` | Listing route leads; a secondary **Verify your business** link is shown so the second step is not a surprise later | Same, as a secondary link |

The verification-only copy states plainly that nothing is wrong with the
listing and that it publishes automatically once verification passes.

---

## 2. What the member must complete

Route: `/verify?for=business` → `VerifyForm` with `purpose="member_business"`.

1. **An explicit attestation** — "This is the business I represent on Ponte."
   Version-stamped (`represent-own-business/v1`). Server-enforced by
   `checkAttestation()`, so a direct API call cannot bypass the checkbox, and
   only a strict boolean `true` counts.
2. **Company identification** — name and country, plus registration number, VAT
   or LEI where available.
3. **2 credits.** Signup grants 3 (`20260722d_signup_credits.sql`), so a new
   member can complete exactly one member-business verification without paying.
   Confirmed workable; noted because it is a non-obvious dependency.

The pipeline then resolves the company against registries, screens sanctions,
and lands on `auto_verified`, `review`, `needs_selection` or `failed`.

`needs_selection` pauses the run when a name-only search returns several
candidates; the member picks one and the case resumes without a second charge.

---

## 3. Can it be completed end to end?

**In code: yes.** The path from `/verify?for=business` to a bound, passing
verification is complete and coherent, with no missing step or unreachable
state.

**In production: cannot be confirmed from the repository.** The pipeline calls
external registries, and two of them require API keys:

| Source | Key | Coverage |
|---|---|---|
| Companies House | `COMPANIES_HOUSE_API_KEY` | UK |
| OpenCorporates | `OPENCORPORATES_API_KEY` | Broad international |
| VIES | none | EU VAT |
| GLEIF | none | LEI holders |

Both keyed sources are `isConfigured()`-guarded, so a missing key degrades
rather than crashes. But a member outside the EU, without an LEI, and with no
OpenCorporates key configured has no registry that can confirm them
automatically. Their case goes to `review`, which is a human decision — and
`review` is **not** a passing status for the publication gate.

**This matters more under ADR-0013 than it did before.** Previously a listing
waited for Giuseppe either way. Now verification is the only gate, so an
unconfigured registry key converts "automated publication" into "manual
verification review", silently.

**Owner action required.** Before calling the release successful, confirm in
Netlify:

```bash
netlify env:list | grep -E "COMPANIES_HOUSE_API_KEY|OPENCORPORATES_API_KEY"
```

and confirm at least one production account can reach `auto_verified`. If none
can, the primary path of this release is unproven, and the deployment record
must say so rather than marking smoke test 5.1 passed. This is written into
`docs/runbooks/PR-74-automated-listing-publication-deployment.md` §7.

---

## 4. Does a successful verification actually bind to the publication gate?

**Yes, and it is the strongest part of this journey.**

On `auto_verified` **and** `grantsMemberStatus(purpose)`, the pipeline writes
(`lib/verification/pipeline.ts`):

```
profiles.verification_level      = 2
profiles.verified_at             = now()
profiles.business_verification_id = <this verification id>
```

The publication gate reads exactly those, plus the live verification row:

- `business_verification_id` must be set;
- the bound row's `purpose` must grant member status;
- its `status` must be in `{auto_verified, verified}`;
- `profiles.verification_level` must be ≥ 2;
- stored sanctions must be clean with zero strong candidates.

Three properties are worth stating because each closes a real hole:

1. **It reads live state, not the binding alone.** A re-screen suspension
   (`lib/verification/rescreen.ts`) moves the case to `review` and drops the
   profile to level 1 while leaving `business_verification_id` in place. A gate
   that checked only "is a verification bound" would keep publishing for a
   member whose verification had lapsed. This one does not.
2. **A counterparty check can never grant it.** `normalizePurpose()` treats
   anything that is not exactly `member_business` as `counterparty_check`, so a
   missing, misspelled or hostile purpose grants nothing.
3. **It is re-checked on every public read.** `isPubliclyEligibleVerification()`
   mirrors the same rule, so a lapsed verification drops the member's listings
   off public surfaces even though the listing row is still `approved`.

Covered by `lib/verification/__tests__/purpose.test.ts`,
`lib/listings/__tests__/publication-gate.test.ts` and, for the new path,
`lib/listings/__tests__/eligibility.test.ts` ("an unverified member does not
publish", "a suspended verification does not publish").

---

## 5. What the member sees when verification is the only blocker

Covered in §1. After this PR:

- **Screen:** eyebrow "One step left", title "Your offer is ready. Your business
  is not verified yet.", the exact blocking issue, a **Verify your business**
  button to `/verify?for=business`, and a note that verifying confirms the legal
  entity and is not an assessment of the opportunity.
- **Email:** subject *Verify your business to publish your Ponte offer*,
  matching body and CTA.
- **Never:** "a few required details are missing" when the listing is complete.

---

## 6. Business verification vs private counterparty check

**Clearly distinguished, in data and in interface.**

**Data.** Two purposes and only two. `grantsMemberStatus()` is the single rule
and is imported by the pipeline, the admin queue, the re-screen and the
publication gate, so all four gate identically. A counterparty check produces a
case result and never touches the requester's level, trust score, badge or
`verified_at`.

**Interface.** `/verify` opens on an explicit two-way choice:

> **01 Verify my business** — "Verify the business you represent. Sets your
> Business checked status."
> **02 Check a counterparty** — "A private check on another company. Does not
> change your account."

Both cards say what the check does *to the member's own account*, which is the
distinction that matters. The counterparty copy states the negative outright.

**One residual risk, not a defect.** Both paths cost 2 credits and share a form.
A member with 3 signup credits who spends 2 on a counterparty check cannot then
verify their own business without buying more — and under ADR-0013 that now
blocks publication rather than merely a badge. Nothing misleads them; the choice
screen is explicit. But the consequence of choosing 02 first is larger than it
was, and the copy does not say so.

Recorded as a follow-up rather than fixed here: changing credit pricing or the
signup grant is a commercial decision under the `AGENTS.md` stop conditions, not
an implementation detail.

---

## 7. Making the requirement testable

Added in this PR:

- `resolutionRoute()` and `isVerificationIssue()` — pure, unit-tested
  classification of the blocking set.
- Eligibility tests asserting an unverified member does not publish, a
  suspended verification does not publish, and that both produce a
  `field: "verification"` issue rather than a generic failure.
- Exception-console tests asserting `unverified_submitter` is its own reason
  category, separate from `incomplete`, so an operator can see at a glance how
  many listings are blocked on verification rather than on the listing itself.

Not added, and worth stating: **there is no end-to-end test that drives a real
verification to `auto_verified`.** Doing so requires live registry credentials
and a real company, so it is inherently a production smoke test. It is written
up as step 5.1/§7 of the deployment runbook rather than faked in CI.

---

## 8. Recommendations

1. **Before deploying:** confirm the registry API keys (§3). Without at least
   one working registry for the target market, automated publication cannot
   complete for anybody.
2. **Before deploying:** confirm at least one production account can reach
   `auto_verified`, or record that smoke test 5.1 is unrunnable.
3. **Follow-up, owner decision:** the credit interaction in §6. Either raise the
   signup grant, make the member-business check free, or say plainly on the
   choice screen that a counterparty check spends credits needed to publish.
4. **Follow-up:** surface verification status on the member's own listing list,
   so a blocked member sees the reason without submitting again.
