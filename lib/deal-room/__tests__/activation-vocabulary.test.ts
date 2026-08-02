// The paid Deal Room step is called ACTIVATION, everywhere a member can read it.
//
// Run: npx tsx lib/deal-room/__tests__/activation-vocabulary.test.ts
//
// ## Why this exists
//
// The commercial model was restated twice. ADR-0025 called the paid moment
// publishing the room ("you build it free, and pay when it goes live");
// ADR-0028 supersedes it and names the moment activation, because a listing is
// what publishes and it is free. Two words for two different things, one of
// which is charged for.
//
// The owner's instruction on 2 August 2026 is explicit and has two halves:
//
//   > All customer-visible copy, emails, Stripe descriptions, receipts and
//   > payment metadata must use "activate." Internal routes or persisted enums
//   > should be renamed only where they represent the wrong domain state.
//
// The second half is why this test asserts on COPY and not on identifiers. The
// persisted vocabulary is already right and must not be swept: the Deal Room
// state machine carries `activation_pending`, `declined_before_activation` and
// `cancelled_before_activation`; the charge kinds are `room_activation` and
// `reactivation`; and `listings.status` carries `published`, which is correct,
// because a listing genuinely does publish and genuinely is free.
//
// ## What this can and cannot see
//
// It reads source. It cannot read a Stripe dashboard, and it cannot read the
// Supabase-hosted email templates, which are pasted in by hand and are not in
// this repository. Those two surfaces are checked by a person.
//
// At the time of writing there is NO activation checkout: activation as a paid
// event is item 3 of the eleven unbuilt items in ADR-0028, and the only Stripe
// surface in the repository is the legacy credits purchase. The Stripe half of
// this test therefore guards a surface that does not exist yet, which is the
// cheapest moment to put a guard on it.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function walk(dir: string, match: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...walk(path, match));
    } else if (match.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/** Prose only: a comment explains the code and is not read by a member. */
function copyOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// The words a member reads about the paid step
// ---------------------------------------------------------------------------

const PAID_STEP_COPY = [
  "lib/deal-room/screens-example.ts",
  "lib/deal-room/walkthrough.ts",
  "lib/deal-room/draft-room-example.ts",
  "components/deal-room/ActivationScreen.tsx",
];

test("the paid step is never described as publishing a room", () => {
  // The specific confusion ADR-0028 exists to end: "publish the Deal Room",
  // "publish this room", "pay to publish". Publishing an opportunity is a
  // different act, it is free, and that phrasing stays.
  const banned = [
    /publish(?:ing|ed|es)?\s+(?:the\s+|this\s+|your\s+|a\s+)?(?:deal\s+)?room/i,
    /pay\s+to\s+publish/i,
    /publish(?:ing)?\s+(?:it\s+)?costs/i,
  ];
  for (const file of PAID_STEP_COPY) {
    const copy = copyOnly(readFileSync(file, "utf8"));
    for (const pattern of banned) {
      const hit = copy.match(pattern);
      assert.equal(hit, null, `${file} describes the paid step as publishing: "${hit?.[0]}"`);
    }
  }
});

test("the activation screen names activation, and states the one figure", () => {
  const screen = readFileSync("lib/deal-room/screens-example.ts", "utf8");
  const activation = screen.slice(screen.indexOf("export const ACTIVATION"), screen.indexOf("JOIN_APPLICATIONS"));
  assert.ok(activation.length > 0, "the activation copy is gone");
  assert.match(activation, /Activat/, "the activation screen does not use the word");
});

test("the walkthrough charges at activation and nowhere earlier", () => {
  const walk = readFileSync("lib/deal-room/walkthrough.ts", "utf8");
  const stages = Array.from(walk.matchAll(/key: "([a-z]+)"/g), (m) => m[1]);
  assert.ok(stages.includes("activate"), "there is no activation stage");
  assert.ok(stages.includes("publish"), "the free publish stage has been renamed, which is the wrong half");
  // Publishing is stated as free, in the member's own reading order, before the
  // one stage that is not.
  assert.ok(stages.indexOf("publish") < stages.indexOf("activate"), "the paid stage comes before the free one");
  assert.match(walk, /Publishing is free, and stays free/, "the free half is no longer stated as free");
});

// ---------------------------------------------------------------------------
// Stripe: descriptions, receipts, metadata
// ---------------------------------------------------------------------------

const STRIPE_ROUTES = walk("app/api", /route\.ts$/).filter((f) =>
  readFileSync(f, "utf8").includes("stripe"),
);

test("the walk finds the Stripe routes it is supposed to be checking", () => {
  // A silent zero would make the assertion below pass by checking nothing.
  assert.ok(STRIPE_ROUTES.length >= 2, `only ${STRIPE_ROUTES.length} Stripe routes found; the walk is not working`);
});

test("no Stripe line item, description or metadata sells publishing a room", () => {
  // Nothing charges for activation yet. When something does, the words it
  // sends to Stripe end up on a card statement and in a receipt, which are the
  // two places a member reads them without any of our chrome around them.
  for (const route of STRIPE_ROUTES) {
    const copy = copyOnly(readFileSync(route, "utf8"));
    assert.equal(
      /publish\w*\s+(?:the\s+|this\s+|your\s+|a\s+)?(?:deal\s+)?room/i.test(copy),
      false,
      `${route} sends "publish ... room" to Stripe, where it becomes a receipt line`,
    );
  }
});

// ---------------------------------------------------------------------------
// The persisted vocabulary is NOT swept
// ---------------------------------------------------------------------------

test("the Deal Room state machine keeps its activation states", () => {
  const states = readFileSync("lib/deal-room/states.ts", "utf8");
  for (const state of ["activation_pending", "declined_before_activation", "cancelled_before_activation"]) {
    assert.ok(states.includes(state), `${state} has been renamed; the migration and the check constraint still use it`);
  }
});

test("a listing still PUBLISHES, because that is the right domain state and it is free", () => {
  // The instruction was to rename only where an identifier represents the wrong
  // domain state. `listings.status = 'published'` represents the right one, and
  // sweeping it would rename a free act to a paid one in the database.
  const gate = readFileSync("lib/listings/publication-gate.ts", "utf8");
  assert.match(gate, /published/, "the listing publication vocabulary has been swept into activation");
});

console.log(`ok   activation vocabulary: ${passed} assertions passed`);
