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

> One Ponte. One global shell. One canonical market entrance. One canonical publish entrance.
> One visual language.

**“One entrance” means one canonical visible and navigational entrance — not immediate route
retirement or redirect.** R0-A makes `/find` the single market entrance a member is *offered* in
navigation, and `/publish` the single publish entrance. It does **not** remove `/explore` or
`/structure`: those remain shelled and reachable until R0-B parity is proven and the redirect is
separately authorised.

R0-A is done when a member can move between **any two surfaces** without the logo, the navigation,
the typeface or the page ground changing — and when the entrance offers exactly two journeys.

**What the audit found, which R0-A exists to end:** five header systems, **two competing primary
market entrances**, three first questions, three display typefaces and three near-blacks.

---

## 0a. R0 is two slices, and only one is being designed

An earlier draft of this specification assigned R0 several **journey corrections**: Distribution
parity before retiring the publish entrance, removing numbered trust tiers, correcting anonymous
progress, enforcing credible interest, absorbing `/check`. The design brief simultaneously
**forbade R0 from fixing those same defects**. Both cannot hold. This section resolves it, and
every later section is read subject to it.

| Slice | Scope | Authority | Status |
|---|---|---|---|
| **R0-A — Experience Shell Consolidation** | Shell, navigation, visual identity, context preservation. **Nothing else.** | This document + `R0-CLAUDE-DESIGN-BRIEF.md` | **Approved. The current Claude Design scope.** |
| **R0-B — prerequisite journey repairs** | The specific journey defects that must be repaired **before** a route may be redirected, retired, or claimed to have parity | **Separately authorised, per defect, under journey authority.** Not this document | **Not authorised, not designed, not scheduled here** |

### The rule, restated so it cannot be misread

> **R0-A may change shell conformance. R0-A may never change journey correctness.**

**A JD defect may be a blocking precondition for a retirement without becoming R0-A work.** That is
the distinction the earlier draft collapsed. R0-A is *blocked by* JD defects; it never *fixes*
them. Repair is R0-B.

### What this means in practice

- A surface may receive the canonical shell **while remaining journey-defective**. Its defect stays
  open, and stays visible.
- A route is **not** redirected or retired because its replacement now looks right.
- Where applying a shell rule would **conceal** a registered defect, R0-A does not apply it — see
  §3.3.

---

## 1. Canonical visible sitemap

**This is the canonical *visible and navigational* sitemap — what a member is offered.** It is not
a list of every route that exists. Legacy routes not shown here remain **live, shelled and
reachable** until R0-B parity is proven and their redirect is separately authorised. See §2.

### Signed out

