# Ponte — canonical authority v5.2

**v5.2, 2 August 2026.** **Corrects a factual error that originated with me and propagated into five documents and one decision: I reported PR #53 as unmerged. It was merged on 27 July 2026 at commit `b9f2c032ac44f2fd02b0d2124a0ebc2af9c993b4`, and current `main` descends from it.** I repeated a status note inside a document as though it were verified repository state, and did not check GitHub. `DECISION-23` is replaced with audit-and-supersede. Also: the production-SQL prohibition no longer contradicts the export it authorises; the remaining unlimited-capacity promises are removed; `AUTH-01` now covers renewals and reactivations; the `B10` title is binding; and the header and status appendix are corrected.

**v5.1, 2 August 2026.** Corrects eight internal inconsistencies found on strategic review. No new decisions: these are corrections to how already-taken decisions were expressed. `AUTH-02` no longer says "at payment", which became false when Starter was priced at $0. `AUTH-05`, `DECISION-20` and `DECISION-22` now agree that **Claude Code does not connect directly to production for this reconciliation work**, and the database-role exception is removed. A future connection remains possible only through a new explicit decision. The stale `PARAM-03` paragraph is gone. Starter terminology drops "upgrade", which is meaningless once Starter and paid rooms are identical. Four screen-mapping errors are repaired. A false cross-reference to section 4 is corrected. The controller is made durable rather than session-bound. `DECISION-25` and `DECISION-27` are tightened.

**v5, 2 August 2026.** Adds `DECISION-22` to `DECISION-27`: production data access boundary, PR #53 handling (since corrected in v5.2), formal separation of repository and deployment control, design pacing, a pre-committed response to reconciliation findings, and the merge gate. 

**v4, 2 August 2026.** Adds `AUTH-04`, `AUTH-05` and `DECISION-15` to `DECISION-21`, taken by GPT as strategic reviewer and accepted. Amends `AUTH-02`. Closes all three open parameters, so section 7 now records resolutions rather than gaps. Adds the v1 scope definition, which the product has never had. Moves dated and temporary facts out of the permanent sections into a status appendix, so the decisions do not go stale.

