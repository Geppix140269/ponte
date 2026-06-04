import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// Throws if the caller is not an admin. Returns the admin's user id.
export async function assertAdmin(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  const sb = createClient();
  const { data } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") throw new Error("Forbidden");
  return user.id;
}
