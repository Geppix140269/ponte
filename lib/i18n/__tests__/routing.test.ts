// Interface-locale routing after the English-first simplification.
//
// Run: npx tsx lib/i18n/__tests__/routing.test.ts
//
// Proves the acceptance points of the localisation-simplification task:
//   - exactly English and Spanish are actively supported;
//   - unsupported / deferred / unknown browser locales fall back to English;
//   - old removed-locale URLs resolve to the canonical English path, never 404;
//   - the language selector data lists only the active locales;
//   - multilingual typed input is classified independently of interface locale.

import assert from "node:assert/strict";
import {
  locales,
  deferredLocales,
  defaultLocale,
  localeNames,
  hreflangFor,
  rtlLocales,
  isRtl,
  resolveLocale,
} from "../../../i18n/routing";
import { removedLocales, stripRemovedLocale } from "../removed-locales";
import { inferIntent } from "../../landing/intent";

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

// --- Active locale set --------------------------------------------------------

test("only English and Spanish are actively supported", () => {
  assert.deepEqual([...locales], ["en", "es"]);
  assert.equal(defaultLocale, "en");
});

test("the language selector data lists exactly the active locales", () => {
  assert.deepEqual(Object.keys(localeNames).sort(), ["en", "es"]);
  assert.deepEqual(Object.keys(hreflangFor).sort(), ["en", "es"]);
  assert.equal(localeNames.en, "English");
  assert.equal(localeNames.es, "Español");
});

test("no active locale is RTL, but the RTL plumbing still answers", () => {
  assert.deepEqual(rtlLocales, []);
  assert.equal(isRtl("ar"), false);
  assert.equal(isRtl("en"), false);
});

test("deferred locales are the eight removed languages and never overlap active", () => {
  assert.deepEqual(
    [...deferredLocales].sort(),
    ["ar", "de", "fr", "hi", "it", "pt", "ru", "zh"],
  );
  for (const d of deferredLocales) {
    assert.ok(!(locales as readonly string[]).includes(d), `${d} must not be active`);
  }
});

// --- Fallback -----------------------------------------------------------------

test("resolveLocale keeps supported locales", () => {
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("es"), "es");
});

test("resolveLocale falls back to English for deferred, unknown and empty input", () => {
  for (const d of deferredLocales) assert.equal(resolveLocale(d), "en");
  assert.equal(resolveLocale("ja"), "en"); // unsupported browser locale
  assert.equal(resolveLocale("es-419"), "en"); // region variant we do not ship
  assert.equal(resolveLocale(undefined), "en");
  assert.equal(resolveLocale(null), "en");
  assert.equal(resolveLocale(""), "en");
});

// --- Removed-locale URL handling ---------------------------------------------

test("removedLocales stays in sync with deferredLocales", () => {
  assert.deepEqual([...removedLocales].sort(), [...deferredLocales].sort());
});

test("a removed-locale URL strips to the canonical English path", () => {
  assert.equal(stripRemovedLocale("/fr/marketplace"), "/marketplace");
  assert.equal(stripRemovedLocale("/zh/find/o/PT-1234"), "/find/o/PT-1234");
  assert.equal(stripRemovedLocale("/de"), "/");
  assert.equal(stripRemovedLocale("/it/"), "/");
  assert.equal(stripRemovedLocale("/ar/marketplace/"), "/marketplace");
});

test("supported and unprefixed paths are left alone (no redirect)", () => {
  assert.equal(stripRemovedLocale("/es/marketplace"), null);
  assert.equal(stripRemovedLocale("/marketplace"), null);
  assert.equal(stripRemovedLocale("/"), null);
  assert.equal(stripRemovedLocale("/en/marketplace"), null); // "en" is not a removed prefix
  // A real path segment that is not a locale is untouched.
  assert.equal(stripRemovedLocale("/interior-design"), null);
});

test("stripping never yields another removed-locale prefix (no redirect loop)", () => {
  for (const loc of removedLocales) {
    const out = stripRemovedLocale(`/${loc}/marketplace`);
    assert.ok(out !== null);
    assert.equal(stripRemovedLocale(out as string), null);
  }
});

// --- Multilingual input is independent of interface locale --------------------

test("typed intent is classified without any interface-locale input", () => {
  // inferIntent takes no locale argument at all: interface language cannot
  // restrict what language a user may type their objective in.
  const es = inferIntent("Necesito estructurar una solicitud de compra de azúcar.");
  assert.equal(es.route, "structure");

  const it = inferIntent("Cerco acquirenti in Germania per il mio olio d'oliva.");
  assert.equal(it.route, "find"); // routed even though Italian is not an interface locale

  // The user's original words are always preserved verbatim.
  assert.equal(es.facts.raw, "Necesito estructurar una solicitud de compra de azúcar.");
});

// --- Runner -------------------------------------------------------------------

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(`     ${(err as Error).message}`);
  }
}
if (failed) {
  console.error(`\n${failed} of ${tests.length} locale routing tests failed.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} locale routing tests passed.`);
