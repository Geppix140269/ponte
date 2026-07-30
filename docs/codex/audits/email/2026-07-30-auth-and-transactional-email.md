# Authentication and transactional email — audit, 30 July 2026

**Classification:** Launch Blocker `LB-012`, on the repository owner's
instruction of 30 July 2026 that authentication and transactional email be
treated as a launch-blocking workstream.

**Scope of this audit:** the ten points of that instruction. Nothing else.
Findings outside them are recorded in
`docs/launch/POST-LAUNCH-BACKLOG.md` and were not implemented.

---

## 1. The production-deployed commit against `main`

**Not determinable from the repository.** This is a finding, not a gap in the
attempt.

| Source | What it says |
|---|---|
| `gh api repos/Geppix140269/ponte/deployments` | `[]` — Netlify does not write GitHub deployments, so there is no deployment record here |
| `docs/operations/OPERATIONS_LOG.md` | The last deployment mentioned is the 28 July hotfix of `b378ad2`, whose stated next action — "confirm the Netlify deployment of the merge commit succeeds and production is serving" — has no recorded outcome |
| `https://ponte.trade/` | `401` with `WWW-Authenticate: Basic realm="Ponte Trade"`. The site is behind the temporary Basic-auth wall, so the deployed HTML cannot be read and no build identifier can be observed |
| `gh api .../commits/main/check-runs` | `verify` **success**, `Supabase Preview` **failure**, at 2026-07-30T05:48Z on `23637d3` |

So the honest statement is: **`main` is `23637d3`, the working branch is identical
to it, and which commit Netlify is serving is unrecorded and unobservable from
here.** Establishing it needs one of the Netlify dashboard, the deploy log, or the
site password — all three are owner-held.

### What this does and does not permit

It permits one conclusion that matters, because it does not depend on knowing the
deployed commit:

**The malformed CSS in the instruction's point 4 does not exist in this
repository at any revision.**

- `git log --all -S "32border"` — no commit ever added or removed that string.
- `lib/email/shell.ts` has been modified in exactly two commits, `cc438c2` and
  its merge `b378ad2`, and has carried
  `padding:${EMAIL_SPACE.lg}px ${EMAIL_SPACE.xl}px;border-bottom:…` since it was
  written.
- The layout `cc438c2` retired (`lib/email.ts` before that commit) was
  `<div>`-based on `#0F1E3C` and `#E8A020` and contained no
  `padding:24px 32px` declaration at all, fused or otherwise.
- Rendering `wrapDocument()` on the incomplete-listing fixture on `main` produces
  `padding:24px 32px;border-bottom:1px solid #E5DFD2` and two closed header
  paragraphs. Reproduced in section 2.

**The one place in the repository that carried those exact bytes outside the code
was a document a human copies by hand:**
`docs/email-provider-template-configuration.md`, the Supabase Auth template. And
that document carried its per-template bodies as FRAGMENTS — literally
`<h1 style="...">` with the declarations listed separately further up the page —
so a person applying it had to reassemble every body by hand, for every template,
with the header declaration among the pieces.

That is where a fused `padding:24px 32border-bottom` comes from. It is also the
one part of Ponte's email that has never had a test on the far side of it: the
document said so itself — "there is no automated test on the far side of the
dashboard, so a broken auth template is discovered by a member who cannot sign
in."

**This audit therefore treats the provider-side template as the defect surface**
and the application shell as the thing to pin so it stays correct. Both are now
read by the same reader.

---

## 2. Reproducing `wrapDocument()` on the incomplete-listing fixture

The fixture is `listing_needs_information--many-issues` from
`scripts/email-preview.ts`: seven blocking issues, no member name, and a title
long enough to wrap at 390px. It is the worst case in the set and the one a
broken email was reported from.

```
npx tsx lib/email/__tests__/auth-email.test.ts
→ auth-email.test.ts: 25 assertion groups passed.
```

The rendered header, verbatim:

```html
<tr><td style="padding:24px 32px;border-bottom:1px solid #E5DFD2"><p style="margin:0;
font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;line-height:1.2;
font-weight:400;letter-spacing:.01em;color:#0F0F0E">Ponte Trade</p><p style="margin:4px 0 0;
font-family:-apple-system,…;font-size:13px;line-height:1.4;color:#6E6A61">Cross-border
trade, with greater clarity.</p></td></tr>
```

---

## 3. The reader, and what it fails on

`lib/email/audit.ts`. Dependency-free, so it runs inside `npm test` beside the
thing it reads. Three properties, in the order of what they catch:

1. **Tag structure.** Every element that opens is closed, in order. Rawtext
   elements (`<style>`, `<title>`) are skipped as text so a CSS brace is not read
   as markup.
2. **Attributes.** Every attribute has a valid name and a quoted, terminated
   value, no duplicates, and no value containing `<`.
