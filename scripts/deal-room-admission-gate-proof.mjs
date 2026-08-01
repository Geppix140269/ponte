#!/usr/bin/env node
/**
 * Execution proof for the Deal Room admission gate (20260731g).
 *
 *   DATABASE_URL=... DEAL_ROOM_PROOF_ALLOW=1 npm run deal-room:gate-proof
 *
 * ## STATUS: WRITTEN, NEVER EXECUTED
 *
 * This script has not been run, against any database, at any point. There is no
 * PostgreSQL, no container runtime and no Supabase CLI on the machine this
 * branch was written on, so there is nowhere to run it. Until it runs green
 * against a disposable production-equivalent schema, the SQL boundary in
 * 20260731g is WRITTEN AND UNPROVED, and nothing in this repository should be
 * read as saying otherwise.
 *
 * ## What it requires: a SCHEMA, and no data at all
 *
 * The first version of this script selected the first two profiles it found and
 * the first approved listing owned by one of them, then assumed those rows had
 * confirmed emails, a jurisdiction and no prior Starter entitlement. A Supabase
 * preview branch is normally data-less, and a restored database could have
 * failed any of those assumptions for reasons having nothing to do with the
 * migration - a fixture failure wearing the costume of a boundary failure.
 *
 * So this version creates everything it needs and reads nothing it did not
 * create:
 *
 *   - two synthetic `auth.users` and their `profiles`, tagged with a run id
 *   - one synthetic approved products Deal, with exactly the facts
 *     `deal_room_propose` requires of that family and nothing more
 *   - the four current agreement documents, upserted to known versions and
 *     checksums rather than trusted from seed data
 *
 * The only thing it asks of the database is that the production-equivalent
 * SCHEMA is present, and it says precisely which object is missing when it is
 * not, rather than failing somewhere downstream with a confusing message.
 *
 * ## Isolation
 *
 * Everything - the migration, the fixture, every proof - happens inside ONE
 * transaction that is ALWAYS rolled back, including on failure. Nothing is ever
 * committed. The rollback is then verified by re-reading the catalogue and the
 * fixture ids, which is proof 7: if it had not worked, those reads would find
 * the objects still there.
 *
 * The synthetic accounts use `@example.invalid`, a domain reserved by RFC 2606
 * that can never receive mail, and every row carries the run id so anything
 * that somehow survived is identifiable.
 *
 * ## The proofs, in order
 *
 *   0. the database carries the production-equivalent schema, column for column,
 *      including every conflict target this proof's fixture relies on
 *   1. the migration applies cleanly
 *   2. exact function signatures and grants after application
 *   3. a synthetic fixture exists, isolated from any existing data
 *   4. direct RPC refusal for an inadmissible opener
 *   5. the admissible opener path succeeds, carrying the member's own words
 *   6. direct RPC refusal for an inadmissible invitee
 *   7. a stale agreement version still does not satisfy admission
 *   8. the admissible invitee path succeeds
 *   9. rollback: every synthetic row and every migration object is gone
 *
 * Proofs 4 and 6 are the ones that matter most, and they are made by calling the
 * granted commands DIRECTLY as `authenticated`, never through a server action.
 * That is the boundary the TypeScript predicate cannot be.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const MIGRATION = "supabase/migrations/20260731g_deal_room_admission_verification_gate.sql";

/** The production project ref. Never this one, whatever the URL claims to be. */
const PRODUCTION_REF = "qaqfclbpfzmvqwpdqoky";

/**
 * The schema this proof needs, and nothing beyond it.
 *
 * Checked before anything is written, so a database missing a prerequisite says
 * so in one precise sentence instead of failing later inside a command with a
 * message about some unrelated column.
 */
