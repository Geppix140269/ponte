# Schema snapshots

Schema-only dumps of production's `public` schema. Structure only: tables,
columns, functions, policies and grants, with no rows.

These exist because the migration history cannot rebuild the database on its
own - see the KNOWN DRIFT note in `supabase/schema.sql` and the blocker section
of `docs/platform/DEAL-ROOM-GATE-PROOF-RUNBOOK.md`.

`deal-room-migration-replay.yml` restores the newest file here as its baseline,
and refuses any file containing `COPY`, `INSERT` or a data section.

Produced with pg_dump 17 or newer, because production is PostgreSQL 17.6:

```bash
pg_dump --dbname="$PROD_URL" --schema=public --schema-only --no-owner \\
  --file=supabase/schema-snapshots/production-public-<date>.sql
```

`--no-acl` is deliberately absent: the grants are part of what the gate proof
checks.
