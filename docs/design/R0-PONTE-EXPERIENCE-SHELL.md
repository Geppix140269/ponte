# Recovery Slice R0 — the Ponte Experience Shell

**Status:** proposed for controller/owner review. Not authority until accepted and merged.
**Date:** 7 August 2026
**Scope:** the shell a member is inside, everywhere. **Not** JR-01, which is designed after R0 is approved.
**Evidence:** the signed-out browser audit of 7 August 2026 (27 surfaces, click-reachable only).
**Governing authority:** North Star §1–§3, ADR-0032 + Amendments 1–2, ADR-0036 to ADR-0041, the Canonical Journey Register, Design Constitution v1.1.

> **Dependency.** ADR-0036 to ADR-0041 and `00-CANONICAL-JOURNEY-REGISTER.md` are on the
> `governance/recovery-mode-authority` branch and are **not yet merged to `main`** (PR #231, under
> controller review). This document is written against them and is cited in prose rather than by
> link so that nothing here dangles. **R0 implementation must not begin before PR #231 merges**,
> because the decisions R0 builds on are not authority until it does.

> **R0 removes no functionality.** Every capability that exists today survives. What changes is
> *where it lives* and *what it looks like*. Any route named for retirement below is retired **only
> after** its capability has been absorbed by the surface that replaces it, and that absorption is a
> precondition recorded per route in §8.

---

## 0. The objective, stated as a test

> One Ponte. One global shell. One market entrance. One publish entrance. One visual language.

R0 is done when a member can move between **any two surfaces** without the logo, the navigation,
the typeface or the page ground changing — and when the entrance offers exactly two journeys.

**What the audit found, which R0 exists to end:** five header systems, two market entrances, three
first questions, three display typefaces and three near-blacks.

---

## 1. Canonical visible sitemap

### Signed out

```
/                       The entrance
├─ /find                THE MARKET            (absorbs /explore)
│   ├─ /find/o/[ref]      Qualified Opportunity detail        → JR-01
│   └─ /market-signals    Market Signals  (unconfirmed lane)  → JR-05
│       └─ /market-signals/[id]
├─ /publish             START A DEAL          (absorbs /structure)
├─ /deal-rooms          What a Deal Room is   (explanation, ADR-0036)
│   └─ /deal-rooms/inside  The walkthrough
├─ /pricing             Fees
├─ /verification        How verification works  (explainer)
├─ /learn/duties  /learn/trade-data
├─ /about  /contact  /privacy  /terms
└─ /login               Sign in
```

### Signed in — everything above, plus

```
/workspace              Do now · Waiting on others · Recent outcomes
/opportunities          My opportunities
/deal-rooms             My rooms (the same route; contents differ by session)
/verify                 Verify my business / check a counterparty
/account                Profile, company, sign out
```

**Two primary journeys, and no third.** North Star §1 stands: *Explore the market* and *Start a deal*.
The Deal Room is publicly **explained** (ADR-0036) and is never a third entry journey.

---

## 2. Route disposition

