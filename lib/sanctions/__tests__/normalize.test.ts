// Unit tests for the sanctions name normaliser.
//
// Plain node:test, no test framework dependency. Run it with:
//   node --test --experimental-strip-types lib/sanctions/__tests__/normalize.test.ts
//
// What these tests are actually protecting. normalizeName decides which names
// meet in the database, and trigram similarity decides which of them clear the
// 0.4 candidate threshold and the 0.85 strong threshold. Both thresholds are
// asserted here against trigramSimilarity, which mirrors pg_trgm, so a change
// to the fold that would quietly stop surfacing a real hit fails here first
// rather than in production on a subject nobody re-screens.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LEADING_LEGAL_FORMS,
  LEGAL_SUFFIXES,
  LEGAL_SUFFIX_SPELLINGS,
  LEGAL_SUFFIX_TOKENS,
  bestVariantSimilarity,
  nameVariants,
  normalizeName,
  trigramSimilarity,
} from "../normalize.ts";

/** Mirrors CANDIDATE_THRESHOLD and STRONG_THRESHOLD in screen.ts. */
const CANDIDATE_THRESHOLD = 0.4;
const STRONG_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Legal suffixes
// ---------------------------------------------------------------------------

test("legal suffix variants normalize to the same name", () => {
  const forms = ["Acme Ltd", "ACME LIMITED", "Acme, Ltd.", "  acme   ltd.  "];
  for (const form of forms) {
    assert.equal(normalizeName(form), "acme", `unexpected fold for ${form}`);
  }
});

test("the punctuated and unpunctuated spellings of a legal form agree", () => {
  const pairs: [string, string][] = [
    ["Fabbrica Italiana S.p.A.", "Fabbrica Italiana SPA"],
    ["Iberia Comercial S.A.", "Iberia Comercial SA"],
    ["Milano Servizi S.r.l.", "Milano Servizi SRL"],
    ["Warsaw Handel Sp. z o.o.", "Warsaw Handel Sp z oo"],
    ["Hamburg Handel GmbH", "hamburg handel gmbh"],
  ];
  for (const [a, b] of pairs) {
    assert.equal(normalizeName(a), normalizeName(b), `${a} vs ${b}`);
  }
});

test("a company that differs only by legal form is a strong match", () => {
  const score = trigramSimilarity(
    normalizeName("Anglo-Caribbean Co., Ltd."),
    normalizeName("Anglo Caribbean"),
  );
  assert.ok(
    score >= STRONG_THRESHOLD,
    `expected a strong match, got ${score.toFixed(3)}`,
  );
});

test("suffixes are stripped as whole words only", () => {
  // "grouper", "incorporated into", "limitless" all contain a suffix as a
  // substring. None of them may lose it.
  assert.equal(normalizeName("Grouper Seafood"), "grouper seafood");
  assert.equal(normalizeName("Limitless Energy"), "limitless energy");
  assert.equal(normalizeName("Incognito Shipping"), "incognito shipping");
  assert.equal(normalizeName("Cooperativa Agricola"), "cooperativa agricola");
});

test("a suffix that is part of the real name survives", () => {
  // The "Group 4" case. "group" is a legal form word, but here it is the name.
  assert.equal(normalizeName("Group 4"), "group 4");
  assert.equal(normalizeName("Group 4 Securicor Ltd"), "group 4 securicor");
  // Nothing may normalize away to nothing.
  assert.equal(normalizeName("Holdings"), "holdings");
  assert.equal(normalizeName("International"), "international");
  assert.equal(normalizeName("Ltd"), "ltd");
  // A suffix word that leads is not a suffix.
  assert.equal(normalizeName("Trading Places Advisory"), "trading places advisory");
});

test("leading legal forms are stripped, so OOO Rosneft meets Rosneft", () => {
  assert.equal(normalizeName("OOO Rosneft"), "rosneft");
  assert.equal(normalizeName("ZAO Severstal"), "severstal");
  assert.ok(
    trigramSimilarity(
      normalizeName("OOO Rosneft"),
      normalizeName("Rosneft Oil Company"),
    ) >= CANDIDATE_THRESHOLD,
  );
});

test("the suffix list is exported in a usable shape", () => {
  assert.ok(LEGAL_SUFFIXES.length > 20);
  assert.ok(LEGAL_SUFFIXES.indexOf("ltd") !== -1);
  assert.ok(LEGAL_SUFFIXES.indexOf("gmbh") !== -1);
  assert.ok(LEGAL_SUFFIXES.indexOf("sp z oo") !== -1);
  assert.equal(
    LEGAL_SUFFIX_TOKENS.length,
    LEGAL_SUFFIXES.length + LEGAL_SUFFIX_SPELLINGS.length,
  );
  // Longest sequences first, so "sp z oo" is tried before "oo" style tails.
  for (let i = 1; i < LEGAL_SUFFIX_TOKENS.length; i++) {
    assert.ok(LEGAL_SUFFIX_TOKENS[i - 1].length >= LEGAL_SUFFIX_TOKENS[i].length);
  }
  assert.ok(LEADING_LEGAL_FORMS.indexOf("ooo") !== -1);
  // A word that can be a real name never leads the stripping list.
  assert.equal(LEADING_LEGAL_FORMS.indexOf("group"), -1);
});