const REQUIRED_TABLES = [
  "auth.users",
  "public.profiles",
  "public.organizations",
  "public.listings",
  "public.deal_rooms",
  "public.deal_room_sub_rooms",
  "public.deal_room_participants",
  "public.deal_room_entitlements",
  "public.deal_room_agreement_documents",
  "public.deal_room_agreement_acceptances",
  "public.deal_room_activity_events",
];

const REQUIRED_FUNCTIONS = [
  ["auth", "uid"],
  ["public", "deal_room_propose"],
  ["public", "deal_room_admit_participant"],
  ["public", "deal_room_declare_participation"],
  ["public", "deal_room_is_writable"],
  ["public", "deal_room_log_event"],
];

/**
 * Every column this proof writes, per table, and the conflict target it uses.
 *
 * The preflight checks three things against the live catalogue for each entry,
 * so a fixture insert can never fail for a schema reason dressed up as a
 * boundary failure:
 *
 *   - every column named here exists (catches a rename);
 *   - every NOT NULL column WITHOUT a default is named here (catches a column
 *     added since, which would otherwise fail the insert);
 *   - the `onConflict` target really is backed by a unique index on exactly
 *     those columns.
 *
 * That last one is why this table exists at all. `ON CONFLICT (kind)` on
 * `deal_room_agreement_documents` is only valid if `kind` carries a unique or
 * primary-key index; the repository schema declares it `text primary key`, but
 * the proof must not take the repository's word for what the database in front
 * of it actually has.
 */
const WRITES = [
  { table: "auth.users", columns: ["id", "email", "email_confirmed_at"] },
  { table: "public.profiles", columns: ["id", "company", "country"], onConflict: ["id"] },
  {
    table: "public.listings",
    columns: [
      "user_id",
      "type",
      "product",
      "details",
      "status",
      "market_family",
      "market_intent",
      "quantity",
      "unit",
      "origin_country",
    ],
  },
  {
    table: "public.deal_room_agreement_documents",
    columns: ["kind", "version", "title", "sha256", "current"],
    onConflict: ["kind"],
  },
  {
    table: "public.deal_room_participants",
    columns: ["room_id", "profile_id", "participant_class", "transaction_role", "declared_capacity", "state"],
  },
  {
    table: "public.deal_room_agreement_acceptances",
    columns: [
      "participant_id",
      "room_id",
      "agreement_kind",
      "document_version",
      "document_sha256",
      "accepted_as",
    ],
  },
];

/** The four agreement kinds the admission gate requires, at known identities. */
const AGREEMENTS = [
  ["participation", "proof-v1", "Participation Agreement"],
  ["nda", "proof-v1", "Non-Disclosure Agreement"],
  ["room_rules", "proof-v1", "Room Rules"],
  ["authority_declaration", "proof-v1", "Authority Declaration"],
];

/** A distinct 64-hex checksum per kind, so a mismatch cannot pass by collision. */
const sha = (n) => String(n).repeat(64).slice(0, 64);

const results = [];
let failed = 0;