3. **Declarations.** Every declaration in every style attribute — and inside the
   `<style>` block — has one property, a non-empty value, no second colon, and
   **no numeric token wearing something that is not a CSS unit**.

The third check is the one that matters, and it catches the class generically
rather than by matching a known-bad string: `32px` yields the unit `px`;
`32border-bottom` yields the "unit" `border-bottom`, which is not one.

### Proved in both directions

A check that has never failed is a check nobody has reason to believe, so the
suite reintroduces each defect and requires the reader to name it:

| Defect reintroduced | Reader's finding |
|---|---|
| `padding:24px 32px;border-bottom` → `padding:24px 32border-bottom` | `"padding: 24px 32border-bottom:1px solid #E5DFD2" carries the numeric token "32border-bottom:1px", whose unit … is not a CSS unit — two declarations are fused` |
| `>Ponte Trade</p>` → `>Ponte Trade` | `</td> closes out of order: <p> is still open` |
| `style="padding:…` → `style=padding:…` | `<td> attribute "style" has an unquoted value` |

All three assertions fail if the reader is weakened.

---

## 4. The named assertions

Point 4 of the instruction asks for the literals by name, not only for a generic
check that happens to cover them. Both are asserted literally, so a future
loosening of the reader cannot take this case with it unnoticed:

- `padding:24px 32px;border-bottom:1px solid ` **is present** — and so is the
  footer's `padding:24px 32px;border-top:1px solid `;
- `padding:24px 32border-bottom` **is absent**, together with the general form
  `/padding:\s*\d+px\s+\d+[a-z-]{3,}/`;
- the header opens and closes exactly two paragraphs, and both
  `>Ponte Trade</p>` and `>Cross-border trade, with greater clarity.</p>` are
  present;
- `EMAIL_SPACE.lg === 24` and `EMAIL_SPACE.xl === 32`, so the literals in the
  assertion are pinned to the tokens that produce them.

Every one of these is asserted against the **Supabase template** as well as the
application shell.

---

## 5. Rendered evidence

`npm run email:clients:capture` → 12 frames in `evidence/`.

**These are not renders by Gmail, Yahoo or Outlook.** Each is the same document
with that client's documented limitations applied as an explicit transformation.
A real render in each requires delivering a message to a real mailbox in each and
looking at it, which is an owner action and is point 10 of the instruction. It is
outstanding, and `LB-012` stays open until it is done.

| Profile | Transformation, and why |
|---|---|
| Gmail webmail, desktop | None. Gmail webmail honours the `<style>` block, so the media query survives. The most forgiving of the three |
| Gmail app, non-Google account | `<style>` removed. The Gmail apps strip `<head>` for a mailbox that is not a Google account, so there is no media query and no responsive padding. Captured at 390px |
| Yahoo Mail | `<style>` removed, and the preheader left **visible** — Yahoo has historically rewritten `display:none` on a preheader, so if it reads as body copy in this frame it will read that way there |
| Outlook Windows, Word engine | `<style>` removed, `border-radius` and `max-width` dropped, preheader removed via `mso-hide:all`. Square corners and no fluid cap, which is what Word gives |

Three documents through each: the auth template, **the auth template as
Supabase renders it** (with a real six-digit code substituted, because
`{{ .Token }}` is eleven characters and a code is six — a preview of the
placeholder can wrap where the real email does not, or fit where it would not),
and the incomplete-listing email.

**All twelve degraded documents parse clean**, which is the property that matters:
nothing in a Ponte email depends on the stylesheet to be structurally sound. That
is asserted as a test too, not only observed — the suite strips the `<style>`
block and requires the card's ground, border, header padding and body padding to
survive inline.

What the frames show, read: the header padding and rule are present in every one;
the six-digit code is legible and unwrapped at 390px with no media query; the
seven-issue list, the long wrapped title, the status pill, the button and the
disclaimer all hold at 390px; the Outlook frame is square-cornered and legible.

---

## 6 and 7. The Supabase template, and applying it

One template, in `supabase/templates/auth-otp.html`, pasted into **both**
Confirm signup and Magic Link with one subject, `Your Ponte Trade sign-in code`.
Generated by `lib/email/auth-templates.ts` through the same `wrapDocument()`
shell, the same tokens and the same footer as the thirteen application templates.

The change of substance is that it stopped being prose. It is a committed file
with a recorded SHA-256, the test fails if the file stops matching its generator,
and the same reader that audits the application mail audits it. What a person
pastes is a whole file, and "is production still running the template we wrote?"
now has a checkable answer.

**Applying it is a manual production action and has not been carried out.**
Nothing in this repository can write a Supabase dashboard template. Merging this
changes what should be in production, not what is.

Two conflicts in the existing records were resolved rather than left standing:

| Conflict | Resolution |
|---|---|
| `AUTH-EMAIL-SETUP.md` §5's dark template (`#06070A`, `#0A0C11`, lime `#CBFB5E`, Inter, `ponte.` wordmark) against the light Ponte Flow palette | The dark template is **superseded**. Its colours are in no approved token file — the same class of violation as the retired `#0F1E3C`/`#E8A020` that ADR-0013 removed from application email. It was written 22 July 2026, before ADR-0002 made the Constitution binding |
| Ten-minute expiry (`AUTH-EMAIL-SETUP.md` §4) against one hour (`email-provider-template-configuration.md`) | **Ten minutes**, `OTP_EXPIRY_MINUTES` in `lib/email/auth-templates.ts`. It is the only one an instruction was ever written for (§4 says set the field to `600`), and it is the shorter, which is the safer way to be wrong about a credential's lifetime. The email's sentence and the required dashboard value now come from one constant, and the test refuses an email naming two durations |

`Reset Password`, `Change Email Address` and `Invite user` are deliberately not
generated: Ponte has no password and no invitation flow in launch scope, and a
template pasted for a journey that does not exist is one nobody will notice has
gone stale.

---

## 8. Tracking

Open and click tracking must be **off** for authentication and operational mail.
Click tracking rewrites every `href` to the provider's domain, which would put a
third-party host in the middle of a Ponte link, add a redirector to a message
whose whole purpose is to be trustworthy, and — for the auth template — attach
tracking to an email about a credential.

The repository cannot switch it: in Resend it is a setting on the sending domain,
not a per-send flag. What the repository can do, and now does, is prove it asks
for nothing and carries nothing:

- the `resend.emails.send()` call passes exactly `from`, `to`, `subject`, `html`,
  `text` — asserted by reading the source, so an added `trackOpens` fails a test;
- no Ponte email contains an `<img>` at all, so there is no open pixel. The
  wordmark is text, which was already the design;
- every `href` in every document must be an absolute `https://ponte.trade` URL
  with no `utm_`, no redirector and no `resend.dev`.

The dashboard state is a manual production check, recorded with the template
application.

---

## 9. Sender identities

| Mail | Identity | Where it is set |
|---|---|---|
| Authentication | `Ponte Trade <auth@ponte.trade>` | Supabase SMTP settings — manual |
| Operational | `Ponte Trade <hello@ponte.trade>` | `lib/email/send.ts` — **corrected here** |

`lib/email/send.ts` sent the **bare address**
(`RESEND_FROM_EMAIL || "hello@ponte.trade"`), so the recipient's inbox list
showed a sender called `hello`. It now composes `Ponte Trade <…>`, wraps a bare
address supplied by the environment rather than passing it through, and honours a
full identity verbatim if one is deliberately configured. `parseSenderIdentity()`
refuses the six shapes that produced or resemble the defect.

The Supabase side was `Sender name: Ponte`, not `Ponte Trade`. Corrected in
`AUTH-EMAIL-SETUP.md`, and it is a manual dashboard change.

---

## 10. What keeps `LB-012` open

Everything above is repository work. None of it proves a message arrives.

The blocker closes when a fresh test send renders correctly **and lands outside
spam** in Yahoo, Gmail and Outlook, after the template and the SMTP and tracking
settings have been applied. That needs a real send to real mailboxes from the
production sender, and it is the owner's to perform. The checklist is in
`docs/email-provider-template-configuration.md`.

Two things worth knowing before that test, because they will affect its result
and neither is fixed by this work:

- **`auth@ponte.trade` cannot send until `ponte.trade` is verified in Resend with
  DKIM, SPF and DMARC published.** Unverified, or SPF/DMARC absent, the message
  goes to spam in all three regardless of how the HTML renders. Whether those
  records exist is unrecorded in this repository.
- **Supabase's SMTP has no Reply-To.** So a reply to a sign-in code goes nowhere
  unless `auth@ponte.trade` forwards to `hello@ponte.trade`.
  `AUTH-EMAIL-SETUP.md` §3 recommended that forward on 22 July 2026 and there is
  no record of it being set up.

## Files

| File | Change |
|---|---|
| `lib/email/audit.ts` | New. The strict reader |
| `lib/email/auth-templates.ts` | New. The Supabase templates as code |
| `lib/email/__tests__/auth-email.test.ts` | New. 25 assertion groups |
| `supabase/templates/` | New. Generated, committed, checksummed |
| `scripts/build-auth-templates.ts` | New. Generator, with `--check` |
| `scripts/email-client-preview.ts` | New. Client profiles and evidence capture |
| `lib/email/send.ts` | Sender identity |
| `lib/email/shell.ts` | `footerLinks` option, for the not-signed-in reader; and removal of the dead "Notification preferences" footer link (PL-025), keeping Privacy and Terms |
| `lib/email/blocks.ts`, `tokens.ts` | The `code` block and its mono stack |
