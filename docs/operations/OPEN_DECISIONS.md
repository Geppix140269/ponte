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
