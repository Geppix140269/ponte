// Deal Room billing notices: the five languages, the Arabic bidi guarantee, and
// the two properties that are not about wording - non-disclosure and purity.
//
// Authority: PT-COMMERCIAL-2026-07-31-01 sections 11, 12 and 13, recorded by
// ADR-0020. Stage 7.
//
// Run: npx tsx lib/deal-room/__tests__/billing-notices.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BILLING_NOTICE_KINDS,
  LRI,
  PDI,
  isolateLtr,
  renderBillingNotice,
  renderInEveryLanguage,
  type BillingNoticeKind,
  type BillingNoticeRequest,
  type RenderedNotice,
} from "../billing-notices";
import { DEAL_ROOM_LANGUAGES, type DealRoomLanguage } from "../language";
import {
  ADDITIONAL_BRANCH_PRICE_CENTS,
  BASE_ROOM_PRICE_CENTS,
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  formatUsd,
} from "../pricing";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const ROOM = "PT-DR-4417";

function request(kind: BillingNoticeKind, language: DealRoomLanguage): BillingNoticeRequest {
  switch (kind) {
    case "activation":
      return {
        kind,
        language,
        facts: { roomReference: ROOM, amountCents: BASE_ROOM_PRICE_CENTS, periodEndIso: "2026-08-30" },
      };
    case "additional_branch":
      return {
        kind,
        language,
        facts: {
          roomReference: ROOM,
          amountCents: ADDITIONAL_BRANCH_PRICE_CENTS,
          periodTotalCents: BASE_ROOM_PRICE_CENTS + ADDITIONAL_BRANCH_PRICE_CENTS,
        },
      };
    case "expiry":
      return { kind, language, facts: { roomReference: ROOM, endedOnIso: "2026-08-30" } };
    case "reactivation":
      return {
        kind,
        language,
        facts: { roomReference: ROOM, amountCents: 9400, periodEndIso: "2026-09-29" },
      };
  }
}

function everyNotice(): RenderedNotice[] {
  return BILLING_NOTICE_KINDS.flatMap((kind) =>
    DEAL_ROOM_LANGUAGES.map((language) => renderBillingNotice(request(kind, language))),
  );
}

const label = (n: RenderedNotice) => `${n.kind}/${n.language}`;

/* ------------------------------------------------------------------ *
 * 1. Coverage: four notices, five languages, nothing missing
 * ------------------------------------------------------------------ */

test("four notice kinds exist and match the authority's four period events", () => {
  assert.deepEqual([...BILLING_NOTICE_KINDS], [
    "activation",
    "additional_branch",
    "expiry",
    "reactivation",
  ]);
});

test("every kind renders in every language with a non-empty subject and body", () => {
  const all = everyNotice();
  assert.equal(all.length, 4 * 5, "expected 20 renderings");
  for (const n of all) {
    assert.ok(n.subject.trim().length > 0, `${label(n)} has an empty subject`);
    assert.ok(n.body.trim().length > 20, `${label(n)} has a suspiciously short body`);
  }
});

test("no rendering leaks an unsubstituted placeholder", () => {
  for (const n of everyNotice()) {
    assert.doesNotMatch(n.subject, /\{[a-z]+\}/, `${label(n)} subject`);
    assert.doesNotMatch(n.body, /\{[a-z]+\}/, `${label(n)} body`);
  }
});

test("a missing placeholder value throws rather than rendering a brace", () => {
  // Reaching the throw requires a template referencing a value the kind does not
  // supply. The expiry kind supplies no `amount`, so borrowing its facts for an
  // activation is the honest way to exercise it.
  assert.throws(
    () =>
      renderBillingNotice({
        kind: "activation",
        language: "en",
        // deliberately wrong shape, which is what a future refactor would do by accident
        facts: { roomReference: ROOM, periodEndIso: "2026-08-30" } as never,
      }),
    /cents must be an integer|no value for placeholder/,
  );
});

test("renderInEveryLanguage returns one notice per supported language, in order", () => {
  const all = renderInEveryLanguage({
    kind: "expiry",
    facts: { roomReference: ROOM, endedOnIso: "2026-08-30" },
  } as Omit<BillingNoticeRequest, "language">);
  assert.deepEqual(all.map((n) => n.language), [...DEAL_ROOM_LANGUAGES]);
});

/* ------------------------------------------------------------------ *
 * 2. Money - authority section 13
 * ------------------------------------------------------------------ */

