"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getSettlementProvider } from "@/lib/settlement";
import { buildMilestonePlan, feeCents } from "@/lib/settlement/plan";

export interface DealSettlementMilestone {
  id: string; seq: number; label: string; amountCents: number;
  trigger: string; requiredDocType: string | null; status: string;
}
export interface DealSettlement {
  id: string; status: string; currency: string;
  totalCents: number; feeCents: number; heldCents: number; releasedCents: number;
  milestones: DealSettlementMilestone[];
}

async function assertParticipant(dealId: string, userId: string): Promise<boolean> {
  const sb = createAdminClient();
  const { data } = await sb.from("deals").select("initiator_id, counterparty_id").eq("id", dealId).maybeSingle();
  if (!data) return false;
  return data.initiator_id === userId || data.counterparty_id === userId;
}

async function logEvent(settlementId: string, milestoneId: string | null, actorId: string | null, type: string, detail?: string) {
  const sb = createAdminClient();
  await sb.from("settlement_events").insert({ settlement_id: settlementId, milestone_id: milestoneId, actor_id: actorId, type, detail: detail ?? null });
}

// Read the settlement for a deal (for the deal-room panel).
export async function getDealSettlement(dealId: string): Promise<DealSettlement | null> {
  const sb = createAdminClient();
  const { data: s } = await sb.from("settlements")
    .select("id, status, currency, total_cents, fee_bps").eq("deal_id", dealId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!s) return null;
  const { data: ms } = await sb.from("settlement_milestones")
    .select("id, seq, label, amount_cents, trigger_type, required_doc_type, status")
    .eq("settlement_id", s.id).order("seq", { ascending: true });
  const milestones: DealSettlementMilestone[] = (ms ?? []).map((m: any) => ({
    id: m.id, seq: m.seq, label: m.label, amountCents: m.amount_cents,
    trigger: m.trigger_type, requiredDocType: m.required_doc_type, status: m.status,
  }));
  const released = milestones.filter((m) => m.status === "released").reduce((a, m) => a + m.amountCents, 0);
  const funded = s.status === "draft" ? 0 : milestones.reduce((a, m) => a + m.amountCents, 0);
  return {
    id: s.id, status: s.status, currency: s.currency,
    totalCents: s.total_cents, feeCents: feeCents(s.total_cents, s.fee_bps),
    heldCents: Math.max(0, funded - released), releasedCents: released, milestones,
  };
}

// Create a "Secured by ponte" escrow with the default milestone ladder.
export async function createSettlement(dealId: string, totalCents: number, currency = "USD"): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  if (!(await assertParticipant(dealId, user.id))) return { error: "forbidden" };
  if (!Number.isFinite(totalCents) || totalCents <= 0) return { error: "invalid_amount" };

  const sb = createAdminClient();
  const { data: existing } = await sb.from("settlements").select("id").eq("deal_id", dealId).maybeSingle();
  if (existing) return { error: "settlement_exists" };

  const milestones = buildMilestonePlan(totalCents);
  const escrow = await getSettlementProvider().createEscrow({ dealId, currency, totalCents, feeBps: 60, milestones });

  const { data: s, error } = await sb.from("settlements").insert({
    deal_id: dealId, currency, total_cents: totalCents, fee_bps: 60, status: "draft",
    provider: escrow.providerRef.startsWith("esc_mock") ? "mock" : "live", provider_ref: escrow.providerRef,
  }).select("id").single();
  if (error) return { error: error.message };

  await sb.from("settlement_milestones").insert(milestones.map((m) => ({
    settlement_id: s.id, seq: m.seq, label: m.label, amount_cents: m.amountCents,
    trigger_type: m.trigger, required_doc_type: m.requiredDocType ?? null, status: "pending",
  })));
  await logEvent(s.id as string, null, user.id, "created", `${(totalCents / 100).toLocaleString()} ${currency}`);
  revalidatePath(`/network/deals/${dealId}`);
  return { ok: true };
}

// Buyer funds the escrow (mock: marks the whole escrow funded).
export async function fundSettlement(settlementId: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createAdminClient();
  const { data: s } = await sb.from("settlements").select("id, deal_id, total_cents, provider_ref").eq("id", settlementId).maybeSingle();
  if (!s) return { error: "not_found" };
  if (!(await assertParticipant(s.deal_id as string, user.id))) return { error: "forbidden" };

  await getSettlementProvider().fundEscrow(s.provider_ref as string, s.total_cents as number);
  await sb.from("settlements").update({ status: "funded" }).eq("id", settlementId);
  await sb.from("settlement_milestones").update({ status: "funded" }).eq("settlement_id", settlementId).eq("status", "pending");
  await logEvent(settlementId, null, user.id, "funded");
  revalidatePath(`/network/deals/${s.deal_id}`);
  return { ok: true };
}

// Release one milestone (mock).
export async function releaseSettlementMilestone(milestoneId: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createAdminClient();
  const { data: m } = await sb.from("settlement_milestones").select("id, settlement_id, seq, status").eq("id", milestoneId).maybeSingle();
  if (!m) return { error: "not_found" };
  const { data: s } = await sb.from("settlements").select("id, deal_id, provider_ref").eq("id", m.settlement_id).maybeSingle();
  if (!s) return { error: "not_found" };
  if (!(await assertParticipant(s.deal_id as string, user.id))) return { error: "forbidden" };

  await getSettlementProvider().releaseMilestone(s.provider_ref as string, m.seq as number);
  await sb.from("settlement_milestones").update({ status: "released", released_at: new Date().toISOString() }).eq("id", milestoneId);

  const { data: all } = await sb.from("settlement_milestones").select("status").eq("settlement_id", s.id);
  const allReleased = (all ?? []).every((x: any) => x.status === "released");
  await sb.from("settlements").update({ status: allReleased ? "released" : "partially_released" }).eq("id", s.id);
  await logEvent(s.id as string, milestoneId, user.id, "released");
  revalidatePath(`/network/deals/${s.deal_id}`);
  return { ok: true };
}
