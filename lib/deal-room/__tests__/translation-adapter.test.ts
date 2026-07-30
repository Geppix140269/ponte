// The provider orchestration and the deterministic adapter: every failure and
// ambiguity state, honesty enforcement, glossary preservation, and interpretation
// with source evidence. No network, no private content leaves the process.
//
// Run: npx tsx lib/deal-room/__tests__/translation-adapter.test.ts
//
// ## Why this file exists
//
// A provider failure must never throw out of the loop or leave a dishonest row,
// and the original must stay readable. runTranslation is where that is enforced.
// The deterministic adapter drives each state from a marker in the source text so
// the states are reproducible without a real translator.

import assert from "node:assert/strict";
import { preservesTradeTerms } from "../glossary";
import { assertTranslationTextInvariant, translationHasText } from "../messages";
import { proposalHasEvidence } from "../interpretation";
import {
  ProviderTimeoutError,
  runTranslation,
  type TranslationOutcome,
  type TranslationProvider,
  type TranslationRequest,
} from "../translation/provider";
import {
  DeterministicInterpretationProvider,
  DeterministicTranslationProvider,
} from "../translation/test-adapter";

let passed = 0;
const tests: Array<[string, () => Promise<void> | void]> = [];
function test(name: string, fn: () => Promise<void> | void): void {
  tests.push([name, fn]);
}

const HASH = "b".repeat(64);

function req(sourceText: string, target: "en" | "es" | "ru" | "zh-CN" | "ar" = "es"): TranslationRequest {
  return {
    messageId: "m1",
    subRoomId: "s1",
    sourceText,
    sourceLanguage: "en",
    targetLanguage: target,
    glossaryVersion: "v0-2026-07-30",
  };
}

const adapter = new DeterministicTranslationProvider();

test("a clean source translates to completed with full provenance", async () => {
  const result = await runTranslation(adapter, req("Confirmed 25 MT on FOB."), HASH);
  assert.equal(result.status, "completed");
  assert.ok(result.text && result.text.length > 0);
  assert.ok(result.provenance);
  assert.equal(result.provenance!.sourceSha256, HASH);
  assert.equal(result.provenance!.glossaryVersion, "v0-2026-07-30");
  assert.equal(result.provenance!.provider, "test-adapter");
  assertTranslationTextInvariant(result.status, result.text);
});

test("the deterministic translation preserves coded trade identifiers", async () => {
  const source = "Confirmamos 25 MT en FOB, ref PT-1234, HS 2710.19.";
  const result = await runTranslation(adapter, req(source), HASH);
  assert.equal(result.status, "completed");
  assert.ok(preservesTradeTerms(source, result.text!));
});

test("ambiguous and low_confidence carry text with a caveat", async () => {
  const amb = await runTranslation(adapter, req("Deliver soon [[AMBIGUOUS]]."), HASH);
  assert.equal(amb.status, "ambiguous");
  assert.ok(translationHasText(amb.status));
  assert.ok(amb.text);

  const low = await runTranslation(adapter, req("Roughly 25 MT [[LOW]]."), HASH);
  assert.equal(low.status, "low_confidence");
  assert.ok(low.text);
});

test("failure and source-uncertain leave no text, so nothing masquerades as translated", async () => {
  const fail = await runTranslation(adapter, req("[[FAIL]] anything"), HASH);
  assert.equal(fail.status, "failed");
  assert.equal(fail.text, null);
  assert.equal(fail.provenance, null);

  const uncertain = await runTranslation(adapter, req("[[UNCERTAIN]]"), HASH);
  assert.equal(uncertain.status, "source_uncertain");
  assert.equal(uncertain.text, null);
});

test("an inactive provider yields provider_unavailable and is never called", async () => {
  let called = false;
  const inactive: TranslationProvider = {
    name: "inactive",
    active: false,
    async translate() {
      called = true;
      throw new Error("must not be called");
    },
  };
  const result = await runTranslation(inactive, req("anything"), HASH);
  assert.equal(result.status, "provider_unavailable");
  assert.equal(result.text, null);
  assert.equal(called, false, "an inactive provider must not receive content");
});

test("a timeout maps to provider_unavailable; a generic error maps to failed; the original stays readable", async () => {
  const timeout: TranslationProvider = {
    name: "slow",
    active: true,
    async translate() {
      throw new ProviderTimeoutError("slow", 20_000);
    },
  };
  const broke: TranslationProvider = {
    name: "broken",
    active: true,
    async translate() {
      throw new Error("boom");
    },
  };
  assert.equal((await runTranslation(timeout, req("x"), HASH)).status, "provider_unavailable");
  assert.equal((await runTranslation(broke, req("x"), HASH)).status, "failed");
});

test("a dishonest provider that claims completed with no text is downgraded to failed, not persisted", async () => {
  const dishonest: TranslationProvider = {
    name: "dishonest",
    active: true,
    async translate(): Promise<TranslationOutcome> {
      return { status: "completed", text: null, model: "x", modelVersion: "1", confidence: "high" };
    },
  };
  const result = await runTranslation(dishonest, req("x"), HASH);
  assert.equal(result.status, "failed");
  assert.equal(result.text, null);
});

test("interpretation proposes a quantity fact and cites the message it came from", async () => {
  const interp = new DeterministicInterpretationProvider();
  const outcome = await interp.propose({
    roomId: "r1",
    subRoomId: "s1",
    glossaryVersion: "v0-2026-07-30",
    messages: [{ messageId: "m1", text: "We can supply 25 MT next month.", language: "en" }],
  });
  assert.equal(outcome.proposals.length, 1);
  const proposal = outcome.proposals[0];
  assert.equal(proposal.field, "quantity");
  assert.deepEqual(proposal.proposedValue, { amount: "25", unit: "MT" });
  assert.ok(proposalHasEvidence({ sourceRefs: proposal.sourceRefs }));
  assert.equal(proposal.sourceRefs[0].messageId, "m1");
});

test("two messages with different quantities yield two proposals, one per source, not a merge", async () => {
  const interp = new DeterministicInterpretationProvider();
  const outcome = await interp.propose({
    roomId: "r1",
    subRoomId: "s1",
    glossaryVersion: "v0-2026-07-30",
    messages: [
      { messageId: "m1", text: "We can supply 25 MT.", language: "en" },
      { messageId: "m2", text: "Necesitamos 30 MT.", language: "es" },
    ],
  });
  assert.equal(outcome.proposals.length, 2);
  assert.deepEqual(
    outcome.proposals.map((p) => p.sourceRefs[0].messageId).sort(),
    ["m1", "m2"],
  );
});

(async () => {
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed++;
    } catch (err) {
      console.error(`FAIL  ${name}`);
      console.error(`      ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`ok   deal-room translation adapter: ${passed} assertions passed`);
})();
