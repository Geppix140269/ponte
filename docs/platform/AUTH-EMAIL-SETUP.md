# Auth email: Resend SMTP, 6-digit codes, and the E1 template

What Giuseppe pastes into the Supabase dashboard. The code side (the OTP entry
UI, `verifyOtp`, the gate modal) ships separately and is useless without this.

Written 2026-07-22, after live testing found that a newly registered member
confirming their email in a browser that already held a session landed on
`/account` looking at the previous member's account.

## Why this is a bug fix, not a branding job

`login/page.tsx` asks Supabase to send a magic link and sets `emailRedirectTo`
to `/account`. `app/auth/confirm/route.ts` exists to verify a `token_hash`, but
it is only reachable if the Supabase email template points at it, and the
templates are still the Supabase defaults. So the default template sends the
member through Supabase's own `/auth/v1/verify`, which redirects to `/account`
carrying the session in a URL fragment or as a `?code=`.

`/account` is a Server Component. Only `login/page.tsx` and `ListingForm.tsx`
ever instantiate a browser Supabase client, and neither renders there. Nothing
on that page can turn a fragment or a code into a session.

So the confirming member's session was never created at all, and the server
rendered whatever cookie the browser already had. No data crossed accounts
over the wire and RLS was never bypassed, but the member was operating as
somebody else: a listing posted or a credit spent in that state is attributed
to the wrong account.

A 6-digit code removes the whole class of problem. There is no link, no
redirect, no fragment, and no dependence on which browser opened the email.
The code is typed into the page that asked for it, and the session is
established by an explicit call in that page's own context.

## 1. Resend: verify the sending domain

Resend dashboard, Domains, add `ponte.trade` if it is not already verified, and
publish the DKIM, SPF and DMARC records it gives you. `auth@ponte.trade` cannot
send until the domain is verified. It does not need to be a real mailbox to
send, but see the reply-to note in section 3.

## 2. Supabase: custom SMTP

Dashboard, Project Settings, Authentication, SMTP Settings. Enable custom SMTP.

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key, the same `RESEND_API_KEY` already in Netlify |
| Sender email | `auth@ponte.trade` |
| Sender name | `Ponte` |

Then raise **Rate limit for sending emails** on the same screen. Supabase caps
the built-in sender at a handful per hour, which is fine for a project nobody
uses and wrong for a launch. Set it to at least 100 per hour.

## 3. Reply-to: Supabase cannot set it, so forward instead

**Supabase's custom SMTP has no Reply-To field.** It sends `From` and nothing
else. So the requested reply-to of `hello@ponte.trade` cannot be configured in
the dashboard.

Two ways to honour it:

- **Now, and what is recommended:** make `auth@ponte.trade` a forwarding
  address that delivers to `hello@ponte.trade`. A member who replies to a
  login code reaches the desk, which is the actual intent. Costs one DNS or
  mailbox rule and no code.
- **Later:** replace SMTP with a Supabase Auth send-email hook that calls the
  Resend API directly, where `reply_to` is a supported field. That is a real
  piece of work and should not land in launch week.

Until one of those is done, a reply to a Ponte code goes nowhere. Set up the
forward.

## 4. Switch the flow to 6-digit codes

Dashboard, Authentication, Providers, Email.

- **Confirm email**: leave enabled.
- **Email OTP Expiration**: set to `600` seconds. The template says ten
  minutes, so it must be ten minutes.

The switch from link to code is made by the template, not by a setting: a
Supabase email template that contains `{{ .Token }}` delivers a 6-digit code.
One that contains `{{ .ConfirmationURL }}` delivers a link. Section 5 replaces
the templates so they carry the code and no link at all.

Leave **Site URL** as `https://ponte.trade` and keep the existing redirect
allow-list. Nothing in the code flow uses them, but Google OAuth still does.

## 5. The E1 template

Dashboard, Authentication, Email Templates. Paste the HTML below into **Magic
Link** and into **Confirm signup**, and set both subjects to:

    Your Ponte code

Both, because `signInWithOtp` sends Confirm signup to an address it has never
seen and Magic Link to one it has. A member cannot tell the difference and
neither should the email.

### Deliberate deviations from the wireframe, and why

- **The code renders as one letter-spaced block, not six separate boxes.**
  `{{ .Token }}` arrives as a single string and Supabase's template engine
  cannot split it into digits, so six bordered cells are not achievable. The
  block keeps the monospaced, wide-tracked look at a glance.
- **The bridge mark is set as text, not SVG.** Gmail strips inline SVG. The
  wordmark with its lime full stop survives everywhere and carries the brand on
  its own.
- **Tables, not flexbox.** Outlook does not do flexbox.
- **600px wide**, per the UI brief, rather than the 340px of the phone mock.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
  </head>
  <body style="margin:0;padding:0;background:#06070A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06070A;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#0A0C11;border:1px solid #1B2029;border-radius:14px;overflow:hidden;font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif;">

            <tr>
              <td style="padding:16px 24px;border-bottom:1px solid #161A21;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:17px;font-weight:700;color:#EEF1F5;letter-spacing:-0.3px;">ponte<span style="color:#CBFB5E;">.</span></td>
                    <td align="right" style="font-size:11px;color:#8A93A2;">Sign in</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 24px 8px 24px;">
                <div style="font-size:20px;font-weight:700;color:#EEF1F5;letter-spacing:-0.3px;">Your Ponte code</div>
                <div style="font-size:14px;line-height:1.55;color:#8A93A2;margin-top:8px;">Enter this to continue. It expires in 10 minutes.</div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 24px 4px 24px;">
                <div style="border:1px solid #242932;border-radius:12px;background:#11141A;padding:20px 12px;text-align:center;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;color:#EEF1F5;letter-spacing:14px;">{{ .Token }}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 24px 28px 24px;">
                <div style="font-size:12.5px;line-height:1.6;color:#8A93A2;">If you did not ask for this code, ignore this email. Nobody can use it without your inbox.</div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 24px;border-top:1px solid #161A21;">
                <div style="font-size:10.5px;line-height:1.6;color:#6B7280;">1402 Celsius Ltd · UK Reg 12475013 · <a href="mailto:hello@ponte.trade" style="color:#8A93A2;text-decoration:none;">hello@ponte.trade</a></div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

No unsubscribe link, deliberately: a login code is a transactional message a
member asked for seconds earlier, not marketing, and offering to unsubscribe
from your own sign-in is how people lock themselves out. The Deal Sheet (E7) is
the one that needs an unsubscribe, and it is not this template.

## 6. After pasting, check it

Send yourself a code from `/login` and confirm all of:

- [ ] the email arrives from `Ponte <auth@ponte.trade>`, not from Supabase
- [ ] it contains a 6-digit code and **no link**
- [ ] replying reaches `hello@ponte.trade`, which proves the forward in section 3
- [ ] the code is refused after ten minutes
- [ ] it renders dark in Gmail on Android and in Apple Mail, and the code is
      readable in both
- [ ] signing in with a second account, in a browser already signed in as the
      first, ends with the second account on `/account`. That is the bug this
      whole document exists for, so test it deliberately rather than assuming.
