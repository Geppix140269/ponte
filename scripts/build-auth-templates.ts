// Generate the pasteable Supabase Auth templates.
//
//   npm run auth:templates          write supabase/templates/
//   npm run auth:templates --check  fail if the committed files are stale
//
// The generated files are COMMITTED. That is deliberate and it is the whole
// mechanism: what a person pastes into the Supabase dashboard is a file, the file
// has a checksum, and `lib/email/__tests__/auth-email.test.ts` fails if the file
// stops matching the generator. Without the committed copy there is nothing to
// compare the dashboard against, and "is production still running the template we
// wrote?" has no answer short of sending yourself an email and reading its source.
//
// The same pattern the repository already uses twice: `messages/en.json` is
// generated from fragments and checked byte-for-byte, and every migration's
// SHA-256 is recorded in `schema_migrations` so the file and the thing that ran
// can be compared.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  authEmail,
  AUTH_SENDER_IDENTITY,
  OPERATIONAL_SENDER_IDENTITY,
  OTP_EXPIRY_MINUTES,
  OTP_EXPIRY_SECONDS,
  SUPABASE_TEMPLATE_NAMES,
  SUPABASE_TOKEN_VARIABLE,
} from "../lib/email/auth-templates";

const DIR = join("supabase", "templates");
const HTML = "auth-otp.html";
const TEXT = "auth-otp.txt";
const README = "README.md";

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

function readme(email: ReturnType<typeof authEmail>): string {
  return `# Supabase Auth email templates

**Generated. Do not edit these files by hand.** Run \`npm run auth:templates\`.

**Applying them is a manual production action.** Nothing in this repository can
write a Supabase dashboard template, so a merged pull request changes what
*should* be in production and does not change what *is*. See
\`docs/email-provider-template-configuration.md\` for the procedure and
\`docs/operations/OPERATIONS_LOG.md\` for whether it has been carried out.

## The one template

| Field | Value |
|---|---|
| File to paste | \`${HTML}\` |
| Supabase templates | ${SUPABASE_TEMPLATE_NAMES.map((n) => `**${n}**`).join(" and ")} |
| Subject, for both | \`${email.subject}\` |
| Required variable | \`${SUPABASE_TOKEN_VARIABLE}\` |
| Must NOT contain | \`{{ .ConfirmationURL }}\` — Ponte sends a code, never a sign-in link |
| Email OTP Expiration | \`${OTP_EXPIRY_SECONDS}\` seconds (${OTP_EXPIRY_MINUTES} minutes), matching the sentence in the email |
| Sender identity (SMTP) | \`${AUTH_SENDER_IDENTITY}\` |
| Open and click tracking | **disabled** on the sending domain |

Both dashboard templates carry the same document and the same subject.
\`signInWithOtp()\` chooses between them on whether Supabase has seen the address
before, which is bookkeeping the member cannot observe and should not be shown.

## Checksums

Compare these against the file before pasting, and record the applied checksum
in the operations log so production and the repository can be compared later.

| File | SHA-256 |
|---|---|
| \`${HTML}\` | \`${sha256(email.html)}\` |
| \`${TEXT}\` | \`${sha256(email.text)}\` |

## \`${TEXT}\`

Reference only. **Supabase sends the HTML part and nothing else**, so this text
is never delivered. It exists so the wording can be reviewed in a diff that is
not a style attribute, and so the one place Ponte cannot honour its
every-email-has-a-text-part rule is visible rather than assumed.

## Not generated here

\`Reset Password\`, \`Change Email Address\` and \`Invite user\` have no Ponte
journey behind them in the launch scope: there is no password, and no invitation
flow. They are left as Supabase defaults deliberately, and are recorded as
deferred in \`docs/email-provider-template-configuration.md\` rather than pasted
and forgotten.

## Operational mail

Application-generated email is committed code (\`lib/email/\`) sent through
Resend as \`${OPERATIONAL_SENDER_IDENTITY}\`. It is not configured in the
Supabase dashboard and nothing in this directory affects it.
`;
}

function main(): void {
  // Pinned before anything is rendered. `appUrl()` reads this at call time, so a
  // developer whose environment points at localhost would otherwise generate a
  // template with localhost links in it and no warning that they had.
  process.env.NEXT_PUBLIC_APP_URL = "https://ponte.trade";

  const check = process.argv.includes("--check");
  const email = authEmail();

  const files: Record<string, string> = {
    [HTML]: email.html,
    [TEXT]: email.text,
    [README]: readme(email),
  };

  if (check) {
    const stale: string[] = [];
    for (const [name, content] of Object.entries(files)) {
      let onDisk: string | null = null;
      try {
        onDisk = readFileSync(join(DIR, name), "utf8");
      } catch {
        stale.push(`${name} (missing)`);
        continue;
      }
      if (onDisk !== content) stale.push(name);
    }
    if (stale.length) {
      console.error(
        `FAIL  ${DIR} is stale: ${stale.join(", ")}\n` +
        `      Run "npm run auth:templates" and commit the result.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`OK    ${DIR} matches the generator (${Object.keys(files).length} files).`);
    return;
  }

  mkdirSync(DIR, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(DIR, name), content, "utf8");
    console.log(`${join(DIR, name)}  ${content.length} bytes  sha256 ${sha256(content).slice(0, 16)}…`);
  }
  console.log(`\nSubject for both templates: ${email.subject}`);
}

main();
