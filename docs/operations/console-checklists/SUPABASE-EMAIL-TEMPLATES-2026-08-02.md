# Checklist A: the Supabase-hosted email templates

**For:** Giuseppe, by hand, in the Supabase dashboard
**Date:** 2 August 2026
**Why it exists:** these templates are pasted in through the dashboard and are
not in this repository. Every P1 and P2 copy correction has therefore missed
them. Nothing in the codebase can read them, and no test can assert on them.

**Do not send me a token, a connection string or a service-role key.** Nothing
in this checklist needs one, and I will not ask for one. If any step seems to
require credentials, stop: the step is wrong, not the rule.

**Labels move.** Supabase reorganises its dashboard regularly. This describes
**what you are looking for**, not where a menu item sat on one afternoon. If the
navigation does not match, search the dashboard for the template body text in the
"Find" column instead of hunting for the menu.

---

## Where these live

Authentication, then the section for email templates. As of 2 August 2026 that is
**Authentication -> Emails -> Templates**, with a tab per template. If that path
has changed, the templates are the ones containing `{{ .ConfirmationURL }}` or
`{{ .Token }}`.

Supabase sends these six. Ponte may have customised only some; check each tab and
note "unchanged from default" where that is the case, because a default template
also carries wording that has to be right.

| # | Template | Sent when |
|---|---|---|
| 1 | Confirm signup | A new account is created |
| 2 | Invite user | An invitation is issued from the dashboard |
| 3 | Magic Link | Passwordless sign-in |
| 4 | Change Email Address | An address change is confirmed |
| 5 | Reset Password | A password reset is requested |
| 6 | Reauthentication | A sensitive action needs re-confirmation |

---

## What to look for in every template

Work through all six against this table. Most templates will contain none of
these, and recording "none found" for a template is a real result.

| # | Find | Why it is wrong | Replace with |
|---|---|---|---|
| **A1** | "reviews it before anything is published", "reviewed by the desk", "vetted by the desk", "vetted by Ponte", "in vetting", "our team reviews" | Publication has been automatic since ADR-0013. A person does not see an ordinary submission. | "Ponte structures your submission, shows what will be public and private, and automatically checks it for completeness, quality and risk before publication. Flagged submissions may require additional information or human review." |
| **A2** | "Approved" or "Vetted" as the status of a listing that went live | A machine outcome described as a human one | "Checked" |
| **A3** | "publish" / "published" / "publishing" used about a **Deal Room** | Publish means make publicly visible. A Deal Room is private and stays private. | "activate" / "activated" / "activation" |
| **A4** | "publish" used about a **listing or opportunity** | **CORRECT. Leave it alone.** A listing genuinely becomes public, and it is free. | no change |
| **A5** | "30 active days" | Implies a clock that stops. It never has: the period is wall time from activation. | "30 calendar days" |
| **A6** | "unlimited", "indefinitely", "forever", "always available", "permanent" describing stored drafts, rooms, documents or history | Retention is an undecided parameter. Copy may not commit to a duration the product has not chosen. | Delete the claim. For a free draft room: "Building the room is free. No activation period begins until payment." |
| **A7** | Any expiry or deadline given **without** a date, a time and a timezone, including "3 days left", "expires soon", "your room expires in a week" | A buyer in Hamburg and a seller in Singapore read a bare countdown as two different deadlines | "3 days remaining, until 1 September 2026 at 16:32 CEST". The count may stay; it may not stand alone. |
| **A8** | "guarantee", "fully verified", "comprehensively screened", "all counterparties checked" | Claims a completeness Ponte does not perform | State what was checked, against which source, and when |

### A note on A7 inside an email

An email cannot know the reader's timezone. Do **not** print a bare local time
you cannot compute. Either state the instant in UTC and label it UTC, or link to
the room where the browser renders it in the reader's own zone. An unlabelled
time is the failure this rule exists to prevent.

---

## What to record

For each of the six templates, one line:

```
Template: <name>
Customised, or Supabase default: <which>
Findings: <A1..A8 hit, or "none">
Changed: <what you changed, or "no change needed">
```

Paste that back to me and I will file it in `docs/operations/OPERATIONS_LOG.md`.

---

## What cannot be verified from code, and is therefore not done until you do it

Stated plainly so nothing is assumed:

- **No test in this repository can see these templates.** `promise-vocabulary`
  and `activation-vocabulary` cover `lib/email/templates.ts`, which is the
  transactional system Ponte controls. They cannot reach the Supabase-hosted
  auth emails at all.
- Until this checklist comes back, **the P1-1 and P1-2 corrections are complete
  in the product and unverified in the auth emails.**
