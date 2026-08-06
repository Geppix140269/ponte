# Waiver entity resolution spec, amendment 1

**Date:** 2 August 2026
**Amends:** `PONTE-WAIVER-ENTITY-RESOLUTION-SPEC.md`, resolution step 1 and the count query
**Cause:** a finding from Claude Code that contradicts the spec, verified and accepted
**From:** Claude (`claude-opus-5`), UX/UI Director
**Status:** the rule is **unchanged**. What changes is where the authority comes from, and one commercial consequence that needs a decision.

---

## 1 · The finding, accepted

The spec said the registry authority comes "from `verifications.registry`". **It does not.**

`verifications.registry` is `jsonb` holding the provider's response: `{source, available, status, companyName, regNumber, checkedAt}`. **`source` is the data provider**, `opencorporates` or `companies_house`, **not the register that issued the number.**

Claude Code is right that using `source` as the authority would be worse than useless. OpenCorporates is a global aggregator, so every jurisdiction would collapse into one namespace, which is precisely the collision correction 3 exists to prevent. A Delaware number and a Hamburg number would compete for the same key.

There is a subtlety worth recording: **`source` is sometimes authority-bearing and sometimes not.** `companies_house` is a single national register, so it does imply a jurisdiction. `opencorporates` implies nothing. **A field that is authority-bearing for some values and not others cannot be used as an authority at all**, because nothing in the data says which case you are in.

`registryAuthorityIsCapturable = false`, pinned by a test, is the correct way to hold this. The rule is not weakened: no qualifying identifier means no waiver and a $79 activation.

---

## 2 · The fix, and it is a capture change rather than a design change

**The authority is available from the provider. It is simply not being persisted.**

OpenCorporates' own data dictionary defines `jurisdiction_code` as a "lowercase, underscore version of ISO 3166-2 code", and states that **`jurisdiction_code` together with `company_number` forms the composite primary key of its companies dataset.** So the aggregator already models company identity exactly as correction 3 requires, as an authority plus a number, and Ponte is currently discarding the first half.

**The stronger option, and the one I recommend, is the GLEIF Registration Authorities List.** It is a public code list of **more than 1,050 business registers across 232 jurisdictions**, and LEI issuers use it in a field called `BusinessRegisterEntityID` composed of two parts: **Register**, the RA code identifying the authority, and **EntityID**, the local number that authority issued.

That is, exactly, the `(authority, value_normalised)` pair the decision specified. **The model you and the reviewer arrived at independently is the shape the international standard already uses**, which is a good sign for it and means the authority namespace does not have to be invented.

### What this means for implementation

1. **Persist the jurisdiction.** Capture `jurisdiction_code` from OpenCorporates and the equivalent for any other provider, into a named column or a named key, not buried in an opaque blob.
2. **Adopt GLEIF RA codes as the canonical authority namespace**, mapping provider jurisdiction codes onto them. Where no confident mapping exists, **store nothing rather than a guess.** A wrong authority silently merges two entities, which denies a waiver to a company entitled to one.
3. **`registryAuthorityIsCapturable` flips to true** only when a verification can produce an authority that is authoritative rather than inferred. Until then it stays false and it stays pinned.

**None of this is applied.** It is target-schema and verification-capture work, and it sits inside `WO-6.4` under the `DECISION-20` sequence.

---

## 3 · The count query correction

Claude Code is right that `usable_with_authority` over-reports: `registry is not null` counts "a lookup happened", not "an authority was captured". Replace that column with:

```sql
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified')
       and registry ? 'jurisdiction_code')                                            as usable_with_jurisdiction,
```

Today that will return **0** by construction, because the key is not written. It is worth keeping in the query as the measure that turns positive when the capture fix lands.

---

## 4 · The commercial consequence, which is the part that needs you

This is the reason this amendment exists rather than being a footnote in a commit message.

**The waiver is LEI-only in practice. LEIs are held almost entirely by entities that participate in financial markets.** They are required for derivatives and securities reporting under regimes like MiFID II and EMIR. They are not something a Turkish olive oil exporter, an Italian food distributor, a Vietnamese freight forwarder or a UAE trading company generally holds, and those are Ponte's members.

**So the free first Deal Room, as currently buildable, is available to approximately nobody.**

That is not a fault in the rule. The rule is correct and I would not weaken it. It is a sequencing fact: **the waiver cannot launch as a real offer until registry authority is capturable**, and until then any pricing surface that advertises a free first room will be advertising something almost no visitor can claim.

Three ways forward, and this is your decision, not mine.

| | Consequence |
|---|---|
| **A · Do the capture work before the waiver is announced** | The waiver launches as a real offer. Costs the `jurisdiction_code` persistence and the RA mapping, which is a contained piece of work, plus the `DECISION-20` sequence to apply the schema. |
| **B · Launch paid-only, add the waiver later** | $79 from the first activation. Simple, honest, and nothing on any surface promises something unavailable. The waiver becomes a later announcement rather than a broken one. |
| **C · Announce the waiver now and let almost every member fail to qualify** | Not viable. It would put a promise on the pricing page that the system refuses, which is the class of thing `DECISION-19` and the whole honesty doctrine exist to prevent. |

**My recommendation is B, then A.** Ship paid-only, do the capture work properly, announce the waiver when it can actually be claimed. It also removes the waiver from the launch critical path entirely, which matters given that `20260731e` cannot be applied until there is a staging rehearsal and a second reviewer, neither of which exists.

**What must not happen either way:** no pricing surface states or implies a free first room until the identity that gates it can be captured. `WO-7.5` should be built with the waiver copy behind the same flag as the waiver itself.

---

## 5 · Unchanged

Everything else in the spec stands: the resolved-entity model, identifier aliases, the at-most-one claim per entity, LEI ISO 7064 validation, the refusal to merge entities automatically, the `coalesce(authority,'')` in the unique index, and the atomic $0 activation with no Stripe object and no webhook.

**Sources:**

- [Data Dictionary: Companies, OpenCorporates Knowledge Base](https://knowledge.opencorporates.com/knowledge-base/data-dictionary-companies/)
- [GLEIF Registration Authorities List](https://www.gleif.org/en/lei-data/code-lists/gleif-registration-authorities-list)
