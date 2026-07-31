// Test double for @/lib/credits.
//
// It exists for one question: did this run touch money at all? Every function
// the real module exports is recorded here by name and arguments, so a test can
// assert that a member-business verification reached NONE of them, rather than
// asserting that the source text looks like it would not.
//
// Recording every function, not only spendCredits, is the point. A refund is a
// credit movement, a balance read is a payment decision, and a grant is money.
// ADR-0018 says a member_business run cannot call a credit function; that is
// the whole surface, so the double watches the whole surface.
//
// The constants keep their real values, so a caller that reads a cost behaves
// normally and the recorded arguments are the arguments production would pass.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CreditCall = { fn: string; args: any[] };

/** A Level 2 business verification. Same value as the real module. */
export const COST_VERIFICATION_L2 = 2;
/** A Level 3 activity verification. Same value as the real module. */
export const COST_VERIFICATION_L3 = 2;

export type SpendReason =
  | "spend_verification"
  | "grant_signup"
  | "purchase"
  | "refund_failed"
  | "admin_adjust";

/**
 * Mirrors the real class so `err instanceof InsufficientCredits` in the
 * pipeline resolves against the same constructor the double throws.
 */
export class InsufficientCredits extends Error {
  constructor(public readonly needed: number) {
    super(`insufficient credits, need ${needed}`);
    this.name = "InsufficientCredits";
  }
}

const recorded: CreditCall[] = [];

type Scenario = {
  /** What getBalance returns. */
  balance?: number;
  /** When true the next spendCredits throws InsufficientCredits. */
  insufficient?: boolean;
  /** Ledger id handed back by a successful spend or grant. */
  ledgerId?: string;
};

let scenario: Scenario = {};

/** Clear the recorded calls and install the scenario for the next run. */
export function __resetCredits(s: Scenario = {}): void {
  recorded.length = 0;
  scenario = s;
}

/** Every credit function call this run made, in order. Optionally by name. */
export function __creditCalls(fn?: string): CreditCall[] {
  return fn ? recorded.filter((c) => c.fn === fn) : recorded.slice();
}

/** The distinct credit function names this run reached, in first-call order. */
export function __creditFunctionsCalled(): string[] {
  const seen: string[] = [];
  for (const call of recorded) {
    if (seen.indexOf(call.fn) === -1) seen.push(call.fn);
  }
  return seen;
}

function record(fn: string, args: any[]): void {
  recorded.push({ fn, args });
}

export async function getBalance(userId: string): Promise<number> {
  record("getBalance", [userId]);
  return scenario.balance ?? 0;
}

export async function spendCredits(
  userId: string,
  amount: number,
  reason: SpendReason,
  ref?: string,
): Promise<string> {
  record("spendCredits", [userId, amount, reason, ref]);
  if (scenario.insufficient) throw new InsufficientCredits(amount);
  return scenario.ledgerId ?? "ledger-mock";
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: SpendReason,
  ref?: string,
): Promise<string> {
  record("grantCredits", [userId, amount, reason, ref]);
  return scenario.ledgerId ?? "ledger-mock";
}

export async function grantGuestCredits(
  guestEmail: string,
  amount: number,
  ref: string,
): Promise<string> {
  record("grantGuestCredits", [guestEmail, amount, ref]);
  return scenario.ledgerId ?? "ledger-mock";
}

export async function refundSpend(
  userId: string,
  amount: number,
  ref: string,
): Promise<void> {
  record("refundSpend", [userId, amount, ref]);
}

export async function ledgerFor(userId: string, limit = 50): Promise<any[]> {
  record("ledgerFor", [userId, limit]);
  return [];
}
