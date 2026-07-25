# Ponte Trade North Star entry architecture

**Status date:** 25 July 2026
**Repository:** `Geppix140269/ponte`
**Product owner:** Giuseppe Funaro
**Source:** `Ponte_Trade_North_Star_Reset_Master_Claude_Code_Brief.md`, received 25 July 2026
**Base commit at reconciliation:** `4fe880d7c5701b37d97b04542ad3678b69395555`

> This document supersedes all earlier landing, gateway and primary-entry instructions.

Specifically, it supersedes every earlier instruction that:

- defines the landing as four primary routes;
- makes Qualified Opportunities the primary Explore or Find result;
- treats Market Signals as a secondary fallback lane;
- makes voice a primary landing interaction.

Where `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` and this document
disagree about the entry experience, this document wins. The Master
Implementation Brief remains the authority for everything downstream of entry
that this document does not restate: verification, introductions, admin
operations, security, lifecycle and Brand v5.

---

## 1. The North Star

# Ponte Trade
## What's your deal?

The platform has two primary entry journeys, and no others:

1. **Explore the market**
2. **Start a deal**

Everything else is contextual and downstream.

- Check a business is not a primary landing route.
- Investigate an opportunity is not a primary landing route.
- Verification is a professional-participation gate.
- Communication is downstream of verification.
- Monetisation is deferred.
- Business Passport, Transaction Passport and Transaction Readiness remain
  future architecture unless separately approved and implemented.

The core product statement:

> Ponte Trade helps professionals explore what is happening in global
> physical-goods trade or start a deal of their own.

## 2. Who Ponte serves

Professional participants in global physical-goods trade: manufacturers and
OEMs, producers and farmers, importers and buyers, exporters and suppliers,
traders, brokers and commercial intermediaries, distributors and agents,
logistics providers, customs and compliance providers, inspection and
certification providers, finance and insurance providers, and other
trade-enabling service providers.

A user's country or region does not define the journey. The interface must not
assume native-English fluency.

## 3. Product principles

### 3.1 Value before registration

Without an account a visitor may view recent market activity, explore sectors
and subcategories, search products, services, routes, companies and markets,
view public Market Signals, view public requirements, offers and reviewed
opportunities, start building a deal and preview a complete structured draft.

Registration is requested only for a persistent action: save, submit, follow,
investigate, express interest, request an introduction, communicate, disclose
identity.

### 3.2 Never lead with emptiness

Ponte must never answer commercial curiosity with a large empty Qualified
Opportunities state. When no reviewed opportunity exists, show relevant Market
Signals, related requirements or offers, related services, useful market
context, and a direct route to create a related deal.

> No match is not the end of the journey. It is the beginning of Ponte's work.

### 3.3 Market Signals are day-one product content

Market Signals are useful indications of demand, supply, service needs or
commercial activity and are visible from the beginning. They remain truthfully
classified. An unconfirmed Market Signal is never called a Qualified
Opportunity.

This does not weaken the founding-launch separation rule in `AGENTS.md`. The two
record classes stay separate in data, in status, in language and in the actions
they offer. What changes is only the presentation hierarchy: they appear in one
market-activity stream, each item carrying its own true classification, instead
of one lane being emptied out in front of the other.

### 3.4 User language overrides database language

Visitors should understand: explore, source, supply, offer a service, market
activity, requirement, offer, reviewed opportunity, investigate, save, submit.
They must not be made to learn internal objects, status enums or database lanes
before receiving value.

### 3.5 Current product truth overrides future copy

No active interface may promise a capability that is not implemented, enabled,
reachable and complete enough to deliver the stated outcome. Do not promise
Business Passport, Transaction Passport, full verification, complete compliance,
guaranteed counterparties, transaction readiness, or safe or risk-free
transactions.

## 4. Participation and trust model

- **Visitor:** explore, search, browse, view, build a draft.
- **Registered member:** save, retain drafts, submit initial opportunities.
- **Verified participant:** required later for commercial communication,
  controlled introductions, identity disclosure, investigations that consume
  Ponte resources, and active professional exchange.

> Open discovery. Light registration. Verified participation. Controlled
> communication.

Verification is not implemented or priced in this phase.

## 5. Landing page

Required hierarchy, in this order:

1. Global header
2. Prominent recent-market-activity band
3. Ponte Trade
4. "What's your deal?"
5. Two-route bridge
6. Main search field below the bridge
7. Popular or recent areas
8. Trust and evidence explanation
9. Footer

### 5.1 The bridge

The bridge remains the central brand device with exactly two routes.

**01 Explore the market** - See current demand, supply, services and commercial
activity.

**02 Start a deal** - Source a product, supply a product or offer a trade
service.

Clicking either route navigates directly. The bridge must not retain Check a
company, Investigate a signal, four numbered route points, or a route-selection
state that leaves the visitor on the landing page.

