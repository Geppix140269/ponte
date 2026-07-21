// Credits ledger.
//
// Append only: a balance is the sum of its rows, never a stored number that
// can drift away from its own history. Every verification is a spend, and
// every spend names what it was for, so a member can always be shown where
// their credits went.

import { createAdminClient } from "@/lib/supabase/server";

/** A Level 2 business verification. */
export const COST_VERIFICATION_L2 = 2;
/** A Level 3 activity verification, more documents and more model work. */
export const COST_VERIFICATION_L3 = 2;

export type SpendReason =
  | "spend_verification"
  | "grant_signup"
  | "purchase"
  | "refund_failed"
  | "admin_adjust";

export async function getBalance(userId: string): Promise<number> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("credit_balance", { p_user_id: userId });
  if (error) throw new Error(`credit_balance failed: ${error.message}`);
  return Number(data ?? 0);
}

export class InsufficientCredits extends Error {
  constructor(public readonly needed: number) {
    super(`insufficient credits, need ${needed}`);
    this.name = "InsufficientCredits";
  }
}

/**
 * Spend atomically. The balance check and the insert happen inside one
 * database function under a row lock, so two verifications started at the same
 * moment cannot both pass the check and overdraw.
 *
 * Returns the ledger row id, which is stored on the verification so a spend is
 * always traceable back to what it bought.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: SpendReason,
  ref?: string,
): Promise<string> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });

  if (error) {
    if (/insufficient credits/i.test(error.message)) {
      throw new InsufficientCredits(amount);
    }
    throw new Error(`spend_credits failed: ${error.message}`);
  }
  return String(data);
}

/** Grant credits. Signup bonus, a purchase, or an admin correction. */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: SpendReason,
  ref?: string,
): Promise<string> {
  if (amount <= 0) throw new Error("grant amount must be positive");
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("credit_ledger")
    .insert({ user_id: userId, delta: amount, reason, ref })
    .select("id")
    .single();
  if (error) throw new Error(`grant failed: ${error.message}`);
  return data.id;
}

/**
 * A guest who bought a single certificate has no account to bill, so the
 * entitlement is recorded against the email from the Stripe session. The
 * verification carries the same ledger id, so the paper trail is identical.
 */
export async function grantGuestCredits(
  guestEmail: string,
  amount: number,
  ref: string,
): Promise<string> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("credit_ledger")
    .insert({ guest_email: guestEmail, delta: amount, reason: "purchase", ref })
    .select("id")
    .single();
  if (error) throw new Error(`guest grant failed: ${error.message}`);
  return data.id;
}

/**
 * Give a spend back when the work could not be completed. A member should
 * never pay for a verification that failed on our side.
 */
export async function refundSpend(
  userId: string,
  amount: number,
  ref: string,
): Promise<void> {
  await grantCredits(userId, amount, "refund_failed", ref);
}

export async function ledgerFor(userId: string, limit = 50) {
  const sb = createAdminClient();
  const { data } = await sb
    .from("credit_ledger")
    .select("id, delta, reason, ref, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
