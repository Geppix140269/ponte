# Email client-compatibility evidence — 30 July 2026

Regenerate with `npm run email:clients:capture`. Fixtures only; no member or
production data reaches these frames.

**These are not renders by Gmail, Yahoo or Outlook.** Each PNG is the same
document with that client's documented limitations applied as an explicit
transformation, captured headless at a fixed viewport so it is reproducible. The
profiles and their basis are in `scripts/email-client-preview.ts`; the reading of
them is in `../2026-07-30-auth-and-transactional-email.md` section 5.

A real render in each of the three requires delivering a message to a real mailbox
and looking at it. That is point 10 of the owner's instruction, it is outstanding,
and `LB-012` stays open until it is done.

## The three documents

| Prefix | What it is |
|---|---|
| `auth-otp--*` | `supabase/templates/auth-otp.html` as committed, with `{{ .Token }}` unsubstituted |
| `auth-otp-as-delivered--*` | The same template as Supabase renders it, with a real six-digit code. **This is the one that shows what a member sees** — `{{ .Token }}` is eleven characters and a code is six |
| `listing-needs-information--*` | The incomplete-listing email on the worst-case fixture: seven blocking issues, no member name, a title long enough to wrap |

## The four profiles

| Suffix | Viewport | Transformation applied |
|---|---|---|
| `gmail-webmail-desktop` | 900 | None. Gmail webmail honours the `<style>` block |
| `gmail-app-non-google-account` | 390 | `<style>` removed. The Gmail apps strip `<head>` for a non-Google mailbox, so there is no media query and no responsive padding |
| `yahoo-mail` | 700 | `<style>` removed, preheader left **visible** — Yahoo has historically rewritten `display:none` on one |
| `outlook-windows-word-engine` | 700 | `<style>` removed, `border-radius` and `max-width` dropped, preheader removed by `mso-hide:all` |

## What the twelve frames establish

- The header's `padding:24px 32px;border-bottom:1px solid #E5DFD2` renders in
  every profile. It is the declaration whose fused form (`padding:24px
  32border-bottom`) prompted this work, and a client silently discards the whole
  declaration when it is fused — so its visible presence is the point.
- The six-digit code is legible, monospaced and **unwrapped at 390px with no
  media query**, which is the measurement that decides whether the code block
  works on a phone in the Gmail app.
- The seven-issue list, the wrapped 130-character title, the status pill, the
  button and the disclaimer all hold at 390px without the stylesheet.
- The Outlook frame is square-cornered and fully legible: nothing depends on a
  rounded corner.
- All twelve parse clean through `lib/email/audit.ts` after their transformation,
  which is asserted as a test and not merely observed here.
