#!/usr/bin/env node
/**
 * `npm run dev:code` - the sign-in code for the local test account.
 *
 * ## Why this exists
 *
 * Ponte authenticates by email OTP and by nothing else. There is no password
 * field anywhere in the product: `DeskLoginForm` sends a six-digit code with
 * `signInWithOtp` and exchanges it with `verifyOtp`.
 *
 * `npm run dev:db` used to print "password ponte-dev-password" as though that
 * were the way in. It never was. The seeded account has a password because
 * `auth.admin.createUser` will take one, and no surface of the product will
 * ever ask for it.
 *
 * The Supabase CLI has no fixed-code option for email - `[auth.email.test_otp]`
 * is rejected as an invalid key, only the SMS one exists - so the code is
 * genuinely emailed, to the local Mailpit on :54324. This reads it from there,
 * which is the difference between a loop somebody can run and a loop that stops
 * to open a mailbox.
 *
 *   npm run dev:code                 the newest code, for any address
 *   npm run dev:code -- someone@x    the newest code sent to that address
 */

const MAILPIT = process.env.PONTE_MAILPIT_URL ?? "http://127.0.0.1:54324";
const wanted = process.argv[2] ?? null;

function die(message, detail) {
  console.error(`\n${message}\n`);
  if (detail) console.error(`${detail}\n`);
  process.exit(1);
}

async function json(path) {
  const response = await fetch(`${MAILPIT}${path}`);
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response.json();
}

/*
  Six digits standing alone.

  Anchored to a word boundary on both sides so a six-digit run inside a longer
  number - a port, a timestamp, an id - cannot be mistaken for the code. The
  templates put the code on its own line, so this is precise rather than lucky.
*/
const CODE = /\b(\d{6})\b/;

async function main() {
  let list;
  try {
    list = await json("/api/v1/messages?limit=25");
  } catch (err) {
    die(
      `No mailbox at ${MAILPIT}.`,
      ["The local stack is not running, or Mailpit is not up.", "", "    npm run dev:db", "", err.message].join("\n"),
    );
  }

  const messages = list.messages ?? [];
  const matching = wanted
    ? messages.filter((m) => (m.To ?? []).some((to) => to.Address?.toLowerCase() === wanted.toLowerCase()))
    : messages;

  if (matching.length === 0) {
    die(
      wanted ? `No email to ${wanted} yet.` : "The local mailbox is empty.",
      "Ask for a code first: open /login, enter the address, submit. Then run this again.",
    );
  }

  // Mailpit returns newest first. The newest code is the only valid one - each
  // request invalidates the last.
  const newest = matching[0];
  const body = await json(`/api/v1/message/${newest.ID}`);
  const found = `${body.Text ?? ""}\n${body.HTML ?? ""}`.match(CODE);

  if (!found) {
    die(
      "The newest email carries no six-digit code.",
      `Subject: ${newest.Subject}\nOpen it at ${MAILPIT} and look.`,
    );
  }

  console.log("");
  console.log(`  to      ${(newest.To ?? []).map((t) => t.Address).join(", ")}`);
  console.log(`  subject ${newest.Subject}`);
  console.log(`  code    ${found[1]}`);
  console.log("");
}

main().catch((err) => die(err.message));
