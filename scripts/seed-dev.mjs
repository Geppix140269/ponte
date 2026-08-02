#!/usr/bin/env node
/**
 * Seed the DEVELOPMENT database with a signed-in test account and enough real
 * records that the signed-in surfaces render something.
 *
 * ## Why this exists (issue #84)
 *
 * Until now there was no development database, so no local session, so no way
 * to open any signed-in page. Every check, every claim of "verified", and every
 * automated test covered only what a signed-out visitor sees.
 *
 * On 2 August 2026 that cost a working day. `/deal-rooms/propose` answered a
 * hard 500 on a deployment, and it took three wrong diagnoses to find out why,
 * because the whole signed-in half of the product was outside everything that
 * could be run. Two genuine faults were found on the way - a crash on an
 * unrecognised market family, and three routes that 500 rather than degrade
 * when Supabase is unconfigured - and neither was the reported one.
 *
 * A dev database is not developer comfort. It is the difference between
 * verifying and guessing.
 *
 * ## Safety: this refuses to run against anything but a local stack
 *
 * The guard below is the whole reason this file can be trusted. It checks the
 * Supabase URL is loopback before it writes a single row. A seeder that can be
 * pointed at production by an environment variable is one typo from being a
 * production incident, and this one creates users.
 *
 * ## Why the Auth Admin API and not SQL
 *
 * A signed-in test account needs an `auth.users` row, a matching
 * `auth.identities` row and a correctly hashed password. Hand-written INSERTs
 * get the first, usually miss the second, and produce an account that exists
 * and cannot sign in - which looks exactly like a broken login page.
 *
 *   node scripts/seed-dev.mjs
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** The account every signed-in check uses. Credentials are not a secret: this
 *  account exists only in a database that lives on one machine. */
export const TEST_ACCOUNT = {
  email: "dev@ponte.local",
  password: "ponte-dev-password",
  fullName: "Dev Tester",
  company: "Ponte Dev Trading Ltd",
};

/* ------------------------------------------------------------------ *
 * The guard. Nothing below runs until this passes.
 * ------------------------------------------------------------------ */

function assertLocal(url) {
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Run this through `npm run dev:db`.");
  }
  let host;
  try {
    host = new globalThis.URL(url).hostname;
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a URL: ${url}`);
  }
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "host.docker.internal";
  if (!local) {
    throw new Error(
      `REFUSING TO SEED. ${host} is not a local stack.\n` +
        "This script creates users and writes rows. It runs against a loopback\n" +
        "Supabase only, and there is deliberately no flag to override that.",
    );
  }
}

/* ------------------------------------------------------------------ *
 * Fixtures: one record per family, so every journey has something real
 * ------------------------------------------------------------------ */

/**
 * Three listings, one per market family.
 *
 * Not three products. The families take different journeys, ask for different
 * facts and render different screens, so a fixture set that is all products
 * leaves two thirds of the intake untested and every family-specific bug
 * invisible.
 *
 * The fourth is the one that matters most: a record whose `market_family` is a
 * value this build does not recognise. That exact shape crashed
 * `/deal-rooms/propose` for signed-in members, and a seed that only contains
 * well-formed rows would never have caught it.
 */
function listingsFor(userId) {
  const base = { user_id: userId, status: "approved", payment_terms: "30% advance, 70% against documents" };
  return [
    {
      ...base,
      type: "offer",
      product: "Organic extra virgin olive oil",
      market_family: "products",
      market_intent: "offer_product",
      quantity: 24,
      unit: "t",
      incoterm: "FOB",
      origin: "Spain",
      destination: "Germany",
      hs_code: "150910",
    },
    {
      ...base,
      type: "requirement",
      product: "Refined cane sugar ICUMSA 45",
      market_family: "products",
      market_intent: "source_product",
      quantity: 500,
      unit: "MT",
      incoterm: "CIF",
      origin: "Brazil",
      destination: "Spain",
      hs_code: "170199",
    },
    {
      ...base,
      type: "offer",
      product: "Freight forwarding, Europe to South America",
      market_family: "services",
      market_intent: "offer_trade_service",
      service_category_key: "freight_forwarding",
      coverage_scope_key: "europe_south_america",
    },
    {
      ...base,
      type: "offer",
      product: "Distribution partner sought, food and beverage",
      market_family: "distribution",
      market_intent: "seek_distribution_partner",
      distribution_partner_type_key: "importer_distributor",
      product_sector_key: "food_and_beverage",
      territory_codes: ["ES", "PT"],
    },
    {
      ...base,
      type: "offer",
      product: "Legacy record with an unrecognised family",
      // NOT a typo. This is the shape that crashed /deal-rooms/propose for
      // signed-in members on 2 August 2026, and it is seeded on purpose so the
      // regression is reachable by hand as well as by test.
      market_family: "goods",
      market_intent: "offer_product",
      quantity: 10,
      unit: "t",
    },
  ];
}

/* ------------------------------------------------------------------ */

async function main() {
  assertLocal(URL);
  if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");

  const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Idempotent: re-seeding must not fail on the second run, because the whole
  // point is that anybody can reset and re-seed without thinking about it.
  const { data: existing } = await admin.auth.admin.listUsers();
  const already = existing?.users?.find((u) => u.email === TEST_ACCOUNT.email);

  let userId;
  if (already) {
    userId = already.id;
    console.log(`user      ${TEST_ACCOUNT.email} (existing)`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_ACCOUNT.email,
      password: TEST_ACCOUNT.password,
      // Confirmed on creation. Without this the account exists and cannot sign
      // in, which is indistinguishable from a broken login page.
      email_confirm: true,
      user_metadata: { full_name: TEST_ACCOUNT.fullName },
    });
    if (error) throw new Error(`could not create the test user: ${error.message}`);
    userId = data.user.id;
    console.log(`user      ${TEST_ACCOUNT.email} (created)`);
  }

  // The profile row. Upserted rather than inserted, for the same reason.
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email: TEST_ACCOUNT.email, full_name: TEST_ACCOUNT.fullName }, { onConflict: "id" });
  if (profileError) {
    // Reported, not fatal: the column set differs across schema generations and
    // a missing optional column should not stop the account being usable.
    console.warn(`profile   could not be written (${profileError.message})`);
  } else {
    console.log("profile   ok");
  }

  const { error: clearError } = await admin.from("listings").delete().eq("user_id", userId);
  if (clearError) console.warn(`listings  could not clear existing (${clearError.message})`);

  let written = 0;
  for (const listing of listingsFor(userId)) {
    const { error } = await admin.from("listings").insert(listing);
    if (error) {
      // One failing fixture must not lose the rest. A schema that has moved on
      // is a finding to report, not a reason to seed nothing.
      console.warn(`listing   "${listing.product}" skipped (${error.message})`);
      continue;
    }
    written++;
  }
  console.log(`listings  ${written} of ${listingsFor(userId).length} written`);

  console.log("");
  console.log("Sign in at http://localhost:3000/login");
  console.log(`  email     ${TEST_ACCOUNT.email}`);
  console.log(`  password  ${TEST_ACCOUNT.password}`);
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
