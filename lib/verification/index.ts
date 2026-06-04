// Entry point for the verification layer.
//
//   import { getVerificationProvider } from "@/lib/verification";
//   const result = await getVerificationProvider().verifyCounterparty({ companyName, country, hsCode });
//
// The flag ADAMFTD_LIVE selects the provider. It defaults to the mock, so the
// app never touches the real ADAMftd API (and never spends credits) unless the
// flag is explicitly set to "true" AND the live provider is implemented.

import type { VerificationProvider } from "./types";
import { MockVerificationProvider } from "./mock-provider";
import { LiveVerificationProvider } from "./live-provider";

let cached: VerificationProvider | null = null;

export function getVerificationProvider(): VerificationProvider {
  if (cached) return cached;
  const live = process.env.ADAMFTD_LIVE === "true";
  cached = live ? new LiveVerificationProvider() : new MockVerificationProvider();
  return cached;
}

// For tests that need to reset the singleton.
export function __resetVerificationProvider() {
  cached = null;
}

export * from "./types";
export { composeVerification, cacheKey } from "./compose";
export { MockVerificationProvider } from "./mock-provider";
export { LiveVerificationProvider } from "./live-provider";
