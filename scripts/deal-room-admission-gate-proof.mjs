#!/usr/bin/env node
/**
 * Execution proof for the Deal Room admission gate (20260731g).
 *
 *   npm run deal-room:gate-proof
 *
 * ## STATUS: WRITTEN, NEVER EXECUTED
 *
 * This script has not been run. There is no PostgreSQL, no container runtime
 * and no Supabase CLI on the machine this branch was written on - `docker`,
 * `podman`, `psql`, `pg_ctl`, `initdb` and `supabase` are all absent, and there
 * is no PostgreSQL installation - so there is nowhere to run it. That is the
 * infrastructure dependency, stated plainly rather than worked around, and the
 * controller's stop condition of 31 July 2026 asks for exactly that statement
 * rather than a claim that the SQL boundary is ready.
 *
 * The script exists so that the moment a disposable production-equivalent
 * schema is available, the seven required proofs are one command away and
 * nobody has to reconstruct what they were.
 *
 * ## What it requires
 *
 *   DATABASE_URL   a superuser connection to a DISPOSABLE database that already
 *                  carries the production-equivalent schema - a restored dump,
 *                  a Supabase branch, or `supabase db reset` output. It must
 *                  NOT be production, and the guard below refuses the
 *                  production project ref outright.
 *   DEAL_ROOM_PROOF_ALLOW=1
 *                  a second, deliberate opt-in, so a stray DATABASE_URL in a
 *                  shell cannot cause this to run by accident.
 *
 * Everything it does happens inside ONE transaction that is ROLLED BACK at the
 * end, including the migration itself. The database is left exactly as it was
 * found, which is also proof 7: if the rollback did not work, the final checks
 * would see the objects still present.
 *
 * ## The seven proofs, in order
 *
 *   1. the migration applies cleanly
 *   2. exact function signatures and grants after application
 *   3. direct RPC refusal for an inadmissible opener
 *   4. direct RPC refusal for an inadmissible invitee
 *   5. the admissible opener and invitee paths succeed
 *   6. the current-version/checksum agreement gate still blocks a stale acceptance
 *   7. reversal: the transaction rolls back and the schema is unchanged
 *
 * Proofs 3 and 4 are the ones that matter most, and they are deliberately made
 * by calling the granted functions DIRECTLY as the member role, never through
 * the application. That is the boundary the TypeScript predicate cannot be.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const MIGRATION = "supabase/migrations/20260731g_deal_room_admission_verification_gate.sql";

/** The production project ref. Never this one, whatever the URL claims to be. */
const PRODUCTION_REF = "qaqfclbpfzmvqwpdqoky";

const results = [];
let failed = 0;

