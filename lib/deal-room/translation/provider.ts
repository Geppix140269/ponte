/**
 * The server-side translation and interpretation provider interface (LB-009).
 *
 * No browser ever calls a provider. These interfaces sit behind the SQL
 * commands and a server adapter. The real provider is chosen and configured in
 * ./index.ts; a deterministic adapter in ./test-adapter.ts drives every test and
 * every failure and ambiguity state without a network call.
 *
 * The orchestration helpers here turn a provider outcome or failure into a row
 * that obeys the message-domain invariants: a provider failure never throws out
 * of the loop, it maps to an explicit status that leaves the authorised original
 * readable (ADR-0016 section 4, ExecPlan section 5 rule 10).
 */

import type { DealRoomLanguage } from "../language";
import {
  assertTranslationTextInvariant,
  type TranslationProvenance,
  type TranslationStatus,
} from "../messages";
import type { SourceMessageRef } from "../interpretation";

/** Raised when a provider is asked to run while its configuration is inactive. */
export class ProviderInactiveError extends Error {
  constructor(providerName: string) {
    super(`translation provider "${providerName}" is not active; no content was sent`);
    this.name = "ProviderInactiveError";
  }
}

/** Raised when a provider call exceeds its timeout. */
export class ProviderTimeoutError extends Error {
  constructor(providerName: string, timeoutMs: number) {
    super(`translation provider "${providerName}" timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}

export interface TranslationRequest {
  messageId: string;
  subRoomId: string;
  sourceText: string;
  sourceLanguage: DealRoomLanguage;
  targetLanguage: DealRoomLanguage;
  glossaryVersion: string;
}

/** What a provider returns for one translation attempt. */
export interface TranslationOutcome {
  status: TranslationStatus;
  text: string | null;
  model: string;
  modelVersion: string;
  confidence: string | null;
}

export interface TranslationProvider {
  readonly name: string;
  /** False when the configuration boundary is closed; translate must not send content. */
  readonly active: boolean;
  translate(request: TranslationRequest): Promise<TranslationOutcome>;
}

export interface InterpretationMessageInput {
  messageId: string;
  text: string;
  language: DealRoomLanguage;
}

export interface InterpretationRequest {
  roomId: string;
  subRoomId: string;
  messages: InterpretationMessageInput[];
  glossaryVersion: string;
}

/** One structured fact a provider proposes, each carrying its source evidence. */
export interface ProposedFact {
  field: string;
  proposedValue: unknown;
  partyPosition: string;
  partyParticipantId: string | null;
  sourceRefs: SourceMessageRef[];
  confidence: string | null;
  ambiguity: string | null;
}

export interface InterpretationOutcome {
  model: string;
  modelVersion: string;
  proposals: ProposedFact[];
}

export interface InterpretationProvider {
  readonly name: string;
  readonly active: boolean;
  propose(request: InterpretationRequest): Promise<InterpretationOutcome>;
}

/** The row-ready result of running a translation, safe to persist. */
export interface TranslationRunResult {
  status: TranslationStatus;
  text: string | null;
  provenance: TranslationProvenance | null;
  confidence: string | null;
}

/**
 * Run one translation through a provider and return a row-ready result that
 * always obeys the message-domain invariants.
 *
 * - An inactive provider yields `provider_unavailable`; no content is sent.
 * - A timeout yields `provider_unavailable`; a generic failure yields `failed`.
 * - A returned outcome is checked against the text-presence invariant before it
 *   is accepted, so a provider can never produce a `completed` row with no text.
 * - Provenance is built only for statuses that carry text, and always binds the
 *   translation to the immutable source hash passed in.
 *
 * In every failure path the authorised original remains readable, because this
 * returns a status row and never throws.
 */
export async function runTranslation(
  provider: TranslationProvider,
  request: TranslationRequest,
  sourceSha256: string,
): Promise<TranslationRunResult> {
  if (!provider.active) {
    return { status: "provider_unavailable", text: null, provenance: null, confidence: null };
  }

  let outcome: TranslationOutcome;
  try {
    outcome = await provider.translate(request);
  } catch (err) {
    const status: TranslationStatus = err instanceof ProviderTimeoutError ? "provider_unavailable" : "failed";
    return { status, text: null, provenance: null, confidence: null };
  }

  // A provider must not talk us into an inconsistent row. If it does, treat the
  // attempt as failed rather than persisting a dishonest state.
  try {
    assertTranslationTextInvariant(outcome.status, outcome.text);
  } catch {
    return { status: "failed", text: null, provenance: null, confidence: null };
  }

  const carriesText = outcome.text !== null && outcome.text.length > 0;
  const provenance: TranslationProvenance | null = carriesText
    ? {
        provider: provider.name,
        model: outcome.model,
        modelVersion: outcome.modelVersion,
        glossaryVersion: request.glossaryVersion,
        sourceSha256,
      }
    : null;

  return { status: outcome.status, text: outcome.text, provenance, confidence: outcome.confidence };
}
