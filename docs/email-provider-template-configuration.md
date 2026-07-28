# Email templates that must be configured in the provider console

**Status:** Manual deployment step. Not applied by any pull request.
**Owner action required:** yes.
**Related:** ADR-0012, `docs/platform/AUTH-EMAIL-SETUP.md`.

Ponte's application-generated email is committed code (`lib/email/`). Supabase
Auth's email is not: Supabase renders its own templates from the dashboard, and
nothing in this repository can change them. They are therefore listed here with
the exact content to paste, so the gap is visible rather than discovered.

Until these are applied, **authentication emails will not match the Ponte
design system.** They will still work; they will look like Supabase defaults.

## Which emails this covers

| Template | Supabase name | Status |
|---|---|---|
| Sign-up confirmation | Confirm signup | Provider-side, not yet applied |
| Magic link | Magic Link | Provider-side, not yet applied |
| Password recovery | Reset Password | Provider-side, not yet applied |
| Email address change | Change Email Address | Provider-side, not yet applied |
| Invitation | Invite user | Provider-side, not yet applied |

Every other Ponte email is application-generated and already uses the shared
shell. See the inventory in the pull request description.

## Constraints Supabase imposes

Three things the application templates do are not possible here.

1. **No plain-text part.** Supabase sends the HTML body only. This is the one
   place where Ponte's "every email has a text alternative" rule cannot be met,
   and it is a provider limitation rather than a decision.
2. **No Reply-To.** Recorded already in `docs/platform/AUTH-EMAIL-SETUP.md` §3.
3. **Provider variables are required.** `{{ .Token }}`, `{{ .ConfirmationURL }}`
   and `{{ .SiteURL }}` must survive verbatim. Removing one breaks sign-in.

## The shell

Paste this into each template, replacing `<!--BODY-->` with the per-template
body below and `<!--PREHEADER-->` with the per-template preheader.

Colours are the approved light Ponte Flow tokens, identical to
`lib/email/tokens.ts`. If those tokens change, this file must be re-derived and
re-pasted; nothing automates that.

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#FCFBF7">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E5DFD2;border-radius:14px;overflow:hidden">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #E5DFD2">
        <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;line-height:1.2;color:#0F0F0E">Ponte Trade</p>
        <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;color:#6E6A61">Cross-border trade, with greater clarity.</p>
      </td></tr>
      <tr><td style="padding:32px">
        <!--BODY-->
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #E5DFD2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6E6A61">
        <p style="margin:0 0 8px">Ponte Trade will never ask you for your password, a payment detail or a verification code by email.</p>
        <p style="margin:0 0 8px">You are receiving this because of activity on your Ponte Trade account.</p>
        <p style="margin:0">Ponte Trade is operated by 1402 Celsius Ltd. <a href="{{ .SiteURL }}" style="color:#6E6A61;text-decoration:underline">ponte.trade</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

The 6-digit code block, used by every template that carries `{{ .Token }}`:

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">
  <tr><td style="padding:16px 24px;background:#F2EFE6;border:1px solid #E5DFD2;border-radius:9px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;letter-spacing:.18em;color:#0F0F0E">{{ .Token }}</td></tr>
</table>
```

The heading and paragraph styles used by every body below:

- `h1`: `margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;line-height:1.25;font-weight:400;color:#0F0F0E`
- `p`: `margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3A3733`

## Per-template content

### Confirm signup

- **Subject:** `Your Ponte Trade verification code`
- **Preheader:** `Enter this code to finish setting up your account.`

```html
<h1 style="...">Confirm your email address.</h1>
<p style="...">Enter this code on the page that asked for it. It expires in one hour.</p>
<!-- code block -->
<p style="...">If you did not create a Ponte Trade account, ignore this email and nothing happens.</p>
```

### Magic Link

- **Subject:** `Your Ponte Trade sign-in code`
- **Preheader:** `Enter this code to sign in.`

```html
<h1 style="...">Sign in to Ponte Trade.</h1>
<p style="...">Enter this code on the page that asked for it. It expires in one hour.</p>
<!-- code block -->
<p style="...">If you did not try to sign in, ignore this email. Your account is unchanged.</p>
```

### Reset Password

- **Subject:** `Reset your Ponte Trade password`
- **Preheader:** `Use this code to set a new password.`

```html
<h1 style="...">Reset your password.</h1>
<p style="...">Enter this code on the password reset page. It expires in one hour.</p>
<!-- code block -->
<p style="...">If you did not ask to reset your password, ignore this email and your password stays as it is.</p>
```

### Change Email Address

- **Subject:** `Confirm your new Ponte Trade email address`
- **Preheader:** `Confirm the change to finish updating your account.`

```html
<h1 style="...">Confirm your new email address.</h1>
<p style="...">Enter this code to move your Ponte Trade account to this address.</p>
<!-- code block -->
<p style="...">If you did not ask to change your email address, contact Ponte immediately: somebody may have access to your account.</p>
```

### Invite user

- **Subject:** `You have been invited to Ponte Trade`
- **Preheader:** `Accept the invitation to set up your account.`

```html
<h1 style="...">You have been invited to Ponte Trade.</h1>
<p style="...">Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">
  <tr><td style="border-radius:5px;background:#0F0F0E">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#FCFBF7;text-decoration:none;border-radius:5px">Accept your invitation</a>
  </td></tr>
</table>
<p style="...">If you were not expecting this, ignore it and no account is created.</p>
```

## How to apply

1. Supabase dashboard → Authentication → Email Templates.
2. For each template: paste the subject, then the shell with its body.
3. Confirm `{{ .Token }}` / `{{ .ConfirmationURL }}` / `{{ .SiteURL }}` survived.
4. Send one test of each to a real inbox and check it on a phone.
5. Record the date applied in `docs/codex/CURRENT-STATE.md`.

Step 4 is not optional. There is no automated test on the far side of the
dashboard, so a broken auth template is discovered by a member who cannot sign
in.
