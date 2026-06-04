// Live ADAMftd provider — STUB.
//
// Intentionally not implemented yet. We are waiting on the ADAMftd technical API
// docs (endpoints + request/response payloads) before wiring real calls. When
// they arrive, implement the three methods against the real endpoints and the
// rest of the app needs no changes (same VerificationProvider contract).
//
// Until then, ADAMFTD_LIVE must stay false so getVerificationProvider() returns
// the mock and no credits are spent.

import type {
  VerificationProvider,
  SanctionsResult,
  RegistryResult,
  TradeActivityResult,
  VerificationResult,
  CounterpartyQuery,
} from "./types";

const NOT_READY =
  "Live ADAMftd provider is not implemented yet (awaiting API docs). Keep ADAMFTD_LIVE=false.";

export class LiveVerificationProvider implements VerificationProvider {
  readonly source = "live" as const;

  // TODO(adamftd): POST {base}/sanctions/screen  -> map to SanctionsResult
  async screenSanctions(_name: string, _country?: string): Promise<SanctionsResult> {
    throw new Error(NOT_READY);
  }
  // TODO(adamftd): GET {base}/companies?name=...   -> map to RegistryResult
  async lookupRegistry(_name: string, _country?: string): Promise<RegistryResult> {
    throw new Error(NOT_READY);
  }
  // TODO(adamftd): GET {base}/company-data?name=... -> map to TradeActivityResult
  async getTradeActivity(_name: string, _country?: string): Promise<TradeActivityResult> {
    throw new Error(NOT_READY);
  }
  async verifyCounterparty(_query: CounterpartyQuery): Promise<VerificationResult> {
    throw new Error(NOT_READY);
  }
}
