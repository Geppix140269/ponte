// Sets a profile's role to 'admin' by email.
// Run:  node scripts/make-admin.mjs you@example.com
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (already in .env).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
if (!url || !key || !email) {
  console.error("Usage: node scripts/make-admin.mjs <email>  (with Supabase env set)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let uid = null, page = 1;
while (page <= 25) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (u) { uid = u.id; break; }
  if (data.users.length < 200) break;
  page++;
}
if (!uid) { console.error(`No user found for ${email}`); process.exit(1); }

const { error } = await db.from("profiles").update({ role: "admin" }).eq("id", uid);
if (error) throw error;
console.log(`OK: ${email} is now an admin.`);
