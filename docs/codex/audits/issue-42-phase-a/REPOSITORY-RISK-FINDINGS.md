# Issue 42 Phase A - repository risk findings

**Date:** 26 July 2026
**Status:** Repository-proven findings; production impact pending read-only probe

## R-01 - verification-level comparison does not validate a text enum

**Severity:** High
**Affected area:** Public eligibility of approved member listings

### Evidence

`scripts/seed-ponte-managed-qos.ts` states that
`profiles.verification_level` is a text enum:

```text
unverified | email_verified | phone_verified | company_verified | fully_verified
```

The script writes `company_verified` for the Ponte Desk profile.

`lib/listings/publication-gate.ts` currently evaluates the level as:

```ts
Number(verificationLevel ?? 0) < 2
```

In JavaScript:

```ts
Number("company_verified") // NaN
NaN < 2                    // false
```

The same numeric conversion is used when deciding whether an approved listing's
owner remains publicly eligible.

### Finding

When the stored value is a text enum, the numeric comparison does not prove that
the value is at or above the required business-verification level. A textual
value such as `unverified` also becomes `NaN`, and `NaN < 2` is false.

Other checks remain in place:

- a bound `business_verification_id`;
- verification purpose `member_business`;
- passing verification status.

However, the verification-level condition itself is not enforced by the current
numeric comparison if production uses the documented text enum.

### Production evidence required

The Phase A production probe records:

- the live data type of `profiles.verification_level`;
- all stored values and counts;
- values used by owners of approved/current listings;
- the bound verification purpose and status.

### Phase boundary

No code fix is included in Phase A. If the live column is the documented text
enum, create a separate targeted corrective PR after the probe. Do not hide this
inside the unified market-schema migration.

## R-02 - overall member count can exceed visible member inventory

**Severity:** High
**Affected area:** Explore and landing totals

### Evidence

`lib/board/market-activity.ts` counts member records using:

```text
listings.status = approved
```

The row reader additionally removes records that fail:

- `valid_until` currency;
- 90-day reconfirmation;
- current owner business-verification eligibility.

### Finding

The displayed overall total can include approved member rows that the public row
reader will not show. The code documents this as an upper bound, but the public
number can still be read as an exact count.

### Production evidence required

The probe records three layers:

1. approved status count;
2. approved plus validity/reconfirmation count;
3. approved/current plus bound passing member-business verification count.

## R-03 - current service classification reverses the apparent intent

**Severity:** High
**Affected area:** Trade services inventory and filters

### Evidence

- Structure describes `type = service` as offering a trade service.
- `kindForListingType("service")` returns `service_requirement`.
- Explore counts `service_requirement` as Trade services.

### Finding

The current record does not persist whether a service is sought or offered, and
the ActivityKind name implies the opposite of the current creation copy. Any
service supply/demand count would therefore be unsupported.

## R-04 - imported product signals cannot populate product sectors

**Severity:** High
**Affected area:** Product sector counts

### Evidence

`lib/market-signals/import-map.ts` writes:

```ts
hs_code: null
```

for every current workbook import because the source has no clean HS column.
Explore sector membership requires a derived HS chapter.

### Finding

The public result of non-zero Products with zero product-sector records follows
directly from the current data contract. Hiding the copy alone does not repair
the classification gap.

## R-05 - signal capability is not native market inventory

**Severity:** Medium
**Affected area:** Member Opportunity counts

### Evidence

`signal_investigations.request_kind = capability` stores what a member can supply
or would buy in response to a specific external signal.

### Finding

This is an action attached to a Market Signal. It has no standalone member
listing lifecycle, publication review, validity, family or canonical intent.
It must not be counted as a Member Opportunity unless the member explicitly
converts and submits it through a native opportunity flow.
