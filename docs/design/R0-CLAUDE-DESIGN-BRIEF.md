# R0-A — Experience Shell Consolidation: bounded design brief

**Issued:** 7 August 2026, under Recovery Mode
**For:** Claude Design
**Approver:** Giuseppe Funaro. Claude Code receives no implementation brief until this prototype package is approved.
**Authority:** `R0-PONTE-EXPERIENCE-SHELL.md` (accepted), North Star §1–§3, ADR-0032 + Amendments 1–2, ADR-0036 to ADR-0041, Design Constitution v1.1, the Canonical Journey Register.

> **Dependency.** ADR-0036 to ADR-0041 and `00-CANONICAL-JOURNEY-REGISTER.md` sit on the
> `governance/recovery-mode-authority` branch and are **not yet merged to `main`** (PR #231, under
> controller review). They are cited in prose, never by link, so nothing here dangles. **Design may
> proceed on this brief; R0-A implementation must not begin before PR #231 merges.**

---

## 0. What you are designing, in one sentence

**The shell a member is inside, everywhere** — so that Ponte stops being five products wearing one name.

You are **not** designing what happens inside any journey. JR-01 is designed after R0-A is approved.

---

## 1. The rule that governs everything below

> **R0-A unifies shell and navigation only. It must not cosmetically legitimise journey defects.**

A surface that receives the new shell has been **re-housed, not repaired.** Missing Distribution
in the publish entrance, numbered trust tiers in verification, false anonymous progress in
opportunities, and every defect like them remain separately classified and open. **None may be
marked resolved because its surface now looks correct.**

This is the failure mode R0-A is most likely to cause: a walkthrough where everything matches, so
everything reads as fixed. A consistent shell over an unfixed journey is more dangerous than an
inconsistent one, because it removes the visible seam that told a reviewer to look closer.

### 1.1 Two axes, never collapsed

Every surface carries **two independent statuses**. R0-A can move the first. R0-A can never move the second.

| Axis | Question | R0-A may change it? |
|---|---|---|
| **Shell conformance** | Does it wear the one shell, navigation, ground and typeface? | **Yes. This is R0-A.** |
| **Journey correctness** | Does it do the right thing for a member? | **No. Out of scope, and stays open.** |

A surface may be **shell-conformant and journey-defective at the same time**, and several will be.
That combination must be visible in the prototype, not hidden by it.

### 1.2 Carried defects — R0-A closes none of these, and several BLOCK a retirement

Reproduce these in the prototype **as they are**, and mark each visibly (see §5.4). Do not design
the fix. Do not quietly draw the corrected version.

| ID | Defect | Where it shows | Stays open under |
|---|---|---|---|
| **JD-01** | Publish entrance offers only Source a product / Supply a product / Offer a trade service — **Distribution and representation is missing**, though the entrance promises three equal families | corridor B | ADR-0001, ADR-0011 |
| **JD-02** | Verification presents **numbered trust tiers 01–04** as the trust model | `/verification` | Master Brief §1.3 |
| **JD-03** | `/opportunities` shows a rail with stages **"completed"** to anonymous visitors | `/opportunities` | Constitution §19, North Star §3.5 |
| **JD-04** | Public walkthrough demonstrates an **Accept / Clarify / Decline** owner inbox; **Clarify does not exist** | corridor D | **LB-015** |
| **JD-05** | No clarification action in owner review, though canonical `O04` requires accept / decline / **ask for clarification** | JR-01 step 9 | Master Brief §9.12 |
| **JD-06** | Introduction prerequisites — the verification gate — **not implemented** | JR-01 step 10 | ADR-0021 ruling 2 |
| **JD-07** | **No path** from an accepted introduction to a Deal Room | JR-01 step 12 | ADR-0037 |
| **JD-08** | `/pricing` still sells the retired model and **does not name the Deal Room** | `/pricing` | **LB-014**, OD-F |
| **JD-09** | Room proposal passes placeholder values through its **own credible-interest gate** | `/deal-rooms/propose` | ADR-0037 |
| **JD-10** | Two express-interest interfaces exist, one dead and still test-pinned | JR-01 step 5 | audit |

**Re-shelling `/pricing` does not close LB-014. Re-shelling the walkthrough does not close LB-015.**
Those two are named because they are the ones most likely to be assumed fixed.

### 1.2a A defect may BLOCK a retirement without becoming your work

Some defects gate a route retirement. **That does not move them into R0-A.** They are repaired
under **R0-B**, separately authorised, and R0-A waits behind them.

