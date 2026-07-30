// The Deal Room supported-language contract: the five ADR-0016 languages, the
// English fallback, and right-to-left detection.
//
// Run: npx tsx lib/deal-room/__tests__/language.test.ts
//
// ## Why this file exists
//
// ADR-0016 fixes the initial supported Deal Room languages as en, es, ru,
// zh-CN and ar, requires unsupported or malformed values to fall back to
// English rather than fail, and requires Arabic to be handled right to left.
// It is also explicit that this must NOT reactivate the English-only site
// interface. This file pins all of that: the exact set, the fallback for
// regional variants and junk, the strict validator that a forged language on a
// row must not pass, and the separation from the interface locale list.

import assert from "node:assert/strict";
import { locales as interfaceLocales } from "../../../i18n/routing";
import {
  DEAL_ROOM_LANGUAGES,
  DEFAULT_DEAL_ROOM_LANGUAGE,
  dealRoomLanguageDir,
  isRtlDealRoomLanguage,
  isSupportedDealRoomLanguage,
  resolveDealRoomLanguage,
  type DealRoomLanguage,
} from "../language";

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

test("the supported set is exactly the five ADR-0016 languages, in order", () => {
  assert.deepEqual([...DEAL_ROOM_LANGUAGES], ["en", "es", "ru", "zh-CN", "ar"]);
});

test("English is the canonical default", () => {
  assert.equal(DEFAULT_DEAL_ROOM_LANGUAGE, "en");
  assert.ok(isSupportedDealRoomLanguage(DEFAULT_DEAL_ROOM_LANGUAGE));
});

test("isSupported is strict: only the exact canonical tags pass", () => {
  for (const language of DEAL_ROOM_LANGUAGES) {
    assert.ok(isSupportedDealRoomLanguage(language), `${language} must be supported`);
  }
  // A forged or normalised-looking value must NOT pass the strict validator,
  // which is what a message/translation row check relies on.
  for (const bad of ["zh", "zh-cn", "ZH-CN", "en-US", "EN", "es-ES", "fr", "ja", "", " ", "xx-YY"]) {
    assert.ok(!isSupportedDealRoomLanguage(bad), `${JSON.stringify(bad)} must not pass isSupported`);
  }
  for (const bad of [null, undefined, 5, {}, ["en"]]) {
    assert.ok(!isSupportedDealRoomLanguage(bad), `${JSON.stringify(bad)} must not pass isSupported`);
  }
});

test("resolve returns exact tags unchanged", () => {
  for (const language of DEAL_ROOM_LANGUAGES) {
    assert.equal(resolveDealRoomLanguage(language), language);
  }
});

test("resolve is case-insensitive and normalises the region subtag to zh-CN", () => {
  assert.equal(resolveDealRoomLanguage("zh-cn"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("ZH-CN"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("Zh-Cn"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("EN"), "en");
});

test("resolve maps a regional or scripted variant to its supported base", () => {
  assert.equal(resolveDealRoomLanguage("es-ES"), "es");
  assert.equal(resolveDealRoomLanguage("es-419"), "es");
  assert.equal(resolveDealRoomLanguage("ru-RU"), "ru");
  assert.equal(resolveDealRoomLanguage("ar-SA"), "ar");
  assert.equal(resolveDealRoomLanguage("ar-EG"), "ar");
  assert.equal(resolveDealRoomLanguage("en-GB"), "en");
  // Any Chinese variant resolves to the one supported Chinese tag.
  assert.equal(resolveDealRoomLanguage("zh"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("zh-Hans"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("zh-TW"), "zh-CN");
  assert.equal(resolveDealRoomLanguage("zh_CN"), "zh-CN");
});

test("resolve falls back to English for unsupported, empty, malformed or non-string input", () => {
  for (const candidate of ["ja", "pt", "de", "fr", "hi", "it", "", "   ", "!!!", "123", "-", "x"]) {
    assert.equal(resolveDealRoomLanguage(candidate), "en", `${JSON.stringify(candidate)} must fall back to en`);
  }
  assert.equal(resolveDealRoomLanguage(null), "en");
  assert.equal(resolveDealRoomLanguage(undefined), "en");
});

test("resolve always returns a supported language", () => {
  for (const candidate of ["en", "zh-cn", "es-ES", "ja", "", "garbage", null, undefined]) {
    const resolved = resolveDealRoomLanguage(candidate);
    assert.ok(isSupportedDealRoomLanguage(resolved), `resolve produced unsupported ${resolved}`);
  }
});

test("Arabic is the only right-to-left language; dir maps accordingly", () => {
  assert.ok(isRtlDealRoomLanguage("ar"));
  assert.equal(dealRoomLanguageDir("ar"), "rtl");
  for (const language of DEAL_ROOM_LANGUAGES.filter((l) => l !== "ar") as DealRoomLanguage[]) {
    assert.ok(!isRtlDealRoomLanguage(language), `${language} must be LTR`);
    assert.equal(dealRoomLanguageDir(language), "ltr");
  }
});

test("the Deal Room language set does not reactivate the English-only interface", () => {
  // The interface stays single-locale English. The Deal Room set is broader and
  // is a separate system; asserting this guards against a future edit that wires
  // one into the other.
  assert.deepEqual([...interfaceLocales], ["en"], "interface locales must remain English-only");
  assert.ok(DEAL_ROOM_LANGUAGES.length > interfaceLocales.length);
  assert.ok((DEAL_ROOM_LANGUAGES as readonly string[]).includes("en"));
});

console.log(`ok   deal-room language: ${passed} assertions passed`);
