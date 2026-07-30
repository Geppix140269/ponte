// Deterministic source-language detection and preference resolution.
//
// Run: npx tsx lib/deal-room/__tests__/language-detection.test.ts
//
// ## Why this file exists
//
// The message domain must record a source language and an honest confidence. A
// wrong-but-confident guess is worse than an honest "uncertain", because the UI
// promises a state it cannot back. This pins the script-based detection, the
// conservative Latin handling, and the declared-wins-over-detected rule.

import assert from "node:assert/strict";
import {
  detectSourceLanguage,
  establishSourceLanguage,
  resolvePreferredLanguage,
} from "../language-detection";
import { isSupportedDealRoomLanguage } from "../language";

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

test("empty or whitespace input is uncertain with no language", () => {
  assert.deepEqual(detectSourceLanguage(""), { language: null, confidence: "uncertain" });
  assert.deepEqual(detectSourceLanguage("   "), { language: null, confidence: "uncertain" });
});

test("Arabic script is detected as ar", () => {
  const d = detectSourceLanguage("نؤكد الكمية 25 MT على أساس FOB");
  assert.equal(d.language, "ar");
  assert.equal(d.confidence, "detected");
});

test("Cyrillic script is detected as ru", () => {
  const d = detectSourceLanguage("Подтверждаем количество 25 MT на условиях FOB");
  assert.equal(d.language, "ru");
  assert.equal(d.confidence, "detected");
});

test("Han script is detected as zh-CN", () => {
  const d = detectSourceLanguage("确认数量 25 MT，按 FOB 条款");
  assert.equal(d.language, "zh-CN");
  assert.equal(d.confidence, "detected");
});

test("the dominant script wins over a stray Latin trade code", () => {
  // Mostly Arabic with Latin codes FOB and 25 MT embedded.
  const d = detectSourceLanguage("نؤكد التسليم في ميناء روتردام بكمية 25 MT وبشرط FOB والسعر USD 1,200");
  assert.equal(d.language, "ar");
});

test("Spanish markers are detected as es", () => {
  assert.equal(detectSourceLanguage("Confirmamos el envío de 25 MT en FOB").language, "es");
  assert.equal(detectSourceLanguage("La cantidad es 25 MT").confidence, "detected");
  assert.equal(detectSourceLanguage("¿Cuál es el precio?").language, "es");
});

test("clear English is detected as en", () => {
  const d = detectSourceLanguage("Please confirm the delivery quantity and price");
  assert.equal(d.language, "en");
  assert.equal(d.confidence, "detected");
});

test("ambiguous Latin defaults to English but is honestly uncertain", () => {
  const d = detectSourceLanguage("25 MT FOB Rotterdam PT-1234");
  assert.equal(d.language, "en");
  assert.equal(d.confidence, "uncertain");
});

test("detection always returns a supported language or null", () => {
  for (const text of ["", "hello", "25 MT", "نؤكد", "Подтверждаем", "确认", "Confirmamos el envío"]) {
    const d = detectSourceLanguage(text);
    assert.ok(d.language === null || isSupportedDealRoomLanguage(d.language), `bad language for ${JSON.stringify(text)}`);
  }
});

test("preference resolution falls back to English for malformed values", () => {
  assert.equal(resolvePreferredLanguage("zh-cn"), "zh-CN");
  assert.equal(resolvePreferredLanguage("es-ES"), "es");
  assert.equal(resolvePreferredLanguage("ja"), "en");
  assert.equal(resolvePreferredLanguage(null), "en");
  assert.equal(resolvePreferredLanguage("garbage"), "en");
});

test("a declared language wins and is recorded as declared, resolved safely", () => {
  const r = establishSourceLanguage("zh-cn", "Please confirm delivery");
  assert.equal(r.language, "zh-CN");
  assert.equal(r.confidence, "declared");
  // An unsupported declared value resolves to English but is still 'declared'.
  const r2 = establishSourceLanguage("ja", "some text");
  assert.equal(r2.language, "en");
  assert.equal(r2.confidence, "declared");
});

test("with no declaration, source language falls back to detection", () => {
  const r = establishSourceLanguage(null, "Confirmamos el envío de 25 MT");
  assert.equal(r.language, "es");
  assert.equal(r.confidence, "detected");
  const r2 = establishSourceLanguage("  ", "Подтверждаем количество");
  assert.equal(r2.language, "ru");
  assert.equal(r2.confidence, "detected");
});

console.log(`ok   deal-room language detection: ${passed} assertions passed`);
