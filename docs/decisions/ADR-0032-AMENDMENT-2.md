# ADR-0032, amendment 2

**Date:** 6 August 2026
**Cause:** three findings from the `B01` rebuild, accepted by the owner and
recorded before `B02` to `B09` were built.
**Amends:** `ADR-0032`, the bridge is the interface.
**Reads with:** `ADR-0032-AMENDMENT-1`.

---

## 1 · Markup never goes inside a translated string

The italic accent on a question is a SEPARATE VALUE, chosen per locale, and the
component composes it. It is never an `<em>` welded into the copy and never
interpolated through `dangerouslySetInnerHTML`. The reason is not tidiness: word
order differs between scripts, so an emphasis that lands on the last two words of
an English question lands in the middle of the Arabic one and on nothing at all
in the Chinese one. A translator handed markup is being asked to preserve a
position the target language does not have. Two values, a lead and an accent,
can each be translated as language rather than as HTML, and the component decides
where the emphasis sits. This is a rule for every screen in the system, not a
`B01` fix, and it applies to any inline emphasis, not only the bronze italic.

## 2 · The arc reports position WITHIN a stage as well as across stages

`deckFraction(total, current, within)` is a real extension of `ADR-0032` and not
an implementation detail, so it is recorded here to stop it being removed later
as unexplained. The publish path asks several questions inside one stage: `B01`
asks three and `B01b` asks a fourth, all of them stage one. Without `within` the
deck would sit still through four answers and then jump a whole fifth of the
crossing, which is a stage indicator wearing a drawing rather than a span that
draws as the member answers. **The nodes still light on whole stages.** A stage
is whole or it is not, exactly as the retired segmented rule had it; only the
deck moves continuously, and it is the deck that carries "you are moving". Where
two surfaces share a stage, the stage is divided between the surfaces that this
member's path actually visits, so a member who skips `B06` does not see the deck
stall at the halfway point of stage three.

## 3 · The publish view of `ponte-platform.html` is defective and is not a build target

The prototype's publish view holds two identical placeholder questions and jumps
to the signed-in home after four answers. Building it literally would drop
`seek_brands_or_products_to_represent` for the third time, which is the defect
the whole listing build exists to end. A comment is placed at the top of that
section of the file saying so, so the next reader does not have to rediscover it.
The file remains **authoritative for appearance** on every surface: ink ground,
grain, type, scale, whitespace, hairlines, tone, the arc, the tape, the ledger.
It is **not authoritative for flow, count or content anywhere**, and that is the
general form of `ADR-0032-AMENDMENT-1` section 7 rather than a second rule:
wherever the two appear to disagree, the code file wins and the prototype is
wrong.
