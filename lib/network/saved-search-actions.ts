"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import type { ListingFilters } from "@/lib/network/listing-filters";

export interface SavedSearchRow { id: string; name: string; filters: ListingFilters; created_at: string }

export async function saveSearch(name: string, filters: ListingFilters): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("saved_searches").insert({ profile_id: user.id, name: name || "Saved search", filters });
  if (error) return { error: error.message };
  revalidatePath("/network/listings");
  return { ok: true };
}
export async function listMySavedSearches(): Promise<SavedSearchRow[]> {
  const user = await getUser(); if (!user) return [];
  const sb = createClient();
  const { data } = await sb.from("saved_searches").select("id, name, filters, created_at").eq("profile_id", user.id).order("created_at", { ascending: false });
  return (data as SavedSearchRow[]) ?? [];
}
export async function deleteSavedSearch(id: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("saved_searches").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/network/listings");
  return { ok: true };
}