function record(proof, ok, detail) {
  results.push({ proof, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${proof}${detail ? `\n        ${detail}` : ""}`);
}

/** Run a statement and return the error message, or null when it succeeded. */
async function refusalOf(client, sql, params = []) {
  try {
    await client.query(sql, params);
    return null;
  } catch (err) {
    return err.message;
  }
}

/** Act as this member for the statements that follow, the way PostgREST does. */
async function actAs(client, profileId) {
  await client.query("select set_config('role', 'authenticated', true)");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: profileId, role: "authenticated" }),
  ]);
}

async function actAsOwner(client) {
  await client.query("select set_config('role', 'postgres', true)");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Set DATABASE_URL to a DISPOSABLE production-equivalent database.\n" +
        "This script never runs against production and never runs by accident:\n" +
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

  // Everything, including the migration, inside one transaction we will undo.
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

    const signature = (name) => fns.filter((f) => f.proname === name).map((f) => f.args);
    const expectations = [
      ["deal_room_propose", ["uuid, uuid, text, text, text, text, text, text, text"]],
      ["deal_room_admit_participant", ["uuid"]],
      ["deal_room_declare_participation", ["uuid, text, text, text, text, text, text, text"]],
      ["deal_room_declare_opening_intent", ["uuid, text, text, text"]],
    ];
    let signaturesOk = true;
    const signatureDetail = [];
    for (const [name, expected] of expectations) {
      const actual = signature(name);
      if (actual.length !== 1 || actual[0] !== expected[0]) {
        signaturesOk = false;
        signatureDetail.push(`${name}: expected exactly ${expected[0]}, found ${JSON.stringify(actual)}`);
      }
    }
    record("2a. exact signatures, and no overload", signaturesOk, signatureDetail.join("; ") || undefined);

    const granted = (name) =>
      fns.filter((f) => f.proname === name).every((f) => /authenticated=X/.test(f.acl));
    const internalClosed = (name) =>
      fns.filter((f) => f.proname === name).every((f) => !/authenticated=X/.test(f.acl));
    const grantsOk =
      granted("deal_room_propose") &&
      granted("deal_room_admit_participant") &&
      granted("deal_room_declare_participation") &&
      granted("deal_room_declare_opening_intent") &&
      internalClosed("deal_room_admission_minimum_missing") &&
      internalClosed("deal_room_room_prerequisite_state");
    record("2b. the four commands are granted; the two helpers are not", grantsOk);

    // -----------------------------------------------------------------
    // Fixture: two members, one approved Deal. Marked, and rolled back.
    // -----------------------------------------------------------------
    const { rows: seeded } = await client.query(`
      select id from public.profiles order by created_at limit 2
    `);
    if (seeded.length < 2) throw new Error("the schema needs at least two profiles to drive both doors");
    const [opener, invitee] = seeded.map((r) => r.id);

    const { rows: deals } = await client.query(
      `select id from public.listings where user_id = $1 and status = 'approved' limit 1`,
      [opener],
    );
    if (deals.length === 0) throw new Error("the schema needs one approved Deal owned by the first profile");
    const listingId = deals[0].id;

    // -----------------------------------------------------------------
    // 3. Direct RPC refusal for an inadmissible opener
    // -----------------------------------------------------------------
    // No opener declaration exists yet, so criteria 6, 7 and 8 are missing.
    // Called DIRECTLY as the member, never through the server action.
    await actAs(client, opener);
    const openerRefusal = await refusalOf(
      client,
      `select public.deal_room_propose($1, $2, '', '', 'Buyer', 'Objective', 'accepted_introduction', 'software_only', 'Purpose')`,
      [listingId, invitee],
    );
    record(
      "3. an inadmissible opener is refused by the command itself",
      openerRefusal !== null && /relationship to the business|transaction role|authority to participate/.test(openerRefusal),
      openerRefusal ?? "the command SUCCEEDED, which means the gate is not enforcing",
    );

    // -----------------------------------------------------------------
    // 5a. The admissible opener path succeeds
    // -----------------------------------------------------------------
    await client.query(
      `select public.deal_room_declare_opening_intent($1, 'Director of the company', 'Seller', 'Board resolution of 12 June')`,
      [listingId],
    );
    await actAsOwner(client);
    await client.query(
      `update public.profiles
          set company = coalesce(nullif(btrim(company), ''), 'Fixture Trading Srl'),
              country = coalesce(nullif(btrim(country), ''), 'IT')
        where id = $1`,
      [opener],
    );
    await actAs(client, opener);

    let roomId = null;
    const openError = await refusalOf(client, "select 1");
    try {
      const { rows } = await client.query(
        `select public.deal_room_propose($1, $2, '', '', 'Buyer', 'Objective', 'accepted_introduction', 'software_only', 'Purpose') as room`,
        [listingId, invitee],
      );
      roomId = rows[0].room;
    } catch (err) {
      record("5a. the admissible opener path succeeds", false, err.message);
    }
    if (roomId) record("5a. the admissible opener path succeeds", true, `room ${roomId}`);

    // The opener's participant rows must carry what they DECLARED, not literals.
    if (roomId) {
      const { rows: seats } = await client.query(
        `select transaction_role, participation_authority, business_relationship
           from public.deal_room_participants where room_id = $1 and profile_id = $2`,
        [roomId, opener],
      );
      const declaredThrough = seats.every(
        (s) =>
          s.transaction_role === "Seller" &&
          s.participation_authority === "Board resolution of 12 June" &&
          s.business_relationship === "Director of the company",
      );
      record(
        "5b. the opener's seats carry their own declaration, not 'Deal owner'",
        seats.length > 0 && declaredThrough,
        JSON.stringify(seats),
      );
    }

    // -----------------------------------------------------------------
    // 4. Direct RPC refusal for an inadmissible invitee
    // -----------------------------------------------------------------
    if (roomId) {
      await actAsOwner(client);
      const { rows: seat } = await client.query(
        `insert into public.deal_room_participants
           (room_id, profile_id, participant_class, transaction_role, declared_capacity, state)
         values ($1, $2, 'principal', 'Buyer', 'Independent broker', 'invited')
         returning id`,
        [roomId, invitee],
      );
      const participantId = seat[0].id;

      await actAs(client, invitee);
      const inviteeRefusal = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [participantId]);
      record(
        "4. an inadmissible invitee is refused by the command itself",
        inviteeRefusal !== null,
        inviteeRefusal ?? "the command SUCCEEDED, which means the gate is not enforcing",
      );

      // ---------------------------------------------------------------
      // 6. The versioned agreement gate still blocks a stale acceptance
      // ---------------------------------------------------------------
      await actAsOwner(client);
      await client.query(
        `update public.deal_room_participants
            set represented_legal_name = 'Rossi Forwarding',
                business_relationship = 'Retained under engagement letter',
                participation_authority = 'Engagement letter of 3 May',
                state = 'terms_pending'
          where id = $1`,
        [participantId],
      );
      // A forged acceptance at a version that is not current.
      await client.query(
        `insert into public.deal_room_agreement_acceptances
           (participant_id, agreement_kind, document_version, document_sha256)
         select $1, d.kind, d.version || '-stale', d.sha256
           from public.deal_room_agreement_documents d where d.current`,
        [participantId],
      );
      await actAs(client, invitee);
      const staleRefusal = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [participantId]);
      record(
        "6. a stale agreement version does not satisfy admission",
        staleRefusal !== null && /not yet accepted at the current version/.test(staleRefusal),
        staleRefusal ?? "admission SUCCEEDED on a stale acceptance",
      );

      // ---------------------------------------------------------------
      // 5c. The admissible invitee path succeeds
      // ---------------------------------------------------------------
      await actAsOwner(client);
      await client.query(`delete from public.deal_room_agreement_acceptances where participant_id = $1`, [
        participantId,
      ]);
      await client.query(
        `insert into public.deal_room_agreement_acceptances
           (participant_id, agreement_kind, document_version, document_sha256)
         select $1, d.kind, d.version, d.sha256
           from public.deal_room_agreement_documents d where d.current`,
        [participantId],
      );
      await actAs(client, invitee);
      const admitError = await refusalOf(client, `select public.deal_room_admit_participant($1)`, [participantId]);
      record("5c. the admissible invitee path succeeds", admitError === null, admitError ?? undefined);
    }

    if (openError) record("connection sanity", false, openError);
  } finally {
    // -----------------------------------------------------------------
    // 7. Reversal
    // -----------------------------------------------------------------
    await client.query("rollback");
    await actAsOwner(client);
    const { rows: after } = await client.query(`
      select count(*)::int as n
        from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace
       where nsp.nspname = 'public' and p.proname = 'deal_room_declare_opening_intent'
    `);
    const { rows: tbl } = await client.query(`
      select to_regclass('public.deal_room_opener_declarations') is null as gone
    `);
    record(
      "7. rollback leaves the schema exactly as it was found",
      after[0].n === 0 && tbl[0].gone === true,
      `deal_room_declare_opening_intent present: ${after[0].n}; opener declarations table gone: ${tbl[0].gone}`,
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