// ---------------------------------------------------------------------------
// Diacritics, punctuation and ampersands
// ---------------------------------------------------------------------------

test("diacritics and punctuation are folded away", () => {
  assert.equal(normalizeName("Société Générale"), "societe generale");
  assert.equal(normalizeName("Müller Öl AG"), "muller ol");
  assert.equal(normalizeName("Ægir Ørsted"), "aegir orsted");
  assert.equal(normalizeName("AL-QA'IDA"), "al qa ida");
});

test("an ampersand and the word it stands for meet", () => {
  assert.equal(normalizeName("Smith & Co"), normalizeName("Smith and Company"));
});

test("non Latin names survive normalisation instead of vanishing", () => {
  assert.equal(normalizeName("Роснефть"), "роснефть");
  assert.ok(normalizeName("中国石油").length > 0);
});

// ---------------------------------------------------------------------------
// Transliteration: pairs that MUST reach candidate status
// ---------------------------------------------------------------------------

test("transliteration pairs clear the 0.4 candidate threshold", () => {
  const pairs: [string, string][] = [
    ["Vladimir Ivanov", "Wladimir Iwanow"],
    ["Dmitry Sokolov", "Dmitri Sokolow"],
    ["Yusuf Ibrahim", "Iusuf Ibrahim"],
    ["Mohammed Hussein", "Mohamed Husein"],
    ["Mohammed Al-Fulani", "Muhammad Al Fulani"],
    ["Al-Qaida", "Alqaida"],
    ["Yevgeny Prigozhin", "Evgeniy Prigozhin"],
    ["Bashar Al-Assad", "Bachar Al Assad"],
    ["Sberbank of Russia", "Sberbank Rossii"],
  ];
  for (const [a, b] of pairs) {
    const score = bestVariantSimilarity(a, b);
    assert.ok(
      score >= CANDIDATE_THRESHOLD,
      `${a} vs ${b} scored ${score.toFixed(3)}, below the ${CANDIDATE_THRESHOLD} candidate threshold`,
    );
  }
});

test("a spelling difference in one letter stays a strong match", () => {
  const score = bestVariantSimilarity("Rosneft Trading SA", "Rosneft Trading");
  assert.ok(
    score >= STRONG_THRESHOLD,
    `expected strong, got ${score.toFixed(3)}`,
  );
});

test("variants are capped, deduplicated and start with the base form", () => {
  const variants = nameVariants("Mohammed Al-Fulani");
  assert.equal(variants[0], "mohammed al fulani");
  assert.ok(variants.length <= 6);
  assert.equal(new Set(variants).size, variants.length);
  assert.deepEqual(nameVariants(""), []);
  assert.deepEqual(nameVariants("   "), []);
});

// ---------------------------------------------------------------------------
// Names that must NOT collide
// ---------------------------------------------------------------------------

test("genuinely different companies stay below the candidate threshold", () => {
  const pairs: [string, string][] = [
    ["Acme Ltd", "Zenith Industries Ltd"],
    ["Siemens AG", "Sinopec Group"],
    ["Banco Nacional de Cuba", "Bank of China"],
    ["Hamburg Sud GmbH", "Maersk Line"],
    ["Group 4", "Acme Group"],
    ["Rosneft Oil Company", "Lukoil"],
  ];
  for (const [a, b] of pairs) {
    const score = bestVariantSimilarity(a, b);
    assert.ok(
      score < CANDIDATE_THRESHOLD,
      `${a} vs ${b} scored ${score.toFixed(3)}, which would wrongly raise a candidate`,
    );
  }
});

test("different people who share a common given name are not strong matches", () => {
  const pairs: [string, string][] = [
    ["Mohammed Al-Fulani", "Mohammed Al-Qasimi"],
    ["Ivan Petrov", "Ivan Sidorov"],
  ];
  for (const [a, b] of pairs) {
    const score = bestVariantSimilarity(a, b);
    assert.ok(
      score < STRONG_THRESHOLD,
      `${a} vs ${b} scored ${score.toFixed(3)} and would be auto flagged as strong`,
    );
  }
});

test("two companies that only share a legal form do not collide", () => {
  // Both fold to a single word plus nothing. If suffix stripping ever left the
  // suffix behind, these would suddenly share trigrams.
  assert.notEqual(normalizeName("Kandahar Ltd"), normalizeName("Bremen Ltd"));
  assert.ok(
    trigramSimilarity(normalizeName("Kandahar Ltd"), normalizeName("Bremen Ltd")) <
      CANDIDATE_THRESHOLD,
  );
});

// ---------------------------------------------------------------------------
// Degenerate input
// ---------------------------------------------------------------------------

test("empty and punctuation only input normalize to an empty string", () => {
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName("   "), "");
  assert.equal(normalizeName("..., --- ..."), "");
  assert.equal(trigramSimilarity("", "acme"), 0);
});