test("every notice that states money spells out USD", () => {
  for (const n of everyNotice()) {
    if (n.kind === "expiry") continue;
    assert.ok(n.body.includes("USD"), `${label(n)} states money without the currency code`);
  }
});

test("the expiry notice states no amount at all, because nothing was charged", () => {
  for (const language of DEAL_ROOM_LANGUAGES) {
    const n = renderBillingNotice(request("expiry", language));
    assert.doesNotMatch(n.body, /\$|USD/, `${label(n)} mentions money`);
    assert.doesNotMatch(n.subject, /\$|USD/, `${label(n)} subject mentions money`);
  }
});

test("a notice states only the amount it was given, never a constant of its own", () => {
  // The engine decides the price. If this module ever hard-codes one, an unusual
  // amount will render alongside a familiar one and this fails.
  for (const language of DEAL_ROOM_LANGUAGES) {
    const n = renderBillingNotice({
      kind: "activation",
      language,
      facts: { roomReference: ROOM, amountCents: 4242, periodEndIso: "2026-08-30" },
    });
    assert.ok(n.body.includes("$42.42 USD"), `${label(n)} lost the given amount`);
    assert.ok(!n.body.includes(formatUsd(BASE_ROOM_PRICE_CENTS)), `${label(n)} invented the base price`);
    assert.ok(
      !n.body.includes(formatUsd(ADDITIONAL_BRANCH_PRICE_CENTS)),
      `${label(n)} invented the branch price`,
    );
  }
});

test("the additional-branch notice names the published maximum, which is a promise not a charge", () => {
  for (const language of DEAL_ROOM_LANGUAGES) {
    const n = renderBillingNotice(request("additional_branch", language));
    assert.ok(
      n.body.includes(formatUsd(MAXIMUM_ROOM_PERIOD_PRICE_CENTS)),
      `${label(n)} omits the period cap`,
    );
  }
});

test("non-integer cents are refused by the formatter rather than rounded silently", () => {
  assert.throws(
    () =>
      renderBillingNotice({
        kind: "activation",
        language: "en",
        facts: { roomReference: ROOM, amountCents: 79.5, periodEndIso: "2026-08-30" },
      }),
    /cents must be an integer/,
  );
});

/* ------------------------------------------------------------------ *
 * 3. Arabic - the bidi guarantee, authority section 13
 * ------------------------------------------------------------------ */

test("direction is rtl for Arabic and ltr for the other four", () => {
  for (const n of everyNotice()) {
    assert.equal(n.dir, n.language === "ar" ? "rtl" : "ltr", label(n));
  }
});

/** Walk a string, returning the isolate depth at each Latin letter. */
function latinLettersOutsideIsolates(text: string): string[] {
  const escaped: string[] = [];
  let depth = 0;
  for (const ch of text) {
    if (ch === LRI) depth++;
    else if (ch === PDI) depth--;
    else if (/[A-Za-z]/.test(ch) && depth === 0) escaped.push(ch);
  }
  return escaped;
}

function isolateDepthBalanced(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === LRI) depth++;
    else if (ch === PDI) depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

test("in Arabic, no Latin letter renders outside a directional isolate", () => {
  // This is the whole of section 13's LTR-preservation requirement, stated as a
  // property rather than as a list of identifiers to remember. It covers the
  // room reference, the amount, the currency code and the company name at once,
  // and it will fail the moment someone adds an un-isolated Latin word.
  for (const kind of BILLING_NOTICE_KINDS) {
    const n = renderBillingNotice(request(kind, "ar"));
    assert.deepEqual(
      latinLettersOutsideIsolates(n.body),
      [],
      `${label(n)} body has bare Latin letters`,
    );
    assert.deepEqual(
      latinLettersOutsideIsolates(n.subject),
      [],
      `${label(n)} subject has bare Latin letters`,
    );
  }
});

test("Arabic isolates are balanced, so no isolate leaks into following content", () => {
  for (const kind of BILLING_NOTICE_KINDS) {
    const n = renderBillingNotice(request(kind, "ar"));
    assert.ok(isolateDepthBalanced(n.body), `${label(n)} body has unbalanced isolates`);
    assert.ok(isolateDepthBalanced(n.subject), `${label(n)} subject has unbalanced isolates`);
  }
});

