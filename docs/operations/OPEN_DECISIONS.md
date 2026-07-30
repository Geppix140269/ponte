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

## OD-010 - Deal Room translation and interpretation provider, and its data posture

**Status:** OPEN
**Owner:** Giuseppe Funaro
**Urgency:** Medium; does not block provider-independent LB-009 work, but blocks any real provider call and production activation

### Decision required

Confirm the AI provider for Deal Room message translation and commercial interpretation (LB-009), and
accept its data-retention, residency and privacy terms for private, participant-authored commercial
negotiation content, or direct an alternative.

### Current evidence

Anthropic is the only AI provider present and is already approved and configured (`ANTHROPIC_API_KEY`,
`lib/ai.ts`). The canonical client `lib/ai.ts` is metered, timed with an `AbortController`, and logs only
token counts, never content. The legacy translation path `lib/ai-vet.ts` (`translateListing`) is un-metered,
un-timed, has no retry, and writes no audit row; it must not be used for Deal Room content. What the
repository does not establish is Anthropic's server-side retention of the content Ponte sends and whether
sending private Deal Room negotiation text to a US-based API is acceptable under the Deal Room's intended
privacy and residency posture. See `docs/codex/audits/deal-room/MULTILINGUAL-PREFLIGHT-2026-07-30.md`
sections 10, 11, 12 and 14.

### Recommended decision

Use the existing approved Anthropic path via `lib/ai.ts` for both translation and interpretation, with a
server-side adapter, the supported-language allowlist, timeouts, bounded retries, safe error mapping and no
unauthorised content in logs. Record the accepted retention/residency terms. Continue all provider-independent
LB-009 work in the meantime with a deterministic test adapter. Provider selection, any new secret, the
additive migration, the multilingual feature flag, deployment and activation each remain separate owner
approvals under AGENTS.md.