| Route | Disposition | Note |
|---|---|---|
| `/` | **KEEP** | Canonical entrance. IA in §4 |
| `/find`, `/find/o/[ref]` | **KEEP + RECONNECT** | The one market entrance. Must first absorb `/explore` |
| `/publish` | **KEEP + RECONNECT** | The one publish entrance. Must first absorb `/structure` |
| `/market-signals`, `/market-signals/[id]` | **RECONNECT** | Add `h1`; remove the journey rail from a public page |
| `/market-signals/categories` | **RECONNECT** | Fold into `/find` sector browse |
| `/deal-rooms`, `/deal-rooms/inside` | **KEEP + RECONNECT** | Authorised public explanation (ADR-0036). Re-shell |
| `/pricing` | **KEEP + RECONNECT** | Must name the Deal Room (LB-014, OD-F) |
| `/verification` | **REDESIGN** | Keep the explainer. **Retire the numbered tiers 01–04** |
| `/verify` | **KEEP + RECONNECT** | Re-shell to the canonical typeface |
| `/login` | **KEEP + RECONNECT** | Fix the lost `next=` (§3 back behaviour) |
| `/workspace`, `/account` | **KEEP + RECONNECT** | Re-shell |
| `/opportunities` | **REDESIGN + HIDE when signed out** | No progress rail for anonymous visitors |
| `/deal-rooms/propose` | **HIDE** | Behind auth **and** credible interest (ADR-0037) |
| `/explore`, `/explore?family=…` | **REDIRECT → `/find`** | After absorption. 308 |
| `/structure`, `/structure?from=…` | **REDIRECT → `/publish`** | After absorption. 308 |
| `/check` | **ABSORB then RETIRE** | Not completed as a parallel visible entrance (OD-L). Unique capability absorbed into the canonical verification/check path; route and `NEXT_PUBLIC_CHECK_JOURNEY` retire once parity exists |
| `/learn/*`, `/about`, `/contact`, `/privacy`, `/terms` | **KEEP + RECONNECT** | Content unchanged; shell applied |

**Nothing is deleted in R0.** `/explore` and `/structure` become redirects, not removals.

---

## 3. The global shell — single specification

One shell component. Every surface renders inside it. There is no second shell and no
per-route chrome decision.

### 3.1 Logo and home
- Wordmark **`PONTE`**, the ADR-0032 lockup. The `Ponte .trade` icon lockup is retired.
- Always top-left, always the same size, always links to `/`.
- **It never carries state.** No breadcrumb beside it. No `.trade` suffix on some pages and not others.

### 3.2 Global header — the command bar
North Star §2: the command bar carries **all** product navigation and is *"visibly a different
system from the rail."* One bar, one place, always present.

**Signed out**

| Slot | Label | Destination |
|---|---|---|
| 1 | **Explore the market** | `/find` |
| 2 | **Start a deal** | `/publish` |
| 3 | Market Signals | `/market-signals` |
| 4 | Deal Rooms | `/deal-rooms` |
| right | Sign in | `/login?next=<current>` |

**Signed in** — slots 1–4 unchanged, then:

| Slot | Label | Destination |
|---|---|---|
| 5 | Workspace | `/workspace` |
| right | *Account menu* | `/account`, sign out |

- **Slots 1 and 2 are the two North Star journeys and are always both present.** The audit found
  "Find an opportunity" only in the footer; that is the defect this fixes.
- **Sign in appears on every signed-out surface.** `/verification` and `/explore` have none today.
- The Deal Rooms slot is **explanation** signed out and **the member's rooms** signed in. Same
  route, same label, contents differ by session. It is not a third entry journey.

### 3.3 Journey rail — separate from the command bar
- The rail carries **journey positions only**, never navigation (North Star §2, ADR-0038).
- Stages: `ENTER → DISCOVER → CREATE → TRUST → CONNECT → [DEAL ROOM] → PROGRESS → RECORD`.
- **`MANAGE` never appears** (ADR-0038).
- **A surface with no journey has no rail.** This retires the rail from `/market-signals` and from
  `/opportunities` when signed out, where the audit found stages marked *"completed"* for a visitor
  who had completed nothing.
- The rail never draws `[DEAL ROOM]` as the end (ADR-0024).

### 3.4 Back behaviour
- **Every surface has an in-product way back.** Browser Back is never the only intelligible move —
  the audit found `/structure` offering only *"Back to Ponte Trade"* and no navigation.
- Inside a multi-step path, Back means **one step back in the path**, labelled with the step it
  returns to, and never loses entered work.
- At step one of a path, Back returns to the surface the member entered from, resolved server-side
  against an allowlist.
- The logo is always available as an escape and always goes to `/`.

### 3.5 Context preservation
- **Authentication never loses work.** `next=` is set on **every** redirect to `/login`, and the
  member returns to exactly where they were. The audit found `/account` redirecting to bare
  `/login` while `/workspace` and `/admin` preserved the destination.