### 5.2 Voice is not a primary feature

The large "Click and talk" control is removed: inconsistent browser support,
unreliable performance across accents, poor first-impression risk, and most
users are not native English speakers. Typing and search are the primary
interaction. No invisible layout space remains where it was.

Voice input elsewhere in the product (the Find product picker, the Check
composer, the introduction request) is unaffected: it is an assist inside a
journey, not the front door.

### 5.3 Search field

The search field sits under the bridge. Placeholder: "Search products, markets,
companies or services". It handles broad exploration and specific intent, and a
specific search bypasses the visual category drill-down.

## 6. Recent market activity band

Prominent evidence that Ponte is alive. It may contain buyer requirements,
seller offers, service requirements, distribution opportunities, Market Signals
and Qualified Opportunities where genuinely available. Each item shows its real
classification.

Requirements: real data only, no fake activity, horizontal motion on desktop,
pause on hover and keyboard focus, respects reduced motion, accessible labels
and controls, static or manually scrollable mobile fallback, no claim that every
item is verified, and a click that opens the relevant public detail or filtered
Explore result.

## 7. Explore the market

The first Explore screen is a visual market universe over three families:

1. **Products** - the existing approved HS category system and icons, which
   remain the single source of truth (`components/hs/hsCategories.tsx`).
2. **Trade services**
3. **Distribution and representation**

Each sector container shows its icon, name, number of relevant public market
records, and where reliable a demand/supply/service breakdown. Counts represent
market records, not verified opportunities. Containers must not default to a
generic corporate dashboard-card grid without design justification.

Supported hierarchy:

```text
Explore the market -> Products -> Sector -> Chapter or subcategory -> Product
-> Product market -> Commercial records
```

At every level: search stays available, Back works, URLs are stable and
shareable, counts are shown where reliable, a direct Start a related deal action
is offered, and no registration is required.

Do not invent granular service or distribution categories or counts where the
repository does not support them.

## 8. Product or service market screen

One coherent commercial-activity presentation preserving status distinctions:
Market Signal, Member Requirement, Member Offer, Service Requirement,
Distribution Opportunity, Reviewed Opportunity.

Each record shows type, product or service, geography, quantity or scope where
known, recency, evidence/status classification and a relevant action.

**Empty-state rule:** do not render a large empty Qualified Opportunities lane.
Show reviewed opportunities when they exist; otherwise show available market
activity without presenting absence as the primary message.

Contextual actions where supported: View, Start a related deal, Create a related
offer, Create a related requirement, Ask Ponte to investigate, Check the
business, Save, Express interest. No dead buttons. Actions requiring
registration or verification route to a truthful boundary.

## 9. Start a deal

The first question is not who the user is. It is:

# What do you want to do?

1. **Source a product**
2. **Supply a product**
3. **Offer a trade service**

Organisation type and role are asked later, in relation to the specific deal. A
"Find a market partner" option is not added without separate approval.

The existing Structure composer is the foundation and is reused: progressive
flow, HS product selection, product search, country selection, quantity and
units, Incoterms, payment, frequency, role, preview, save draft, submit,
AccountGate, submission payload and Workspace continuation. It is not rebuilt
unless it cannot safely support the approved design.

## 10. Preview before registration

The visitor sees a complete structured draft before registration, separating
what is public if submitted from what is kept private. Actions: Continue
editing, Save privately, Submit for review. Registration is triggered only by
Save or Submit, through the existing account gate and resumption behaviour.

## 11. Verification and communication (future, downstream)

Not implemented in the entry phase. A user may register lightly and submit an
opportunity. Verification is required before communicating with another
participant, requesting a controlled introduction, seeing protected counterparty
identity, asking Ponte to spend resources on an investigation, or engaging
professionally in an active deal. Pricing, credits and monetisation are
deferred.

## 12. Data, security and performance constraints

Real public data only. No private records exposed. No RLS weakening. No
migrations in the entry phase. No unbounded per-category query on each render.
No thousands of records on the landing or universe screen. Counts aggregated
server-side. Result lists paginated or progressively loaded. No N+1 access.
Stable ordering. Data-quality limitations documented.

## 13. Accessibility and responsive requirements

Real buttons or links for all interactions. No SVG-only interaction. Visible
keyboard focus. Text labels with icons. Colour never carries meaning alone.
`prefers-reduced-motion` respected. Moving content pauses on hover and focus. No
horizontal overflow. Mobile widths tested. Browser Back preserved. Counts and
statuses carry meaningful accessible labels.

## 14. Copy rules

Approved current phrases: Ponte Trade; What's your deal?; Explore the market;
Start a deal; Source a product; Supply a product; Offer a trade service; Market
activity; Market Signal; Member Requirement; Member Offer; Service Requirement;
Reviewed Opportunity; Start a related deal; Save privately; Submit for review.