| Defect | What it blocks | Repaired under |
|---|---|---|
| **JD-01** Distribution missing | **`/structure` may not redirect to `/publish`** | R0-B.2, journey authority |
| **JD-02** numbered trust tiers | nothing — `/verification` keeps its route and its shell | R0-B.3 |
| **JD-03** false anonymous progress | nothing — `/opportunities` keeps its route and its shell | R0-B.4 |
| **JD-08** `/pricing` sells the retired model | nothing — LB-014 closes on its own evidence | R0-B.7 |
| **JD-09** credible-interest bypass | nothing — `/deal-rooms/propose` keeps its route and its shell | R0-B.5 |
| — | `/explore` may not redirect to `/find` | R0-B.1 absorption |
| — | `/check` may not retire | R0-B.6 parity, OD-L |

**You draw none of these repairs.** Where a route awaits one, draw it **with the new shell and the
defect still present**, annotated per §5.4.

**The sequence you must not shortcut in a prototype:** repair or absorb → prove parity → redirect →
retire. A prototype showing `/structure` already redirecting to `/publish`, or `/explore` already
gone, asserts a parity that does not exist and would authorise a premature retirement.

### 1.3 What R0-A *does* legitimately fix

These are shell properties, so R0-A owns them and may mark them resolved:

- five header systems → one;
- two market entrances → one;
- three near-blacks → one;
- three display typefaces → one;
- two logo lockups → one;
- surfaces rendering with **no chrome at all**;
- **sign-in missing** from `/verification` and `/explore`;
- **`next=` lost** on the `/account` → `/login` redirect while `/workspace` and `/admin` keep it;
- a **journey rail on surfaces with no journey**;
- **browser Back as the only intelligible navigation**.

Nothing else.

---

## 2. Decisions already taken — build to these, do not reopen

| Ref | Decision |
|---|---|
| **OD-J** | Member-visible primary journeys are **“Explore the market”** and **“Start a deal”**. `/find` and `/publish` remain the technical routes and are never shown as labels |
| **OD-K** | Canonical shell ground is **`--brg-ink` `#0E0F0C`**. `#0A0C11` and `#050504` are eliminated as shell grounds through this design |
| **OD-L** | `/check` is **not** completed as a parallel visible entrance. Its unique capability is absorbed into the canonical verification/check path; the route and its flag retire once parity exists. **Do not draw `/check`** |
| **OD-A** | Deal Rooms may be publicly explained and demonstrated — never a third entry journey |
| **OD-B** | An accepted introduction does not open a room; the surface may *offer* it |
| **OD-C** | Lifecycle `ENTER → DISCOVER → CREATE → TRUST → CONNECT → [DEAL ROOM] → PROGRESS → RECORD`; **`MANAGE` is not a stage** |
| **OD-G** | Market Signals stay on the landing, always explicitly unconfirmed |

---

## 3. In scope

1. **The shell**: logo and home, command bar (signed out and signed in), journey rail, back
   behaviour, context preservation, footer, responsive collapse.
2. **The entrance**, to the approved information architecture.
3. **One representative surface per corridor**, drawn *only far enough to prove the shell holds*:
   - **A · Explore the market** — `/find`, results in two lanes
   - **B · Start a deal** — `/publish`, first question
   - **C · Market Signal investigation** — a signal, with **Ask Ponte to investigate**
   - **D · Deal Room explanation** — `/deal-rooms`
4. **Shell states**: loading, signed out, signed in, error, offline, reduced motion, keyboard focus.

## 4. Out of scope — do not draw

- **JR-01 in any form**: no interest form, owner review, prerequisites, disclosure, room progression.
- The inside of a Deal Room; activation, payment or pricing surfaces.
- Admin and reviewer surfaces. `/check`.
- Verification as a product — only the shell around its explainer.
- **Any fix to a JD-listed defect.**
- Any new capability. R0-A moves and re-dresses; it adds nothing.
- **Any redirect or retirement.** R0-A redirects nothing and retires nothing.

---

## 5. The prototype package

### 5.1 Deliverables
| # | Artefact |
|---|---|
| 1 | **Shell specification sheet** — logo, command bar both auth states, rail, back, footer, responsive collapse, with the token values used |
| 2 | **The entrance**, 390 × 844 and desktop |
| 3 | **Four corridor surfaces** (A–D), 390 × 844 and desktop |
| 4 | **Connected walkthrough** — `/` → each corridor and back, clickable |
| 5 | **Shell state set** — the seven states in §3.4 |
| 6 | **Generation-elimination sheet** — before/after of the five headers, three typefaces, three grounds |
| 7 | **Carried-defect sheet** — §1.2, each defect shown where it appears, marked unresolved |

