# Ponte Trade Open Decisions

Purpose: a compact register of unresolved owner decisions that materially affect product, engineering, data, security, operations or go-to-market work.

This is not a backlog. Include only decisions that require owner direction or that block a meaningful next step.

## Status values

- `OPEN` — owner decision required.
- `DECIDED` — decision made; link the canonical record.
- `CANCELLED` — no longer relevant; state why.

---

## OD-001 — Protect the migration ledger

**Status:** OPEN  
**Owner:** Giuseppe Funaro  
**Urgency:** Immediate

### Decision required

Approve an additive production migration that enables RLS on `public.schema_migrations`, revokes anon/authenticated privileges and preserves privileged migration tooling.

### Current evidence

The table is publicly readable and writable through the anon role. Existing rows must be preserved.

### Recommended decision

Approve the security migration, privileged-path verification and post-change anonymous SELECT/INSERT refusal tests.

---

## OD-002 — Unexplained migration-ledger backfill

**Status:** OPEN  
**Owner:** Giuseppe Funaro  
**Urgency:** High

### Decision required

After log investigation, decide whether the 26 rows inserted at 2026-07-28 13:37:42 UTC should remain annotated as reconciliation-only evidence or be repaired through a documented ledger process.

### Constraint

Do not delete or rewrite the rows before preserving evidence and attempting attribution.

---

## OD-003 — Supabase Preview integration

**Status:** OPEN  
**Owner:** Giuseppe Funaro  
**Urgency:** Medium

### Decision required

Choose whether to unlink/disable the Supabase GitHub App check that points to inaccessible project reference `kltuzbxnldtmdfhakphv`.

### Recommended decision

Disable or unlink it until the repository contains a reproducible production baseline and a valid preview-database strategy.

---

## OD-004 — Production base-schema provenance

**Status:** OPEN  
**Owner:** Giuseppe Funaro  
**Urgency:** High

### Decision required

Approve creation of a sanitised schema-only production baseline covering the 29 production tables not represented by repository migrations.

### Constraint

The baseline must contain no production data, credentials, secrets or personal information and must be clearly labelled as a baseline snapshot, not a migration to rerun against production.

---

## OD-005 — Existing Market Signals classification

**Status:** OPEN  
**Owner:** Giuseppe Funaro  
**Urgency:** Product priority after database security

### Decision required

Choose the classification and backfill strategy for the existing Market Signals inventory now that the category schema is live.

### Current state

The schema is available, but historical records remain unclassified; category filters therefore report `nothing_classified`.

---

## OD-006 — Contrast and colour remediation direction

**Status:** DECIDED
**Owner:** Giuseppe Funaro
**Decided:** 29 July 2026

### Decision required

Choose the remediation direction for the accepted focus-group finding that members cannot reliably distinguish surfaces, modules, controls and states.

### Decision taken

Direction B, paper with blue interaction, incorporating Direction C's three non-colour mobile rules. Gold keeps its four meanings; blue becomes the interaction family; `--pf-focus` is not repurposed. Delivered in two stages, structural contrast then the interaction family.

### Canonical record

`docs/decisions/ADR-0015-contrast-and-colour-remediation.md`, Design Constitution v1.1, `docs/plans/active/contrast-and-colour-remediation.md`. Evidence at `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`. Blockers LB-001 and LB-002.

---

## OD-007 — Bridge deck and pier contrast inside the approved Bridge authority package

**Status:** DECIDED
**Owner:** Giuseppe Funaro
**Decided:** 29 July 2026

### Decision required

Approve, or decline, changing four stroke declarations in `design/authority/bridge/v1/source/ponte-bridge.css` as part of Stage 1.

### Current evidence

The Bridge deck is drawn as `--pf-ink` at `--pf-opacity-track` (.16) and measures **1.42:1** against the page ground. The station pier is drawn at .34 and measures 2.22:1. Both are structural, so Constitution section 18a asks 3:1 of them. This is finding 4 of the contrast audit, and the Bridge is the product's central interaction metaphor.

