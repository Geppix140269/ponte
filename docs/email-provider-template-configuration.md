# Email that must be configured in the provider console

**Status:** Manual production action. **Not applied by any pull request.**
**Owner action required:** yes.
**Authority:** ADR-0013 (application email), ADR-0017 (authentication and
operational email), `docs/launch/LAUNCH-BLOCKERS.md` `LB-012`.
**Related:** `docs/platform/AUTH-EMAIL-SETUP.md`,
`docs/codex/audits/email/2026-07-30-auth-and-transactional-email.md`.

Ponte's application-generated email is committed code (`lib/email/`). Supabase
Auth's email is not: Supabase renders its own templates from the dashboard, and
nothing in this repository can change them.

**Merging a change to this document changes what SHOULD be in production. It does
not change what is.** Whether any of it has been applied is recorded in
`docs/operations/OPERATIONS_LOG.md` and nowhere else.

## What changed on 30 July 2026, and why

This document previously carried the templates as prose, with each body written
as a FRAGMENT — `<h1 style="...">`, with the real declarations listed separately
further up the page. A person applying it had to reassemble every body by hand,
for every template, and one of the pieces to reassemble was the header's
`padding:24px 32px;border-bottom:1px solid #E5DFD2`.

That declaration has a specific failure mode. Lose the `px;` and it becomes
`padding:24px 32border-bottom:1px solid #E5DFD2`, which is not a syntax error to
any HTML parser: the attribute is still quoted, the tag still closes, the document
still renders. Every email client silently discards the whole declaration it
cannot parse, so the header loses its padding and its rule and the email arrives
looking broken with nothing anywhere reporting a fault.

`padding:24px 32border-bottom` does not appear in this repository at any revision
(`git log --all -S "32border"` is empty, and `lib/email/shell.ts` has carried the
correct form since it was written). A hand-reassembled paste into a dashboard form
is the one place it can come from, and it is the one part of Ponte's email that
had no test on the far side of it.

So the templates are now **generated, committed files** under
`supabase/templates/`, checksummed, and read by the same strict reader
(`lib/email/audit.ts`) that reads the application mail. What you paste is a whole
file. `lib/email/__tests__/auth-email.test.ts` fails if the file stops matching
its generator, and asserts the header declaration by name in both the application
shell and the pasted template.

**Never edit `supabase/templates/*` by hand.** Change
`lib/email/auth-templates.ts` and run `npm run auth:templates`.

## Which emails this covers

| Template | Supabase name | Source | Status |
|---|---|---|---|
| Sign-in / sign-up code | **Confirm signup** and **Magic Link** | `supabase/templates/auth-otp.html` | Generated, committed, **not applied** |
| Password recovery | Reset Password | — | **Deliberately not written.** Ponte has no password |
| Email address change | Change Email Address | — | **Deferred.** No journey in launch scope |
| Invitation | Invite user | — | **Deferred.** No invitation flow in launch scope |

A template pasted for a journey that does not exist is a template nobody will
notice has gone stale. The three deferred ones stay as Supabase defaults, on
purpose, and are recorded in `docs/launch/POST-LAUNCH-BACKLOG.md`.

## One template, both names

`signInWithOtp()` sends **Confirm signup** to an address Supabase has not seen
before and **Magic Link** to one it has. The member did the same thing in both
cases and is waiting for the same code, so both dashboard templates take the same
document and the same subject. Two wordings would mean a member's second sign-in
looked different from their first, for a reason that is about Supabase's
bookkeeping and nothing to do with them.

## A code, never a link

Neither template may contain `{{ .ConfirmationURL }}`. `lib/auth/use-otp.ts`
requests a code with no `emailRedirectTo` and establishes the session with
`verifyOtp` in the surface that asked for it. A link would reopen the redirect
flow that, in July 2026, left a member signing in on a shared browser looking at
the previous member's account — the defect that hook exists to end. The absence
of a link is a security property and it is asserted by test.

## Constraints Supabase imposes

1. **No plain-text part.** Supabase sends the HTML body only. This is the one
   place where Ponte's "every email has a text alternative" rule cannot be met,
   and it is a provider limitation rather than a decision.
   `supabase/templates/auth-otp.txt` is generated anyway so the wording is
   reviewable in a diff that is not a style attribute; it is never delivered.
2. **No Reply-To.** See `docs/platform/AUTH-EMAIL-SETUP.md` §3. The mitigation is
   a forward from `auth@ponte.trade` to `hello@ponte.trade`, recommended on
   22 July 2026, **with no record of it being set up**.
3. **`{{ .Token }}` must survive verbatim.** Removing it breaks sign-in.

## The settings, exactly

