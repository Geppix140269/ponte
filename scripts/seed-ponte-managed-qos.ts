// Seed a small number of GENUINE Ponte-desk Qualified Opportunities.
//
//   npx tsx scripts/seed-ponte-managed-qos.ts [--dry]
//
// Why this exists: the Find journey needs at least one openable Qualified
// Opportunity to demonstrate the open -> request-introduction path while the
// member board is still filling. These are REAL desk-brokered opportunities
// (desk_managed = true), owned by a dedicated "Ponte Desk" account, never
// fabricated third-party members. They pass the same publication gates as any
// member listing, so a seeded account must carry a passing member-business
// verification, which this script sets up.
//
// Idempotent: the desk account, its verification and the listings are all
// found-or-created / upserted on stable keys, so re-running changes nothing.
//
// SAFE FIRST: run against a Supabase PREVIEW BRANCH, after applying
// supabase/migrations/20260724b_listings_desk_managed.sql there. Never a
// throwaway on production without review.
//
// Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DESK_EMAIL = "desk-opportunities@ponte.trade";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

// The opportunities. Honest, Ponte-desk-brokered, with a written desk
// qualification and its limitations. Refs are in a high range (PT-90xx) to avoid
// colliding with the member sequence, and match the /^PT-\d{3,6}$/ the
// introduction API validates.
const LISTINGS = [
  {
    ref: "PT-9001",
    type: "requirement",
    product: "Refined cane sugar, ICUMSA 45",
    hs_code: "170199",
    origin: "Brazil",
    destination: "Algeria",
    quantity: 25000,
    unit: "MT",
    frequency: "monthly",
    incoterm: "CIF Algiers",
    payment_terms: "Irrevocable L/C at sight",
    submitter_role: "buyer",
    mandate_sighted: true,
    validity_type: "dated",
    details:
      "Ponte-brokered buyer requirement for refined cane sugar, ICUMSA 45, 25,000 MT monthly into Algiers on CIF terms. Ponte holds the commercial record and manages the introduction.",
    desk_version: {
      qualification:
        "Ponte reviewed the structured commercial record and holds the buyer's mandate for this requirement.",
      limitations:
        "Final price, shipping schedule and contract terms are settled directly between the parties. Ponte does not guarantee completion.",
    },
  },
  {
    ref: "PT-9002",
    type: "offer",
    product: "Dried chickpeas, 8mm Kabuli",
    hs_code: "071320",
    origin: "Argentina",
    destination: "India",
    quantity: 5000,
    unit: "MT",
    frequency: "quarterly",
    incoterm: "FOB Rosario",
    payment_terms: "30% advance, balance against documents",
    submitter_role: "seller",
    mandate_sighted: true,
    validity_type: "dated",
    details:
      "Ponte-brokered supplier offer for 8mm Kabuli dried chickpeas, 5,000 MT quarterly, FOB Rosario. Ponte holds the commercial record and manages the introduction.",
    desk_version: {
      qualification:
        "Ponte reviewed the structured commercial record and holds the supplier's mandate for this offer.",
      limitations:
        "Quality on arrival, final pricing and logistics are agreed directly between the parties. Ponte does not guarantee completion.",
    },
  },
] as const;

async function main(): Promise<void> {
  loadEnvLocal();
  const dry = process.argv.includes("--dry");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  if (dry) {
    console.log(`--dry: would seed ${LISTINGS.length} Ponte-managed opportunities as ${DESK_EMAIL}`);
    for (const l of LISTINGS) console.log(`  ${l.ref}  ${l.type}  ${l.product}`);
    return;
  }

  // 1. The Ponte Desk account (found or created).
  const deskId = await ensureDeskUser(sb);
  console.log(`desk account: ${deskId}`);

  // 2. A passing member-business verification bound to that account, so the
  //    opportunities clear the publication gate exactly as a member's would.
  const verificationId = await ensureDeskVerification(sb, deskId);

  // verification_level is a TEXT enum (unverified | email_verified |
  // phone_verified | company_verified | fully_verified), NOT an integer. The
  // publication gate keys off business_verification_id + the bound
  // verification's status; company_verified is the truthful level for a checked
  // business. The error is surfaced, not swallowed, so a failed bind never
  // leaves the desk account silently unverified.
  const { error: profileErr } = await sb.from("profiles").upsert(
    {
      id: deskId,
      full_name: "Ponte Desk",
      company: "Ponte Trade",
      verification_level: "company_verified",
      business_verification_id: verificationId,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(`could not bind desk profile: ${profileErr.message}`);

  // 3. The opportunities themselves.
  const nowIso = new Date().toISOString();
  const validUntil = new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10);
  const rows = LISTINGS.map((l) => ({
    ...l,
    desk_version: l.desk_version,
    user_id: deskId,
    status: "approved",
    desk_managed: true,
    valid_until: validUntil,
    reconfirmed_at: nowIso,
    decided_at: nowIso,
  }));
  const { error } = await sb.from("listings").upsert(rows, { onConflict: "ref" });
  if (error) {
    console.error(`seed failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`seeded ${rows.length} Ponte-managed opportunities (${rows.map((r) => r.ref).join(", ")}).`);
}

async function ensureDeskUser(sb: ReturnType<typeof createClient>): Promise<string> {
  // Look for the desk account across the first pages of users, else create it.
  for (let page = 1; page <= 5; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    const found = data?.users.find((u) => u.email === DESK_EMAIL);
    if (found) return found.id;
    if (!data || data.users.length < 200) break;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email: DESK_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: "Ponte Desk" },
  });
  if (error || !data?.user) throw new Error(`could not create desk user: ${error?.message}`);
  return data.user.id;
}

async function ensureDeskVerification(
  sb: ReturnType<typeof createClient>,
  deskId: string,
): Promise<string> {
  const { data: existing } = await sb
    .from("profiles")
    .select("business_verification_id")
    .eq("id", deskId)
    .maybeSingle();
  if (existing?.business_verification_id) return existing.business_verification_id;

  const { data, error } = await sb
    .from("verifications")
    .insert({
      user_id: deskId,
      subject_name: "Ponte Trade",
      subject_country: "GB",
      level_requested: 2,
      status: "verified",
      purpose: "member_business",
      verdict_reason: "Ponte Desk operating account (seed).",
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`could not create desk verification: ${error?.message}`);
  return data.id;
}

void main();
