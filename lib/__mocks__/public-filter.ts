// Test double for @/lib/listings/public-filter: the test sets which owner ids
// presently pass verification currency.
let eligible = new Set<string>();

export function __setEligible(ids: string[]): void {
  eligible = new Set(ids);
}

export async function eligibleOwnerIds(): Promise<Set<string>> {
  return eligible;
}
