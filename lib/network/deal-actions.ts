"use server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { canOpenDeal, type Principal } from "@/lib/rbac";
import { hasContactInfo } from "@/lib/network/contact-mask";
import { canTransition, isSuccessfulClose } from "@/lib/network/deal-stages";
import { computeContactUnlocked, acceptanceColumnFor } from "@/lib/network/contact-gate";
import { onCompletedDeal } from "@/lib/network/trust-service";
import type { DealStage } from "@/lib/types/network";

type Role = "initiator" | "counterparty";

interface DealParties {
  id: string; stage: DealStage; initiator_id: string; counterparty_id: string | null;
  initiator_accepted_contact: boolean; counterparty_accepted_contact: boolean;
}

async function loadDealForUser(dealId: string, userId: string): Promise<{ deal: DealParties; role: Role } | null> {
  const sb = createAdminClient();
  const { data } = await sb.from("deals")
    .select("id, stage, initiator_id, counterparty_id, initiator_accepted_contact, counterparty_accepted_contact")
    .eq("id", dealId).maybeSingle();
  if (!data) return null;
  const deal = data as DealParties;
  if (deal.initiator_id === userId) return { deal, role: "initiator" };
  if (deal.counterparty_id === userId) return { deal, role: "counterparty" };
  return null; // not a participant
}

async function countActiveDeals(userId: string): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb.from("deals")
    .select("id", { count: "exact", head: true })
    .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`)
    .not("stage", "in", "(closed,cancelled)");
  return count ?? 0;
}

async function logEvent(dealId: string, actorId: string | null, type: string, detail?: string) {
  const sb = createAdminClient();
  await sb.from("deal_events").insert({ deal_id: dealId, actor_id: actorId, type, detail: detail ?? null });
}

export async function createDeal(listingId: string, message?: string): Promise<{ ok?: true; id?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const admin = createAdminClient();

  const { data: listing } = await admin.from("listings").select("id, owner_id, commodity").eq("id", listingId).maybeSingle();
  if (!listing) return { error: "listing_not_found" };
  if (listing.owner_id === user.id) return { error: "cannot_enquire_own_listing" };

  const { data: prof } = await createClient().from("profiles")
    .select("id, role, account_type, plan, plan_status, verified_broker").eq("id", user.id).maybeSingle();
  if (!prof) return { error: "no_profile" };
  const limit = canOpenDeal(prof as Principal, await countActiveDeals(user.id));
  if (!limit.allowed) return { error: limit.reason ?? "deal_limit_reached" };

  const { data: deal, error } = await admin.from("deals").insert({
    listing_id: listing.id, initiator_id: user.id, counterparty_id: listing.owner_id,
    stage: "enquiry", title: `${listing.commodity} enquiry`,
  }).select("id").single();
  if (error) return { error: error.message };

  await admin.from("deal_status_history").insert({ deal_id: deal.id, from_stage: null, to_stage: "enquiry", changed_by: user.id });
  await logEvent(deal.id as string, user.id, "created", listing.commodity as string);
  if (message?.trim()) {
    await admin.from("messages").insert({ deal_id: deal.id, sender_id: user.id, body: message, contains_contact_info: hasContactInfo(message) });
    await logEvent(deal.id as string, user.id, "message");
  }
  revalidatePath("/network/deals");
  return { ok: true, id: deal.id as string };
}

export async function sendMessage(dealId: string, body: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  if (!body.trim()) return { error: "empty_message" };
  const ctx = await loadDealForUser(dealId, user.id);
  if (!ctx) return { error: "forbidden" };

  const admin = createAdminClient();
  const { error } = await admin.from("messages").insert({
    deal_id: dealId, sender_id: user.id, body, contains_contact_info: hasContactInfo(body),
  });
  if (error) return { error: error.message };
  await logEvent(dealId, user.id, "message");
  revalidatePath(`/network/deals/${dealId}`);
  return { ok: true };
}

export async function advanceStage(dealId: string, toStage: DealStage): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const ctx = await loadDealForUser(dealId, user.id);
  if (!ctx) return { error: "forbidden" };
  const { deal } = ctx;
  if (!canTransition(deal.stage, toStage)) return { error: `Cannot move from ${deal.stage} to ${toStage}.` };

  const admin = createAdminClient();
  const { error } = await admin.from("deals").update({ stage: toStage }).eq("id", dealId);
  if (error) return { error: error.message };
  await admin.from("deal_status_history").insert({ deal_id: dealId, from_stage: deal.stage, to_stage: toStage, changed_by: user.id });
  await logEvent(dealId, user.id, "stage_change", `${deal.stage} -> ${toStage}`);

  // Successful close: award completed-deal trust to both parties.
  if (isSuccessfulClose(deal.stage, toStage)) {
    const parties = [deal.initiator_id, deal.counterparty_id].filter(Boolean) as string[];
    for (const pid of parties) {
      await onCompletedDeal(pid);
      await admin.rpc("increment_completed_deals", { p_profile: pid });
    }
  }
  revalidatePath(`/network/deals/${dealId}`);
  return { ok: true };
}

export async function acceptContact(dealId: string): Promise<{ ok?: true; unlocked?: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const ctx = await loadDealForUser(dealId, user.id);
  if (!ctx) return { error: "forbidden" };
  const { deal, role } = ctx;

  const col = acceptanceColumnFor(role);
  const admin = createAdminClient();
  await admin.from("deals").update({ [col]: true }).eq("id", dealId);
  await logEvent(dealId, user.id, "contact_accepted");

  const initiatorAccepted = role === "initiator" ? true : deal.initiator_accepted_contact;
  const counterpartyAccepted = role === "counterparty" ? true : deal.counterparty_accepted_contact;
  const unlocked = computeContactUnlocked(initiatorAccepted, counterpartyAccepted);
  if (unlocked) {
    await admin.from("deals").update({ contact_unlocked: true }).eq("id", dealId);
    await logEvent(dealId, user.id, "contact_unlocked");
  }
  revalidatePath(`/network/deals/${dealId}`);
  return { ok: true, unlocked };
}

export async function uploadDealDocument(dealId: string, formData: FormData): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const ctx = await loadDealForUser(dealId, user.id);
  if (!ctx) return { error: "forbidden" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "no_file" };

  const admin = createAdminClient();
  const path = `${dealId}/${globalThis.crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await admin.storage.from("ponte-deal-docs").upload(path, file, { upsert: false });
  if (upErr) return { error: upErr.message };
  await admin.from("deal_documents").insert({ deal_id: dealId, uploader_id: user.id, name: file.name, path, size_bytes: file.size });
  await logEvent(dealId, user.id, "document", file.name);
  revalidatePath(`/network/deals/${dealId}`);
  return { ok: true };
}

export async function getDealDocumentUrl(docId: string): Promise<{ url?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const admin = createAdminClient();
  const { data: doc } = await admin.from("deal_documents").select("deal_id, path").eq("id", docId).maybeSingle();
  if (!doc) return { error: "not_found" };
  const ctx = await loadDealForUser(doc.deal_id as string, user.id);
  if (!ctx) return { error: "forbidden" };
  const { data } = await admin.storage.from("ponte-deal-docs").createSignedUrl(doc.path as string, 60 * 10);
  return { url: data?.signedUrl };
}
