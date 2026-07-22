# HS Codes — Import Runbook

One-off data load. Run this once on your local machine to populate
`hs_codes` + `hs_embeddings` with the WCO HS 2022 codes.

## Prerequisites

1. Supabase migration `supabase/migrations/20260527_hs_codes.sql` already
   run (you've confirmed this)
2. Node 18+ installed locally
3. You're in the repo: `C:\dev\ponte`

**No OpenAI key is needed.** This runbook used to open by asking for one.
`scripts/import-hs-codes.ts` reads exactly two variables, both Supabase, and
has no model call in it at all. The requirement was left over from an earlier
embeddings-based version of the import and was removed on 22 July 2026, along
with the last other reference to OpenAI anywhere in the platform.

## Step 1 — Install the two dev dependencies needed by the script

```powershell
npm install --save-dev tsx dotenv
```

## Step 2 — Create a `.env.local` file at the repo root

`.env.local` is git-ignored. Use it to feed the script the two values it
needs. Take both from the Supabase dashboard rather than from the hosting
provider, so a stale copy in a dashboard cannot send this at the wrong project.

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...        # Supabase → Project Settings → API → service_role secret
```

The `service_role` key is your full-access Supabase key (NOT the anon
key). Find it in Supabase → Project Settings → API → "Project API keys"
section → "service_role". Never commit this file to git.

## Step 3 — Run the import

```powershell
npx tsx scripts/import-hs-codes.ts
```

Expected output:

```
Fetching WCO HS 2022 CSV...
Parsed 6940 rows.
Inserting 6940 hs_codes rows (idempotent)...
  6940/6940
hs_codes upsert complete.
Fetching back inserted IDs...
Have IDs for 6940 rows.
Checking existing embeddings...
Already have 0 embeddings.
Need to embed 6940 rows.
  embedded 6940/6940
Embeddings complete.
Done.
```

Runtime: ~5 minutes (the embedding step is the slow part — ~70 OpenAI
API calls in batches of 100).

OpenAI cost for this one-off run: ~$0.003 (negligible).

## Step 4 — Verify the data landed

In Supabase SQL editor:

```sql
select count(*) from hs_codes where schedule = 'WCO';
-- should return ~6940

select count(*) from hs_embeddings;
-- should return ~6940
```

## Step 5 — Test the search

Visit https://ponte.trade/tools/hs while logged in. Try searches like:

- "fresh salmon fillets"
- "lithium batteries"
- "olive oil"

You should get results within ~1 second per search.

## Re-running

The script is idempotent. If it crashes halfway through embeddings, just
re-run it — it will skip codes it has already inserted and only embed
rows that don't yet have an embedding.

## Adding more tariff schedules later (US HTS, EU TARIC, UK GTT)

This script only loads the WCO 6-digit codes. To add the
country-specific extensions later, we'd need additional scripts that
fetch from:

- US HTS: https://hts.usitc.gov (CSV download)
- EU TARIC: https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp
- UK GTT: https://www.trade-tariff.service.gov.uk

These come in different formats and would need their own importers.
Defer until customer demand is proven for the WCO 6-digit search.