```
/                       The entrance
├─ /find                THE MARKET            (to absorb /explore — R0-B.1)
│   ├─ /find/o/[ref]      Qualified Opportunity detail        → JR-01
│   └─ /market-signals    Market Signals  (unconfirmed lane)  → JR-05
│       └─ /market-signals/[id]
├─ /publish             START A DEAL          (to absorb /structure — R0-B.2)
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

Three columns, deliberately. **What R0-A does** is shell work and is authorised. **What blocks
retirement** is an R0-B repair and is *not* R0-A work — it is a gate R0-A must wait behind.

| Route | R0-A does (authorised) | Blocked on (R0-B, separately authorised) | Eventual disposition |
|---|---|---|---|
| `/` | Apply shell; entrance IA per §4 | — | **KEEP** |
| `/find`, `/find/o/[ref]` | Apply shell | Absorb `/explore` capability | **KEEP** |
| `/publish` | Apply shell | **JD-01** Distribution parity | **KEEP** |
| `/market-signals`, `/market-signals/[id]` | Apply shell; add missing `h1`; remove the rail (no journey here) | — | **KEEP** |
| `/market-signals/categories` | Apply shell | Sector browse present in `/find` | **RECONNECT** |
| `/deal-rooms`, `/deal-rooms/inside` | Apply shell | **JD-04 / LB-015** — the `Clarify` mock | **KEEP** |
| `/pricing` | Apply shell | **JD-08 / LB-014** — names the retired model | **KEEP** |
| `/verification` | **Apply shell only.** The numbered tiers stay visible | **JD-02** — changing the trust representation is **not R0-A work** | **KEEP**, repaired under R0-B |
| `/verify` | Apply shell | Absorb `/check` capability | **KEEP** |
| `/login` | Apply shell; **set `next=` on every redirect** (§3.5) | — | **KEEP** |
| `/workspace`, `/account` | Apply shell | — | **KEEP** |
| `/opportunities` | **Apply shell only.** Rail and anonymous behaviour untouched — see §3.3 | **JD-03** false anonymous progress | **KEEP**, repaired under R0-B |
| `/deal-rooms/propose` | **Apply shell only.** Access and gating untouched | **JD-09** credible-interest logic | **KEEP**, repaired under R0-B |
| `/explore`, `/explore?family=…` | Apply shell **while it remains live** | Replacement parity in `/find` proven | **REDIRECT → `/find`** |
| `/structure`, `/structure?from=…` | Apply shell **while it remains live** | **JD-01** Distribution parity **plus** intake and resume parity | **REDIRECT → `/publish`** |
| `/check` | Nothing — it 404s and is not drawn (OD-L) | Unique capability absorbed into `/verify`; parity separately authorised | **RETIRE** route + flag |
| `/learn/*`, `/about`, `/contact`, `/privacy`, `/terms` | Apply shell; content unchanged | — | **KEEP** |

**Nothing is deleted in R0-A.** No route in this table is redirected or retired by R0-A. Every
redirect and retirement waits on an R0-B repair or a proven absorption, and each is separately
authorised.

**Applying the shell to a route never advances its eventual disposition.** `/verification` wearing
the canonical shell does not move it closer to having its trust model fixed; `/pricing` wearing it
does not close LB-014.

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
- **A surface with no journey has no rail.** R0-A removes the rail from `/market-signals`, which
  has no journey and no registered defect behind it.
- **Carve-out, and it matters.** `/opportunities` also shows a rail to anonymous visitors — with
  stages marked *"completed"* for someone who has completed nothing. **R0-A does not remove it.**
  Removing it would make the false claim disappear without the defect being repaired, which is
  precisely the cosmetic legitimisation this specification forbids. **JD-03 owns that surface's
  rail entirely**, and it stays visible until R0-B repairs it.
- **The general principle:** where applying a shell rule would *conceal* a registered defect rather
  than *correct* it, R0-A does not apply the rule. The defect keeps the surface.
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
8. **A route is redirected or retired only after replacement parity is proven.** Until then it may
   receive the canonical shell where safe, and it remains **explicitly classified as
   journey-defective**.

   *This replaces an earlier rule — "a route that cannot yet be shelled is redirected, not
   exposed" — which had it backwards. That rule made redirection the remedy for an unfinished
   surface, which would have removed working capability from members to tidy the navigation.
   Parity first, redirect second, in that order and never the reverse.*

---

## 7. The five named routes

Each entry states **what R0-A does now** and **what must happen elsewhere first**. No entry
authorises a journey repair.

### `/explore`
A second market entrance in a third generation, reachable only from `/verification`'s header.

- **R0-A now:** apply the canonical shell. It stays live and reachable.
- **Blocked on (R0-B):** `/find` carrying the three-family overview, sector tiles with counts and
  the market-activity statement. Counts stay honest — "0 market records" is stated, never hidden,
  never invented.
- **Then, separately authorised:** 308 to `/find`.

### `/structure`
A third entrance with a third first question, no chrome, and the sharpest finding of the audit:
**only Source a product / Supply a product / Offer a trade service. Distribution and representation
is missing**, though the entrance promises three equal families.

- **R0-A now:** apply the canonical shell — this route renders with no chrome at all today. It
  stays live and reachable.
- **Blocked on (R0-B): `JD-01` Distribution parity**, resolved under separate journey authority,
  plus intake parity (Describe it · Upload a document · Browse categories) and resume-a-draft.
- **Then, separately authorised:** 308 to `/publish`, preserving `?from=` and `?edit=`.

> **`/structure` may not redirect until JD-01 is resolved.** Redirecting first would remove the
> only entrance that works for two of the three families and route those members into an entrance
> that serves neither. The defect blocks the retirement; it is not fixed by it.

### `/verification`
The explainer is good and stays: what is checked, sources, dates, limits, what a verification does
**not** mean.

- **R0-A now:** apply the canonical shell, and restore the missing sign-in control. **The numbered
  levels 01–04 remain visible.**
- **`JD-02` stays open.** Master Brief §1.3 forbids numbered tiers as the principal user-facing
  trust model, and replacing them with evidence-specific statements changes what the surface
  *claims about a member* — **that is a journey correction and is not R0-A work.**
- **R0-B, separately authorised:** the trust representation. The underlying L1–L4 data model is not
  migrated by either slice.

### `/opportunities`
Renders to anonymous visitors with a rail showing stages *"completed"* for someone who has
completed nothing.

- **R0-A now:** apply the canonical shell. **Nothing else** — not the rail, not the anonymous
  access, not the missing `h1` if removing it would mask the claim.
- **`JD-03` stays open and owns this surface's rail** (§3.3 carve-out). Removing the rail under
  R0-A would delete the false claim without repairing the defect.
- **R0-B, separately authorised:** the false-progress behaviour and the access decision.

### `/deal-rooms/propose`
Open to anonymous visitors. ADR-0037 permits a room only after credible commercial interest, and
the product contract is explicit that a search result or expression of curiosity does not create
one.

- **R0-A now:** apply the canonical shell. **Access and gating are untouched.**
- **`JD-09` stays open:** the flow passes placeholder values through its own credible-interest gate.
  Gating logic is journey correctness — **not R0-A work.**
- **R0-B, separately authorised:** the credible-interest enforcement and who may reach the surface.

### `/check` (OD-L)
- **R0-A now:** nothing. It 404s by design and is not drawn.
- **Blocked on (R0-B):** its unique capability absorbed into the canonical verification/check path,
  with parity separately authorised and proven.
- **Then:** retire the route and `NEXT_PUBLIC_CHECK_JOURNEY`.

---

## 8. Retirement and redirect plan

**The rule, in order and never reversed: repair or absorb → prove parity → redirect → retire.**

> **A route is redirected or retired only after replacement parity is proven. Until then it may
> receive the canonical shell where safe, and it remains explicitly classified as
> journey-defective.**

### R0-A — authorised now

| Phase | Action | Precondition |
|---|---|---|
| **R0-A.1** | Build the shell; apply to `/`, `/find`, `/publish` | — |
| **R0-A.2** | Apply to `/market-signals`, `/deal-rooms*`, `/verify`, `/pricing`, `/login`, `/workspace`, `/account`, `/learn/*`, statics | R0-A.1 accepted |
| **R0-A.3** | Apply to the routes awaiting repair — `/explore`, `/structure`, `/verification`, `/opportunities`, `/deal-rooms/propose` — **shell only**, every JD left visible and open | R0-A.2 accepted |

R0-A ends there. **It redirects nothing and retires nothing.**

### R0-B — separately authorised, each on its own evidence

| Phase | Repair | Unblocks |
|---|---|---|
| **R0-B.1** | Absorb `/explore` capability into `/find` (family overview, sector tiles, counts, market-activity statement) | `/explore` → 308 `/find` |
| **R0-B.2** | **JD-01** Distribution parity in `/publish`, under journey authority, **plus** intake parity and resume-a-draft | `/structure` → 308 `/publish`, preserving `?from=` and `?edit=` |
| **R0-B.3** | **JD-02** trust representation on `/verification` | closes JD-02. No redirect involved |
| **R0-B.4** | **JD-03** `/opportunities` false anonymous progress and access | closes JD-03 |
| **R0-B.5** | **JD-09** `/deal-rooms/propose` credible-interest enforcement | closes JD-09 |
| **R0-B.6** | Absorb `/check` capability into `/verify` (OD-L) | retire `/check` + `NEXT_PUBLIC_CHECK_JOURNEY` |
| **R0-B.7** | **JD-08 / LB-014** `/pricing` reconciled to the Deal-Room-only model | closes LB-014 |
| **R0-B.8** | **JD-04 / LB-015** the `Clarify` mock on the public walkthrough | closes LB-015 |

**Each R0-B phase requires its own authorisation.** None is approved by this document, and none is
scheduled by it. JD-05, JD-06, JD-07 and JD-10 belong to JR-01 and are not listed here.

### What "parity proven" means

Demonstrated on the replacement surface, not argued: every capability the old route offered is
reachable and works, including its query contracts. Until that evidence exists the old route stays
live and shelled.

**No legacy generation is left exposed, and no capability is removed to achieve that.** A surface
is shelled where it stands. Redirection is never used as a substitute for finishing the work.

**Preserved without exception:** every capability behind `/explore`, `/structure`, `/verification`,
`/opportunities`, `/deal-rooms/propose` and `/check`; every email deep link (`?edit=`); the
retired-editor quarantine (LB-013); the Deal Room slice behind its flag.

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
