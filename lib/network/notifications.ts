"use server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export interface NotificationInput { type: string; title: string; body?: string; link?: string }
export interface NotificationRow {
  id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string;
}

// Create a notification for a profile (service role; called from server actions).
export async function createNotification(profileId: string, input: NotificationInput): Promise<void> {
  if (!profileId) return;
  const sb = createAdminClient();
  await sb.from("notifications").insert({
    profile_id: profileId, type: input.type, title: input.title, body: input.body ?? null, link: input.link ?? null,
  }).then(() => {}, () => {});
}

export async function listMyNotifications(limit = 50): Promise<NotificationRow[]> {
  const user = await getUser(); if (!user) return [];
  const sb = createClient();
  const { data } = await sb.from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("profile_id", user.id).order("created_at", { ascending: false }).limit(limit);
  return (data as NotificationRow[]) ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const user = await getUser(); if (!user) return 0;
  const sb = createClient();
  const { count } = await sb.from("notifications")
    .select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("read", false);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("notifications").update({ read: true }).eq("id", id).eq("profile_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/network/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok?: true; error?: string }> {
  const user = await getUser(); if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("notifications").update({ read: true }).eq("profile_id", user.id).eq("read", false);
  if (error) return { error: error.message };
  revalidatePath("/network/notifications");
  return { ok: true };
}