Every row is a manual dashboard change. Values come from
`lib/email/auth-templates.ts`, which is the single source for both the sentence in
the email and the value the field must hold.

### Supabase → Authentication → Email Templates

| Template | Subject | Body |
|---|---|---|
| Confirm signup | `Your Ponte Trade sign-in code` | the whole of `supabase/templates/auth-otp.html` |
| Magic Link | `Your Ponte Trade sign-in code` | the same file |

### Supabase → Authentication → Providers → Email

| Field | Value | Why |
|---|---|---|
| Confirm email | enabled | unchanged |
| **Email OTP Expiration** | **`600`** seconds | The email says "expires in 10 minutes". A member told ten minutes and given an hour will not use the extra time; a member told an hour and given ten minutes types a code that has expired and is told it is incorrect |

### Supabase → Project Settings → Authentication → SMTP

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key the site already uses as `RESEND_API_KEY`, read from the hosting dashboard (Vercel since 31 July 2026, Netlify before that) |
| Sender email | `auth@ponte.trade` |
| **Sender name** | **`Ponte Trade`** — not `Ponte` |
| Rate limit for sending emails | at least `100` per hour |

The full identity a recipient sees must be `Ponte Trade <auth@ponte.trade>`.
Operational mail is `Ponte Trade <hello@ponte.trade>`, set in `lib/email/send.ts`
and not configured here.

### Resend → Domains → `ponte.trade`

| Setting | Required state | Why |
|---|---|---|
| Domain verified, DKIM + SPF + DMARC published | **yes** | `auth@ponte.trade` cannot send at all until the domain is verified, and without SPF and DMARC the message goes to spam in Gmail, Yahoo and Outlook regardless of how well the HTML renders |
| **Open tracking** | **disabled** | An open pixel in an email about a credential. Ponte's emails contain no `<img>` at all, so enabling it would insert the only image in the document |
| **Click tracking** | **disabled** | It rewrites every `href` to the provider's domain. That puts a third-party redirector inside a Ponte link, in a message whose whole purpose is to be trustworthy, and it is a documented spam-filter signal |

Tracking is a setting on the **domain**, not a per-send flag, so the repository
cannot switch it off — only prove it asks for nothing. It does: the
`resend.emails.send()` call passes exactly `from`, `to`, `subject`, `html`,
`text`, asserted by test, and every `href` in every document must be an absolute
`https://ponte.trade` URL.

## How to apply

1. Confirm the Resend domain state and the two tracking toggles above.
2. Set the SMTP fields, including **Sender name `Ponte Trade`**.
3. Set **Email OTP Expiration** to `600`.
4. `npm run auth:templates:check` — confirms the committed file matches its
   generator before you copy it.
5. Compare `supabase/templates/auth-otp.html` against the SHA-256 in
   `supabase/templates/README.md`.
6. Paste the subject and the whole file into **Confirm signup**, then into
   **Magic Link**.
7. Confirm `{{ .Token }}` survived, and that `{{ .ConfirmationURL }}` is absent.
8. Set up the `auth@ponte.trade` → `hello@ponte.trade` forward if it does not
   exist.
9. Run the test sends below.
10. Record the date, the applied checksum and the test results in
    `docs/operations/OPERATIONS_LOG.md`, and update `LB-012`.

## The test sends, which are what closes `LB-012`

Steps 1 to 8 are configuration. None of them proves a message arrives. Request a
code from `/login` to a real mailbox in each of **Gmail, Yahoo and Outlook** and
confirm, for each:

- [ ] it arrives **in the inbox, not in spam or promotions**;
- [ ] the sender reads `Ponte Trade <auth@ponte.trade>`, not Supabase and not
      `auth`;
- [ ] the subject is `Your Ponte Trade sign-in code`;
- [ ] the header has visible padding and a hairline rule beneath it. **This is the
      declaration that was fused.** A missing rule or text against the card edge
      means the paste is wrong, not that the design is;
- [ ] there is a six-digit code, and **no link that signs you in**;
- [ ] the code is legible on a phone without pinching;
- [ ] no link in the email points anywhere but `ponte.trade` — a rewritten link
      means click tracking is still on;
- [ ] the code is refused after ten minutes;
- [ ] a reply reaches `hello@ponte.trade`, which proves the forward;
- [ ] signing in as a second account, in a browser already signed in as the
      first, ends with the **second** account on `/account`. That is the bug the
      whole code flow exists for, so test it deliberately.

Also send one operational email — the incomplete-listing notice is the worst case
— and confirm it arrives outside spam from `Ponte Trade <hello@ponte.trade>`.

Nothing on the far side of a dashboard has an automated test. A broken auth
template is otherwise discovered by a member who cannot sign in.
