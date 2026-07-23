// Test double for @/lib/board/market-signals: only getMarketSignal is used by
// the investigate route, and the test sets what it returns.
/* eslint-disable @typescript-eslint/no-explicit-any */

let lookup: any = { state: "missing" };

export function __setSignal(l: any): void {
  lookup = l;
}

export async function getMarketSignal(): Promise<any> {
  return lookup;
}
