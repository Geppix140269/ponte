"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// Fields a user may edit on their own profile. Trust score, verification level,
// role, and plan are deliberately NOT here (set by the system / admin).
export interface ProfileEdit {
  full_name?: string;
  title?: string;
  company?: string;
  country?: string;
  account_type?: "buyer" | "seller" | "trader" | "enterprise";
  languages?: string[];
  commodities?: string[];
  regions_served?: string[];
  years_active?: number | null;
  typical_deal_size?: string | null;
  bio?: string | null;
}

export async function updateOwnProfile(edit: ProfileEdit): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("profiles").update(edit).eq("id", user.id); // RLS: own row only
  if (error) return { error: error.message };
  revalidatePath("/network/profile/edit");
  revalidatePath(`/network/profile/${user.id}`);
  return { ok: true };
}
