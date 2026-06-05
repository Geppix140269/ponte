// Seeds the trade-network demo data: admin + 3 demo users, 2 organizations,
// sample listings, and one deal room with messages.
//
// Idempotent: re-running updates existing rows instead of duplicating.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.
//
// Run:  node --experimental-strip-types scripts/seed-broker-network.ts
//
// Demo logins (password for all): Ponte-Demo-2026!
//   admin@ponte.trade   — platform admin
//   trader@ponte.trade  — verified trader / principal trading house (Pro)
//   buyer@ponte.trade    — buyer (Starter)
//   seller@ponte.trade   — seller (Free)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "Ponte-Demo-2026!";

type DemoUser = {
  email: string;
  full_name: string;
  role: "customer" | "admin";
  account_type?: "buyer" | "seller" | "trader" | "enterprise";
  plan?: "free" | "starter" | "pro" | "enterprise";
  verified_trader?: boolean;
  verification_level?: string;
  trust_score?: number;
  country?: string;
  commodities?: string[];
  regions_served?: string[];
  years_active?: number;
};

const USERS: DemoUser[] = [
  { email: "admin@ponte.trade", full_name: "Platform Admin", role: "admin", plan: "enterprise", trust_score: 100 },
  {
    email: "trader@ponte.trade", full_name: "Maria Trader", role: "customer",
    account_type: "trader", plan: "pro", verified_trader: true,
    verification_level: "fully_verified", trust_score: 85, country: "Netherlands",
    commodities: ["Coffee", "Cocoa", "Sugar"], regions_served: ["EU", "West Africa"], years_active: 12,
  },
  {
    email: "buyer@ponte.trade", full_name: "John Buyer", role: "customer",
    account_type: "buyer", plan: "starter", verification_level: "company_verified",
    trust_score: 60, country: "Germany", commodities: ["Coffee"], regions_served: ["EU"], years_active: 5,
  },
  {
    email: "seller@ponte.trade", full_name: "Amara Seller", role: "customer",
    account_type: "seller", plan: "free", verification_level: "email_verified",
    trust_score: 45, country: "Côte d'Ivoire", commodities: ["Cocoa"], regions_served: ["West Africa"], years_active: 3,
  },
];

