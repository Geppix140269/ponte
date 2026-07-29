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

**Status:** OPEN
**Owner:** Giuseppe Funaro
**Urgency:** Before Stage 1 of ADR-0015 begins

### Decision required

Approve, or decline, changing four stroke declarations in `design/authority/bridge/v1/source/ponte-bridge.css` as part of Stage 1.

### Current evidence

The Bridge deck is drawn as `--pf-ink` at `--pf-opacity-track` (.16) and measures **1.42:1** against the page ground. The station pier is drawn at .34 and measures 2.22:1. Both are structural, so Constitution section 18a asks 3:1 of them. This is finding 4 of the contrast audit, and the Bridge is the product's central interaction metaphor.

### Why it is not already covered

The owner's Stage 1 scope of 29 July 2026 does not name it, and the file is a binding approved authority package under Constitution section 8 and CODEOWNERS, not an implementation stylesheet. It is arguably the "component is using the wrong semantic token" case that Stage 1 permits, since a structural rule should read from a rule token rather than from ink at an opacity, but that is a reading rather than an instruction.

### Recommended decision

Include it in Stage 1, with the diff limited to the deck, pier and receded-pier strokes and the withdrawal of `--pf-opacity-track`. Geometry, station spacing, node sizes and gold semantics are untouched. Declining means Stage 1 ships with the audit's headline finding open.