### Why it is not already covered

The owner's Stage 1 scope of 29 July 2026 does not name it, and the file is a binding approved authority package under Constitution section 8 and CODEOWNERS, not an implementation stylesheet. It is arguably the "component is using the wrong semantic token" case that Stage 1 permits, since a structural rule should read from a rule token rather than from ink at an opacity, but that is a reading rather than an instruction.

### Decision taken

Include the Bridge deck and passive pier contrast in Stage 1. The central Ponte Bridge must not remain at approximately 1.42:1 structural contrast while the rest of the interface is remediated.

Scope is contrast only: geometry, station fractions, node sizes, labels and motion unchanged; gold semantics unchanged; arrived and selected destinations remain gold; blocked, review and other semantic states unchanged. Passive track and pier use the approved structural rule tokens, and `--pf-opacity-track` is withdrawn if the accepted implementation no longer requires it.

Two conditions: the edit is recorded in ADR-0015 section S-3 and covered by CODEOWNERS, and it must be verified against **updated reference evidence**. The eight approved renders under `design/authority/bridge/v1/reference/` describe the old contrast and must be re-taken.

### Canonical record

ADR-0015 section S-3; ExecPlan sections 6.4 and 11.

---

## OD-008 — Bridge manifest checksums a file the Bridge does not own

**Status:** DECIDED
**Owner:** Giuseppe Funaro
**Decided:** 29 July 2026

### Decision required

`design/authority/bridge/v1/SOURCE-MANIFEST.md` records a SHA-256 for `ponte-flow/tokens/ponte-flow-tokens.css`, and the resolver in `scripts/check-governance.mjs` maps that row to the **live** `design-system/ponte-flow/tokens/ponte-flow-tokens.css`. A manifest describing an approved Bridge delivery was therefore checksumming a shared file the Bridge does not own, and which every future palette decision must change. Discovered while running the checks for the ADR-0015 governance PR.

### Decision taken

Decouple the manifest from the live token file. Preserve a byte-identical package-local snapshot of the token file contained in the original approved Bridge handoff; verify that snapshot through `SOURCE-MANIFEST.md`; stop resolving any Bridge manifest entry to the live `design-system/ponte-flow` file; continue checksum-verifying the Bridge engine, stylesheet, references and every other package-local asset.

**Explicitly rejected:** simply replacing the live token checksum after each authorised palette change. That would turn the manifest into a moving record and remove the protection the check exists to give.

This is a packaging and authority-boundary correction. It amends no Bridge geometry, interaction or motion.

### Constraint on sequencing

The live token file currently hashes to `dabc089f0b9822242cc0a3d8783c2b19ab0021ce98c82d9cfd8f6d1648483d5f`, exactly the value the manifest records, so a byte-identical snapshot can still be taken from the working tree. That stops being true once Stage 1 edits the file, so the snapshot must be created first, as Stage 1 step 0.

### Canonical record

ADR-0015 section S-1; ExecPlan sections 3, 4 and 6.5.

## OD-009 — The approved Bridge reference renders cannot be re-taken

**Status:** DECIDED
**Owner:** Giuseppe Funaro
**Raised:** 29 July 2026
**Decided:** 30 July 2026

### Decision required

ADR-0015 section S-3 requires the eight authoritative reference renders under `design/authority/bridge/v1/reference/` to be re-taken so they show the approved Stage 1 structural contrast rather than the old contrast. They cannot be, and the obstacle is a gap in the approved package rather than a choice made here.

The renders came from `Ponte Landing - Bridge.html`, at 60% and 70% scale for the desktop frames and 390 x 844 rescaled from 62% for the mobile frames, per `design/authority/bridge/v1/implementation/00_README.md`. That file and `Ponte Bridge System.html` are both recorded in `SOURCE-MANIFEST.md` as part of the delivery but are **not vendored**: `scripts/check-governance.mjs` names them, with `ponte-bridge-demos.js`, in its `notVendored` set, which is why it verifies 13 of the 16 rows. Neither has been committed on any branch in the repository's history, and neither is present on the development machine.