test("the four non-RTL languages carry no isolate characters, which would be noise", () => {
  for (const n of everyNotice()) {
    if (n.language === "ar") continue;
    assert.ok(!n.body.includes(LRI) && !n.body.includes(PDI), `${label(n)} body is needlessly isolated`);
    assert.ok(
      !n.subject.includes(LRI) && !n.subject.includes(PDI),
      `${label(n)} subject is needlessly isolated`,
    );
  }
});

test("the Arabic amount keeps its dollar sign adjacent to its digits", () => {
  const n = renderBillingNotice(request("activation", "ar"));
  assert.ok(
    n.body.includes(`${LRI}${formatUsd(BASE_ROOM_PRICE_CENTS)}${PDI}`),
    "the amount is not isolated as a single run",
  );
});

test("isolateLtr is idempotent, so two code paths cannot nest isolates", () => {
  const once = isolateLtr("HS 0904.11");
  assert.equal(isolateLtr(once), once);
  assert.equal(once, `${LRI}HS 0904.11${PDI}`);
});

/* ------------------------------------------------------------------ *
 * 4. Translation integrity
 * ------------------------------------------------------------------ */

/** Latin-script runs of two or more letters, which is what English leakage looks like. */
function latinWords(text: string): string[] {
  return text.replace(/[⁦⁩]/g, "").match(/[A-Za-z]{2,}/g) ?? [];
}

test("the non-Latin languages contain no English prose, only the permitted Latin tokens", () => {
  // Russian, Chinese and Arabic are written in their own scripts, so any Latin
  // word in the output is either a deliberate token or an untranslated string
  // that was never noticed. Only the company name, the currency code and the
  // room reference are permitted.
  const allowed = new Set(["Ponte", "USD", "PT", "DR"]);
  for (const kind of BILLING_NOTICE_KINDS) {
    for (const language of ["ru", "zh-CN", "ar"] as const) {
      const n = renderBillingNotice(request(kind, language));
      for (const word of [...latinWords(n.subject), ...latinWords(n.body)]) {
        assert.ok(allowed.has(word), `${label(n)} contains untranslated Latin text: ${word}`);
      }
    }
  }
});

test("Spanish is a translation, not the English string with an accent", () => {
  for (const kind of BILLING_NOTICE_KINDS) {
    const en = renderBillingNotice(request(kind, "en"));
    const es = renderBillingNotice(request(kind, "es"));
    assert.notEqual(es.subject, en.subject, `${kind} subject is identical in both languages`);
    assert.notEqual(es.body, en.body, `${kind} body is identical in both languages`);
  }
});

test("every language states the room reference and, where relevant, the date", () => {
  for (const n of everyNotice()) {
    const text = `${n.subject} ${n.body}`;
    assert.ok(text.includes(ROOM), `${label(n)} never names the room`);
    if (n.kind !== "additional_branch") {
      assert.match(text, /\d{4}-\d{2}-\d{2}/, `${label(n)} never states the period date`);
    }
  }
});

/* ------------------------------------------------------------------ *
 * 5. Non-disclosure and the prohibited commercial model
 * ------------------------------------------------------------------ */

test("no notice can disclose a branch identity or a branch count, because no field carries one", () => {
  // Section 10's non-disclosure rule, enforced by the shape of the input rather
  // than by wording. If a future change adds such a field this fails, which is
  // the point at which somebody has to justify it.
  const source = readFileSync(join(process.cwd(), "lib/deal-room/billing-notices.ts"), "utf8");
  const factsBlock = source.slice(source.indexOf("interface RoomFacts"), source.indexOf("export type BillingNoticeRequest"));
  for (const forbidden of [
    "branchReference",
    "branchId",
    "subRoomId",
    "subRoomRef",
    "counterpartyName",
    "counterpartyId",
    "branchCount",
    "activeBranches",
    "participantName",
  ]) {
    assert.ok(!factsBlock.includes(forbidden), `a notice fact type carries ${forbidden}`);
  }
});

test("no notice offers a retired monetisation model", () => {
  // Authority section 15. English appears in every language's output only as a
  // permitted token, so scanning all twenty renderings catches a regression in
  // any of them.
  const retired = [
    "subscription",
    "plan",
    "credits",
    "credit pack",
    "commission",
    "success fee",
    "retainer",
    "membership",
    "starter",
    "portfolio",
  ];
  for (const n of everyNotice()) {
    const text = `${n.subject} ${n.body}`.toLowerCase();
    for (const word of retired) {
      assert.ok(!text.includes(word), `${label(n)} offers a retired model: ${word}`);
    }
  }
});

