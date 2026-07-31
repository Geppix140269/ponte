// Test double for @/lib/registry.
//
// Only the network is replaced. Everything else in the real module is pure
// (officerNames, readCandidates, sameRegNumber, the candidate cap) and is
// re-exported unchanged, so a test exercises the same helpers production does
// and cannot drift from them.
//
// `lookupRegistry` is the one function that reaches Companies House or
// OpenCorporates. A test installs the RegistryResult those sources would have
// returned, which makes the verification outcome deterministic without a key,
// a network or a fixture server.

import type { RegistryLookupInput, RegistryResult } from "../registry";

export * from "../registry";

export type RegistryLookupCall = RegistryLookupInput;

export const registryLookups: RegistryLookupCall[] = [];

let nextResult: RegistryResult = {
  source: "mock_registry",
  available: false,
  reason: "no registry result installed for this test",
  checkedAt: "2026-01-01T00:00:00.000Z",
};

/** Install the registry answer for the next lookups, and clear the log. */
export function __resetRegistry(result?: Partial<RegistryResult>): void {
  registryLookups.length = 0;
  nextResult = {
    source: "mock_registry",
    available: false,
    reason: "no registry result installed for this test",
    checkedAt: "2026-01-01T00:00:00.000Z",
    ...result,
  };
}

/** Make the next lookup throw, which is how an upstream fault reaches the pipeline. */
let throwWith: string | null = null;
export function __registryThrows(message: string | null): void {
  throwWith = message;
}

export async function lookupRegistry(
  input: RegistryLookupInput,
): Promise<RegistryResult> {
  registryLookups.push({ ...input });
  if (throwWith) throw new Error(throwWith);
  return nextResult;
}
