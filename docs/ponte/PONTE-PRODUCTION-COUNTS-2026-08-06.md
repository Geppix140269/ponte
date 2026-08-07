# Production row counts, 6 August 2026

**Run by:** Giuseppe Funaro, by hand, Supabase SQL editor, Ponte Trade production
**Boundary:** counts only. No row contents read. `DECISION-22` option A held.
**Closes:** four unknowns listed as undetermined in the WO-2 reconciliation report §7
**Amends:** `WO-8` §3, legacy object treatment, and the WO-2 severity axis for member-data integrity

---

## The result

| Measure | Count |
|---|---|
| `organizations` | **1** |
| `verifications`, `purpose = 'member_business'` | **4** |
| of those, `status in ('verified','auto_verified')` | **0** |
| of those, with an LEI | 0 |
| of those, with a registration number | 0 |
| of those, with a captured jurisdiction | 0 |
| `deal_room_entitlements` | **0** |
| `deal_rooms` | **0** |
| `deals`, the legacy model | **0** |
| `listings_legacy_20260720` | **0** |
| `listing_connections`, member interests | **3** |

---

## 1 · The legacy layer is empty, and that changes the migration

`deals` and `listings_legacy_20260720` **both hold zero rows.**

The WO-2 report recorded `listings_legacy_20260720` as un-droppable until `deals.listing_id` and `adamftd_verification_checks.listing_id` were addressed, and it could not say whether either table held data. **Now it can. Neither does.**

Consequences for `WO-8` §3 and for whatever migration follows:

- Removing `listings_legacy_20260720` and its two foreign keys is a **data-free structural change**. Nothing is preserved because nothing is there.
- `deals`, the complete second deal model discovered in the export, **has never been used**. It is dead structure, not dormant history.
- `deal_rooms` is **empty**, so the entire Deal Room schema, twenty-one tables, carries no member data at all. The paid layer can be built without any risk to member records, because there are none.

**This is the single biggest simplification available to the reconstruction work** and it should be established before anyone plans around preserving legacy data.

**Not established:** whether `adamftd_verification_checks` holds rows. It was not in the query and it is one of the two foreign keys concerned.

## 2 · No member has ever completed business verification

**Four `member_business` verifications exist. None reached `verified` or `auto_verified`.**

This is larger than the waiver. `ADR-0018` makes member business verification free and it is the gate on several things downstream. Four members started it and none finished, and until this query nobody knew.

Three possible causes and the query does not distinguish them:

1. the journey is broken and fails before completion
2. the four are stuck in `review` or `needs_selection`, waiting on a human who was never told
3. members abandon it, which is a funnel problem

**One follow-up query settles it**, and it reads no personal data:

```sql
select status, count(*)
  from public.verifications
 where purpose = 'member_business'
 group by status
 order by count(*) desc;
```

If they are sitting in `review` or `needs_selection`, **four members are waiting on Ponte** and have been for some time.

## 3 · `ADR-0030` was right, and now it is evidenced rather than reasoned

`ADR-0030` deferred the first-activation waiver on the argument that almost no member would hold an LEI or a captured registry identity.

**The measured answer is not "almost none". It is zero, and it is zero one level earlier than expected.** No member has a usable verification at all, so the identity question never arises. Deferring the waiver was correct and the reasoning in `ADR-0030` understated the case.

## 4 · Member-data integrity, WO-2 severity axis

WO-2 v1.1 classified member-data integrity as **undetermined**, correctly, because no rows had been inspected.

It is now **partly determined**, and favourably: the Deal Room layer and the legacy layer are empty. What remains unmeasured is `profiles`, `listings` and `adamftd_verification_checks`. Planner estimates put the first two at 10 and 8, but estimates are not counts and this document does not treat them as such.

**The axis should not be reclassified to minor on this evidence.** It should read: *empty where measured, unmeasured elsewhere.*

## 5 · What this does not change

The reproducibility finding stands unaltered. Production still cannot be recreated from the version-controlled repository alone, no rehearsal is possible until it can, and `WO-8` is still the critical path. **Empty tables make the migration safer. They do not make it possible.**