- A pending action is executed **once** on return, never twice.
- Work in progress survives reload, restore and authentication.
- Moving between the two journeys preserves the stated objective where one exists.

### 3.6 Footer
One footer everywhere: The market · Deal Rooms · Learn · Ponte, then the operator statement and
the Market Signal provenance line. The footer is **not** where a primary journey lives — the audit
found "Find an opportunity" demoted there.

### 3.7 Responsive
- Designed at **390 × 844 first**, then desktop (Constitution §17).
- The command bar collapses to logo + one menu control; **both journeys stay reachable in one tap**.
- The rail becomes a compact horizontal indicator; it never becomes navigation.
- Reduced motion and visible keyboard focus throughout (Constitution §18).

---

## 4. Landing information architecture

The entrance answers three questions in order: *what is this, what can I do, where do I start.*

| # | Band | Purpose | Rule |
|---|---|---|---|
| 1 | Command bar | Navigation | §3.2 |
| 2 | **`What's your deal?`** + the crossing | What Ponte is | North Star §1 headline. The arc is identity, not progress |
| 3 | **Three markets, six doors** | Where to start | Products · Trade services · Distribution — three **equal** families |
| 4 | **Six doors. One destination.** | What it leads to | Deal Room explained, ADR-0036. A link, never a primary route |
| 5 | **Market Signals, read recently** | Live intelligence | ADR-0041. Always labelled unconfirmed, never a Qualified Opportunity |
| 6 | What a Market Signal is | Honesty | The four-line yes/no register |
| 7 | Footer | §3.6 |

**Fixes required by the audit**
- **The arc must not carry publish-path stage labels.** `INTENT · WORDS · THE FACTS · PREVIEW` is
  the publish path; on the entrance it tells a member who came to *buy* that they are in a
  sell flow. The arc keeps its shore labels and drops the stage names.
- **The `PAUSE` control is explained or removed.** No first-time user knows what it pauses.
- **Emptiness is never the loudest thing.** Where the signals band is empty it states the fact
  quietly; it does not occupy a full band of the entrance (North Star §3.2).
- **No journey rail on the entrance** — the member has no journey yet (§3.3).

---

## 5. First-use corridors

Four corridors. Each is **two clicks or fewer** from `/`, and none changes generation.

**A · Find** — `/` → command bar *journey 1* **or** a "looking for" door → `/find` → family →
results, two lanes. *Outcome: a member sees the market.*

**B · Publish** — `/` → command bar *journey 2* **or** an "I have/I provide" door → `/publish`
carrying family + intent → first question. *Outcome: a member starts a record without re-stating
what they already said.*

**C · Market Signal investigation** — `/` → signals band or command bar → `/market-signals` →
a signal → **Ask Ponte to investigate** → JR-05. *Outcome: the member reaches investigation.*
**A signal never offers Request an introduction** (ADR-0037).

**D · Deal Room explanation** — `/` → *Six doors. One destination.* or command bar → `/deal-rooms`
→ `/deal-rooms/inside`. *Outcome: the member understands the room and its price.* **Explanation
only**; entry, invitation, activation and payment stay controlled.

Corridors A and B are the two North Star journeys. C and D are **contextual and downstream** —
reachable, never promoted to a third journey.

---

## 6. Transition rules — no generation may change

A member crossing any corridor must never see the product change identity. Binding:

1. **One shell, applied at the layout level**, not chosen per route. The audit's five header
   systems came from a per-path chrome decision; R0 removes the decision, not just its branches.
2. **One ground.** The canonical page ground is the ADR-0032 approved ink. The audit found three
   near-blacks: `#050504` (approved prototypes), `#0E0F0C` (`--brg-ink`), `#0A0C11` (Desk app).
   **One value wins and the other two are retired** — see OD-K.
3. **One display typeface.** Playfair Display, per ADR-0032. Inter (`/deal-rooms/*`) and Space
   Grotesk (`/verify`) are retired as display faces.
