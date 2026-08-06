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

/**
 * The account every signed-in check uses. Not a secret: it exists only in a
 * database that lives on one machine.
 *
 * The password is here because `auth.admin.createUser` accepts one and it makes
 * the account usable from a script. It is NOT how anybody signs in. Ponte
 * authenticates by email OTP and has no password field anywhere in the product,
 * so the way in is the address plus a six-digit code - `npm run dev:code`.
 */
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
 * The HS codes the fixtures reference, plus the ones the product catalogue can
 * actually produce.
 *
 * `listings.hs_code` is a foreign key to `hs_codes(code)`, and the baseline
 * snapshot is structure only, so that table is empty. Seeding the rows the
 * fixtures need is better than dropping `hs_code` from them: the code drives
 * classification display and the tariff lookups, and a fixture set with no HS
 * code at all leaves that whole surface untestable.
 *
 * ## Why the catalogue's codes are here too
 *
 * The submit route refuses any code that is not a row in this table WHENEVER
 * the table is non-empty (`isHsCatalogReady`). With only the two fixture codes
 * seeded, that check was live and every product a member could actually reach
 * through `lib/products/catalogue.ts` was refused: walking the listing path
 * locally ended at "271019 is not a valid HS 2022 code", which is correct
 * behaviour against a table that is 2 rows deep and useless as a development
 * environment.
 *
 * These are the codes `PRODUCT_CATALOGUE` assigns, so the path a member walks
 * is the path a developer can walk. It is still not an import of the tariff
 * schedule: production carries HS 2022 in full and this is the subset the
 * committed catalogue can reach.
 */
const HS_CODES = [
  {
    code: "150910",
    display: "1509.10",
    chapter: "15",
    chapter_title: "Animal or vegetable fats and oils",
    heading: "1509",
    heading_title: "Olive oil and its fractions",
    description: "Olive oil, virgin",
    unit: "kg",
  },
  {
    code: "170199",
    display: "1701.99",
    chapter: "17",
    chapter_title: "Sugars and sugar confectionery",
    heading: "1701",
    heading_title: "Cane or beet sugar and chemically pure sucrose, in solid form",
    description: "Cane or beet sugar, refined, other",
    unit: "kg",
  },
  // Every code `lib/products/catalogue.ts` can assign. Chapter and heading are
  // derived from the code, which is what the WCO structure guarantees: the
  // first two digits are the chapter and the first four are the heading.
  ...[
    ["271019", "Petroleum oils, other than crude: gas oils", "Mineral fuels, mineral oils", "Petroleum oils, other than crude"],
    ["271112", "Liquefied propane", "Mineral fuels, mineral oils", "Petroleum gases and other gaseous hydrocarbons"],
    ["270900", "Petroleum oils, crude", "Mineral fuels, mineral oils", "Petroleum oils, crude"],
    ["310210", "Urea, whether or not in aqueous solution", "Fertilisers", "Mineral or chemical fertilisers, nitrogenous"],
    ["281511", "Sodium hydroxide, solid", "Inorganic chemicals", "Sodium hydroxide, potassium hydroxide, peroxides"],
    ["100590", "Maize (corn), other than seed", "Cereals", "Maize (corn)"],
    ["100199", "Wheat and meslin, other", "Cereals", "Wheat and meslin"],
    ["170114", "Raw cane sugar, not containing added flavouring or colouring", "Sugars and sugar confectionery", "Cane or beet sugar and chemically pure sucrose, in solid form"],
    ["151219", "Sunflower-seed or safflower oil, other than crude", "Animal or vegetable fats and oils", "Sunflower-seed, safflower or cotton-seed oil"],
    ["090111", "Coffee, not roasted, not decaffeinated", "Coffee, tea, mate and spices", "Coffee, whether or not roasted or decaffeinated"],
    ["720839", "Flat-rolled iron or steel, hot-rolled, in coils", "Iron and steel", "Flat-rolled products of iron or non-alloy steel, hot-rolled"],
    ["740311", "Refined copper cathodes and sections of cathodes", "Copper and articles thereof", "Refined copper and copper alloys, unwrought"],
    ["760110", "Aluminium, not alloyed, unwrought", "Aluminium and articles thereof", "Unwrought aluminium"],
    ["252329", "Portland cement, other", "Salt, sulphur, earths and stone, lime and cement", "Portland cement, aluminous cement and similar hydraulic cements"],
    ["520512", "Cotton yarn, single, uncombed, of a specified decitex", "Cotton", "Cotton yarn, containing 85 percent or more by weight of cotton"],
    ["390120", "Polyethylene having a specific gravity of 0.94 or more", "Plastics and articles thereof", "Polymers of ethylene, in primary forms"],
    ["854143", "Photovoltaic cells assembled in modules or made up into panels", "Electrical machinery and equipment", "Semiconductor devices, photovoltaic cells, light-emitting diodes"],
  ].map(([code, description, chapterTitle, headingTitle]) => ({
    code,
    display: `${code.slice(0, 4)}.${code.slice(4)}`,
    chapter: code.slice(0, 2),
    chapter_title: chapterTitle,
    heading: code.slice(0, 4),
    heading_title: headingTitle,
    description,
    unit: "kg",
  })),
];

/**
 * One listing per market family, plus one that is deliberately incomplete.
 *
 * Not five products. The families take different journeys, ask for different
 * facts and render different screens, so a fixture set that is all products
 * leaves two thirds of the intake untested and every family-specific bug
 * invisible.
 *
 * Every field here has been checked against production's own constraints rather
 * than against what the columns are called. Three of the five did not write on
 * the first run, and each failure named a real disagreement between these
 * fixtures and the schema. The notes are inline where each one was found.
 */
