/**
 * The real Anthropic translation and interpretation adapter (LB-009), behind an
 * inactive configuration boundary.
 *
 * ## It sends nothing until the owner opens the boundary, and OD-010 is open
 *
 * `active` is false unless BOTH `DEAL_ROOM_TRANSLATION_ENABLED === "on"` and an
 * Anthropic key are configured. Neither is set in development or CI, so `active`
 * is false, `runTranslation` returns `provider_unavailable` without ever calling
 * `translate`, and no Deal Room content is sent anywhere. As defence in depth,
 * `translate`/`propose` also throw `ProviderInactiveError` if called while
 * inactive. Turning the boundary on is an owner action gated by OD-010 (provider
 * retention, residency and privacy), a production secret and a feature flag.
 *
 * The adapter reuses `lib/ai.ts` for its timeout, metering and content-safety
 * behaviour (error bodies truncated, no prompt content logged). The prompt and
 * expected JSON shape below are the documented provider input/output contract
 * for the OD-010 decision paper.
 */

import { MODEL_WORK, callAiJson, isAiConfigured } from "../../ai";
import { DEAL_ROOM_LANGUAGE_NAMES } from "../language";
import { TRANSLATION_STATUSES, type TranslationStatus } from "../messages";
import {
  ProviderInactiveError,
  ProviderTimeoutError,
  type InterpretationOutcome,
  type InterpretationProvider,
  type InterpretationRequest,
  type ProposedFact,
  type TranslationOutcome,
  type TranslationProvider,
  type TranslationRequest,
} from "./provider";

const TRANSLATION_TIMEOUT_MS = 20_000;

/** The single boundary switch. Off unless the owner has explicitly enabled it. */
export function translationBoundaryOpen(): boolean {
  return process.env.DEAL_ROOM_TRANSLATION_ENABLED === "on" && isAiConfigured();
}

interface RawTranslation {
  status?: string;
  text?: string | null;
  confidence?: string | null;
}

function coerceStatus(raw: string | undefined, hasText: boolean): TranslationStatus {
  if (raw && (TRANSLATION_STATUSES as readonly string[]).includes(raw)) {
    return raw as TranslationStatus;
  }
  // A provider that does not classify safely is treated as producing a plain
  // completed result when it returned text, and a source-uncertain result when
  // it did not. runTranslation re-checks the text invariant either way.
  return hasText ? "completed" : "source_uncertain";
}

export class AnthropicTranslationProvider implements TranslationProvider {
  readonly name = "anthropic";
  get active(): boolean {
    return translationBoundaryOpen();
  }

  async translate(request: TranslationRequest): Promise<TranslationOutcome> {
    if (!this.active) throw new ProviderInactiveError(this.name);

    const targetName = DEAL_ROOM_LANGUAGE_NAMES[request.targetLanguage];
    const system = [
      "You are a professional trade translator for a private commercial deal room.",
      `Translate the message into ${targetName}.`,
      "Preserve verbatim: numbers, quantities, unit and container codes (MT, KG, FCL, TEU),",
      "currency codes and amounts, Incoterms (FOB, CIF, EXW, DAP), HS codes, listing references",
      "such as PT-1234, company names, and the words Ponte and Ponte AI.",
      "Do not add commitments, do not resolve ambiguity, do not invent facts.",
      "Classify the result with a status field. Use 'ambiguous' when the commercial wording is",
      "genuinely ambiguous, 'low_confidence' when unsure, 'source_uncertain' when you cannot tell",
      "the source language, and 'completed' for a clean translation.",
      'Return JSON: {"status": string, "text": string | null, "confidence": string | null}.',
    ].join(" ");

    let result: { data: RawTranslation; usage: { model: string } };
    try {
      result = await callAiJson<RawTranslation>({
        feature: "deal_room_translation",
        system,
        user: request.sourceText,
        model: MODEL_WORK,
        temperature: 0,
        timeoutMs: TRANSLATION_TIMEOUT_MS,
        userId: null,
        ref: request.messageId,
      });
    } catch (err) {
      if ((err as Error).message.includes("timed out")) {
        throw new ProviderTimeoutError(this.name, TRANSLATION_TIMEOUT_MS);
      }
      throw err;
    }

    const text = typeof result.data.text === "string" && result.data.text.length > 0 ? result.data.text : null;
    const status = coerceStatus(result.data.status, text !== null);
    return {
      status,
      text,
      model: result.usage.model,
      modelVersion: result.usage.model,
      confidence: result.data.confidence ?? null,
    };
  }
}

export class AnthropicInterpretationProvider implements InterpretationProvider {
  readonly name = "anthropic";
  get active(): boolean {
    return translationBoundaryOpen();
  }

  async propose(request: InterpretationRequest): Promise<InterpretationOutcome> {
    if (!this.active) throw new ProviderInactiveError(this.name);
    // Deliberately unimplemented beyond the inactive guard for Stage B: the real
    // interpretation call is written in Stage D once OD-010 is decided. The
    // guard proves no content is sent while the boundary is closed.
    const _proposals: ProposedFact[] = [];
    void request;
    return { model: MODEL_WORK, modelVersion: MODEL_WORK, proposals: _proposals };
  }
}
