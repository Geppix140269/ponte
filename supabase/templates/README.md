# Supabase Auth email templates

**Generated. Do not edit these files by hand.** Run `npm run auth:templates`.

**Applying them is a manual production action.** Nothing in this repository can
write a Supabase dashboard template, so a merged pull request changes what
*should* be in production and does not change what *is*. See
`docs/email-provider-template-configuration.md` for the procedure and
`docs/operations/OPERATIONS_LOG.md` for whether it has been carried out.

## The one template

| Field | Value |
|---|---|
| File to paste | `auth-otp.html` |
| Supabase templates | **Confirm signup** and **Magic Link** |
| Subject, for both | `Your Ponte Trade sign-in code` |
| Required variable | `{{ .Token }}` |
| Must NOT contain | `{{ .ConfirmationURL }}` — Ponte sends a code, never a sign-in link |
| Email OTP Expiration | `600` seconds (10 minutes), matching the sentence in the email |
| Sender identity (SMTP) | `Ponte Trade <auth@ponte.trade>` |
| Open and click tracking | **disabled** on the sending domain |

Both dashboard templates carry the same document and the same subject.
`signInWithOtp()` chooses between them on whether Supabase has seen the address
before, which is bookkeeping the member cannot observe and should not be shown.

## Checksums

Compare these against the file before pasting, and record the applied checksum
in the operations log so production and the repository can be compared later.

| File | SHA-256 |
|---|---|
| `auth-otp.html` | `ccb94f7d7c49da5d1e0569d3261c5649841e42ff44f67b2e806c02846e35d749` |
| `auth-otp.txt` | `d3f7c56b005a13ce6bb71d7b2a96a34d333a254baf9ed33a98949d006e0e6d6c` |

## `auth-otp.txt`

Reference only. **Supabase sends the HTML part and nothing else**, so this text
is never delivered. It exists so the wording can be reviewed in a diff that is
not a style attribute, and so the one place Ponte cannot honour its
every-email-has-a-text-part rule is visible rather than assumed.

## Not generated here

`Reset Password`, `Change Email Address` and `Invite user` have no Ponte
journey behind them in the launch scope: there is no password, and no invitation
flow. They are left as Supabase defaults deliberately, and are recorded as
deferred in `docs/email-provider-template-configuration.md` rather than pasted
and forgotten.

## Operational mail

Application-generated email is committed code (`lib/email/`) sent through
Resend as `Ponte Trade <hello@ponte.trade>`. It is not configured in the
Supabase dashboard and nothing in this directory affects it.