function record(proof, ok, detail) {
  results.push({ proof, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${proof}${detail ? `\n        ${detail}` : ""}`);
}

/**
 * Run a statement and return the error message, or null when it succeeded.
 *
 * Wrapped in a savepoint because this proof runs inside one transaction and an
 * EXPECTED refusal still aborts it - every later statement then fails with
 * "current transaction is aborted", which reads like a cascade of real
 * failures. Rolling back to the savepoint undoes the refused statement and
 * leaves the transaction usable.
 */
let savepointSeq = 0;
async function refusalOf(client, sql, params = []) {
  const sp = `proof_sp_${++savepointSeq}`;
  await client.query(`savepoint ${sp}`);
  try {
    await client.query(sql, params);
    await client.query(`release savepoint ${sp}`);
    return null;
  } catch (err) {
    await client.query(`rollback to savepoint ${sp}`);
    await client.query(`release savepoint ${sp}`);
    return err.message;
  }
}

/** Act as this member, the way PostgREST does: the role AND the JWT claim. */
async function actAs(client, profileId) {
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: profileId, role: "authenticated" }),
  ]);
  await client.query("set local role authenticated");
}

/** Back to the owner, for fixture setup that is not part of any proof. */
async function actAsOwner(client) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

async function preflight(client) {
  const missing = [];

  for (const qualified of REQUIRED_TABLES) {
    const { rows } = await client.query("select to_regclass($1) is null as gone", [qualified]);
    if (rows[0].gone) missing.push(`table ${qualified}`);
  }
  for (const [schema, name] of REQUIRED_FUNCTIONS) {
    const { rows } = await client.query(
      `select count(*)::int as n
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = $1 and p.proname = $2`,
      [schema, name],
    );
    if (rows[0].n === 0) missing.push(`function ${schema}.${name}`);
  }
  // The one column whose absence would make the whole proof meaningless.
  const { rows: cols } = await client.query(`
    select count(*)::int as n from information_schema.columns
     where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at'
  `);
  if (cols[0].n === 0) missing.push("column auth.users.email_confirmed_at");

  // Nothing below can run if a table above is absent; the reads would error
  // rather than report, which is the opposite of a precise message.
  if (missing.length > 0) return missing;

  for (const { table, columns, onConflict } of WRITES) {
    const [schema, name] = table.split(".");

    const { rows: actual } = await client.query(
      `select column_name, is_nullable, column_default, is_identity, identity_generation
         from information_schema.columns
        where table_schema = $1 and table_name = $2`,
      [schema, name],
    );
    const byName = new Map(actual.map((c) => [c.column_name, c]));

    // 1. Every column this proof writes still exists under that name.
    for (const column of columns) {
      if (!byName.has(column)) missing.push(`column ${table}.${column}, which this proof writes`);
    }

    /*
     * 2. Every column the table REQUIRES is one this proof supplies.
     *
     * `not null` with no default and no identity generation means the insert
     * fails without a value. A column added to `listings` or `auth.users` after
     * this script was written would otherwise surface as a fixture error in the
     * middle of a proof run, and read like the migration's fault.
     */
    const supplied = new Set(columns);
    for (const c of actual) {
      const generated = c.is_identity === "YES" || c.identity_generation !== null;
      const required = c.is_nullable === "NO" && c.column_default === null && !generated;
      if (required && !supplied.has(c.column_name)) {
        missing.push(
          `column ${table}.${c.column_name} is NOT NULL with no default, and this proof does not supply it`,
        );
      }
    }

    /*
     * 3. The conflict target is real.
     *
     * `on conflict (kind)` is a syntax error at runtime - "there is no unique or
     * exclusion constraint matching the ON CONFLICT specification" - unless a
     * unique or primary-key index covers exactly those columns. The repository
     * declares `deal_room_agreement_documents.kind` as `text primary key`, but
     * this proof must not take the repository's word for what the database in
     * front of it has.
     */
    if (onConflict) {
      const { rows: idx } = await client.query(
        `select 1
           from pg_index i
           join pg_class t on t.oid = i.indrelid
           join pg_namespace n on n.oid = t.relnamespace
          where n.nspname = $1 and t.relname = $2
            and (i.indisunique or i.indisprimary)
            and i.indnatts = i.indnkeyatts
            and (
              select array_agg(a.attname::text order by a.attname::text)
                from unnest(i.indkey) as k(attnum)
                join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
            ) = (select array_agg(c order by c) from unnest($3::text[]) as c)
          limit 1`,
        [schema, name, onConflict],
      );
      if (idx.length === 0) {
        missing.push(
          `a unique or primary-key index on ${table}(${onConflict.join(", ")}), which this proof uses as an ` +
            `ON CONFLICT target. Without it the fixture insert fails with "no unique or exclusion constraint ` +
            `matching the ON CONFLICT specification"`,
        );
      }
    }
  }

  return missing;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Set DATABASE_URL to a DISPOSABLE database carrying the production-equivalent SCHEMA.\n" +
        "No business or user data is needed: this proof creates everything it reads.\n" +
        "DEAL_ROOM_PROOF_ALLOW=1 is also required.",
    );
    process.exit(2);
  }
  if (url.includes(PRODUCTION_REF)) {
    console.error(`Refusing: ${PRODUCTION_REF} is the production project. This proof is for a disposable copy only.`);
    process.exit(2);
  }
  if (process.env.DEAL_ROOM_PROOF_ALLOW !== "1") {
    console.error("Refusing: set DEAL_ROOM_PROOF_ALLOW=1 to confirm this database is disposable.");
    process.exit(2);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  // -------------------------------------------------------------------
  // 0. Schema preflight, BEFORE the transaction and before any write
  // -------------------------------------------------------------------
  const missing = await preflight(client);
  if (missing.length > 0) {
    console.error(
      "SCHEMA MISMATCH. This database does not carry the production-equivalent schema.\n" +
        `Missing:\n  - ${missing.join("\n  - ")}\n\n` +
        "Apply the repository's migrations up to and including 20260731f, then run this again.\n" +
        "Nothing was written and no transaction was opened.",
    );
    await client.end();
    process.exit(3);
  }
  record(
    "0. the database carries the production-equivalent schema",
    true,
    `${REQUIRED_TABLES.length} tables, ${REQUIRED_FUNCTIONS.length} functions, ` +
      `${WRITES.length} fixture tables checked column-for-column, ` +
      `${WRITES.filter((w) => w.onConflict).length} conflict targets proved`,
  );

  const ids = {};
  await client.query("begin");

  try {
    // -----------------------------------------------------------------
    // 1. The migration applies cleanly
    // -----------------------------------------------------------------
    // The file carries its own begin/commit. Stripping them keeps the whole
    // proof inside OUR transaction, so nothing survives the rollback.
    const sql = readFileSync(MIGRATION, "utf8")
      .replace(/^begin;\s*$/m, "")
      .replace(/^commit;\s*$/m, "");
    const applyError = await refusalOf(client, sql);
    record("1. the migration applies cleanly", applyError === null, applyError ?? undefined);
    if (applyError) throw new Error("cannot continue: the migration did not apply");

    // -----------------------------------------------------------------
    // 2. Signatures and grants, read from the catalogue
    // -----------------------------------------------------------------
    const { rows: fns } = await client.query(`
      select p.proname,
             pg_get_function_identity_arguments(p.oid) as args,
             -- Identity arguments carry parameter NAMES as well as types, so
             -- they cannot be compared against a type-only expectation. The
             -- types alone are what make a signature distinct, so read them
             -- straight from proargtypes and compare on that. The identity
             -- string stays for the human-readable line printed below.
             (select string_agg(format_type(t, null), ', ' order by ord)
                from unnest(p.proargtypes) with ordinality as u(t, ord)) as argtypes,
             p.prosecdef,
             coalesce(array_to_string(p.proacl, ' '), '(default)') as acl
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in ('deal_room_propose','deal_room_admit_participant',
                           'deal_room_declare_participation','deal_room_declare_opening_intent',
                           'deal_room_admission_minimum_missing','deal_room_room_prerequisite_state')
       order by p.proname, args
    `);
    for (const f of fns) console.log(`        ${f.proname}(${f.args})  secdef=${f.prosecdef}  acl=${f.acl}`);

    const argsOf = (name) =>
      fns.filter((f) => f.proname === name).map((f) => f.argtypes ?? "");
    const expectations = [
      ["deal_room_propose", "uuid, uuid, text, text, text, text, text, text, text"],
      ["deal_room_admit_participant", "uuid"],
      ["deal_room_declare_participation", "uuid, text, text, text, text, text, text, text"],
      ["deal_room_declare_opening_intent", "uuid, text, text, text"],
    ];
    const signatureProblems = [];
    for (const [name, expected] of expectations) {
      const actual = argsOf(name);
      if (actual.length !== 1 || actual[0] !== expected) {
        signatureProblems.push(`${name}: expected exactly (${expected}), found ${JSON.stringify(actual)}`);
      }
    }
    record("2a. exact signatures, and no overload", signatureProblems.length === 0, signatureProblems.join("; ") || undefined);

    const grantedToAuth = (name) =>
      fns.filter((f) => f.proname === name).every((f) => /authenticated=X/.test(f.acl));
    const closedToAuth = (name) =>
      fns.filter((f) => f.proname === name).every((f) => !/authenticated=X/.test(f.acl));
    const grantProblems = [];
    for (const name of [
      "deal_room_propose",
      "deal_room_admit_participant",
      "deal_room_declare_participation",
      "deal_room_declare_opening_intent",
    ]) {
      if (!grantedToAuth(name)) grantProblems.push(`${name} is not executable by authenticated`);
    }
    for (const name of ["deal_room_admission_minimum_missing", "deal_room_room_prerequisite_state"]) {
      if (!closedToAuth(name)) grantProblems.push(`${name} IS executable by authenticated and must not be`);
    }
    record("2b. the four commands are granted; the two helpers are not", grantProblems.length === 0, grantProblems.join("; ") || undefined);

    // -----------------------------------------------------------------
    // 3. The synthetic fixture. Everything read below is created here.
    // -----------------------------------------------------------------
    const { rows: run } = await client.query("select gen_random_uuid()::text as id");
    const runId = run[0].id;
    const openerEmail = `deal-room-proof-opener+${runId}@example.invalid`;
    const inviteeEmail = `deal-room-proof-invitee+${runId}@example.invalid`;

    // `handle_new_user` may create the profile for us, so the profile write is
    // an upsert rather than an insert.
    const makeMember = async (email, company, country) => {
      const { rows } = await client.query(
        `insert into auth.users (id, email, email_confirmed_at)
         values (gen_random_uuid(), $1, now())
         returning id`,
        [email],
      );
      const id = rows[0].id;
      await client.query(
        `insert into public.profiles (id, company, country)
         values ($1, $2, $3)
         on conflict (id) do update set company = excluded.company, country = excluded.country`,
        [id, company, country],
      );
      return id;
    };

    ids.opener = await makeMember(openerEmail, "Proof Trading Srl", "IT");
    ids.invitee = await makeMember(inviteeEmail, null, null);

    // One approved products Deal, with exactly what that family requires.
    const { rows: listing } = await client.query(
      `insert into public.listings
         (user_id, type, product, details, status, market_family, market_intent,
          quantity, unit, origin_country)
       values ($1, 'offer', 'Proof cement', 'Synthetic Deal for the admission-gate proof. Not a real offer.',
               'approved', 'products', 'offer_product', 1000, 't', 'IT')
       returning id, ref`,
      [ids.opener],
    );
    ids.listing = listing[0].id;

    // The four current agreement documents, at identities this proof chose.
    // Upserted rather than trusted: a database with none, or with different
    // ones, must produce the same result.
    for (const [i, [kind, version, title]] of AGREEMENTS.entries()) {
      await client.query(
        `insert into public.deal_room_agreement_documents (kind, version, title, sha256, current)
         values ($1, $2, $3, $4, true)
         on conflict (kind) do update
           set version = excluded.version, title = excluded.title,
               sha256 = excluded.sha256, current = true`,
        [kind, version, title, sha(i + 1)],
      );
    }

    // Isolation, asserted rather than assumed: these members are new, so no
    // Starter entitlement of theirs can exist, and `deal_room_propose`'s
    // one-per-member rule cannot fire for a reason belonging to somebody else.
    const { rows: ent } = await client.query(
      `select count(*)::int as n
         from public.deal_room_entitlements e
         join public.deal_rooms r on r.id = e.room_id
        where e.kind = 'starter' and r.initiator_profile_id = any($1::uuid[])`,
      [[ids.opener, ids.invitee]],
    );
    record(
      "3. the fixture is synthetic and isolated from any existing data",
      ent[0].n === 0,
      `run ${runId}; opener ${ids.opener}; invitee ${ids.invitee}; deal ${listing[0].ref}; prior starter entitlements ${ent[0].n}`,
    );

    // -----------------------------------------------------------------
    // 4. Direct RPC refusal for an inadmissible opener
    // -----------------------------------------------------------------
    // No opener declaration exists, so criteria 6, 7 and 8 are missing.
    // Called DIRECTLY as the member: this is the durable boundary or nothing.
    await actAs(client, ids.opener);
    const openerRefusal = await refusalOf(
      client,
      `select public.deal_room_propose($1, $2, '', '', 'Buyer', 'Take the cement forward',
                                       'accepted_introduction', 'software_only', 'First workspace')`,
      [ids.listing, ids.invitee],
    );
    record(
      "4. an inadmissible opener is refused by the command itself",
      openerRefusal !== null &&
        /relationship to the business/.test(openerRefusal) &&
        /transaction role/.test(openerRefusal) &&
        /authority to participate/.test(openerRefusal),
      openerRefusal ?? "the command SUCCEEDED, which means the gate is not enforcing",
    );

    // -----------------------------------------------------------------
    // 5. The admissible opener path
    // -----------------------------------------------------------------
    const declareError = await refusalOf(
      client,
      `select public.deal_room_declare_opening_intent($1, 'Director of the company', 'Seller',
                                                      'Board resolution of 12 June')`,
      [ids.listing],
    );
    if (declareError) record("5a. the opener can record their declaration", false, declareError);
    else record("5a. the opener can record their declaration", true);

    let roomId = null;
    try {
      const { rows } = await client.query(
        `select public.deal_room_propose($1, $2, '', '', 'Buyer', 'Take the cement forward',
                                         'accepted_introduction', 'software_only', 'First workspace') as room`,
        [ids.listing, ids.invitee],
      );
      roomId = rows[0].room;
      ids.room = roomId;
      record("5b. the admissible opener path succeeds", true, `room ${roomId}`);
    } catch (err) {
      record("5b. the admissible opener path succeeds", false, err.message);
    }

    if (roomId) {
      const { rows: seats } = await client.query(
        `select transaction_role, participation_authority, business_relationship
           from public.deal_room_participants where room_id = $1 and profile_id = $2`,
        [roomId, ids.opener],
      );
      const carriesDeclaration =
        seats.length === 2 &&
        seats.every(
          (s) =>
            s.transaction_role === "Seller" &&
            s.participation_authority === "Board resolution of 12 June" &&
            s.business_relationship === "Director of the company",
        );
      record(
        "5c. the opener's seats carry their own words, not 'Deal owner'",
        carriesDeclaration,
        JSON.stringify(seats),
      );

      // ---------------------------------------------------------------
      // 6. Direct RPC refusal for an inadmissible invitee
      // ---------------------------------------------------------------
      await actAsOwner(client);
      const { rows: seat } = await client.query(
        `insert into public.deal_room_participants
           (room_id, profile_id, participant_class, transaction_role, declared_capacity, state)
         values ($1, $2, 'principal', 'Buyer', 'Independent broker', 'invited')
         returning id`,
        [roomId, ids.invitee],
      );
      ids.participant = seat[0].id;

      await actAs(client, ids.invitee);
      const inviteeRefusal = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [
        ids.participant,
      ]);
      record(
        "6. an inadmissible invitee is refused by the command itself",
        inviteeRefusal !== null,
        inviteeRefusal ?? "the command SUCCEEDED, which means the gate is not enforcing",
      );

      // ---------------------------------------------------------------
      // 7. A stale agreement version does not satisfy admission
      // ---------------------------------------------------------------
      await actAsOwner(client);
      await client.query(
        `update public.deal_room_participants
            set represented_legal_name = 'Rossi Forwarding',
                business_relationship = 'Retained under engagement letter',
                participation_authority = 'Engagement letter of 3 May',
                state = 'terms_pending'
          where id = $1`,
        [ids.participant],
      );
      await client.query(
        `update public.profiles set country = 'IT' where id = $1`,
        [ids.invitee],
      );
      // Acceptances recorded against a version that is not the current one.
      await client.query(
        `insert into public.deal_room_agreement_acceptances
           (participant_id, room_id, agreement_kind, document_version, document_sha256, accepted_as)
         select $1, $2, d.kind, d.version || '-stale', d.sha256, 'buyer'
           from public.deal_room_agreement_documents d where d.current`,
        [ids.participant, ids.room],
      );
      await actAs(client, ids.invitee);
      const staleRefusal = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [
        ids.participant,
      ]);
      record(
        "7. a stale agreement version does not satisfy admission",
        staleRefusal !== null && /not yet accepted at the current version/.test(staleRefusal),
        staleRefusal ?? "admission SUCCEEDED on a stale acceptance",
      );

      // ---------------------------------------------------------------
      // 8. The admissible invitee path
      // ---------------------------------------------------------------
      await actAsOwner(client);
      await client.query(`delete from public.deal_room_agreement_acceptances where participant_id = $1`, [
        ids.participant,
      ]);
      await client.query(
        `insert into public.deal_room_agreement_acceptances
           (participant_id, room_id, agreement_kind, document_version, document_sha256, accepted_as)
         select $1, $2, d.kind, d.version, d.sha256, 'buyer'
           from public.deal_room_agreement_documents d where d.current`,
        [ids.participant, ids.room],
      );
      await actAs(client, ids.invitee);
      const admitError = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [ids.participant]);
      record("8. the admissible invitee path succeeds", admitError === null, admitError ?? undefined);
    }
  } catch (err) {
    record("run completed without an unexpected error", false, err.message);
  } finally {
    // -----------------------------------------------------------------
    // 9. Rollback, and the proof that it worked
    // -----------------------------------------------------------------
    await client.query("rollback");
    await client.query("reset role");

    const leftovers = [];

    const { rows: fn } = await client.query(`
      select count(*)::int as n
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'deal_room_declare_opening_intent'
    `);
    if (fn[0].n !== 0) leftovers.push("function deal_room_declare_opening_intent survived");

    const { rows: tbl } = await client.query(
      `select to_regclass('public.deal_room_opener_declarations') is not null as present`,
    );
    if (tbl[0].present) leftovers.push("table deal_room_opener_declarations survived");

    const { rows: col } = await client.query(`
      select count(*)::int as n from information_schema.columns
       where table_schema = 'public' and table_name = 'deal_room_participants'
         and column_name in ('represented_legal_name','business_relationship')
    `);
    if (col[0].n !== 0) leftovers.push(`${col[0].n} added participant column(s) survived`);

    for (const [label, table, column, value] of [
      ["opener account", "auth.users", "id", ids.opener],
      ["invitee account", "auth.users", "id", ids.invitee],
      ["synthetic Deal", "public.listings", "id", ids.listing],
      ["room", "public.deal_rooms", "id", ids.room],
      ["participant", "public.deal_room_participants", "id", ids.participant],
    ]) {
      if (!value) continue;
      const { rows } = await client.query(`select count(*)::int as n from ${table} where ${column} = $1`, [value]);
      if (rows[0].n !== 0) leftovers.push(`${label} ${value} survived in ${table}`);
    }

    record(
      "9. rollback removed every migration object and every synthetic row",
      leftovers.length === 0,
      leftovers.join("; ") || "nothing survived; the database is as it was found",
    );
    await client.end();
  }

  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} proofs passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