`desktop-0-full-composition.png` shows that prototype's own navigation, ticker strip and hero, so the product's landing page cannot reproduce the framing either.

### What was not done, and why

- **The renders were not replaced** and their hashes were not touched.
- **Re-rendering from the product's landing page** was rejected: differently framed, which the owner explicitly excluded.
- **Reconstructing the prototype page** was rejected: it would mean inventing markup for a navigation, ticker and hero that are not in the repository, then presenting the result as an owner-approved reference render. Fabricating an authority artefact is worse than leaving a stale one in place and recording that it is stale.

The manifest's amendment row previously claimed the change had been "verified against re-taken reference renders". That claim was untrue and has been corrected to state what was actually verified.

### What S-3's substance does have

Geometry invariance is proved twice, independently of the renders: `scripts/check-bridge-invariance.mjs` (479 non-colour declarations, 6 at-rules and 23 timings identical, with all 15 colour changes enumerated) and `scripts/check-bridge-geometry.mjs` (8 rendered views, 1208 measured values identical to 0.05px). A pixel diff is deliberately not used, because the colours are meant to differ and an image comparison would report a difference on every changed pixel while proving nothing about shape.

Equivalent Stage 1 Bridge frames, rendered from the product and framed to the product, are at `e2e/evidence/stage1/after/bridge-*.png` for the same eight views. They are evidence, not a substitute, and are not proposed as replacements.

### Options

1. **Supply the two HTML files.** Their SHA-256 rows are already in the manifest, so any copy can be verified as the genuine approved delivery before use. The re-take is then mechanical and this closes.
2. **Re-scope S-3** to accept the two programmatic invariance proofs as the verification, and record the reference PNGs as historical approval evidence frozen at the 27 July 2026 delivery rather than as renders that track the live palette.
3. **Re-approve a new reference set** rendered from the product, framed to the product, as a fresh design approval. This is a new approval, not an implementation of S-3, and would need the owner's visual sign-off in its own right.

### Decision taken

**Option 2, approved by the owner on 30 July 2026.**

- The eight Bridge reference PNGs are **preserved unchanged as historical approval evidence**. They record the original visual approval of 27 July 2026 and are not renders that track the live palette.
- The **stylesheet invariance proof and the rendered geometry comparison are accepted as the authority evidence** for this contrast-only amendment: `scripts/check-bridge-invariance.mjs` (479 non-colour declarations, 6 at-rules and 23 timings identical, all 15 colour changes enumerated) and `scripts/check-bridge-geometry.mjs` (8 rendered views, 1208 measured values identical to 0.05px).
- The missing prototype HTML is **not to be reconstructed or fabricated**.
- It is recorded that ADR-0015 Stage 1 **changes contrast only**, so the geometry, composition, station positions, node sizes, labels and motion the PNGs show remain accurate; what they no longer show is the current contrast.

Options 1 and 3 are not taken. Option 1 remains available if the HTML files ever surface, but nothing is now waiting on them. Option 3 would have been a new design approval rather than an implementation of S-3.

### Canonical record

ADR-0015 section S-3 and its 29 July 2026 implementation note; ExecPlan section 12, discovery 3a; `design/authority/bridge/v1/SOURCE-MANIFEST.md`.

---

## OD-010 — Ponte's sending domain email-authentication state (mostly verified 30 July 2026)

**Status:** PARTIALLY RESOLVED — most settings verified live; two owner items remain
**Owner:** Giuseppe Funaro
**Raised:** 30 July 2026
**Verified against the live Resend account:** 30 July 2026

### What was verified, and how

