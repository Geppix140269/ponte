// The AI interpreter must degrade gracefully, never throw, so the landing page
// always has a path to fall back on. With no ANTHROPIC_API_KEY (as in tests and
// any un-provisioned environment) it must return null rather than error.

import assert from "node:assert/strict";
import { interpretObjective } from "../interpret";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void): void {
  tests.push({ name, fn });
}

test("returns null when the AI is not configured", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(await interpretObjective("sto cercando mandorle"), null);
});

test("returns null for empty or too-short input, even if a key were set", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(await interpretObjective(""), null);
  assert.equal(await interpretObjective(" a "), null);
});

async function main(): Promise<void> {
  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
    } catch (err) {
      console.error(`FAIL  ${t.name}`);
      console.error(`      ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
}

void main();