4. **One lockup** (§3.1).
5. **One navigation vocabulary.** A destination is called the same thing everywhere it is named.
6. **Cream is a reversed panel inside the ink ground**, per ADR-0032 — not a second theme and not
   a second product.
7. **No surface renders without the shell.** `/structure` and `/check` render with no chrome today.
8. **A route that cannot yet be shelled is redirected, not exposed** (§8).

---

## 7. The five named routes

### `/explore` → **REDIRECT to `/find`**
A second market entrance in a third generation, reachable only from `/verification`'s header.
**Absorb first:** the three-family overview, sector tiles with counts, and the market-activity
statement. Then 308. Counts stay honest — "0 market records" is stated, never hidden, never invented.

### `/structure` → **REDIRECT to `/publish`**
A third entrance with a third first question, no chrome, and — the sharpest finding — **only three
options: Source a product / Supply a product / Offer a trade service. Distribution and
representation is missing**, though the entrance promises three equal families.
**Absorb first:** the three intake routes (Describe it · Upload a document · Browse categories) and
the resume-a-draft behaviour. Then 308. `?from=` and `?edit=` continue to work through the redirect.

### `/verification` → **REDESIGN, keep the route**
The explainer is good and stays: what is checked, sources, dates, limits, what a verification does
**not** mean. **The numbered levels 01–04 go.** Master Brief §1.3 forbids numbered tiers as the
principal user-facing trust model; replace with evidence-specific statements (identity confirmed,
business information checked, role declared, authority sighted, under review, not confirmed).
The underlying L1–L4 data model is **not** migrated in R0 — presentation only.

### `/opportunities` → **REDESIGN + require auth**
Renders to anonymous visitors today with a rail showing stages *"completed"*. Signed out it should
not be reachable; signed in it is the member's records with a truthful rail. Add an `h1`.

### `/deal-rooms/propose` → **HIDE behind auth + credible interest**
Open to anonymous visitors today. Per ADR-0037 a room may be proposed only after credible
commercial interest, and per the product contract a search result or expression of curiosity does
not create one. Signed out it explains and offers sign-in; it does not start a room.
*(Separately recorded: the propose flow passes placeholder values through its own credible-interest
gate. Recorded in ADR-0037; not R0 work.)*

---

## 8. Retirement and redirect plan

**The rule: absorb, then redirect, then retire.** No route is redirected before the surface that
replaces it does everything the old one did.

| Phase | Action | Precondition |
|---|---|---|
| R0.1 | Build the shell; apply to `/`, `/find`, `/publish` | — |
| R0.2 | Apply to `/market-signals`, `/deal-rooms*`, `/verify`, `/pricing`, `/login`, `/workspace`, `/account`, `/learn/*`, statics | R0.1 accepted |
| R0.3 | Absorb `/explore` into `/find` | Sector tiles + counts + family overview present in `/find` |
| R0.4 | `/explore*` → 308 `/find` | R0.3 verified |
| R0.5 | Absorb `/structure` into `/publish` | Three intake routes, resume, **and all three families including Distribution** |
| R0.6 | `/structure*` → 308 `/publish`, preserving `?from=` and `?edit=` | R0.5 verified, resume-from-email proven |
| R0.7 | Gate `/opportunities` and `/deal-rooms/propose` | R0.2 accepted |
| R0.8 | `/verification` presentation change | R0.2 accepted |
| R0.9 | `/check`: absorb capability into `/verify`, then 308 and retire the flag | Replacement parity proven (OD-L) |

**Legacy generations are never left exposed.** A surface is shelled or redirected; it is not left
in an older generation because its turn has not come.

**Preserved without exception:** every capability behind `/explore`, `/structure`, `/verification`,
`/opportunities` and `/deal-rooms/propose`; every email deep link (`?edit=`); the retired-editor
quarantine (LB-013); the Deal Room slice behind its flag.

---

## 9. Bounded design brief — R0 for Claude Design