**Date:** 2 August 2026
**Author:** UX/UI Design Director
**Status:** Approved for canonical adoption. **Becomes operative when recorded in the repository authority record and reflected in [GitHub Issue #130](https://github.com/Geppix140269/ponte/issues/130).**
**Supersedes:** the August 28-screen grouping as a rival register. It survives only as the mapping in section 6.

---

## 1. Doctrine, authority and amendments

| ID | Decision |
|---|---|
| `AUTH-01` | **Money: Starter free, then $79.** **One free 30-calendar-day activation per verified organisation. Every later room activation, renewal or reactivation costs $79 for 30 calendar days.** No subscription. No credits. No Portfolio tier. USD. |
| `AUTH-02` | **Verification at activation, with defined earlier exceptions.** Superseded wording ("at payment only", "when money moves") withdrawn. Restated in full below this table. `DECISION-09` stands. |
| `AUTH-03` | **The July register `A01` to `E18` is canonical.** 73 screens. The August 28-screen grouping is retired and reissued as a mapping, section 6. **The register is not the scope.** Capabilities and completed journeys define a release. See `DECISION-17`. |
| `AUTH-04` | **Compliance accountability.** Giuseppe, as operator, owns the v1 compliance policy and the risk acceptance. Claude Code implements. The repository and deployment controller owns release verification. **AI cannot be the legal owner of trade-compliance policy.** |
| `AUTH-05` | **Migration reconciliation**, with roles separated. **Human or DBA:** produces the authorised sanitised export defined in `DECISION-22`. **Claude Code:** analyses that export, and later prepares proposed migration work. **Controller:** verifies evidence and controls progression between steps. Six-step sequence in `DECISION-20`. |

**`AUTH-02` as amended by `DECISION-18`, restated in full.** The phrases "at payment" and "when money moves" are withdrawn; they became false when Starter activation was priced at $0.

> **Verification at activation, with defined earlier exceptions.** Verified contact is sufficient for listings, expressions of interest, invitations, admission and room preparation. **Business verification is required for the activating organisation at either Starter or $79 activation.** It may be required earlier by the listing owner before sensitive disclosure or admission, or by a risk trigger.

---

## 2. What is canonical, by layer

| Layer | Authority | Documents |
|---|---|---|
| **Journey and screens** | **July** | Zero Friction Storyboard v0.3, `A01` to `E18` |
| **Deal Room interior** | **July** | Deal Room Approved Consolidated Specification v1, `DR-01` to `DR-21` |
| **Recognition and progress** | **July** | Professional Momentum and Recognition Standard v1, binding |
| **Integrity and evidence** | **July** | Ponte Integrity, `C06A` to `C06D`, `E11A`, `I01` to `I07` |
| **Prototype execution** | **July** | Clickable Prototype Specification v1, `P01` to `P34` |
| **Commercial model and entitlement** | **August, as amended by `AUTH-01`** | This document, section 3 |
| **Listing lifecycle and screening** | **August** | Model v2.1 sections 6.1, 10, 12.1, 14 |
| **Naming discipline** | **August** | Publish / create / activate. P1 copy brief. |
| **Live defect fixes** | **August** | P0 bugs, P1 copy, independent of everything above |

---

## 3. Amendments to the July package

These are the specific changes `AUTH-01` and `AUTH-02` force. Nothing else in the July package changes.

### 3.1 Entitlement, lifecycle step B and screen `E01`

`E01` "Deal Room Access Choice" survives with **two options, not five**:

| Option | Condition |
|---|---|
| **Activate with Starter — $0** | The organisation is business-verified and has not used its Starter entitlement |
| **Activate for $79** | Always available. 30 consecutive calendar days from activation. |

**Removed:** Portfolio at EUR 149 per month or EUR 1,490 per year. Credit packs and credit consumption values. Promotional entitlement. Authorised waiver as a user-facing path.

**Sponsorship survives, reclassified.** It is no longer an entitlement tier. Under `DECISION-07`, the creator or any admitted counterparty may activate and pay, and the paying organisation does not acquire the Deal or another party's decision authority. That is exactly the July sponsorship rule, expressed as a payment fact rather than a plan.

**Lifecycle step B** in the consolidated specification, currently "Use Starter eligibility, subscription capacity, credits, sponsorship, promotional entitlement or an authorised waiver", becomes:

> **B. Choose entitlement.** Use the organisation's unused Starter entitlement, or activate for $79.

**Currency is USD throughout.** Remove every EUR figure.

### 3.2 The Starter room

Retained as principle, with the clock corrected:

- No credit card required.
- One organisation-level Starter entitlement. Duplicate personal accounts do not create additional free rooms.
- The real core workflow, not a demo: admission, NDA, procedure, evidence, clarification, blockers, decisions, milestones, progress and basic AI recap.
- **30 consecutive calendar days from activation**, not "30 active days from first required principal admission". `DECISION-05` applies to the Starter room and the paid room identically. One clock, one definition.
- Expiry makes the room read-only. It does not delete evidence or history.
- **Paid renewal or reactivation continues the same room with no re-entry and no re-upload.** There is no functional upgrade: Starter and paid rooms have the same capabilities.
- Participating as a sponsored guest in another organisation's room does not consume the guest organisation's Starter entitlement.

**Closed by `DECISION-15`.** No Starter-specific capacity, sub-room, participant or functional restrictions apply; common technical and safety limits apply equally to Starter and paid rooms. The July proposal of three sub-rooms, two external organisations and two internal users is void.

### 3.3 Admission, screen `E05`

The admission checklist keeps: authenticate, identify the organisation or declared capacity, declare the transaction role, declare authority to participate, accept the Participation Agreement, accept the NDA and confidentiality obligations, accept room rules.

**Changed:** "Satisfy the Deal Room-ready Business Passport threshold" is no longer a system-mandated gate for admission. Per `AUTH-02` and `DECISION-09`:

| Moment | Requirement |
|---|---|
| Admission to a room, free or paid | Verified contact, plus the declarations and agreements above |
| **Activating a room, Starter or $79** | **Business verification of the activating organisation** |
| Before revealing sensitive private fields, or before admitting a respondent | **The listing owner may require business verification.** Owner's discretion, not a system default. |
| High-risk category, jurisdiction or value | Enhanced checks, triggered by risk, never universal |

The `C01` to `C07` verification journey is unchanged and still excellent. It moves from being a precondition of admission to being invoked at activation, at owner discretion, or on risk trigger.

**Note.** The Starter room is free but still requires a verified organisation, so business verification is required to activate a Starter room. Free of charge does not mean free of verification. That is the one place where a free path carries the verification cost, and it is correct, because Starter entitlement is granted per organisation and has to be defensible against duplicate accounts.

### 3.4 Vocabulary

My August vocabulary lock is amended. **Momentum survives.** Having read the standard, momentum there is not a vague label. It is a binding recognition contract with five levels, an event catalogue and a list of prohibited patterns. It stays.

| Term | Status |
|---|---|
| **Momentum** | **Reinstated.** Binding, per the Professional Momentum and Recognition Standard v1. |
| **Commercial stage** | **Reinstated.** Named, and separate from percentage, which is the point. |
| **Procedural completion** | **Reinstated**, but only where a percentage is actually shown, and never before the procedure is agreed. |
| Workspace | **Still retired.** Use **sub-room** inside a Deal Room. **`B10` "Deal Workspace" needs a new user-facing title**, even where the internal screen ID stays `B10`. **Binding user-facing title: "Your listing".** |
| Market family | Still retired in the interface. The choice is the choice. |
| Route across, intake | Still retired. |
| Publish, for the paid room action | **Still prohibited.** Activate. The July event catalogue already separates `deal_published` from `room_activated`, so the two packages agree. |
| 30 active days | **Retired.** 30 consecutive calendar days from activation. |

### 3.5 The no-box law

The storyboard wireframes render recent market activity and family choices as cards. **The no-box law wins.** Structure comes from typography, scale, whitespace, full-width hairlines and background tone shifts. This is an execution correction at draw time, not a change to the July architecture.

---

## 4. What August contributes that July does not have

Six things. These become additions to the July register rather than a rival to it.

| # | Contribution | Where it attaches |
|---|---|---|
| 1 | **Automated screening states**: needs information, duplicate detected, limit reached, held for review. Four tiers, publication limits by verification level, post-publication moderation. | After `B07` submit, before `B09` confirmation |
| 2 | **Informed-disclosure acceptance.** Before accepting an expression of interest, the owner sees exactly what acceptance releases: both identities, the precise private fields, the respondent's intermediary status. Acceptance is a disclosure action, not a generic button. | New, owner side, between `D02` and `D03` |
| 3 | **Capacity declaration at listing**, distinct from verification. "For this opportunity, I am acting as..." A previous answer is a suggestion, never silently applied. | Before `B07`, distinct from `C03` |
| 4 | **Honest pending and lapsed states** for an expression of interest. Ponte does not promise an owner will reply. | `D02` |
| 5 | **Listing validity, expiry, archive and reopening.** 60 calendar days default, 90 maximum, reopening requires reconfirmation and fresh screening. | `B07`, `B10` |
| 6 | **Distribution position model.** Four positions forming two matching pairs, with intermediary correctly held as a capacity rather than a position. Without it, two listings that are each other's counterparty are indistinguishable from two that are peers. | `T01`, `T02`, `T03` |

---

## 5. Where the two packages already agree

Worth stating, because it is most of the substance and it means the merge is amendment rather than reconstruction.

- Free layer creates liquidity, the Deal Room earns payment.
- Procedure before conversation. Generic chat is not the dominant structure.
- Progress is deterministic and procedure-based. No percentage before the procedure is agreed.
- Upload does not mean verified, authentic or accepted.
- One clear next action on active surfaces.
- Privacy enforced at the data layer, not hidden in the interface.
- No Trust Scores, no rankings, no gamification.
- Truthful uncertainty. A Deal can be created with destination and HS code open.
- Mobile leads with stage, next action, blocker and recent change.
- English interface, multilingual user input.
- `deal_published` and `room_activated` are already separate events.

---

## 6. Mapping: retired August screens to canonical July screens

The August grouping is retired. This table exists so that anything already written against `S-*` identifiers can be redirected without loss.

| August, retired | July, canonical | Note |
|---|---|---|
| `S-H1` Home | `A01` Landing / Ponte Desk | |
| `S-A1` What are you doing | `B01` Choose Deal Intent | Add the distribution position selector |
| `S-A2` Tell Ponte | `B02` / `S01` / `T01` | **Set 1 pattern. Unchanged.** |
| `S-A3` The listing so far | `B03` `B04` `B05` / `S02` / `T02` | **Set 1 pattern.** July splits essential from optional; the August merge and its rise-above-confirmed hierarchy applies within that. |
| `S-A4` Acting as | New, before `B07` | Contribution 3 |
| `S-A5` Continue to publication | `B08` Light Account Gate | **Set 1 pattern. Unchanged.** |
| `S-A6` What the market sees | `B07` Deal Preview | July already shows the public and private boundary |
| `S-A7` Publish | `B07` submit | |
| `S-A8` Published | `B09` Submission Confirmation | |
| `S-A9` to `S-A12` failure states | New, between `B07` and `B09` | Contribution 1 |
| `S-C1` What is the deal | `B02` path, then `E02` Room Setup | |
| `S-C2` The deal so far | `B03` equivalent | |
| `S-C3` Continue | `B08` | |
| `S-C4` The procedure | `E07` Procedure Proposal, `E08` Approval | July is richer. Use July. |
| `S-C5` Invite | `E03` Invitation Preview | |
| `S-C6` The room, six variants | `E06` Deal Room Command | The six approved state variants apply to `E06` |
| `S-C7` Activate | `E01` Deal Room Access Choice | Now two options per `AUTH-01` |
| `S-CP1` You have been invited | `E04` Invitation Landing | |
| `S-CP2` Review deal and procedure | `E04` with the `E03` permitted preview | |
| `S-CP3` Accept, decline or correct | **Not `E05` alone.** Decline and factual correction occur **before** admission, on the invitation surface. Only accepting leads into `E05` Admission Checklist. | Amended per `AUTH-02` |
| `S-E1` The listing | `A05` Market Record Detail, `B10` (title retired, see note) | **A member opportunity and a Market Signal are different objects and must not be conflated at `A05`.** If they share a visual pattern, their provenance, verification state and honesty copy must remain visibly distinct. |
| `S-E2` Your interest | `D01` Investigation or Interest Request | Add the mutual-disclosure statement before sending |
| `S-E3` Interest status | `D02` Request Status | Three states: pending, lapsed, and **an explicit accepted state carrying the mutual disclosure and the respondent's Create Deal Room action**. Owner and respondent routes both use the **accepted-interest ID** and create **one idempotent room**. |
| `S-EO1` Interest received | `D03` Counterparty Fit Summary | Owner side |
| `S-EO2` Accept and disclose | New, plus `D04` Deal Room Progression Decision | Contribution 2 |

**Set 1 is unaffected.** All three patterns map cleanly and Design should continue without change.

---

## 6b. v1 scope — `DECISION-17`

The product has never had a scope line. This is it.

**Ship the complete commercial loop across all six opportunity types.** Source a product · Supply a product · Find a trade service · Offer a trade service · Find distribution or representation · Offer distribution or representation.

**v1 includes:** free public listings · expressions of interest · mutual identity disclosure after acceptance · one accepted interest creating one Deal Room · direct creation of a Deal Room without a listing · Starter activation followed by $79 activations · the core room, meaning participants, procedure, steps, evidence, decisions, blockers, milestones, permissions and expiry.

**Two constraints on how this is read.**

1. **Reduce depth, not breadth.** A narrower v1 is achieved by shipping less depth per journey, never by removing trade services or distribution. Removing families would recreate the product-only architectural error corrected on 2 August.
2. **Services and distribution are not "content work".** They require different facts, different validation and different matching logic. The family-specific schemas are in `PONTE-OPPORTUNITY-JOURNEY-MODEL-v2.1.md` section 4, not in this document. The build may implement families sequentially behind feature flags; the public v1 scope includes all three.

**The 73-screen register is not the scope.** Capabilities and completed journeys define the release.

---

## 7. Parameters — all resolved

| ID | Resolved as | By |
|---|---|---|
| `PARAM-01` | **$49 per Market Signal investigation**, introductory v1 price. Defined deliverable: source and freshness check; a confirmation, non-confirmation or unable-to-confirm result; an evidence and source trail; a recommended next action. **Payment buys the investigation, not a guaranteed opportunity, response or introduction.** Review after the first 20 completed investigations against actual effort and conversion. | Strategic reviewer, 2 Aug 2026 |
| `PARAM-02` | **Resolved. See `DECISION-16`.** | |
| `PARAM-03` | **Resolved. See `DECISION-15`.** No Starter-specific capacity, sub-room, participant or functional restrictions apply. Common technical and safety limits apply equally to Starter and paid rooms. | |

---

## 7b. Decisions 15 to 21

| ID | Decision |
|---|---|
| `DECISION-15` | **Starter entitlement.** The first Deal Room activation for each business-verified organisation is **free for 30 calendar days**, with **the same functional capability and capacity as a paid room**. No crippled room and **no separate Starter interface**. One free activation per verified organisation. Renewal $79. Every subsequent room $79. **No Starter-specific sub-room, participant or functional restrictions. Common technical and safety limits apply equally to Starter and paid rooms.** Rationale: duration and one-time entitlement prevent permanent free use, whereas structural restrictions would prevent the user from experiencing what distinguishes Ponte. |
| `DECISION-16` | **Draft retention.** *Unauthenticated listing drafts:* stored only in that browser, retained **7 calendar days** after the last meaningful edit, **no anonymous document uploads**, and clearing browser data may remove the draft sooner. Approved wording, verbatim: *"Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device."* *Signed-in listing and unactivated Deal Room drafts:* retained **90 days** after the last meaningful edit or an explicit "Keep draft" action; warnings at **14 and 3 days**; then a **recoverable deleted state for 30 days**; then permanent deletion unless a legal or security hold applies. **Opening a draft must not silently reset the clock.** Activated and concluded rooms follow their separate retention policy. |
| `DECISION-17` | **v1 scope.** See section 6b. |
| `DECISION-18` | **Verification for the free Starter room.** Business verification is required when activating the free Starter room. Free listings, expressions of interest, invitations and room preparation remain available on verified contact details alone. `AUTH-02` amended accordingly. **The Starter entitlement attaches to a uniquely verified organisation, not to an email account.** |
| `DECISION-19` | **Compliance perimeter for v1, deliberately restricted.** Supported categories and jurisdictions · prohibited and restricted-goods rules · country and text-risk screening · member declarations of authority and legitimacy · automatic rejection or hold for clear risks · human escalation only for flagged cases · business and restricted-party checks at activation. **Do not claim comprehensive screening unless a provider and process genuinely support it.** Expansion beyond the perimeter follows provider assessment and professional compliance advice. This is a release gate; it does not block Design or unrelated engineering. Accountability per `AUTH-04`. |
| `DECISION-20` | **Migration reconciliation sequence.** 1. **An authorised human or DBA produces the sanitised schema-and-catalog export defined in `DECISION-22`; Claude Code analyses that export.** No AI connection to production at any point in this step. 2. Reconciliation report covering actual schema, migration history and drift. 3. Proposed forward migration and compatibility plan. 4. Staging rehearsal and rollback procedure. 5. Approval. 6. Controlled production execution. **No production schema change, data mutation, privilege change, migration execution or other state-changing SQL is authorised before steps 1 to 5. The only production SQL permitted during step 1 is the approved, human-run, read-only export defined in `DECISION-22`.** This is the true technical critical path for Deal Room release, and **a credible launch date cannot be fixed until the reconciliation report establishes the actual gap.** Ownership per `AUTH-05`. |
| `DECISION-21` | **Credits withdrawal.** Remove credits from the public product immediately, but do not blindly delete the technical history. Disable new credit purchases · redirect the public credits route to current Deal Room pricing · archive the Stripe product and prices for new purchases · **preserve historical payment records and webhook compatibility** · inventory internal consumers · remove obsolete code only after compatibility is proven. **A dead checkout must not remain reachable behind an accidental link.** |

---

---

## 7c. Decisions 22 to 27 — access, governance and gates

| ID | Decision |
|---|---|
| `DECISION-22` | **Production data access boundary.** No direct production connection for the reconciliation work. Claude Code analyses a **sanitised export produced by an authorised human**, containing only: schema and system-catalog metadata · migration identifiers, checksums and timestamps · RLS and storage policy definitions · indexes, constraints and relationships · functions and views only where their definitions contain no secrets or member data · **catalog-estimated table counts, not row contents and not exact counts.** It may not contain application, `auth` or storage-object rows, sampled records, logs, backups, uploaded files or object names, secrets or connection strings, or anything returning member data. **Direct table `SELECT` access sufficient to run `COUNT(*)` normally also permits row access. Claude Code receives no such grant.** Any essential exact aggregate is produced and reviewed by the authorised human or DBA. **If the export is insufficient, Claude Code stops and requests additional human-run, sanitised queries.** There is no database-role exception: **any future AI connection to production requires a new explicit decision**, not an operational judgement under this one. Grounded in ICO guidance on data minimisation, data protection by design, and security. |
| `DECISION-23` | **PR #53: audit and supersede.** PR #53 **was merged on 27 July 2026** at commit `b9f2c032ac44f2fd02b0d2124a0ebc2af9c993b4`, and current `main` descends from it. Its documents are already in `main` and contain commercial, entitlement and vocabulary positions subsequently superseded. **Inventory** the files introduced or changed by #53 · **classify** their content as still valid, superseded or contradictory · **generate replacement documentation** from the current canonical authority and approved July material · **update the authority manifest** · **explicitly mark or archive superseded documents**. **Do not revert the merge and do not rewrite repository history.** |
| `DECISION-24` | **Repository and deployment control, formally separated.** Controller: **the Ponte repository and deployment controller process, currently operated through the designated ChatGPT control thread** — evidence review, repository-state verification, go/no-go; holds no credentials, executes nothing, does not replace legal accountability. **Its authoritative state lives in the repository handover record, currently GitHub Issue #130, not in any chat session's memory.** A control state that exists only inside a conversation is not a control. Executor: **Claude Code**. Accountable production owner and final human approver: **Giuseppe**. Compliance owner: Giuseppe under `AUTH-04`. Compensating controls for minor production work: Claude Code prepares; controller independently verifies diff, evidence and staging result; rollback and backup evidence exist; Giuseppe approves explicitly; execution and post-deployment verification are logged. **For a material or severe database migration this is insufficient without a second competent human database reviewer**, who must review the migration and rehearsal evidence before production execution. Giuseppe cannot be both sole human authoriser and sole human technical reviewer of a high-impact rebuild. |
| `DECISION-25` | **Design pacing.** Design continues through Sets 2 and 3, then **holds** before the schema-intensive Deal Room sets. During the hold, Design may continue reusable visual-system work but **may not invent unresolved room behaviour or schema assumptions.** **Sets 2 and 3 may proceed only after their briefs have been re-derived against the canonical `A01`–`E18` register. A brief written against the retired `S-*` grouping does not carry forward automatically.** |
| `DECISION-26` | **Response to reconciliation findings, pre-committed.** *Minor drift:* repair forward, rehearse in staging, proceed through `DECISION-20`. *Material drift:* freeze relevant schema work; compare forward repair against clean rebuild with data migration; no production execution until both approaches, data risks and rollback viability are reviewed. *Severe or unreconcilable drift:* **clean rebuild is the default**; migrate validated data into the new schema and accept the v1 delay. **Drift is severe where migration lineage cannot be proven, member-data integrity is uncertain, histories conflict materially, or safe rollback cannot be demonstrated.** **No firm launch date may be communicated, internally or externally, before the reconciliation report exists.** Progress, gates and dependencies may be communicated; a promised date may not. |
| `DECISION-27` | **Merge gate.** PR #225 requires a **mandatory human preview check** before merge: open the Vercel Preview from the actual PR head · follow the affected landing-page path · click the repaired primary CTA · confirm an immediate, visible, correct response · **record the preview URL, tested commit and pass/fail**. Automated tests and the executor's report are required but do not replace it. **"Copy-only" treatment applies only after inspecting the actual diff.** If a nominally copy-only PR changes **expiry calculation, timezone rendering, activation or payment presentation, routing, or compatibility behaviour**, it requires functional verification and an appropriate preview check, not copy evidence. **PR #226 is known to change expiry calculation and timezone rendering**, so it does not qualify as copy-only. |

**Reconciliation report scope, binding:** the report may classify severity, uncertainty and missing evidence. It may contain **no migration SQL, no preferred remedy and no implementation recommendation.**

---

## 7d. Evidence programme

Not a decision, a standing instruction. Design does not pause for a broad competitor study; focused evidence work runs in parallel.

**Instrument, before launch:** listing view → expression of interest · interest → owner acceptance · acceptance → Deal Room creation · rejection and non-response rates · results segmented by verification level and public-profile completeness.

**Run in parallel:** five to eight target-user prototype sessions **covering all three families** · a concise review of comparable listing, response and transaction-room flows · specific testing of identity disclosure and willingness to pay $79.

`DECISION-08`, reveal-on-accepted-interest, stands. There is no evidence justifying reopening it. **If conversion is weak, improve the credibility layer before sacrificing confidentiality.**

---

## 8. Standing constraints for Claude Code

1. **No production schema change, data mutation, privilege change, migration execution or other state-changing SQL** until steps 1 to 5 of `DECISION-20` are complete. The only production SQL permitted during step 1 is the approved, human-run, read-only export of `DECISION-22`. No schema, RLS or storage-policy work before then.
2. **PR #53 is merged** (27 July 2026, `b9f2c032`). Its documents are in `main` and several of their positions are superseded. Handle per `DECISION-23`: audit and supersede, never revert or rewrite history.
3. **P0 bugs and P1 copy fixes proceed now**, independent of all of the above.
4. **Stripe stays feature-flagged** until the core room is stable.
5. **Credits withdrawal per `DECISION-21`**: disable, redirect, archive, preserve, inventory, and only then remove.

---

## 9. Status appendix — dated, and not part of the permanent record

Everything above is intended to remain true. Everything here is a snapshot and will go stale. Do not cite this section as authority.

**As at 2 August 2026:**

- Market Signals live: 4,764. Buyer requirements 2,490, seller offers 2,266.
- **Open, unmerged PRs: #225 (P0 funnel defects), #226 (P1 copy corrections), #227 (export work, unapproved).**
- **PR #53 is MERGED**, on 27 July 2026 at commit `b9f2c032ac44f2fd02b0d2124a0ebc2af9c993b4`. Current `main` descends from it. An earlier claim in this record that it was unmerged was wrong; it repeated a status note inside a document instead of checking the repository.
- **The primary CTA on `/deal-rooms/propose` routed on a single click** but remained **visually silent for 2.638 seconds** in the measured warm-development test. An earlier claim here that it required two clicks and roughly ten seconds was a measurement error on my part: automated waits between clicks made a silent-but-successful route look like a failed one. The defect is real, the characterisation was not.
- **PR #225 is blocked.** The initial `DECISION-27` human check **failed for a signed-in member** because `/deal-rooms/propose` encountered a Server Components render error. A defensive fix was committed at PR #225 head `482e904c6816499ecdbc99c385e793080ce740a4`, and Vercel reports success for that head. **Merge remains blocked pending a repeated human check against the exact current head and its corresponding preview.** The PR description still cites the obsolete tested SHA `00c557c`; that check block must be updated before the retest.
- Design has delivered Set 1 (three reusable patterns, 23 states, both themes, revision A complete) and Set 2 (six surfaces, 31 states, both themes).
- Migration reconciliation report: not started. Roles assigned per `AUTH-05`.
- Compliance perimeter: not implemented. Accountability per `AUTH-04`.
- Build order beyond Set 1 re-derived against `A01`–`E18`. Screen `E01` still requires respecification under `AUTH-01` and `DECISION-15`.
- **This document must be placed in the repository authority record and the control handover at GitHub Issue #130 updated.** Neither has been done.

---

## 10. Note on identifiers

The strategic brief of 2 August used `DECISION-A` to `DECISION-F` for questions put to the strategic reviewer, which violated the numeric convention stated in that same document. Those identifiers are void. Their resolutions are `DECISION-15` to `DECISION-21` above.
