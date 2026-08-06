# WO-6.7: do any `SECURITY DEFINER` functions bypass the `AUTH-05` boundary?

**Date:** 6 August 2026
**Scope:** repository only. Read from the committed schema snapshot,
`supabase/schema-snapshots/production-public-20260801.sql`. **No production
access.**
**Answer, short:** the Deal Room family is clean. **Two functions outside it are
not, and between them they carry 46 policy expressions including the Deal Room's
own.**

---

## 1. What was checked

`AUTH-05` makes RLS the mandatory permission boundary for the Deal Room. The
WO-2 reconciliation recorded that **RLS is enabled on all 76 tables and FORCED
on none**, so the table owner and any `SECURITY DEFINER` path bypasses every
policy, and that 32 `SECURITY DEFINER` functions exist in `public`.

A `SECURITY DEFINER` function runs with the **definer's** privileges. If it does
not pin its own `search_path`, it resolves unqualified names using the
**caller's**, so the caller chooses which objects the privileged body touches.

That is not theoretical here. It is the defect that broke this product before:

> `20260722e_handle_new_user_search_path.sql`: *"handle_new_user() is SECURITY
> DEFINER with no search_path of its own, so it runs with whatever search_path
> the caller has... `insert into profiles` therefore fails to resolve the table,
> raises, and is caught by the function's own exception handler."*

Every member who signed up while that was live got no profile row and no credit
grant, and nothing reported it.

---

## 2. Result

**27 of the 32 pin `search_path`. Five do not.**

| Function | `search_path` | Used in RLS |
| --- | --- | --- |
| `is_admin` | **NO** | **40 policy expressions** |
| `is_deal_participant` | **NO** | **6 policy expressions** |
| `apply_trust_delta` | **NO** | none |
| `increment_adamftd_usage` | **NO** | none |
| `increment_completed_deals` | **NO** | none |
| every `deal_room_*` function (23) | yes | many |
| `handle_new_user`, `spend_credits`, `guard_profile_role`, `sanctions_match`, `sync_investigation_count` | yes | - |

**The Deal Room family is clean.** All 23 `deal_room_*` functions pin
`search_path`. `20260730b` and `20260730c` did that work and it held.

---

## 3. The finding

**`is_admin` and `is_deal_participant` are `SECURITY DEFINER`, do not pin
`search_path`, and are the predicates 46 policy expressions delegate their
decision to.**

`is_deal_participant` is on the `AUTH-05` boundary directly. `is_admin` is worse
in reach: it is the administrative predicate for most of the schema.

The shape of the risk: a caller who can influence `search_path` **and** create an
object that shadows an unqualified name in one of these bodies would have that
object read while the function runs with the definer's rights. `is_admin`
returning `true` incorrectly is a total bypass of forty policies.

---

## 4. What I could NOT determine, and it matters

**Whether this is reachable.** It depends on two things I cannot read from the
snapshot:

1. **Whether any role available to a member can set `search_path`.** PostgREST
   sets it per request from `extra_search_path`; whether an RPC or a connection
   path exists that lets a caller change it is not visible here.
2. **Whether `anon` or `authenticated` holds `CREATE` on any schema in the
   path.** Without CREATE somewhere reachable, there is nothing to shadow with.
   Supabase's newer defaults do not grant it, but this project predates several
   of those defaults and the snapshot does not carry schema-level ACLs.

**So this is a latent hardening defect of a known-dangerous class, not a
demonstrated exploit, and I am not claiming otherwise.** It sits in the same
category as the `handle_new_user` bug: harmless until the day it is not, and
invisible while it is harmless.

**What would answer it:** `has_schema_privilege` for `anon` and `authenticated`
on every schema in the search path, plus the ACLs on those five functions. One
read-only query, human-run, same shape as the WO-2 export.

---

## 5. What is not proposed here

**No fix.** `DECISION-26` and the standing instruction both put migration
remedies with the reconciliation rather than with whoever finds the defect, and
`ADR-0031` routes any production change through `DECISION-20` steps 3, 4 and 5
plus its four controls.

For the record, the remedy is small and the repository already contains the
pattern: `set search_path = public` on each of the five, exactly as
`20260722e` did, restating each function in full so a fresh database can build
it rather than assuming somebody already has.

**It is a five-line change that must not be made casually**, because `is_admin`
is load-bearing for forty policies and getting it wrong locks out the
administrator or opens the schema.
