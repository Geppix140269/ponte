"use server";
import { track } from "@/lib/analytics/track";
import { EVENT } from "@/lib/analytics/events";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { canCreateListing, canCreateListingType, type Principal } from "@/lib/rbac";
import { moderateListing } from "@/lib/network/moderation";
import { maskContactInfo } from "@/lib/network/contact-mask";
import { isWithinActivityLimit, flagSuspiciousActivity } from "@/lib/network/fraud-service";
import { listingMatchesFilters } from "@/lib/network/listing-match";
import { createNotification } from "@/lib/network/notifications";
import type { ListingType } from "@/lib/types/network";

export interface ListingInput {
  listing_type: ListingType;
  commodity: string;
  hs_code?: string | null;
  origin_country?: string | null;
  destination_country?: string | null;
  quantity?: number | null;
  unit?: string | null;
  incoterms?: string | null;
  loading_port?: string | null;
  price_cents?: number | null;
  currency?: string;
  price_on_request?: boolean;
  specifications?: string | null;
}

async function loadPrincipal(): Promise<{ user: { id: string }; principal: Principal } | null> {
  const user = await getUser();
  if (!user) return null;
  const sb = createClient();
  const { data } = await sb.from("profiles")
    .select("id, role, account_type, plan, plan_status, verified_trader")
    .eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { user: { id: user.id }, principal: data as Principal };
}

export async function countActiveListings(ownerId: string): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb.from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId).eq("status", "active");
  return count ?? 0;
}

export async function createListing(
  input: ListingInput,
): Promise<{ ok?: true; id?: string; error?: string; moderation?: string; reasons?: string[] }> {
  const ctx = await loadPrincipal();
  if (!ctx) return { error: "unauthorized" };
  const { user, principal } = ctx;

  if (!input.commodity?.trim()) return { error: "commodity_required" };
  if (!canCreateListingType(principal, input.listing_type)) {
    return { error: `Your account type cannot post a ${input.listing_type}.` };
  }

  const activeCount = await countActiveListings(user.id);
  const limit = canCreateListing(principal, activeCount);
  if (!limit.allowed) return { error: limit.reason ?? "listing_limit_reached" };

  // Moderation: reject outright, or flag for review.
  const mod = moderateListing({ commodity: input.commodity, specifications: input.specifications });
  if (mod.status === "rejected") {
    return { error: "Listing rejected by moderation.", moderation: "rejected", reasons: mod.reasons };
  }

  // Hide any direct contact details from the public specifications field.
  const spec = input.specifications ? maskContactInfo(input.specifications).masked : null;

  // Suspicious-activity guard: too many new listings in a short window.
  let moderationStatus = mod.status; // 'approved' | 'flagged'
  if (!isWithinActivityLimit(user.id, "listing_create", 12, 60 * 60 * 1000)) {
    moderationStatus = "flagged";
    await flagSuspiciousActivity("user", user.id, "Burst of listing creation");
  }

  const sb = createClient(); // RLS: owner_id must be the caller
  const { data, error } = await sb.from("listings").insert({
    owner_id: user.id,
    listing_type: input.listing_type,
    commodity: input.commodity,
    hs_code: input.hs_code ?? null,
    origin_country: input.origin_country ?? null,
    destination_country: input.destination_country ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    incoterms: input.incoterms ?? null,
    loading_port: input.loading_port ?? null,
    price_cents: input.price_on_request ? null : input.price_cents ?? null,
    currency: input.currency ?? "USD",
    price_on_request: input.price_on_request ?? false,
    specifications: spec,
    status: "active",
    moderation_status: moderationStatus,
    moderation_reasons: mod.reasons.length ? mod.reasons : null,
  }).select("id").single();
  if (error) return { error: error.message };

  // Alert users whose saved search matches this newly published listing.
  if (moderationStatus === "approved") {
    try {
      const admin = createAdminClient();
      const { data: searches } = await admin.from("saved_searches").select("profile_id, filters");
      const listingLike = { commodity: input.commodity, origin_country: input.origin_country ?? null, destination_country: input.destination_country ?? null, listing_type: input.listing_type, hs_code: input.hs_code ?? null };
      const notified = new Set<string>();
      for (const row of (searches ?? []) as { profile_id: string; filters: Record<string, unknown> }[]) {
        if (row.profile_id === user.id || notified.has(row.profile_id)) continue;
        if (listingMatchesFilters(listingLike, (row.filters ?? {}) as never)) {
          notified.add(row.profile_id);
          await createNotification(row.profile_id, { type: "listing", title: "New listing matches your search", body: input.commodity, link: `/network/listings/${data.id}` });
        }
      }
    } catch { /* best-effort */ }
  }
  await track(EVENT.listing_published, { commodity: input.commodity, type: input.listing_type, moderation: moderationStatus }, { profileId: user.id });
  revalidatePath("/network/listings");
  return { ok: true, id: data.id as string, moderation: moderationStatus };
}

export async function updateListing(
  id: string, input: Partial<ListingInput>,
): Promise<{ ok?: true; error?: string; moderation?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const sb = createClient();

  const patch: Record<string, unknown> = { ...input };
  // Re-moderate + re-mask if the text fields changed.
  if (input.commodity !== undefined || input.specifications !== undefined) {
    const mod = moderateListing({ commodity: input.commodity, specifications: input.specifications });
    if (mod.status === "rejected") return { error: "Listing rejected by moderation.", moderation: "rejected" };
    if (input.specifications !== undefined) patch.specifications = input.specifications ? maskContactInfo(input.specifications).masked : null;
    patch.moderation_status = mod.status;
    patch.moderation_reasons = mod.reasons.length ? mod.reasons : null;
  }
  if (input.price_on_request) patch.price_cents = null;

  const { error } = await sb.from("listings").update(patch).eq("id", id); // RLS: own only
  if (error) return { error: error.message };
  revalidatePath("/network/listings");
  revalidatePath(`/network/listings/${id}`);
  return { ok: true };
}

export async function setListingStatus(
  id: string, status: "active" | "paused" | "closed",
): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("listings").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/network/listings");
  revalidatePath(`/network/listings/${id}`);
  return { ok: true };
}

export async function deleteListing(id: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("listings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/network/listings");
  return { ok: true };
}