**Deliverable:** one shell specification, drawn, plus the entrance and one representative surface
per corridor, at 390 × 844 and desktop.

**In scope**
1. The shell: logo, command bar signed-out and signed-in, rail, back, footer, responsive collapse.
2. The entrance, to the §4 information architecture.
3. One representative surface per corridor (A Find results · B Publish first question ·
   C Market Signal detail with *Ask Ponte to investigate* · D Deal Room explanation) — drawn
   **only to prove the shell holds**, not to design those journeys.
4. The shell's own states: loading, signed out, signed in, error, offline, reduced motion,
   keyboard focus.

**Out of scope — do not draw**
- JR-01 in any form: no interest form, owner review, prerequisites, disclosure or room progression.
- The inside of a Deal Room.
- Activation, payment, pricing surfaces.
- Admin and reviewer surfaces.
- Verification as a product (only the shell around the explainer).
- Any new capability. R0 moves and re-dresses; it does not add.

**Binding authority:** ADR-0032 + Amendments 1–2 (surface language); ADR-0038 (rail);
ADR-0036 (Deal Room may be explained, never a third journey); ADR-0037 (a signal never offers an
introduction); ADR-0041 (signals always unconfirmed); North Star §1–§3; Design Constitution §9,
§11, §12, §17, §18, §19, §23.

**Truth rules:** evidence-specific trust only — no tiers, no score, gold is brand and never status;
no fabricated traction; a Deal Room is activated, never published; no dead doors.

**Acceptance**
1. Every corridor in §5 walked end to end with no change of logo, navigation, typeface or ground.
2. Both journeys reachable in one tap at 390 px.
3. No rail on a surface with no journey; `MANAGE` absent.
4. Sign in reachable from every signed-out surface; return destination preserved.
5. **Giuseppe walks `/` → each of the four corridors without explanation.**

**Raise, do not resolve:** the two label decisions below, and anything that appears to need a new
capability.

---

## Owner decisions — taken 7 August 2026

All three were open when this specification was first drafted. All three are now decided and are
**not to be reopened** by the design or implementation work that follows.

**OD-J — the two journey labels. APPROVED.**
Member-visible primary journeys are **“Explore the market”** and **“Start a deal”**. `/find` and
`/publish` remain the **technical routes** and are never shown to a member as labels. The competing
wordings — *Find an opportunity*, *Publish an opportunity*, *Explore* — are retired.
*(Three vocabularies existed for two journeys; the North Star §1 naming wins.)*

**OD-K — the canonical shell ground. APPROVED.**
`--brg-ink` **`#0E0F0C`**, the ADR-0032 token. The competing near-black shell grounds — `#0A0C11`
(the Desk app, most surfaces today) and `#050504` (the approved prototypes' body) — are
**eliminated as shell grounds through R0 design guidance**.

**OD-L — `/check`. DECIDED.**
`/check` is **not** to be completed as a parallel visible entrance. Any unique capability it holds
is **preserved and absorbed** into the canonical verification/check path; the route and its
`NEXT_PUBLIC_CHECK_JOURNEY` flag are redirected and retired **only once replacement parity
exists**. Nothing is deleted before then.

---

## The rule that governs R0's relationship to every defect it meets

> **R0 unifies shell and navigation only. It must not cosmetically legitimise journey defects.**

Missing Distribution in the publish entrance, numbered trust tiers in verification, false anonymous
progress in opportunities, and every defect like them **remain separately classified and open**.
**None may be marked resolved because its surface has received the new shell.**

Every surface carries two independent statuses. **Shell conformance** — R0 may change it.
**Journey correctness** — R0 may never change it. A surface may be shell-conformant and
journey-defective at the same time, and several will be.

The carried-defect register (JD-01 to JD-10), the annotation requirement and the acceptance
criteria that enforce this are in `R0-CLAUDE-DESIGN-BRIEF.md` §1.

---

**No code written. No functionality removed. JR-01 not designed. No carried defect closed.**
Stopping for controller and owner review.
