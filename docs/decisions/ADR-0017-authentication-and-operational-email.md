# ADR-0017 — Authentication and operational transactional email

**Status:** Accepted
**Date:** 30 July 2026
**Owner:** Giuseppe Funaro
**Supersedes, within its scope:** section 5 of
`docs/platform/AUTH-EMAIL-SETUP.md` (the dark E1 authentication template), and
the provider-side template content of
`docs/email-provider-template-configuration.md` as it stood before this date.
**Extends, and does not alter:** ADR-0013, which governs the thirteen
application-generated templates and the one shell they render through.

## Context

ADR-0013 unified application email: one shell, one token source, HTML and plain
text for every message, and the retired `#0F1E3C`/`#E8A020` palette gone. It
covered "all application-generated email" and stopped precisely there.

Three things sit outside it, and all three reach a member before anything ADR-0013
governs does.

**1. The authentication email is not application-generated.** Supabase renders it
from a template in its dashboard. Nothing in this repository can write it, so it
reached production by a person copying HTML out of a document into a web form.
`docs/email-provider-template-configuration.md` carried the bodies as FRAGMENTS —
`<h1 style="...">`, with the real declarations listed separately further up the
page — so applying it meant reassembling every body by hand.

One of the pieces to reassemble is the header's
`padding:24px 32px;border-bottom:1px solid #E5DFD2`. Lose the `px;` and it becomes
`padding:24px 32border-bottom:1px solid #E5DFD2`, which no HTML parser rejects:
the attribute is quoted, the tag closes, the document renders. Clients silently
discard a declaration they cannot parse, so the header loses its padding and its
rule and the email arrives broken with nothing reporting a fault. A build passes.
A type check passes. Every existing email test passes, because they assert what
the email *says*.

That string exists nowhere in this repository at any revision. A hand-reassembled
paste is the only place it can come from, and the document admitted the gap in its
own last line: "there is no automated test on the far side of the dashboard, so a
broken auth template is discovered by a member who cannot sign in."

**2. Two records disagreed about the authentication email.**
`AUTH-EMAIL-SETUP.md` §5 (22 July 2026) specified a dark template on `#06070A`,
`#0A0C11` and lime `#CBFB5E` in Inter. `email-provider-template-configuration.md`
(28 July) specified the light Ponte Flow palette. They also disagreed on the code's
lifetime — ten minutes against one hour — and on the sender name, `Ponte` against
`Ponte Trade`. A member's first Ponte email was specified twice, differently.

**3. The operational sender was a bare address.** `lib/email/send.ts` sent from
`RESEND_FROM_EMAIL || "hello@ponte.trade"` with no display name, so the recipient's
inbox list showed a sender called `hello`.

The repository owner classified authentication and transactional email as a
launch-blocking workstream on 30 July 2026 (`LB-012`).

## Decision

**1. The authentication template is generated, committed and checksummed.**
`lib/email/auth-templates.ts` builds it through the same `wrapDocument()` shell,
the same tokens and the same footer as the thirteen application templates.
`npm run auth:templates` writes `supabase/templates/`. The committed files are the
artefact a person pastes; `lib/email/__tests__/auth-email.test.ts` fails if they
stop matching the generator, and `supabase/templates/README.md` records their
SHA-256 so what is in the dashboard can be compared with what the repository holds.

This is the pattern the repository already uses twice — `messages/en.json`
generated from fragments and checked byte-for-byte, and every migration's SHA-256
recorded in `schema_migrations`.

**2. Generated email is read as a document, not only as content.**
`lib/email/audit.ts` is a dependency-free strict reader over every generated email
and the committed templates: tag structure, attribute well-formedness, and — the
check that exists for the defect above — every declaration having one property, a
non-empty value, no second colon, and no numeric token wearing something that is
not a CSS unit. `32px` yields `px`; `32border-bottom` yields `border-bottom`,
which is not a unit. The suite reintroduces the fusion, a dropped closing tag and
a lost attribute quote, and requires the reader to name each.

Dependency-free deliberately: a validator that needs a DOM library cannot run
inside `npm test` beside the thing it validates, and the point is that it runs
every time.

**3. One authentication template serves both Supabase names, with one subject.**
`Your Ponte Trade sign-in code`, pasted into Confirm signup and into Magic Link.
`signInWithOtp()` chooses between them on whether Supabase has seen the address
before, which is bookkeeping a member cannot observe and should not be shown.

