// Server-side assembly of a deal room view, with contact masking applied to
// messages until both parties accept.
import "server-only";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { renderMessageBody } from "@/lib/network/contact-gate";
import type { DealStage } from "@/lib/types/network";

export interface DealMessage { id: string; sender_id: string; body: string; created_at: string }
export interface DealDocument { id: string; name: string; uploader_id: string | null; created_at: string }
export interface DealEvent { id: string; type: string; detail: string | null; actor_id: string | null; created_at: string }
export interface DealParticipant { id: string; full_name: string | null; company: string | null; trust_score: number; verification_level: string }

export interface DealRoom {
  id: string;
  stage: DealStage;
  title: string | null;
  listing_id: string | null;
  contactUnlocked: boolean;
  viewerRole: "initiator" | "counterparty";
  viewerAccepted: boolean;
  counterpartyAccepted: boolean;
  initiator: DealParticipant | null;
  counterparty: DealParticipant | null;
  messages: DealMessage[];
  documents: DealDocument[];
  events: DealEvent[];
}

const PCOLS = "id, full_name, company, trust_score, verification_level";

// List the deals the signed-in user participates in (RLS returns only those).
export async function listMyDeals() {
  const user = await getUser();
  if (!user) return [];
  const sb = createClient();
  const { data } = await sb.from("deals")
    .select("id, title, stage, created_at, initiator_id, counterparty_id, listing_id")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getDealRoom(dealId: string): Promise<DealRoom | null> {
  const user = await getUser();
  if (!user) return null;
  const admin = createAdminClient();

  const { data: deal } = await admin.from("deals")
    .select("id, stage, title, listing_id, contact_unlocked, initiator_id, counterparty_id, initiator_accepted_contact, counterparty_accepted_contact")
    .eq("id", dealId).maybeSingle();
  if (!deal) return null;

  const viewerRole: "initiator" | "counterparty" | null =
    deal.initiator_id === user.id ? "initiator" : deal.counterparty_id === user.id ? "counterparty" : null;
  if (!viewerRole) return null; // not a participant

  const unlocked = Boolean(deal.contact_unlocked);

  const [{ data: msgs }, { data: docs }, { data: events }, { data: initiator }, { data: counterparty }] = await Promise.all([
    admin.from("messages").select("id, sender_id, body, created_at").eq("deal_id", dealId).order("created_at", { ascending: true }),
    admin.from("deal_documents").select("id, name, uploader_id, created_at").eq("deal_id", dealId).order("created_at", { ascending: true }),
    admin.from("deal_events").select("id, type, detail, actor_id, created_at").eq("deal_id", dealId).order("created_at", { ascending: true }),
    admin.from("profiles").select(PCOLS).eq("id", deal.initiator_id).maybeSingle(),
    deal.counterparty_id ? admin.from("profiles").select(PCOLS).eq("id", deal.counterparty_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const messages: DealMessage[] = (msgs ?? []).map((m: { id: string; sender_id: string; body: string; created_at: string }) => ({
    ...m, body: renderMessageBody(m.body, unlocked),
  }));

  return {
    id: deal.id as string,
    stage: deal.stage as DealStage,
    title: deal.title as string | null,
    listing_id: deal.listing_id as string | null,
    contactUnlocked: unlocked,
    viewerRole,
    viewerAccepted: viewerRole === "initiator" ? Boolean(deal.initiator_accepted_contact) : Boolean(deal.counterparty_accepted_contact),
    counterpartyAccepted: viewerRole === "initiator" ? Boolean(deal.counterparty_accepted_contact) : Boolean(deal.initiator_accepted_contact),
    initiator: (initiator as DealParticipant) ?? null,
    counterparty: (counterparty as DealParticipant) ?? null,
    messages,
    documents: (docs ?? []) as DealDocument[],
    events: (events ?? []) as DealEvent[],
  };
}
