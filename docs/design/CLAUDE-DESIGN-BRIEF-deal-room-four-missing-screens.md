# Brief for Claude Design: four Deal Room screens that do not exist yet

- Requested by: Giuseppe Funaro, 1 August 2026
- Target project: `Ponte Trade` design system (`cad4950a-c95c-45f7-92a7-6d8ab2b53853`)
- Authority: ADR-0025, ADR-0026, ADR-0027, ADR-0028 in `docs/decisions/`

## Why only four

The Deal Room already has a screen register: **DR-01 to DR-21**, in
`research/dealroom-spec.txt` section 11, and `Ponte Deal Room - Design Review
v3.html` renders them. Those are not being re-requested. DR-07, the master-room
command view, is already implemented in the product as
`components/home/landing/DealRoomPreview.tsx`, and the rest are implementation
work rather than design work.

The four below are different: they come from commercial decisions taken on
**1 August 2026** and there is no approved drawing of any of them.

---

## Screen 1 — The private Deal Room draft (the showroom)

**State B in ADR-0028.** A member has published an opportunity for free and is
now building a room around it, privately, for free. Nobody else can see it.

This is the conversion mechanism, so it carries more weight than any other
screen in this brief. The owner's words:

> The member should feel: "Ponte has turned my commercial opportunity into
> something professional that I am proud to present."
>
> It is a showcase, it is a showroom, it is something they're gonna be proud of.

**It must not look like a form, a wizard, or a settings page.** It is the
member's deal, presented well.

What it has to show:

- the Master Deal Room presentation, using the member's REAL opportunity
- the commercial opportunity summary and the Deal snapshot
- structured facts, quantity and capacity presentation
- evidence and document areas, empty but legible as areas
- procedure preview
- branch structure, with no branches yet
- participant roles, with no participants yet
- the progress model, in its neutral pre-agreement state
- activity history preview

**The hard part, and the reason this needs design rather than assembly:** every
one of those regions is empty on a first visit. An empty room must read as
*ready and waiting*, not as *broken and unfinished*. Show the empty state of
each region as a deliberate composition.

**Nowhere on this screen:** a price, a plan chooser, a credit prompt, an upgrade
banner, or a countdown. The member must reach the moment of pride without
having been asked for money. ADR-0028 is explicit.

**Progressive recognition.** The room becomes visibly more complete as facts are
added, using the Professional Momentum model: action, recognition, value
created, progress preserved, next action. Example lines from the brief:
"Product identified." / "Quantity and delivery basis added." / "The Arabic
presentation is ready." / "Your room is ready to invite counterparties."
**No points, coins, streaks, confetti or exaggerated praise.**

---

## Screen 2 — Activation

**The one paid moment in the product**, and the first time money is mentioned.

Required interaction, close to verbatim:

> Your Deal Room is ready.
> Activate it to invite counterparties, open private negotiations and begin
> protected commercial progression.
> **$79 USD for 30 active days.**
> Includes up to five active private counterparty branches and all five
> supported languages.

Also on this screen, and it must be an explicit choice with both options
explained. **Never assign it silently:**

- **Discoverable, open to applications.** Qualified Ponte members see an
  approved showroom preview and can apply to open a private branch.
- **Private, invitation only.** Only people the owner invites can begin
  admission.

Default is **discoverable**. The word "open" must not appear on its own for the
first option: it wrongly implies anybody can walk in.

Additional pricing that has to be legible without dominating: `$15 USD` per
additional active branch in the period, `$199 USD` ceiling per room per period.

**The member must actively confirm.** No silent activation, no pre-ticked box,
no charge without a deliberate act.

---

## Screen 3 — The counterparty preview, and the five languages

Two jobs on one surface, because they answer the same question: *what will they
see?*

**The language switch.** English, Spanish, Russian, Simplified Chinese, Arabic.
Arabic renders right to left, and the switch is not a footnote: multilingual
operation is a headline reason the room keeps being used after the counterparty
is known.

Draw at minimum the Latin case, the Simplified Chinese case, and the Arabic RTL
case, including how mixed-direction metadata behaves - a reference like
`DR-2041`, a date, a quantity with a unit - inside an Arabic layout.

**The counterparty preview.** The owner sees exactly what an invited party will
experience before anybody is invited. This needs an unmistakable frame: the
viewer must never be confused about whether they are looking at their own room
or at somebody else's view of it.

It must make visible **what stays private**: other branches, internal notes,
unpublished evidence, the owner's direct contact details, and the existence or
number of other counterparties.

---

## Screen 4 — The request-to-join inbox

Only exists when the room is **discoverable**. The owner reviews applications
from members who found the showroom.

Each application shows an identity card plus a structured commercial summary.

**The identity states must stay separate and specific.** Do not design a single
"Verified" badge. The vocabulary is:

- Email confirmed
- Telephone confirmed
- Business information supplied
- Business registry match completed
- Commercial authority declared
- Commercial authority not independently verified

Commercial summary: role in the proposed transaction; principal, representative,
intermediary or service provider; organisation or capacity; what they want to
discuss; quantity, capacity or scope; origin, destination or territory; timing;
delivery and payment basis; relevant capability; evidence categories available;
preferred language.

Owner actions: **accept**, **ask a structured clarification**, **decline**,
**archive**, **report abuse**, **block**.

**Never on this screen:** the applicant's email, telephone, WhatsApp or any
direct contact route. The whole point of the gate is that contact is controlled.

**Anti-inference.** An applicant may know their own application's status and
nothing else. They must not be able to learn how many applications exist,
whether another was accepted, how many branches are active, or that the room is
near capacity. Nothing in the design may leak a count.

---

## Constraints that apply to all four

These are not preferences. They are the Ponte Design Constitution and the
approved token set, and a drawing that breaks them cannot be implemented.

- **Tokens only.** No invented colours. Surfaces, ink, rules and the four
  reserved semantics come from `ponte-flow-tokens`. Gold marks the brand and
  the single moving point and **never** carries a status.
- **No boxes where a hairline will do.** The Desk is built from rules and space.
  Elevation is a border and a background shift, not a shadow.
- **Colour is never the only carrier.** Every state prints its word.
- **Both themes.** Light on cream and the dark inverse. Section 02 of
  `Ponte Trade - Design Package.html` publishes the inverse grounds by value:
  `#0E0F0C`, `#161813`, ink `#F2EFE8`. Rules on the inverse are alpha, not tint.
- **Two viewports:** desktop 1280 wide, and mobile 390 x 844.
- **The Bridge is the progression primitive.** Where a sequence is drawn, it is
  `PB.route`, not a new stepper.
- **Nothing manufactured.** No sample counts, no fake activity, no invented
  member names presented as real. An example is labelled as one.

## What to deliver

For each screen: the desktop composition, the 390-wide composition, and the
empty or first-run state where it differs. For screen 3, the three language
cases. Standalone HTML in the project, consistent with how
`Ponte Deal Room - Design Review v3.html` is built, so the implementation can
read it directly.

## Open questions the design may answer or defer

1. Does an unpublished room appear in the member's room list, or somewhere
   separate, until it is activated?
2. Is "investigate a published opportunity" the same paid event as opening a
   room, or a smaller separate one?
3. On the counterparty preview, is the frame a persistent chrome, a mode toggle,
   or a separate route?