The Resend account was queried directly on 30 July 2026 (`domains.get` on
`ponte.trade`, ID `ff7c9ce0-ca23-4958-abe7-a2251b7c4f15`). The four settings this
decision was raised over are now mostly **confirmed**, not unknown:

| Setting | Required | **Actual (verified 30 Jul 2026)** |
|---|---|---|
| `ponte.trade` domain | verified, sending enabled | **verified, sending enabled**, region eu-west-1 ✓ |
| DKIM (`resend._domainkey`) | published | **verified** ✓ |
| SPF (`send` MX + TXT `v=spf1 include:amazonses.com ~all`) | published | **verified** ✓ |
| **Open tracking** | disabled | **false (disabled)** ✓ — satisfies ADR-0017 §8 |
| **Click tracking** | disabled | **false (disabled)** ✓ — satisfies ADR-0017 §8 |
| **DMARC** (`_dmarc.ponte.trade` TXT) | published | **NOT confirmed** — Resend does not manage or report DMARC; it is a separate DNS record the owner sets at the registrar. Unverified from here |
| `auth@ponte.trade` → `hello@ponte.trade` forward | in place | **NOT confirmed** — no record; Resend has receiving **disabled** on the domain, so any forward is external to Resend |

So the tracking decision (ADR-0017 §8) is **already satisfied in production**: open
and click tracking are both off on the domain, and delivery is DKIM- and
SPF-authenticated. A test send that lands in spam would therefore not be explained
by missing DKIM/SPF or by tracking rewrites.

**Independently corroborated by the live send log:** the Resend account has
delivered real Ponte mail (`status: delivered`) to Gmail, Yahoo and external
addresses across July 2026, so the operational sending path is live and working.

### What remains genuinely open (owner-held)

1. **DMARC.** Confirm `_dmarc.ponte.trade` publishes a policy (at minimum
   `v=DMARC1; p=none; rua=...`). Its absence is the one remaining
   authentication gap that could still push a message to spam, and it is not
   visible from Resend.
2. **The reply forward** `auth@ponte.trade` → `hello@ponte.trade` (AUTH-EMAIL-SETUP §3).
3. **Domain-wide tracking policy.** Tracking is off now, which is correct for
   transactional mail. If Ponte later wants tracked marketing, it must go on a
   separate subdomain rather than re-enabling tracking on the domain that carries
   sign-in codes. This is the only part that is a forward-looking *decision*
   rather than a fact to read.

### Prior evidence (superseded by the live check above)

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are recorded as existing in Netlify
  (`docs/platform/RUNBOOK.md`, `docs/platform/VERSIONS.md`).
- The forward was **recommended** in `docs/platform/AUTH-EMAIL-SETUP.md` §3 on
  22 July 2026, with no record of it being set up.

### Why it is a decision and not a task

Two of the four are owner-held facts that need reading, not deciding — but the
consequence of not knowing them is that `LB-012`'s closing test cannot be
interpreted. If a test send lands in spam and the DNS records are absent, the
result says nothing about the template; if it lands in the inbox and click
tracking is on, the email that arrived is not the email in this repository,
because every link in it was rewritten through a third-party host.

Tracking is genuinely a decision: Resend sets it per **domain**, so disabling it
for authentication and operational mail disables it for anything else Ponte later
sends from `ponte.trade`, including future marketing. ADR-0017 §8 decides it for
transactional mail; whether Ponte accepts that constraint domain-wide, or later
separates marketing onto its own subdomain, is unresolved.

### Recommended decision

1. Read and record all four states in `docs/operations/OPERATIONS_LOG.md`.
2. Publish DKIM, SPF and DMARC if any is missing, and set the forward.
3. Disable both tracking toggles now, and accept the domain-wide consequence for
   launch. If Ponte later wants tracked marketing, put it on a separate
   subdomain rather than turning tracking back on for the domain that carries
   sign-in codes.

### Blocks

`LB-012`. Also blocks any honest reading of its closing test sends.

---

## OD-011 — Does the Deal Room-Only Pricing Authority retire the paid counterparty check?

