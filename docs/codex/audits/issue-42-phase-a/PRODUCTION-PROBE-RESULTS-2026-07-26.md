# Issue 42 Phase A - production probe results

**Probe date:** 26 July 2026  
**Execution:** Run by Giuseppe Funaro in the Supabase production SQL Editor  
**Source query:** Section 15, `Production evidence summary values`, in `PRODUCTION-PROBE.sql`  
**Evidence level:** Production-proven for the values in this result set only

## Exact result supplied

| public_market_signals | approved_listing_head_count | approved_current_listing_count_before_owner_eligibility | approved_legacy_service_listings | public_signals_with_hs_code |
|---:|---:|---:|---:|---:|
| 3517 | 2 | 2 | 0 | 0 |

## What this proves

1. Production currently contains **3,517 approved and unexpired Market Signals**.
2. Production contains **2 approved member/Ponte-managed listings** at the simple status-count level.
3. Both approved listings also pass the validity and 90-day reconfirmation checks measured by the probe, before checking owner verification eligibility.
4. Production contains **0 approved rows using the legacy `listings.type = 'service'` representation**.
5. Production contains **0 approved and unexpired Market Signals with an HS code**.

## Architectural implications

- The public market is overwhelmingly made up of external Market Signals rather than native Member Opportunities.
- The product-sector zero-count problem is structural and production-proven: the public Market Signals cannot enter the current HS-derived sector buckets because none of the 3,517 public signals carries an HS code.
- The current native public inventory contains no approved legacy service listing.
- This result does not prove that none of the 3,517 signals describes a service or distribution relationship, because `desk_radar` does not persist `market_family`. Under the present model they cannot be counted truthfully as Trade services or Distribution and representation.
- Distribution inventory remains unmeasurable under the current persisted contract.
- The two approved listings still require the owner-eligibility part of the probe before they can be called exact visible Member Opportunities.

## Evidence still required

This is the final summary result set, not the complete production probe output. Phase A still needs the other result sets covering:

- live columns, data types and defaults;
- constraints, indexes, triggers, functions, RLS and policies;
- stored lifecycle and legacy type vocabularies;
- exact listing visibility after owner eligibility;
- HS and source-category coverage by batch;
- provenance gaps and source batches;
- duplicate checks;
- investigation-count reconciliation;
- verification-level values and repository drift.

No database write, migration, backfill or runtime change was performed.