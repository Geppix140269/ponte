# Canonical identifier reconciliation

**Recorded:** 7 August 2026, under Recovery Mode
**Decisions:** owner OD-D (screen identifiers) and OD-I (ADR numbers)
**Authority:** ADR-0039 (reserved route-family letters), `docs/decisions/README.md`
**Status:** **documents reconciled; code and design assets NOT yet changed.**

---

## 0. Why both halves are in one record

Two identifier systems failed the same way, for the same reason: a name was
reused for a second meaning without anyone noticing the first. Screen IDs took
canonical route families; ADR numbers were issued twice. Both were found by
citation, not by a check — so section 4 proposes the check.

**Nothing in section 3 has been done.** It is the queued implementation pass and
requires separate owner approval.

---

## 1. Screen identifiers (OD-D, ADR-0039)

### The rule

The fifteen canonical route-family letters are **reserved permanently**:

```text
E  F  S  K  I  M  D  X  G  H  B  O  T  P  A
```

An implementation-local identifier uses a prefix of **two or more letters that
is not a canonical letter**, and carries a canonical mapping in the Canonical
Journey Register. A local identifier never overrides a canonical route family.

Approved namespaces: **`LP`** (listing path), **`RC`** (Respond and Connect),
**`DR`** (Deal Room, already conforming and unchanged).

### What collided

| Letter | Canonical meaning | What had taken it |
|---|---|---|
| `B` | Business Passport, Vault and team (`B01`–`B08`) | The publish path, `B01`–`B09` |
| `A` | Admin and reviewer (`A01`–`A09`) | Set 3 `A05`, `A06` |
| `D` | Intelligence and developments (`D01`–`D05`) | Set 3 `D01`–`D04` |

Canonical `A05` is *Investigation case*; Set 3's was *Market Record Detail*.
Canonical `D01` is *New intelligence list*; Set 3's was *Investigation or
Interest Request*. Unrelated meanings, identical identifiers.

### Mapping — listing path

| Old | Node | New | Canonical |
|---|---|---|---|
| `B01` | intent | `LP01` | S01 |
| `B01b` | capacity | `LP02` | S01 |
| `B02` | tell | `LP03` | S01→S02 |
| `B03-B05` | listing | `LP04` | S02/S03 |
| `B06` | assets | `LP05` | S03 |
| `B07` | preview | `LP06` | S04 |
| `B08` | gate | `LP07` | G01/G02 |
| `B09s` | screening | `LP08` | S05 |
| `B09` | published | `LP09` | S06 |

### Mapping — Respond and Connect

| Old | Title | New | Canonical |
|---|---|---|---|
| `A05` | Market Record Detail | `RC01` | F02 / F03 |
| `A06` | Action Choice | `RC02` | X01 |
| `D01` | Investigation or Interest Request | `RC03` | O05 (or I01–I02) |
| `D02` | Request Status | `RC04` | H03 + O03 |
| `D02` owner variant | Acceptance | `RC05` | O04 |
| `D03` | Counterparty Fit Summary | `RC06` | O04 |
| `D04` | Deal Room Progression Decision | `RC07` | O07 → DR |

### Member visibility — checked

**No identifier in this section is member-visible.** In the listing path the
value reaches the DOM only as a `data-screen` attribute on `BridgeShell`; it
appears in no message catalogue and in no rendered string. Verified 7 August
2026. The rename is internal and is **not** a member-visible naming change.

---

## 2. ADR numbers (OD-I)

### The rule

Every ADR has a **unique permanent identifier**. Where a number was issued
twice, the **accepted** decision keeps it — it is the one cited by binding
authorities — and the **proposed** one moves. Historical cross-references are
preserved by an identifier note in each moved file, never by rewriting history.

### What moved

| Was | Now | Subject | Prior status | Keeps the old number |
|---|---|---|---|---|
| ADR-0012 | **ADR-0033** | Market classification contract, as implemented | Proposed | `ADR-0012-ai-product-intake-and-document-to-deal-flow.md` (accepted) |
| ADR-0015 | **ADR-0034** | The blue interaction token family (Stage 2) | Proposed | `ADR-0015-contrast-and-colour-remediation.md` (accepted) |
| ADR-0018 | **ADR-0035** | Mobile action hierarchy and the Task Completion Bridge | Proposed → **Accepted** by OD-H | `ADR-0018-member-business-verification-is-free.md` (accepted) |

### The ADR-0016 miscitations, and their root cause

`ADR-0035` **has been numbered three times**: drafted as `ADR-0016`, renumbered
to `ADR-0018` on 30 July 2026, and to `ADR-0035` now.

**The 30 July renumber was never propagated into the code.** Every `ADR-0016`
citation in the Task Completion Bridge cluster is a stale reference to this
document's first number — not to
`ADR-0016-multilingual-deal-room-interpretation.md`, which is a different,
accepted decision that keeps its number.

This is why shipped code appeared to implement an unaccepted ADR under a wrong
number. The decision was real, the number was stale, and the status was never
updated after implementation. OD-H accepts the decision; section 3 corrects the
citations.

### Disambiguation rule that held across 60+ citations

