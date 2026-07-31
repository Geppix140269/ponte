/**
 * Deterministic source-language detection and preference resolution (LB-009).
 *
 * Pure, non-UI, non-provider. This is the lane-owned deterministic layer that
 * decides, without a network call:
 *
 * - a participant's effective Deal Room language from a possibly-malformed stored
 *   preference (always resolving safely to a supported language);
 * - the likely source language of a message among the supported set, with an
 *   honest confidence, so the domain can record `declared`, `detected` or
 *   `uncertain` rather than assert a language it does not know.
 *
 * It is intentionally conservative. Script-based signals (Arabic, Cyrillic, Han)
 * are strong and reported as `detected`. Latin script cannot be split into
 * English and Spanish reliably by rule, so it reports `detected` only on clear
 * Spanish or English markers and `uncertain` otherwise. A real, higher-quality
 * detection may later come from the provider; this remains the deterministic
 * floor and the offline fallback, and never sends content anywhere.
 *
 * Non-ASCII letters are referenced by code point rather than as literals, so the
 * source stays pure ASCII (the repository encoding check rejects adjacent
 * high-Latin bytes as possible cp1252 mojibake).
 */

import {
  DEFAULT_DEAL_ROOM_LANGUAGE,
  resolveDealRoomLanguage,
  type DealRoomLanguage,
} from "./language";
import type { SourceLanguageConfidence } from "./messages";

export interface DetectedLanguage {
  language: DealRoomLanguage | null;
  confidence: SourceLanguageConfidence;
}

const SCRIPT_PATTERNS: Array<{ language: DealRoomLanguage; pattern: RegExp }> = [
  { language: "ar", pattern: /[؀-ۿݐ-ݿࢠ-ࣿ]/g },
  { language: "ru", pattern: /[Ѐ-ӿ]/g },
  { language: "zh-CN", pattern: /[㐀-䶿一-鿿]/g },
];

// Spanish-only letters, by code point: n-tilde, inverted question and
// exclamation, and the accented vowels a e i o u and u-diaeresis. A hit on any of
// these is a strong Spanish signal that English does not share.
const SPANISH_LETTER_CODES = new Set<number>([
  0x00f1, 0x00bf, 0x00a1, 0x00e1, 0x00e9, 0x00ed, 0x00f3, 0x00fa, 0x00fc,
]);

function hasSpanishLetter(text: string): boolean {
  for (const ch of text.toLowerCase()) {
    if (SPANISH_LETTER_CODES.has(ch.charCodeAt(0))) return true;
  }
  return false;
}

// Spanish function words (ASCII forms; the accented "envio" variant is already
// caught by the Spanish-letter signal above).
const SPANISH_WORDS = /\b(?:el|la|los|las|del|una|unos|unas|con|para|por|que|envio|entrega|precio|cantidad|puerto|toneladas)\b/i;

// Common English function words, used only to separate Latin English from an
// otherwise-unmarked Latin string.
const ENGLISH_WORDS = /\b(?:the|and|we|you|for|with|will|please|delivery|quantity|price|confirm|port|tonnes|shipment)\b/i;

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Detect the likely source language of a text among the supported set.
 *
 * Empty or whitespace input yields `{ language: null, confidence: 'uncertain' }`.
 * A dominant non-Latin script yields that language with `detected`. Latin script
 * yields `es` or `en` with `detected` when a clear marker is present, and `en`
 * with `uncertain` when it cannot be told apart.
 */
export function detectSourceLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return { language: null, confidence: "uncertain" };

  // Strongest signal wins by character count, so a stray Latin word inside an
  // Arabic message does not flip the result.
  let best: { language: DealRoomLanguage; count: number } | null = null;
  for (const { language, pattern } of SCRIPT_PATTERNS) {
    const count = countMatches(trimmed, pattern);
    if (count > 0 && (!best || count > best.count)) best = { language, count };
  }
  if (best) return { language: best.language, confidence: "detected" };

  // Latin script: separate Spanish from English only on clear markers.
  const spanish = (hasSpanishLetter(trimmed) ? 1 : 0) + (SPANISH_WORDS.test(trimmed) ? 1 : 0);
  const english = ENGLISH_WORDS.test(trimmed) ? 1 : 0;
  if (spanish > english) return { language: "es", confidence: "detected" };
  if (english > spanish) return { language: "en", confidence: "detected" };

  // Genuinely ambiguous Latin text: default to English but say so honestly.
  return { language: DEFAULT_DEAL_ROOM_LANGUAGE, confidence: "uncertain" };
}

/**
 * Resolve a participant's stored preference to a supported language. A malformed
 * or unsupported value resolves to English rather than failing.
 */
export function resolvePreferredLanguage(stored: string | null | undefined): DealRoomLanguage {
  return resolveDealRoomLanguage(stored);
}

/**
 * Establish the source language to record on a message.
 *
 * A declared language the author chose wins and is recorded as `declared` (after
 * safe resolution). With no declaration, fall back to deterministic detection.
 * This is the single place the message domain decides source language and
 * confidence, so the recorded value and its honesty stay together.
 */
export function establishSourceLanguage(
  declared: string | null | undefined,
  text: string,
): { language: DealRoomLanguage; confidence: SourceLanguageConfidence } {
  if (declared) {
    const trimmed = declared.trim();
    if (trimmed) {
      // A declared value is honoured, resolved safely to a supported language.
      return { language: resolveDealRoomLanguage(trimmed), confidence: "declared" };
    }
  }
  const detected = detectSourceLanguage(text);
  return {
    language: detected.language ?? DEFAULT_DEAL_ROOM_LANGUAGE,
    confidence: detected.confidence,
  };
}