// Find an auth user by email (paged), or create one. Returns the user id.
async function ensureAuthUser(u: DemoUser): Promise<string> {
  // Search existing
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) break;
    page++;
  }
  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log("Seeding trade-network demo data...");

  // 1. Users + profiles
  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const id = await ensureAuthUser(u);
    ids[u.email] = id;
    const { error } = await db.from("profiles").upsert({
      id,
      full_name: u.full_name,
      role: u.role,
      account_type: u.account_type ?? null,
      plan: u.plan ?? "free",
      verified_trader: u.verified_trader ?? false,
      verification_level: u.verification_level ?? "unverified",
      trust_score: u.trust_score ?? 40,
      country: u.country ?? null,
      commodities: u.commodities ?? null,
      regions_served: u.regions_served ?? null,
      years_active: u.years_active ?? null,
    });
    if (error) throw error;
    console.log(`  profile: ${u.email}`);
  }

  // 2. Organizations (deterministic ids so re-runs are idempotent)
  const ORG_TRADER = "11111111-1111-1111-1111-111111111111";
  const ORG_SELLER = "22222222-2222-2222-2222-222222222222";
  const orgs = [
    { id: ORG_TRADER, name: "Rotterdam Commodity Partners BV", country: "Netherlands",
      website: "https://rcp.example", owner_id: ids["trader@ponte.trade"],
      name_normalized: "rotterdam commodity partners bv", domain_normalized: "rcp.example",
      verification_level: "company_verified", trust_score: 85 },
    { id: ORG_SELLER, name: "Abidjan Cocoa Exporters SA", country: "Côte d'Ivoire",
      website: "https://ace.example", owner_id: ids["seller@ponte.trade"],
      name_normalized: "abidjan cocoa exporters sa", domain_normalized: "ace.example",
      verification_level: "email_verified", trust_score: 45 },
  ];
  for (const o of orgs) {
    const { error } = await db.from("organizations").upsert(o);
    if (error) throw error;
    console.log(`  org: ${o.name}`);
  }
  // link trader + seller profiles to their orgs
  await db.from("profiles").update({ organization_id: ORG_TRADER }).eq("id", ids["trader@ponte.trade"]);
  await db.from("profiles").update({ organization_id: ORG_SELLER }).eq("id", ids["seller@ponte.trade"]);

  // 3. Listings
  const LIST_COCOA = "33333333-3333-3333-3333-333333333333";
  const LIST_COFFEE = "44444444-4444-4444-4444-444444444444";
  const listings = [
    { id: LIST_COCOA, owner_id: ids["seller@ponte.trade"], organization_id: ORG_SELLER,
      listing_type: "offer", commodity: "Cocoa Beans", hs_code: "1801.00",
      origin_country: "Côte d'Ivoire", quantity: 500, unit: "MT", incoterms: "FOB",
      loading_port: "Abidjan", price_cents: 285000_00, currency: "USD",
      specifications: "Grade I, moisture <7.5%, 2025/26 main crop.",
      status: "active", moderation_status: "approved" },
    { id: LIST_COFFEE, owner_id: ids["trader@ponte.trade"], organization_id: ORG_TRADER,
      listing_type: "request", commodity: "Green Coffee (Arabica)", hs_code: "0901.11",
      origin_country: "Brazil", destination_country: "Netherlands", quantity: 200, unit: "MT",
      incoterms: "CIF", loading_port: "Santos", price_on_request: true,
      specifications: "Santos NY2/3, screen 17/18, looking for verified mills.",
      status: "active", moderation_status: "approved" },
  ];
  for (const l of listings) {
    const { error } = await db.from("listings").upsert(l);
    if (error) throw error;
    console.log(`  listing: ${l.commodity}`);
  }

  // 4. A deal room: buyer enquires on the seller's cocoa listing
  const DEAL = "55555555-5555-5555-5555-555555555555";
  const { error: dealErr } = await db.from("deals").upsert({
    id: DEAL, listing_id: LIST_COCOA,
    initiator_id: ids["buyer@ponte.trade"], counterparty_id: ids["seller@ponte.trade"],
    stage: "negotiation", title: "Cocoa Beans 500MT — Q3 enquiry", contact_unlocked: false,
  });
  if (dealErr) throw dealErr;

  // messages (clear existing for this deal first, to stay idempotent)
  await db.from("messages").delete().eq("deal_id", DEAL);
  await db.from("messages").insert([
    { deal_id: DEAL, sender_id: ids["buyer@ponte.trade"], body: "Interested in your 500MT cocoa offer. Can you confirm 2025/26 main crop and FOB Abidjan?" },
    { deal_id: DEAL, sender_id: ids["seller@ponte.trade"], body: "Confirmed. Grade I, moisture under 7.5%. Can share SGS report inside the deal room." },
    { deal_id: DEAL, sender_id: ids["buyer@ponte.trade"], body: "Great. What is your best CIF Hamburg indication for 200MT to start?" },
  ]);
  console.log("  deal room: 1 deal, 3 messages");

  // 5. Sample notification + a trust event for the trader
  await db.from("notifications").insert({
    profile_id: ids["trader@ponte.trade"], type: "verification",
    title: "You are now a Verified Trader", body: "Your company verification was approved.", read: false,
  });
  await db.from("trust_score_events").insert({
    profile_id: ids["trader@ponte.trade"], delta: 15, reason: "company_verified", new_score: 85,
  });

  console.log("Done. Demo password for all accounts: " + PASSWORD);
}

main().catch((e) => { console.error(e); process.exit(1); });
