/**
 * Deterministic translation and interpretation adapters for tests and local
 * development (LB-009).
 *
 * No network, no provider, no private content leaves the process. The adapters
 * are fully deterministic so every state, including failure and ambiguity, is
 * reproducible. Markers in the source text drive the outcome:
 *
 * - `[[FAIL]]` in the source -> status `failed`
 * - `[[UNAVAILABLE]]` -> status `provider_unavailable`
 * - `[[UNCERTAIN]]` -> status `source_uncertain` (no text)
 * - `[[AMBIGUOUS]]` -> status `ambiguous` (text with a caveat)
 * - `[[LOW]]` -> status `low_confidence`
 * - otherwise -> status `completed`
 *
 * A "translation" prefixes the target-language tag and preserves every
 * controlled trade term and coded identifier verbatim, so glossary-preservation
 * tests are meaningful. This is a test double, not a translator.
 */

import type { DealRoomLanguage } from "../language";
import { preservedTermsIn } from "../glossary";
import type {
  InterpretationOutcome,
  InterpretationProvider,
  InterpretationRequest,
  ProposedFact,
  TranslationOutcome,
  TranslationProvider,
  TranslationRequest,
} from "./provider";

const TEST_MODEL = "test-deterministic";
const TEST_MODEL_VERSION = "1";

function markerStatus(text: string): TranslationOutcome["status"] {
  if (text.includes("[[FAIL]]")) return "failed";
  if (text.includes("[[UNAVAILABLE]]")) return "provider_unavailable";
  if (text.includes("[[UNCERTAIN]]")) return "source_uncertain";
  if (text.includes("[[AMBIGUOUS]]")) return "ambiguous";
  if (text.includes("[[LOW]]")) return "low_confidence";
  return "completed";
}

/**
 * A deterministic transform that stands in for a translation. It tags the target
 * language and keeps every preserved trade term unchanged. It never claims to be
 * a real translation.
 */
export function pseudoTranslate(text: string, target: DealRoomLanguage): string {
  // Preserved terms are already verbatim in the source; tagging the whole string
  // keeps them verbatim in the output too, which is the property tests assert.
  const preserved = preservedTermsIn(text);
  const body = `[${target}] ${text}`;
  // Sanity: the tag transform must not have dropped a preserved token.
  for (const term of preserved) {
    if (!body.includes(term)) {
      // Should be unreachable; fail loudly rather than emit a lossy result.
      throw new Error(`test adapter dropped preserved term "${term}"`);
    }
  }
  return body;
}

export class DeterministicTranslationProvider implements TranslationProvider {
  readonly name = "test-adapter";
  readonly active = true;

  async translate(request: TranslationRequest): Promise<TranslationOutcome> {
    const status = markerStatus(request.sourceText);
    const carriesText = status === "completed" || status === "ambiguous" || status === "low_confidence";
    const text = carriesText ? pseudoTranslate(request.sourceText, request.targetLanguage) : null;
    const confidence = status === "low_confidence" ? "low" : status === "ambiguous" ? "ambiguous" : status === "completed" ? "high" : null;
    return { status, text, model: TEST_MODEL, modelVersion: TEST_MODEL_VERSION, confidence };
  }
}

/**
 * A deterministic interpretation adapter. It extracts a quantity+unit fact and,
 * when two messages carry different quantities for the same field, emits both as
 * distinct party positions so the disagreement path is exercised. Every proposed
 * value cites the message it came from.
 */
export class DeterministicInterpretationProvider implements InterpretationProvider {
  readonly name = "test-adapter";
  readonly active = true;

  async propose(request: InterpretationRequest): Promise<InterpretationOutcome> {
    const proposals: ProposedFact[] = [];
    const quantityPattern = /(\d[\d,]*(?:\.\d+)?)\s?(MT|KG|FCL|LCL|TEU|FEU)/;

    for (const message of request.messages) {
      const match = quantityPattern.exec(message.text);
      if (!match) continue;
      proposals.push({
        field: "quantity",
        proposedValue: { amount: match[1].replace(/,/g, ""), unit: match[2] },
        partyPosition: message.messageId,
        partyParticipantId: null,
        sourceRefs: [
          {
            messageId: message.messageId,
            excerpt: match[0],
            sourceLanguage: message.language,
          },
        ],
        confidence: "high",
        ambiguity: null,
      });
    }

    return { model: TEST_MODEL, modelVersion: TEST_MODEL_VERSION, proposals };
  }
}