**Status:** **DECIDED — 31 July 2026. No: the counterparty check stays paid.**
**Owner:** Giuseppe Funaro
**Raised:** 31 July 2026, by the ADR-0020 authority reconciliation
**Decided:** 31 July 2026, same day

### The decision

The private **counterparty check** — a check a member buys on somebody else's
company — is **not** the "paid verification" section 15 prohibits, and remains
paid. The owner directed that the authority be amended to say so.

**Canonical record:** `PT-COMMERCIAL-2026-07-31-01`, **Amendment 2**, which
amends **both** section 15 (the prohibition now reads "paid verification **of a
member's own business**") and **section 1** (whose "the only paid product" would
otherwise have recreated the same contradiction one section earlier).

The line is ADR-0018's: what section 15 prohibits is charging a member to prove
**themselves**. Charging for research a member chooses to buy about a **third
party** is a different act, and was never the toll the section was written
against. `member_business` remains free permanently.

### Two consequences that are easy to miss

1. **Ponte Credits are still retired.** Section 15's prohibition on "credit
   packs, room credits, tokens or usage currency" is **untouched** by this
   amendment. So the counterparty check survives but its **pricing mechanism does
   not**: it must be repriced as a direct USD charge rather than billed against
   a credit balance. That work is Stage 8.
2. **No badge, tier or certificate.** Those stay prohibited, and gold remains a
   brand signal rather than a verification status.

**Unblocks:** Stage 8 of `docs/plans/active/deal-room-transaction-pricing.md`,
and settles the `counterparty_check` half of **PL-035**.

The original question and both readings are preserved below.

---

### Decision required

`PT-COMMERCIAL-2026-07-31-01` §15 states that Ponte must not publicly charge for
or reintroduce **"paid verification or verification badges"**, without
qualification, and §1 states that the Deal Room is Ponte's **only** paid product.

Ponte currently charges **2 credits** for a `counterparty_check`.

Does the prohibition retire it?

### The two readings, both defensible

**It is retired.** The words are flat and the authority is emphatic that the Deal
Room is the *only* paid product. A counterparty check is verification, it is
paid, and there is no carve-out for it anywhere in the authority.

**It is outside the prohibition.** ADR-0018 spent its length establishing that
these are two different commercial acts sharing one technical pipeline:
`member_business` verifies the legal entity the member represents and unlocks
their own participation, while `counterparty_check` is a private check on
somebody else's company that changes nothing about the member's account.
ADR-0018 made the first free precisely so the second could stay paid, and gave a
strategic reason — a toll in front of publication suppresses the supply the
marketplace depends on, which is not true of a check the member chooses to buy.
On that reading §15 is aimed at re-tolling the member's own onboarding, which
ADR-0018 already prohibited.

### Why an agent must not decide it

Narrowing an owner's prohibition by inference is exactly the move the
Source-of-Truth SOP exists to prevent. The authority does not name
`counterparty_check`, and the fact that a distinction is defensible is not
evidence the owner intended it.

### Current state, for the record

- `app/api/verification/route.ts:98-104` reads the balance and answers **402**
  with `cost: COST_VERIFICATION_L2` when short.
- `lib/verification/pipeline.ts:197` spends 2 credits; `:502` refunds on a
  Ponte-side failure. Both are guarded by the same `paidPurpose`, so each fires
  for a `counterparty_check` only.
- `/check` and `components/check/CheckComposer.tsx` state the cost before the run.
- `member_business` is free and guarded by
  `lib/verification/__tests__/member-business-free.test.ts` (ADR-0018).
- `/pricing` publishes "Credits — 2 credits — Per counterparty check", which is
  part of proposed **LB-014** either way.

### Recommended decision

Confirm one reading explicitly and record it. If the check is retired, it goes
into Stage 8 of `docs/plans/active/deal-room-transaction-pricing.md` with the
rest of the credits retirement. If it survives, amend the authority — or record
an ADR under it — so §15 names the exception, because the next contributor will
read §15 and reach the same question.

