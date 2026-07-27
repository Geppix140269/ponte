# Issue 42 Phase A - production probe results

**Probe date:** 26 July 2026  
**Execution:** Run by Giuseppe Funaro in the Supabase production SQL Editor  
**Probed at:** `2026-07-26T10:45:41.549418` UTC  
**Database:** PostgreSQL 17.6, database `postgres`, role `postgres`  
**Evidence level:** Production-proven for the Issue #42 market-record scope

The detailed reconciliation and conclusions are recorded in:

- `PHASE-A-FINAL-REPORT.md`

## Headline inventory

| Measure | Production result |
|---|---:|
| Total Market Signal rows | 6,735 |
| Approved signal rows | 3,543 |
| Approved and unexpired public Market Signals | 3,517 |
| Public requirements | 2,526 |
| Public offers | 991 |
| Total listings | 4 |
| Approved listings | 2 |
| Approved/current before owner eligibility | 2 |
| Approved/current with bound passing member-business verification | 0 |
| Desk-managed listings | 2 |
| Legacy service listings | 0 |
| Signal investigations | 1 |

## HS and classification coverage

| Measure | Production result |
|---|---:|
| HS catalogue rows | 5,613 |
| HS chapters | 97 |
| Approved listings with HS code | 2 of 2 |
| Public signals with HS code | 0 of 3,517 |
| Public signals with source category but no HS code | 3,517 |
| Invalid listing HS values | 0 |
| Invalid signal HS values | 0 |
| Records in unassigned chapters 71/91/92 | 0 |

## Import and provenance integrity

The `g4wb_v2` batch contains 6,441 rows:

- 3,543 approved;
- 2,898 private.

All 6,441 imported rows have a canonical id, source platform, source URL, import metadata and dedupe key.

| Integrity check | Result |
|---|---:|
| Duplicate canonical-id groups | 0 |
| Duplicate dedupe-key groups | 0 |
| Duplicate investigation request groups | 0 |
| Investigation-count mismatches | 0 |

There are 294 older private rows outside that batch: 204 without source metadata and 90 legacy `go4world` rows with source URLs/raw descriptions but no canonical id or import metadata.

## Stored vocabularies

Production confirms:

- listing types: 3 `offer`, 1 `requirement`, 0 `service`;
- listing statuses: 2 `approved`, 1 `draft`, 1 `submitted`;
- signal statuses/sides: 3,543 approved and 3,192 private;
- investigation requests: 1 `investigate`, status `new`;
- profile verification levels: 6 `unverified`, 1 `company_verified`, 1 null;
- no passing `member_business` verification exists; two such cases are in `review`.

## Key conclusions

1. The zero product-sector problem is production-proven and structural: all 3,517 public signals lack an HS code, although all 3,517 carry a source category.
2. The exact current public Member Opportunity inventory under the bound passing member-business eligibility rule is zero.
3. Trade services has no stored legacy listing inventory.
4. Distribution and representation cannot be counted canonically because neither market table persists `market_family`; one keyword candidate exists but is not a classification.
5. Origin separation, import provenance and duplicate protection are strong reusable foundations.
6. The verification-level code/database contract is defective because production stores a text enum while the application applies a numeric conversion/threshold.
7. The authenticated approved-listing RLS policy requires a grants/security review because its row condition does not include validity, reconfirmation or owner eligibility.

No database write, migration, backfill or runtime change was performed.