test("both paid-period notices promise no automatic renewal, in every language", () => {
  // Section 12 forbids silent auto-renewal. The promise is worth least when it is
  // only made in English.
  for (const kind of ["activation", "reactivation"] as const) {
    for (const language of DEAL_ROOM_LANGUAGES) {
      const n = renderBillingNotice(request(kind, language));
      const said = {
        en: "never renews",
        es: "nunca renueva",
        ru: "никогда не продлевает",
        "zh-CN": "绝不会自动续期",
        ar: "لا تجدّد",
      }[language];
      assert.ok(n.body.includes(said), `${label(n)} omits the no-auto-renewal promise`);
    }
  }
});

test("the reactivation notice says it is a new period, not an extension", () => {
  // A member who reads "renewed" expects the previous period's terms. Section 12
  // says it is a new period priced afresh, so each language has to say so.
  const said = {
    en: "new 30-day period",
    es: "nuevo periodo de 30 días",
    ru: "новый 30-дневный период",
    "zh-CN": "新的 30 天周期",
    ar: "فترة جديدة",
  };
  for (const language of DEAL_ROOM_LANGUAGES) {
    const n = renderBillingNotice(request("reactivation", language));
    assert.ok(n.body.includes(said[language]), `${label(n)} does not call it a new period`);
  }
});

/* ------------------------------------------------------------------ *
 * 6. Input validation
 * ------------------------------------------------------------------ */

test("a non-ISO date is refused, because a period boundary is a contractual fact", () => {
  for (const bad of ["30/08/2026", "2026-8-30", "August 30 2026", ""]) {
    assert.throws(
      () =>
        renderBillingNotice({
          kind: "expiry",
          language: "en",
          facts: { roomReference: ROOM, endedOnIso: bad },
        }),
      /ISO YYYY-MM-DD/,
      `accepted ${JSON.stringify(bad)}`,
    );
  }
});

test("an empty room reference is refused rather than rendering a gap", () => {
  assert.throws(
    () =>
      renderBillingNotice({
        kind: "expiry",
        language: "en",
        facts: { roomReference: "   ", endedOnIso: "2026-08-30" },
      }),
    /roomReference must not be empty/,
  );
});

test("an unsupported language is refused rather than silently falling back to English", () => {
  // `resolveDealRoomLanguage` exists for incoming preferences. A notice is sent
  // against a stored, already-validated language, so a bad value here means a
  // caller bug, and quietly sending English would hide it.
  assert.throws(
    () =>
      renderBillingNotice({
        kind: "expiry",
        language: "fr" as DealRoomLanguage,
        facts: { roomReference: ROOM, endedOnIso: "2026-08-30" },
      }),
    /unsupported Deal Room language/,
  );
});

/* ------------------------------------------------------------------ *
 * 7. Purity and the stage boundary
 * ------------------------------------------------------------------ */

test("rendering is pure: the same request twice gives the same bytes", () => {
  for (const kind of BILLING_NOTICE_KINDS) {
    const a = renderBillingNotice(request(kind, "ar"));
    const b = renderBillingNotice(request(kind, "ar"));
    assert.deepEqual(a, b, `${kind} is not deterministic`);
  }
});

test("the module reads no clock, no environment and no provider", () => {
  const source = readFileSync(join(process.cwd(), "lib/deal-room/billing-notices.ts"), "utf8");
  for (const forbidden of ["Date.now", "new Date", "process.env", "fetch(", "supabase", "stripe"]) {
    assert.ok(!source.includes(forbidden), `billing-notices.ts references ${forbidden}`);
  }
});

function importersUnder(dir: string): string[] {
  try {
    const out = execSync(`git grep -l "deal-room/billing-notices" -- ${dir}`, {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return out.split("\n").filter(Boolean);
  } catch {
    return []; // git grep exits 1 when it finds nothing, which is the pass.
  }
}

test("nothing is wired to this module yet, which is the Stage 7 boundary", () => {
  // Stage 7 delivers the notices and their proof. Sending them is Stage 4b's
  // webhook and belongs behind the Stripe owner gates, so a caller appearing
  // here without one is a scope breach rather than progress.
  const callers = ["app", "components"].flatMap(importersUnder);
  assert.deepEqual(callers, [], `nothing may import deal-room/billing-notices yet, found: ${callers}`);
});

console.log(`ok   deal-room billing notices: ${passed} assertions passed`);