**4. The light Ponte Flow palette. The dark E1 template is superseded.** Its
colours are in no approved token file, which is the same violation ADR-0013
removed from application email. It was designed before ADR-0002 made the
Constitution binding. Its non-colour reasoning is kept: text wordmark rather than
SVG, tables rather than flexbox, 600px, one letter-spaced code block, no
unsubscribe link on a sign-in code.

**5. A code, never a link.** No authentication template may contain
`{{ .ConfirmationURL }}`. A link reopens the redirect flow that put one member on
another member's account in July 2026, which is why `lib/auth/use-otp.ts` exists.
This is a security property and it is asserted.

**6. Ten minutes, from one constant.** `OTP_EXPIRY_MINUTES` in
`lib/email/auth-templates.ts` produces both the sentence in the email and the
`600` the dashboard field must hold. Ten rather than sixty because it is the only
value an instruction was ever written for, and because it is the shorter — the
safer way to be wrong about a credential's lifetime. The suite refuses an email
naming two durations.

**7. Sender identities are always `Ponte Trade <address>`.**
`Ponte Trade <auth@ponte.trade>` for authentication, set in Supabase's SMTP
settings; `Ponte Trade <hello@ponte.trade>` for operational mail, set in
`lib/email/send.ts`. `RESEND_FROM_EMAIL` may still override, and a bare address
supplied there is wrapped in the brand name rather than passed through, so a
configuration that forgets the display name cannot reintroduce the defect.

**8. Open and click tracking are disabled for authentication and operational
mail.** Click tracking rewrites every `href` to the provider's domain, putting a
third-party redirector inside a Ponte link in a message whose purpose is to be
trustworthy, and it is a documented spam-filter signal. An open pixel in an email
about a credential is worse.

Resend sets both on the sending **domain**, not per send, so the repository cannot
switch them off. It proves it asks for nothing and carries nothing: the
`resend.emails.send()` call passes exactly `from`, `to`, `subject`, `html`,
`text`, asserted by reading the source; no Ponte email contains an `<img>` at all;
and every `href` must be an absolute `https://ponte.trade` URL with no `utm_`, no
redirector and no `resend.dev`. The dashboard state is a manual production check.

**9. Applying any of it to production is a manual owner action, recorded as
such.** Merging this changes what should be in production and not what is. The
procedure and the closing checklist are in
`docs/email-provider-template-configuration.md`; the outcome belongs in
`docs/operations/OPERATIONS_LOG.md`.

**10. Only templates with a Ponte journey behind them are written.** Reset
Password, Change Email Address and Invite user stay as Supabase defaults: there is
no password and no invitation flow in launch scope, and a template pasted for a
journey that does not exist is one nobody will notice has gone stale.

## Consequences

- A malformed authentication template is now caught by `npm test` rather than by a
  member who cannot sign in — for the file. Whether the **dashboard** still holds
  that file is answerable by checksum but is not automatic, and cannot be: there
  is no API in this repository's reach that reads a Supabase email template.
- Client-compatibility evidence is reproducible (`npm run email:clients:capture`,
  twelve committed frames) and is explicitly **not** a render by Gmail, Yahoo or
  Outlook. Those require delivery to a real mailbox in each. `LB-012` stays open
  until they render correctly and arrive outside spam.
- `wrapDocument()` gains one option, `footerLinks`. Authentication mail passes
  `none`: a reader of a sign-in code is by definition not signed in, and
  "Notification preferences" behind the account wall is a link that cannot work at
  the moment they see it. The thirteen application templates are unchanged.
- `blocks.ts` gains a `code` block and `tokens.ts` a monospaced stack. A one-time
  code needs equal-width digits and tracking, which is not a paragraph's job, and
  a template still cannot choose its own styling.
- Two deliverability preconditions are named and are **not** satisfied by this
  work: `ponte.trade` verified in Resend with DKIM, SPF and DMARC published, and
  the `auth@ponte.trade` → `hello@ponte.trade` forward recommended on 22 July
  2026. Without the DNS records the message goes to spam in all three clients
  regardless of how the HTML renders.

## Alternatives considered

**Keep the templates as prose and add a review step.** Rejected. The failure is a
lost character in a hand copy, and a second pair of eyes on a 60-line style
attribute does not find one. The generated file plus a checksum converts a
judgement into a comparison.

**Use a Supabase Auth send-email hook calling the Resend API directly.** It would
give a Reply-To and a plain-text part, both of which SMTP denies. Rejected for
launch: `AUTH-EMAIL-SETUP.md` §3 already assessed it as real work that should not
land in launch week, and it is recorded in the post-launch backlog. It does not
change any decision above.

**Parse with a DOM library.** Rejected: it would move the validator out of
`npm test`, and none of the three checks needs one.