Whichever way it goes, the credits *subsystem* is retired regardless: a surviving
counterparty check would need a direct USD price, not a credit balance.

### Blocks

~~Stage 8 of the Deal Room transaction pricing programme (retirement of credits and
paid verification). Does **not** block LB-014, LB-001 or LB-009.~~
**Resolved 31 July 2026. Stage 8 is unblocked**, with its shape now settled: the
credits subsystem is retired as planned, and the counterparty check is repriced
in USD rather than retired with it.

---

## OD-012 — Does a broker's Deal Branch count toward the branch price?

**Status:** **DECIDED — 31 July 2026. Yes: a broker's branch counts.**
**Owner:** Giuseppe Funaro
**Raised:** 31 July 2026, by Stage 2 of the Deal Room transaction pricing programme
**Decided:** 31 July 2026, same day

### The decision

The owner decided that a branch whose admitted counterparty is an
**intermediary acting for a disclosed or controlled principal** is a billable
principal-counterparty branch, and directed that the authority be amended so it
stops contradicting itself.

**Canonical record:** `PT-COMMERCIAL-2026-07-31-01`, **Amendment 1**, which
rewrites section 7 condition 1 to say so explicitly. Implementation:
`BILLABLE_PARTICIPANT_CLASSES` in `lib/deal-room/pricing.ts`, pinned by the named
test *"a broker fronting a principal counts - settled by the owner, OD-012"*.

**No behaviour changed.** The constant already held
`["principal", "intermediary"]` pending this decision, so the amendment confirms
the reading rather than altering what anyone would be charged.

**Unblocks:** Stage 6 of `docs/plans/active/deal-room-transaction-pricing.md`.

The original question and both readings are preserved below.

---

### Decision required

`PT-COMMERCIAL-2026-07-31-01` §7 condition 1 says a branch counts toward the
price only when "it is a **principal**-counterparty Deal Branch".

`PT-COMMERCIAL-2026-07-31-01` §4, listing the simultaneous confidential branches
a Master Deal Room may contain, gives as one of its own examples "**a broker
acting for a disclosed or controlled principal**".

In the live schema a broker is `deal_room_participants.participant_class =
'intermediary'`, not `'principal'`. So the two sections point different ways.

Does a branch whose admitted counterparty is an **intermediary** count as a
billable branch?

### What is implemented, pending the answer

`lib/deal-room/pricing.ts` exports:

```ts
BILLABLE_PARTICIPANT_CLASSES = ["principal", "intermediary"]
```

That counts brokers. It follows §4's explicit example, and it matches the
commercial substance: a broker fronting a real principal is a live counterparty
negotiation consuming the same controlled-progression product as any other.
Reading §7 literally instead would make **every brokered negotiation free**,
which is the larger of the two commercial surprises and would create an obvious
incentive to route negotiations through an intermediary.

`provider`, `adviser`, `ponte_facilitator` and `observer` are excluded on either
reading, and that exclusion is not in question.

### Why this is safe to leave open for now

Nothing charges. The module is pure, nothing imports it (asserted by its own
test), and the reading is a single named constant documented at its definition
and pinned by a test whose title says what it is testing. Reversing the decision
is a one-line change plus one test edit, not a refactor.

### Recommended decision

Confirm that a broker's branch counts, and amend §7 condition 1 to read
"principal-counterparty (including an intermediary acting for a disclosed or
controlled principal)" so the authority stops contradicting its own §4. If the
answer is the opposite, say so and the constant loses `intermediary`.

### Blocks

~~Stage 6 of `docs/plans/active/deal-room-transaction-pricing.md` — a price cannot
go on a screen while it is undecided. Does not block Stages 3 to 5.~~
**Resolved 31 July 2026. Stage 6 is unblocked by this decision** (it still needs
the Design Constitution work and LB-014's classification).