function listingsFor(userId) {
  // `details` is NOT NULL with no default, and `status` must be one of a
  // checked set. Both were found by running this against the restored schema
  // for the first time; the previous fixtures wrote nothing at all.
  const base = { user_id: userId, status: "approved", payment_terms: "30% advance, 70% against documents" };
  return [
    {
      ...base,
      type: "offer",
      product: "Organic extra virgin olive oil",
      details: "Single-estate, cold pressed, harvest 2025. Analysis certificate per lot.",
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
      details: "Monthly requirement, 12-month term. Inspection at load port.",
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
      details: "FCL and LCL, customs clearance both ends, bonded warehousing available.",
      market_family: "services",
      market_intent: "offer_trade_service",
      service_category_key: "freight_forwarding",
      /*
        `coverage_scope_key` used to be set here, and the database refuses it:

          listings_distribution_family_coherent
            CHECK ((distribution_partner_type_key IS NULL
                    AND distribution_relationship_terms IS NULL
                    AND coverage_scope_key IS NULL)
                   OR market_family = 'distribution')

        Coverage scope is a DISTRIBUTION field, not a service one. Services
        carry `service_category_key` and `service_subcategory_keys`, governed by
        listings_service_family_coherent. The fixture had borrowed a column from
        the wrong family, and only a real schema could say so.
      */
    },
    {
      ...base,
      type: "offer",
      product: "Distribution partner sought, food and beverage",
      details: "Iberian coverage, existing retail listings, own cold chain preferred.",
      market_family: "distribution",
      market_intent: "seek_distribution_partner",
      distribution_partner_type_key: "importer_distributor",
      product_sector_key: "food_and_beverage",
      territory_codes: ["ES", "PT"],
    },
    {
      ...base,
      type: "offer",
      product: "Legacy record that carries no market family",
      details: "Seeded deliberately incomplete. Opening a Deal Room from this must refuse, and say why.",
      /*
        NOT an oversight, and NOT the fixture that used to be here.

        This slot held `market_family: "goods"` - an unrecognised family - to
        reproduce the TypeError that killed the /deal-rooms/propose render on
        2 August 2026. Restoring production's own schema showed that row can
        never exist:

          listings_market_family_check
            CHECK (market_family IS NULL
                   OR market_family IN ('products','services','distribution'))

        The constraint is validated, so no production row violates it either.
        `unknown_family` in lib/deal-room/interest.ts guards a shape the
        database refuses; the reachable defect is the one below, a NULL family,
        which the column expressly permits.

        The defensive branch stays - a cheap guard against a cast that is a
        claim rather than a check - but the fixture now reproduces something
        that can actually happen.

        `market_intent` is null and must be: listings_intent_needs_family
        forbids an intent without a family.
      */
      market_family: null,
      market_intent: null,
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

  /*
    The profile row. Upserted rather than inserted, for the same reason.

    `profiles` has NO `email` column - the address lives on `auth.users` and
    nowhere else. Writing one here failed every run and was reported as a
    warning, so the account existed with no profile and nobody noticed. That is
    the first thing restoring the real schema found.
  */
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: TEST_ACCOUNT.fullName, company: TEST_ACCOUNT.company }, { onConflict: "id" });
  if (profileError) {
    // Reported, not fatal: the column set differs across schema generations and
    // a missing optional column should not stop the account being usable.
    console.warn(`profile   could not be written (${profileError.message})`);
  } else {
    console.log("profile   ok");
  }

  // Before the listings, because listings.hs_code references this table.
  const { error: hsError } = await admin.from("hs_codes").upsert(HS_CODES, { onConflict: "code" });
  if (hsError) throw new Error(`could not seed hs_codes: ${hsError.message}`);
  console.log(`hs_codes  ${HS_CODES.length} written`);

  const { error: clearError } = await admin.from("listings").delete().eq("user_id", userId);
  if (clearError) console.warn(`listings  could not clear existing (${clearError.message})`);

  const fixtures = listingsFor(userId);
  let written = 0;
  for (const listing of fixtures) {
    const { error } = await admin.from("listings").insert(listing);
    if (error) {
      // One failing fixture must not lose the rest. A schema that has moved on
      // is a finding to report, not a reason to seed nothing - so every fixture
      // is attempted and every error is printed, rather than stopping at the
      // first and hiding the other four.
      console.warn(`listing   "${listing.product}" skipped (${error.message})`);
      continue;
    }
    written++;
  }
  console.log(`listings  ${written} of ${fixtures.length} written`);

  /*
    But a skipped fixture is still a failure, and it must exit non-zero.

    The first run of this against the restored schema wrote ZERO listings and
    reported no profile, and still exited 0 - so `npm run dev:db` printed
    sign-in credentials for an account with nothing behind it and called itself
    finished. Warning about something and then succeeding anyway is how the
    signup trigger stayed broken in production for weeks.
  */
  if (written < fixtures.length) {
    throw new Error(
      `${fixtures.length - written} of ${fixtures.length} fixtures did not write.\n` +
        "The schema and these fixtures disagree. The messages above name every column\n" +
        "involved. Nothing is wrong with the database: fix the fixtures to match it.",
    );
  }

  console.log("");
  console.log("Sign in at http://localhost:3000/login");
  console.log(`  email     ${TEST_ACCOUNT.email}`);
  console.log("  code      npm run dev:code    (Ponte is OTP only; there is no password field)");
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
