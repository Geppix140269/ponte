/**
 * The message, correction and translation domain contract (LB-009).
 *
 * These are pure types and pure logic. No provider, no database, no crypto, so
 * the module is safe to import anywhere. Hashing and persistence live in the
 * translation adapter and the SQL commands; this file defines the shapes and
 * the invariants that keep an original immutable, a translation honest, and a
 * cached translation bound to exactly one immutable source.
 *
 * ## The three records are distinct, deliberately (ADR-0016, ExecPlan section 5)
 *
 * - A source message is the exact original participant text. It is evidence and
 *   is never mutated. A correction is a new, attributable follow-up record, not
 *   an edit of the original.
 * - A translation is a derived, participant-specific view of one immutable
 *   source message. It is not a second message and not a commitment.
 * - A translation must never be presented as successful when it is not. The text
 *   presence invariant below is what makes "never label an untranslated fallback
 *   as a successful translation" checkable.
 */

import type { DealRoomLanguage } from "./language";

/**
 * How the source language of a message was established. `declared` = the author
 * chose it; `detected` = inferred; `uncertain` = inference was low-confidence and
 * the UI must say so rather than assert a language.
 */
export const SOURCE_LANGUAGE_CONFIDENCE = ["declared", "detected", "uncertain"] as const;
export type SourceLanguageConfidence = (typeof SOURCE_LANGUAGE_CONFIDENCE)[number];

/**
 * Translation status. Every one is a state the UI must be able to render
 * distinctly (ExecPlan section 8); none may be silently collapsed into "done".
 *
 * - `pending` - queued or in flight, no text yet.
 * - `completed` - a translation the product may present as a translation.
 * - `failed` - the attempt failed; the original stays readable.
 * - `provider_unavailable` - the provider could not be reached; original stays readable.
 * - `source_uncertain` - the source language could not be established safely.
 * - `low_confidence` - a translation exists but must be shown as provisional.
 * - `ambiguous` - the wording is commercially ambiguous and must be flagged.
 */
export const TRANSLATION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "provider_unavailable",
  "source_uncertain",
  "low_confidence",
  "ambiguous",
] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

/**
 * The statuses that carry translated text. A row in one of these states must
 * have text; a row in any other state must not. This is the invariant that
 * forbids labelling an untranslated fallback as a success.
 */
export const TRANSLATION_STATUSES_WITH_TEXT: readonly TranslationStatus[] = [
  "completed",
  "low_confidence",
  "ambiguous",
];

/** Non-terminal: still pending. Everything else is a settled outcome. */
export function isPendingTranslation(status: TranslationStatus): boolean {
  return status === "pending";
}

/** Whether a status is one that carries translated text. */
export function translationHasText(status: TranslationStatus): boolean {
  return TRANSLATION_STATUSES_WITH_TEXT.includes(status);
}

/**
 * Only `completed` is an unqualified success. `low_confidence` and `ambiguous`
 * carry text but must be shown with a caveat, so they are not "successful" in
 * the sense the UI uses to drop the warning.
 */
export function isSuccessfulTranslation(status: TranslationStatus): boolean {
  return status === "completed";
}

/**
 * The text-presence invariant: a translated text is present if and only if the
 * status is one of the with-text statuses. Throws on any inconsistency, e.g. a
 * `completed` row with no text, or a `failed` row that still carries text. This
 * is called by the adapter before a row is written and asserted in tests.
 */
export function assertTranslationTextInvariant(
  status: TranslationStatus,
  text: string | null,
): void {
  const shouldHaveText = translationHasText(status);
  const hasText = typeof text === "string" && text.length > 0;
  if (shouldHaveText && !hasText) {
    throw new Error(`translation status "${status}" requires non-empty text`);
  }
  if (!shouldHaveText && hasText) {
    throw new Error(`translation status "${status}" must not carry text`);
  }
}

/**
 * Whether a source in one language needs translating for a reader who prefers
 * another. When the source already matches the reader's preference there is no
 * translation row and no status: the UI shows the original, which is a distinct
 * state from a successful translation.
 */
export function needsTranslation(
  sourceLanguage: DealRoomLanguage,
  targetLanguage: DealRoomLanguage,
): boolean {
  return sourceLanguage !== targetLanguage;
}

/**
 * Provenance sufficient to explain or reproduce a displayed translation, and to
 * bind it to exactly one immutable source. `sourceSha256` is the hash of the
 * original message text: a corrected or superseded source produces a new hash,
 * so an old translation can never silently attach to new content.
 */
export interface TranslationProvenance {
  provider: string;
  model: string;
  modelVersion: string;
  glossaryVersion: string;
  sourceSha256: string;
}

/** Whether provenance has every field a stored, presentable translation needs. */
export function isCompleteProvenance(provenance: Partial<TranslationProvenance> | null | undefined): boolean {
  if (!provenance) return false;
  return (
    !!provenance.provider &&
    !!provenance.model &&
    !!provenance.modelVersion &&
    !!provenance.glossaryVersion &&
    !!provenance.sourceSha256 &&
    /^[0-9a-f]{64}$/.test(provenance.sourceSha256)
  );
}

/**
 * The cache identity of a translation. A cached translation is bound to the
 * immutable source message, the target language, the model that produced it and
 * the glossary version in force, so a new model or glossary yields a new row
 * rather than overwriting evidence, and a translation is never shared across
 * those dimensions. The message id already scopes the cache to one sub-room, so
 * a translation can never be reused across a permission boundary.
 */
export interface TranslationCacheKey {
  messageId: string;
  targetLanguage: DealRoomLanguage;
  model: string;
  glossaryVersion: string;
}

/** A stable, order-fixed string identity for a translation cache key. */
export function translationCacheKey(key: TranslationCacheKey): string {
  return [key.messageId, key.targetLanguage, key.model, key.glossaryVersion].join("::");
}

/** The immutable original participant statement. */
export interface SourceMessage {
  id: string;
  roomId: string;
  subRoomId: string;
  authorParticipantId: string;
  authorProfileId: string;
  sourceLanguage: DealRoomLanguage;
  sourceLanguageConfidence: SourceLanguageConfidence;
  originalText: string;
  contentSha256: string;
  createdAt: string;
}

/** An attributable correction to a message. Never an edit of the original. */
export interface MessageCorrection {
  id: string;
  messageId: string;
  subRoomId: string;
  correctedByParticipantId: string;
  correctedByProfileId: string;
  correctedText: string;
  createdAt: string;
}

/** A derived, participant-specific translation of one source message. */
export interface MessageTranslation {
  id: string;
  messageId: string;
  subRoomId: string;
  targetLanguage: DealRoomLanguage;
  status: TranslationStatus;
  translatedText: string | null;
  provenance: TranslationProvenance | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
}
