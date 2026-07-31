/**
 * Translation and interpretation provider selection (LB-009).
 *
 * The default runtime provider is the real Anthropic adapter, which is inactive
 * unless the owner has opened the boundary (see ./anthropic-adapter.ts). While
 * inactive it produces an honest `provider_unavailable` status and sends no
 * content, so the app is safe to run before OD-010 is decided.
 *
 * Setting `DEAL_ROOM_TRANSLATION_PROVIDER=test` selects the deterministic
 * adapter, which never touches the network. That is the only way to exercise the
 * real translation loop locally, and it still sends no private content anywhere.
 */

import {
  AnthropicInterpretationProvider,
  AnthropicTranslationProvider,
} from "./anthropic-adapter";
import {
  DeterministicInterpretationProvider,
  DeterministicTranslationProvider,
} from "./test-adapter";
import type { InterpretationProvider, TranslationProvider } from "./provider";

function useTestProvider(): boolean {
  return process.env.DEAL_ROOM_TRANSLATION_PROVIDER === "test";
}

export function getTranslationProvider(): TranslationProvider {
  return useTestProvider() ? new DeterministicTranslationProvider() : new AnthropicTranslationProvider();
}

export function getInterpretationProvider(): InterpretationProvider {
  return useTestProvider() ? new DeterministicInterpretationProvider() : new AnthropicInterpretationProvider();
}

export * from "./provider";
