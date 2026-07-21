// Validates every messages/<locale>.json against messages/en.json.
//
//   node scripts/check-messages.mjs
//
// Checks, per locale:
//   1. valid JSON
//   2. exact key parity with English, no missing and no extra keys
//   3. every ICU placeholder in the English value is present in the translation
//   4. every rich-text tag in the English value is present in the translation
//   5. no em dashes anywhere, in any language
//
// Exits non-zero on any failure, so it can gate a build.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const EN = "en";
const LOCALES = ["en", "zh", "es", "ar", "fr", "pt", "ru", "de", "hi", "it"];
const EM_DASH = "—";

function load(locale) {
  const path = join("messages", `${locale}.json`);
  if (!existsSync(path)) return { path, missing: true };
  try {
    return { path, data: JSON.parse(readFileSync(path, "utf8")) };
  } catch (err) {
    return { path, parseError: err.message };
  }
}

// Flatten to { "a.b.c": "value" }
function flatten(node, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, out);
    else out[path] = String(value);
  }
  return out;
}

// ICU argument names. A real argument is {name} or {name, ...}, so the name
// must be followed by a closing brace or a comma. Without that check the
// literal text inside a plural branch, as in `=1 {One file failed.}`, would be
// read as an argument called "One".
function placeholders(text) {
  return new Set(
    [...text.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[},]/g)].map((m) => m[1]),
  );
}

function tags(text) {
  return new Set([...text.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)>/g)].map((m) => m[1]));
}

const base = load(EN);
if (base.missing || base.parseError) {
  console.error(`Cannot read ${base.path}: ${base.parseError ?? "missing"}`);
  process.exit(1);
}
const english = flatten(base.data);
const englishKeys = Object.keys(english);

let failed = false;

for (const locale of LOCALES) {
  const problems = [];
  const file = load(locale);

  if (file.missing) {
    console.error(`FAIL ${locale}: ${file.path} does not exist`);
    failed = true;
    continue;
  }
  if (file.parseError) {
    console.error(`FAIL ${locale}: invalid JSON, ${file.parseError}`);
    failed = true;
    continue;
  }

  const flat = flatten(file.data);
  const keys = new Set(Object.keys(flat));

  const missing = englishKeys.filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !english[k] && !(k in english));
  if (missing.length) problems.push(`${missing.length} missing keys, first: ${missing.slice(0, 3).join(", ")}`);
  if (extra.length) problems.push(`${extra.length} unexpected keys, first: ${extra.slice(0, 3).join(", ")}`);

  let placeholderIssues = 0;
  let tagIssues = 0;
  let emDashes = 0;

  for (const key of englishKeys) {
    const translated = flat[key];
    if (translated === undefined) continue;

    for (const name of placeholders(english[key])) {
      // Plural category words are not arguments.
      if (["plural", "select", "selectordinal"].includes(name)) continue;
      if (!placeholders(translated).has(name)) placeholderIssues++;
    }
    for (const tag of tags(english[key])) {
      if (!tags(translated).has(tag)) tagIssues++;
    }
    if (translated.includes(EM_DASH)) emDashes++;
  }

  if (placeholderIssues) problems.push(`${placeholderIssues} dropped ICU placeholders`);
  if (tagIssues) problems.push(`${tagIssues} dropped rich-text tags`);
  if (emDashes) problems.push(`${emDashes} values contain an em dash`);

  if (problems.length) {
    console.error(`FAIL ${locale}: ${problems.join("; ")}`);
    failed = true;
  } else {
    console.log(`ok   ${locale}: ${englishKeys.length} strings`);
  }
}

if (failed) {
  console.error("\nMessage validation failed.");
  process.exit(1);
}
console.log(`\nAll ${LOCALES.length} locales valid.`);
