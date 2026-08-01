#!/usr/bin/env node
/**
 * ADR-0023: members choose, they do not type.
 *
 * Fails when a surface where members state facts about their deal adds a bare
 * text input for a field that has a known answer set.
 *
 * ## Why this is a script and not a paragraph
 *
 * The rule had been stated in owner channels for two weeks. It kept coming back
 * because nothing in the build objected: a component treated every commercial
 * term identically and rendered a blank box for Incoterm, Unit and Origin -
 * three vocabularies that were already sitting in this repository.
 *
 * A ratchet, in the shape Constitution section 7 uses for icons: the count that
 * exists today is recorded below, new ones are refused, and the number only ever
 * goes down. Lowering BASELINE when you remove one is part of removing it.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Surfaces where a member states facts about their own deal. */
const SURFACES = [
  "components/products/intake",
  "components/structure",
  "app/[locale]/structure",
  "app/[locale]/deal-rooms/propose",
];

/**
 * Inputs that are legitimately typed, by field name or by purpose.
 *
 * Each is here because it has no answer set, not because writing a list was
 * inconvenient. Adding an entry means arguing that case in the commit.
 */
const TYPED_BY_NATURE = [
  // Free prose the member chooses to write. ADR-0023 permits exactly this.
  /note|comment|clarif|describ|detail|message|purpose|objective/i,
  // Searching a list is choosing from it, not typing a value into a record.
  /search|filter|lookup|query|hssearch/i,
  // Values with no set: numbers, dates, names, references, credentials.
  /quantity|amount|price|number|date|validity|email|name|reference|password|code/i,
];

/**
 * Text inputs that exist today and are not yet choices.
 *
 * This number may go down. It may not go up. When it goes down, change it here
 * in the same commit.
 */
const BASELINE = 1;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(entry) && !/__tests__/.test(full)) out.push(full);
  }
  return out;
}

const findings = [];

for (const surface of SURFACES) {
  for (const file of walk(surface)) {
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, i) => {
      // A text input: an explicit <input>, or a type="text". A <select>, a
      // radio, a checkbox and a button are all choices and are never flagged.
      if (!/<input\b/.test(line)) return;
      if (/type=["'](checkbox|radio|file|hidden|submit|button)["']/.test(line)) return;

      // The surrounding few lines carry the label, aria-label and className
      // that say what this input is for.
      const context = lines.slice(Math.max(0, i - 6), i + 8).join(" ");
      if (TYPED_BY_NATURE.some((pattern) => pattern.test(context))) return;

      findings.push(`${relative(process.cwd(), file)}:${i + 1}`);
    });
  }
}

if (findings.length > BASELINE) {
  console.error(
    `check-member-choice failed: ${findings.length} bare text inputs where members state facts, baseline is ${BASELINE}.\n`,
  );
  for (const finding of findings) console.error(`  ${finding}`);
  console.error(
    "\nADR-0023: a member is never asked to type a value the product already knows.\n" +
      "If the field has an answer set, offer it - see lib/products/term-options.ts.\n" +
      "If it genuinely has none, add the reason to TYPED_BY_NATURE in this script.\n",
  );
  process.exit(1);
}

if (findings.length < BASELINE) {
  console.error(
    `check-member-choice: ${findings.length} bare text inputs, below the baseline of ${BASELINE}.\n` +
      `Lower BASELINE in scripts/check-member-choice.mjs to ${findings.length} so the ratchet holds.\n`,
  );
  process.exit(1);
}

console.log(
  `ok   member choice: ${findings.length} typed inputs where members state facts, at the baseline (ADR-0023)`,
);
