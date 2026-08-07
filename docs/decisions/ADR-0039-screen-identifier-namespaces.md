# ADR-0039: Canonical route-family letters are reserved; local screens are namespaced

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-D during
  Recovery Mode.
- **Protects** `00-MASTER-IMPLEMENTATION-BRIEF.md` section 9, the master route
  and screen register.
- **Amends** ADR-0032 and its Amendments 1 and 2 in respect of screen
  identifiers only. Their design direction, surface language and approved
  prototypes are untouched.

---

## Why this exists

`00-MASTER-IMPLEMENTATION-BRIEF.md` section 9 defines fifteen canonical route
families by single letter:

```text
E  F  S  K  I  M  D  X  G  H  B  O  T  P  A
```

Three of those letters were taken over by implementation work that did not know
the register existed:

| Letter | Canonical meaning (Master Brief section 9) | What took it |
|---|---|---|
| `B` | Business Passport, Vault and team (`B01`–`B08`) | The publish/listing path, `B01`–`B09` — ADR-0032 and Amendments 1–2, `lib/publish/steps.ts`, Set 2 |
| `A` | Admin and reviewer (`A01`–`A09`) | Set 3 `A05` Market Record Detail, `A06` Action Choice |
| `D` | Intelligence and developments (`D01`–`D05`) | Set 3 `D01`–`D04` request and progression screens |

The collisions are exact and the meanings are unrelated. Canonical `A05` is
*Investigation case*; Set 3's `A05` is *Market Record Detail*. Canonical `D01` is
*New intelligence list*; Set 3's `D01` is *Investigation or Interest Request*.

**None of this was decided.** ADR-0032 names what it supersedes — the visual
treatment of the Set 1 and Set 2 references — and names what it does not touch.
It never claims section 9, and no ADR retires the register. The clash is
accidental, and it silently overwrote `B = Business Passport`.

## The decision

### 1. The canonical letters are reserved, permanently

`E F S K I M D X G H B O T P A` are reserved for the Master Brief section 9
route families. **No implementation-local identifier may use a single canonical
letter as its prefix, now or in future.**

### 2. Local screen identifiers are namespaced

An implementation-local identifier must use a prefix of **two or more letters
that is not a canonical single letter**, and must carry a canonical mapping in
the Canonical Journey Register.

### 3. The two approved namespaces

- **`LP`** — the listing path (publish). Replaces `B01`–`B09`.
- **`RC`** — Respond and Connect. Replaces Set 3's `A0x` and `D0x`.

`DR` is already in use for Deal Room screens (`DR-01`…`DR-05`), already
conforms, and is confirmed rather than changed.

### 4. Local identifiers are not authority

A local identifier names a surface an implementation actually builds. It never
overrides, extends or renames a canonical route family. Where the two disagree
about what a screen *is*, the canonical register wins.

## The mapping

Full detail, including every file that carries an old identifier, is in
`docs/codex/CANONICAL-ID-RECONCILIATION.md`. Summary:

| Old | Node | New | Canonical |
|---|---|---|---|
| B01 | intent | LP01 | S01 |
| B01b | capacity | LP02 | S01 |
| B02 | tell | LP03 | S01→S02 |
| B03–B05 | listing | LP04 | S02/S03 |
| B06 | assets | LP05 | S03 |
| B07 | preview | LP06 | S04 |
| B08 | gate | LP07 | G01/G02 |
| B09s | screening | LP08 | S05 |
| B09 | published | LP09 | S06 |

| Old | Title | New | Canonical |
|---|---|---|---|
| A05 | Market Record Detail | RC01 | F02 / F03 |
| A06 | Action Choice | RC02 | X01 |
| D01 | Investigation or Interest Request | RC03 | O05 (or I01–I02) |
| D02 | Request Status | RC04 | H03 + O03 |
| D02 owner variant | Acceptance | RC05 | O04 |
| D03 | Counterparty Fit Summary | RC06 | O04 |
| D04 | Deal Room Progression Decision | RC07 | O07 → DR |

## Why this is safe to perform

**No identifier in this ADR is member-visible.** In the listing path the value
reaches the DOM only as a `data-screen` attribute on the bridge shell; it
appears in no message catalogue and in no rendered string. The rename is
therefore internal, and is **not** a member-visible naming change.

## Consequences

- `lib/publish/steps.ts` carries the `id` field that must change. That is
  implementation and is not authorised by this ADR.
- ADR-0032 and Amendments 1 and 2 keep their text; a pointer to this ADR is
  added so a reader who meets `B01` there knows what it now means.
- Set 2 and Set 3 design references carry old identifiers and are inputs to the
  Journey 1 design work. They are corrected in the same implementation pass.
- `B01`–`B08` are returned to Business Passport, Vault and team, unbuilt and
  unclaimed.

## Alternatives rejected

**Retire section 9 and let the built identifiers stand.** Rejected. Section 9 is
the only complete map of the product's states, most of which are not yet built;
discarding it to preserve nine identifiers would trade the map for the path.

**Leave both and disambiguate by context.** Rejected. It has already failed once
silently, and `ADR-0015` shows the same failure mode in the ADR numbering
itself.