Active copy must not promise: Business Passport; Transaction Passport; fully
verified; complete compliance; trusted company; safe counterparty; transaction
ready; guaranteed deal; authenticated documents unless the exact process
supports the claim.

## 15. Design authority

The current Ponte Trade Brand Book is the visual authority. No new corporate
identity. New elements (two-point bridge, activity band, sector universe,
category containers, mixed record presentation, Start a Deal controls) are
derived from the existing typography, spacing, colour, icon and motion rules,
with the design decision documented in the pull request. Avoid generic SaaS
cards and unrelated visual redesign.

## 16. Implementation sequence

Each phase is a focused pull request that stops before merge for owner review.

- **PR 1 - North Star landing and entry shell.** North Star authority document,
  recent-market-activity band, two-route bridge, direct navigation, removal of
  voice, search below the bridge, popular or recent areas, trust explanation,
  desktop and mobile, direct Start a Deal link into the existing Structure
  composer, initial Explore route shell.
- **PR 2 - Explore universe and drill-down.** Products, Trade Services,
  Distribution and Representation; visual category universe; real category
  counts; sector and subcategory drill-down; stable URLs; search bypass;
  pagination or progressive loading; mobile and accessibility.
- **PR 3 - Market activity presentation.** Unified market-activity screen;
  Market Signals visible immediately; reviewed opportunities when available; no
  empty QO-first experience; filters; contextual Start a related deal; truthful
  status labels.
- **PR 4 - Start a Deal refinement.** Source, Supply, Service; visual icon-led
  controls; missing duration and commercial terms; service-specific refinement;
  preview before registration; current submission and account-gate behaviour.

Verification, communication and monetisation do not begin until separately
approved.

## 17. Non-negotiable exclusions

Do not merge without owner review; deploy production; change production flags;
add monetisation, paid verification, credits or tokens; add communication; add
investigation execution; create Business Passport, Transaction Passport or
Transaction Cases; add trust scores; add migrations; redesign the entire app;
rebuild working foundations without proof; or expand a phase into all future
phases.

---

## Appendix A - PR 1 as implemented

Recorded on implementation so the next reader does not have to infer it from the
diff.

**Reuse (unchanged, depended upon):**

- `lib/board/live-deals.ts`, `lib/board/market-signals.ts` and
  `lib/market-signals/logic.ts` for public, rule-filtered records.
- `components/hs/hsCategories.tsx` (`HS_CATEGORIES`) for sector names, icons and
  chapter ranges.
- `lib/landing/intent.ts`, `interpret.ts`, `routing.ts` and the
  `/api/landing/interpret` endpoint for search interpretation.
- `components/structure/StructureComposer.tsx`, the marketplace submission
  endpoint, `AccountGate` and Workspace continuation.
- `PonteFooter`, `ChromeGate`, the landing font stack and the Brand v5
  heritage-light token block in `landing.css`.

**Adapt:**

- `components/home/landing/PonteLanding.tsx`: North Star hierarchy, no voice, no
  landing-resident route selection state.
- `components/home/landing/PonteBridge.tsx`: two routes, two markers.
- `components/structure/StructureComposer.tsx` S01 copy: Source a product,
  Supply a product, Offer a trade service. The `Intent` values
  (`requirement` / `offer` / `service`) and the submission payload are unchanged.
- `landing.css`: activity band, two-route bridge geometry, search, popular
  areas.

**Replace:**

- The four-route bridge and its per-route fact strip.
- The oversized voice control and `VoiceSheet` on the landing (deleted, along
  with the `voice*` landing analytics events that only it emitted).
- The landing's "four ways to begin" copy.

**New:**

- `lib/board/market-activity.ts` - one truthfully classified public activity
  feed built from the two existing readers.
- `lib/explore/families.ts` - the three families and server-side sector counts.
- `lib/landing/bridge.ts` - the two bridge routes and their destinations.
- `components/home/landing/ActivityBand.tsx`.
- `components/explore/*` and `app/[locale]/explore/page.tsx`.

**Deliberately deferred to PR 2 and PR 3:**

- Chapter, subcategory and product drill-down below a sector.
- Filters, pagination and progressive loading on market-activity lists.
- The `Reviewed Opportunity` and `Distribution Opportunity` classifications:
  the repository has no field that distinguishes them today, so PR 1 classifies
  member records by their actual type (`Member Requirement`, `Member Offer`,
  `Service Requirement`) rather than asserting a review class it cannot prove.
- Rewriting `/find` to the market-activity hierarchy.

**Recorded data-quality limitations:**

- Sector and family counts are computed from the most recent public records read
  per request, capped (see `lib/explore/families.ts`). Where the cap is reached
  the count is a floor, and the surface says so rather than implying an exact
  total.
- `desk_radar` carries no service or distribution classification, so Trade
  services counts come from member service records only, and Distribution and
  representation carries no count at all.