### 5.2 Signed-out and signed-in
Both auth states for the entrance and every corridor surface. The command bar differs only by the
addition of Workspace and the account menu; **slots 1–4 never move**.

### 5.3 The two journeys
Slots 1 and 2 are **“Explore the market”** and **“Start a deal”**, in that order, always both
present, on every surface, at every breakpoint, in one tap at 390 px.

### 5.4 How to mark a carried defect
Every JD defect visible in a drawn surface carries a **prototype-only annotation** naming the JD id
and its authority — for example *“JD-01 · Distribution absent · ADR-0001”*. The annotation is a
review instrument and is **never** part of the design. It must be trivially strippable and must
never be drawn as a member-facing state.

**Draw the defect as it currently is.** Do not add Distribution to the publish entrance. Do not
replace the numbered tiers. Do not remove Clarify from the walkthrough mock. Showing the true
current behaviour inside the true new shell is the point of R0-A.

---

## 6. Binding design authority

- **Surface language** — ADR-0032 + Amendments 1–2: ink ground, fine grain, bronze doing one job,
  scale carrying the drama, motion as passage. Cream is a **reversed panel inside the ink ground**,
  not a second theme.
- **Ground** — `#0E0F0C` (OD-K), one value, everywhere.
- **Display typeface** — Playfair Display. Inter and Space Grotesk are retired as display faces.
- **Rail** — ADR-0038. Journey positions only, never navigation; no rail where there is no journey;
  `MANAGE` never appears; `[DEAL ROOM]` never drawn as the end (ADR-0024).
- **Constitution v1.1** — §9 progress, §11 navigation, §12 buttons, §17 responsive, §18
  accessibility, §19 state completeness, §23 prohibited substitutions.

### Truth rules
- Evidence-specific trust only — no tiers, no score, no percentage. **Gold is brand, never status.**
  *(Where an existing surface breaks this, it is JD-02 and stays broken — see §5.4.)*
- Market Signals: read from a named public source, republished as printed, not confirmed, not a
  member. **Never dressed or acted on as a Qualified Opportunity** (ADR-0037, ADR-0041).
- A Deal Room is **activated**, never published.
- No fabricated traction. An empty market says so plainly and quietly.
- **No dead doors.** Do not draw a control that performs something the product cannot do. Where one
  is needed and the capability is absent, raise it — do not draw it as live.

---

## 7. Acceptance

**Shell (R0-A's own work)**
1. Every corridor walked `/` → destination → back, with **no change** of logo, navigation, typeface
   or ground.
2. Both journeys reachable in **one tap at 390 px**, labelled per OD-J.
3. **One ground `#0E0F0C`** across every drawn surface; no `#0A0C11`, no `#050504`.
4. Sign in reachable from **every** signed-out surface; the return destination preserved.
5. No rail where there is no journey. `MANAGE` absent. `[DEAL ROOM]` not drawn as an ending.
6. Every surface has an in-product way back; browser Back is never the only intelligible move.
7. Reduced motion and visible keyboard focus throughout.

**Anti-cosmetic (the §1 rule)**
8. The **carried-defect sheet is present** and every JD in §1.2 appears on it.
9. **No JD defect is fixed, softened or redrawn** in any surface.
10. No artefact, caption or summary states or implies that a JD defect is resolved.

**Owner**
11. **Giuseppe walks `/` → each of the four corridors, and back, without explanation.**

---

## 8. Raise, do not resolve

- Anything that appears to need a new capability.
- Any surface that cannot be shelled without changing what it does.
- Any place where the two journeys will not fit the mobile bar without demoting one.
- Any JD defect the shell makes **worse** or **harder to see** — that is a finding, and it is the
  most valuable thing this package can return.

---

## 9. What happens after

1. Owner reviews this package.
2. On approval, Claude Code receives a bounded **R0-A** implementation brief — **shell and
   navigation only**, phases R0-A.1 to R0-A.3. **R0-A redirects nothing and retires nothing.**
3. **R0-B repairs are authorised separately, one at a time, each on its own evidence.** A route is
   redirected or retired only once its replacement parity is proven — never because the new shell
   makes the replacement look ready.
4. JR-01 design begins only once R0-A is implemented and accepted.

---

**No code. No functionality removed. JR-01 not designed. No carried defect closed.**
Stopping for owner review.