- `ADR-0015 Stage 2`, "interaction blue", `--pf-interact-*` → **ADR-0034**
- `ADR-0015` Stage 1, sections S-1..S-5, §6a, Constitution 18b, gold/contrast → **stays 0015**
- `ADR-0016` in `lib/deal-room/**` → genuine multilingual, **stays 0016**
- `ADR-0016` in the Task Completion Bridge cluster → **ADR-0035**
- `ADR-0012` = AI product intake → **stays 0012**; = classification contract → **ADR-0033**

Inside `ADR-0034` a bare `ADR-0015` correctly means its accepted parent and
**stays**.

---

## 3. Queued implementation — NOT DONE, requires approval

### 3a. Screen identifiers

| File | Change |
|---|---|
| `lib/publish/steps.ts` | `id` field on all nine `NODES` entries: `B0x` → `LP0x` |
| `components/bridge/publish/Bridge*.tsx` | `screen="B0x"` props → `LP0x` (9 components) |
| `components/bridge/publish/BridgeShell.tsx` | doc comment references |
| `e2e/bridge-path.spec.ts`, `e2e/bridge-landing.spec.ts` | any `data-screen` selector |
| `docs/ponte/design-reference/ponte-set2-screens.js` | `id:'B01'`, `'B01b'`, `'B06'`, `'B09'`, `'B09s'` |
| `docs/ponte/design-reference/ponte-set1-screens.js` | `id:'B08'` |
| `docs/ponte/design-reference/ponte-set3-screens.js` | `A05`, `A06`, `D01` → `RC01`–`RC03` |
| `docs/ponte/design-reference/ponte-set3-screens-d.js` | `D02`, `D03`, `D04` → `RC04`–`RC07` |
| `docs/ponte/design-reference/b01-b09-contact-sheet.html` + `scripts/build-contact-sheet.mjs` | filename and labels |
| `docs/decisions/ADR-0032*.md` | pointer note, text otherwise unchanged |

### 3b. ADR citations in code

**`ADR-0016` → `ADR-0035`** (all mean the Task Completion Bridge):

- `lib/structure/completion.ts:5`, `:14`
- `lib/structure/__tests__/completion.test.ts:1`
- `components/ponte/bridge/TaskCompletionBridge.tsx:7`, `:18`
- `components/ponte/bridge/completion-bridge.css:2`
- `components/structure/StructureComposer.tsx:894`
- `components/products/intake/intake.css:249`
- `e2e/completion-bridge.spec.ts:5`
- `scripts/check-governance.mjs:157`

**`ADR-0015 Stage 2` → `ADR-0034`**:

- `design-system/ponte-flow/tokens/ponte-flow-tokens.css:65`, `:104`
- `components/structure/structure.css:59`
- `components/find/find.css:54`
- `components/desk/desk.css:388`
- `components/ponte/bridge/bridge-integration.css:568`
- `docs/codex/audits/2026-07-30-mobile-action-hierarchy/prototypes.html:12`, `:36`, `:338`, `:506`

**No `.sql` or `supabase/` file cites any affected ADR.** All ten `ADR-0016`
citations in `lib/deal-room/**` are genuine and must **not** change.

### 3c. Remaining doc citations

`docs/schemas/market-category-taxonomy.md:3` and
`docs/plans/active/constitution-led-interface-rebuild.md:176` → **ADR-0033**.
Audit READMEs and `DECISION-LOG.md:159–162` under
`docs/codex/audits/2026-07-30-*/` → **ADR-0034 / ADR-0035**.

### 3d. `docs/decisions/README.md` index — rebuild, do not patch

The index is independently broken and predates this work:

- it links `ADR-0012-automated-listing-publication.md`, **which does not exist**
  (the file is `ADR-0013-automated-listing-publication.md`);
- it omits `ADR-0012-ai-product-intake-and-document-to-deal-flow.md` entirely;
- its "unresolved numbering collision" sections are now obsolete and must be
  replaced by a record of the resolution;
- five accepted decisions have no row.

### 3e. Do not mechanically replace these

Each rewrites history or mixes meanings in one sentence. Judge individually:

- `docs/decisions/ADR-0035-...md` identifier note — deliberately records all
  three numbers
- `docs/plans/active/automated-listing-publication-and-email-system.md:213`
- `docs/decisions/ADR-0029-the-first-activation-waiver.md:145` — a statement
  *about* the duplicates; update to record the resolution
- `docs/codex/DECISION-LOG.md:789` — a stale duplicate heading; line 790 is the
  correct one
- `docs/plans/active/deal-room-transaction-pricing.md:595–596` and
  `docs/codex/audits/deal-room-pricing/INVENTORY-2026-07-31.md:194` — mixed
  sentences where `ADR-0016` means multilingual and stays

---

## 4. Preventing recurrence

Both failures were invisible because nothing checked. Proposed, not yet built:

1. **A duplicate-ADR-number check** in `npm run check`, failing when two files
   in `docs/decisions/` share a number. Would have caught all three pairs.
2. **A reserved-prefix check**, failing when a screen identifier in
   `lib/publish/steps.ts` or a design reference matches
   `^[EFSKIMDXGHBOTPA][0-9]`. Would have caught `B01` on the day it was written.
3. **An index-integrity check**, failing when `docs/decisions/README.md` links a
   file that does not exist. Would have caught the broken `ADR-0012` link.

Recorded as observations under Launch Mode. None is authorised.
