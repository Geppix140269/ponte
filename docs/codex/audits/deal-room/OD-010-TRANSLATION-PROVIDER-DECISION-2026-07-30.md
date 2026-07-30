# OD-010 provider decision paper: Deal Room translation and interpretation

- **Date:** 30 July 2026
- **Status:** OPEN. This paper informs the owner decision; it does not accept any provider terms.
- **Scope:** the AI provider that translates private Deal Room messages and proposes commercial interpretation for LB-009.
- **Related:** `docs/operations/OPEN_DECISIONS.md` OD-010; ADR-0016; `MULTILINGUAL-PREFLIGHT-2026-07-30.md` sections 10-15.

## What is being decided

Whether Ponte may send private, participant-authored Deal Room negotiation content
to an external AI provider for translation and interpretation, and on what data
terms. The recommended provider is Anthropic, because it is already the only AI
provider integrated in Ponte (`lib/ai.ts`, `ANTHROPIC_API_KEY`) and the code reuses
its timeout, metering and content-safety behaviour. No alternative is proposed.

**This paper does not accept any retention, residency or privacy terms.** Accepting
those is an owner action. Several dimensions below can only be settled against
Anthropic's current commercial terms and DPA, which must be read by the owner (or
counsel) rather than asserted here.

## 1. Data that would be sent

- The exact original text of a Deal Room message (a participant's own words), and,
  for interpretation, a small set of recent messages from **one** sub-room.
- The target language code and the glossary version.
- No names, no email addresses, no room or participant identifiers, no deal
  snapshot, no evidence files. The prompt carries the message text and the
  instruction only. The message id is used locally as a metering `ref`, not sent
  in the prompt body.
- Content is drawn only from a sub-room the requesting flow is authorised to read;
  authorisation is derived from the participant's permitted read, never from a
  service-role query alone (preflight section 12).

## 2. Retention  — to confirm with Anthropic

Whether request and response content is retained server-side, and for how long,
is governed by Anthropic's commercial terms and DPA. This must be confirmed by the
owner against those documents. Do not assume zero retention by default.

## 3. Training use — to confirm with Anthropic

Whether content submitted via the API is used to train models is governed by the
same terms. Anthropic's commercial API terms have historically stated that API
inputs and outputs are not used to train models, but this must be verified against
the terms in force at activation rather than taken on trust here.

## 4. Processing and storage regions — to confirm

The processing region and any data residency commitments must be confirmed against
Anthropic's terms. If EU or other residency is required for Deal Room content, that
requirement must be checked before the boundary is opened.

## 5. Subprocessors — to confirm

Anthropic's subprocessor list and any cloud hosting subprocessors must be reviewed
against Ponte's residency and privacy requirements.

## 6. Deletion and retention controls — to confirm

Whether deletion-on-request, configurable retention windows, or zero-data-retention
(ZDR) are available, and on what plan, must be confirmed with Anthropic. ZDR-style
controls are offered to some API customers on request; availability and terms for
Ponte's account must be established, not assumed.

## 7. Contractual and API privacy protections — to confirm

A signed DPA and the commercial terms are the instruments that bind retention,
training and residency. The owner must confirm which are in force for Ponte's
Anthropic account before any private content is sent.

## 8. Latency and supported-language quality

- Latency: the adapter uses a 20s timeout via `AbortController`; a timeout maps to
  `provider_unavailable` and the original stays readable. Translation is asynchronous
  to the message post, so provider latency never blocks message delivery.
- Quality: Anthropic models handle the five supported languages, but machine parity
  is not sufficient for launch. Native commercial review of launch-critical glossary
  and interpretation fixtures is a separate, outstanding acceptance requirement
  (`GLOSSARY_REVIEW_STATUS = machine_prepared_pending_native_review`).

## 9. Cost controls

- Every real call is metered through `lib/ai.ts` into `ai_calls` (token counts only,
  no content). The legacy un-metered path (`lib/ai-vet.ts`) is deliberately not used.
- Translations are cached one row per message per target language; a message is
  translated once per language unless the model or glossary version changes.
- Interpretation runs on a bounded recent-message window, not the whole history.

## 10. Failure and safe-disable behaviour

- The boundary is closed by default (`DEAL_ROOM_TRANSLATION_ENABLED` unset): the
  adapter is inactive, sends no content, and returns `provider_unavailable`.
- `DEAL_ROOM_TRANSLATION_PROVIDER=test` selects the deterministic adapter (no
  network) for local exercise of the loop with no content sent.
- Any provider failure, timeout or inactive state leaves the authorised original
  readable and never writes a dishonest "completed" row (enforced by the text
  invariant and `runTranslation`).
- Safe-disable via `NEXT_PUBLIC_DEAL_ROOM_MULTILINGUAL` removes derived presentation
  while preserving original messages and confirmed canonical terms.

## 11. Zero-data-retention or equivalent — to confirm

See sections 2 and 6. If the owner requires ZDR or a signed DPA with a short
retention window before private negotiation content may be sent, that is the
gating condition for opening the boundary. Until then, development proceeds with
the deterministic adapter only.

## Recommendation

Adopt Anthropic via the existing `lib/ai.ts` path, **subject to the owner confirming
sections 2 through 7 against Anthropic's current terms and DPA and explicitly
accepting them.** Until that confirmation:

- keep `DEAL_ROOM_TRANSLATION_ENABLED` unset (boundary closed, no content sent);
- continue all provider-independent work with the deterministic adapter;
- do not add the production secret, open the boundary, or send any Deal Room content.

Opening the boundary, adding a secret, and activation each remain separate owner
approvals under AGENTS.md.
