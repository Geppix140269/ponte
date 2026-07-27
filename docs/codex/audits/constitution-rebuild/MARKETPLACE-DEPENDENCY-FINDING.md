# `/marketplace` — dependency finding

**Status:** Investigation complete. **Escalated to the owner.** Nothing removed.
**Requested by:** Owner ruling 2, Phase 2 foundation instruction.
**Authority:** ADR-0010 leaves the retire-or-rebuild decision explicitly open.

The instruction presumed `/marketplace` to be a legacy route to retire rather
than redesign, and asked for that presumption to be checked before any exclusion.

**It does not hold.** The routes carry at least three functions that exist
nowhere else in the product, and one of the three is half of a two-sided flow
whose other half is already live on `/workspace`. Retiring the pages as they
stand would remove a capability, not just a visual treatment.

---

## 1. What was checked

Four questions, per the instruction.

### 1.1 Does it provide a unique authoritative function?

**Yes. Three of them.**

| Function | Where | Covered elsewhere? |
|---|---|---|
| **Owner decision on an inbound introduction** — accept or decline an interest expression against a listing you own (`connectDecisionAction`, writes `listing_connections`) | `app/[locale]/marketplace/actions.ts:122` | **No.** `/workspace` reads `listing_connections` filtered by `requester_id` — the *outbound* side, the requests this member has sent. The **owner's side of the same relation has no other surface.** |
| **Listing reconfirmation** — the member's periodic confirmation that a listing is still live (`reconfirmListingAction`, writes `reconfirmed_at` / `valid_until`) | `actions.ts:63` | **No.** `lib/listings/validity.ts` (`isPubliclyCurrent`, `reconfirmationLapsed`) gates public visibility on this. Admin can set it; the member can only do it here. |
| **Account brief** — the AI vet summary across a member's listings (`account_briefs`, `lib/ai-vet.ts`) | `marketplace/page.tsx:196` | **No.** Read and written on this page only. |

The reconfirmation finding is the sharpest. A listing whose reconfirmation lapses
drops out of public circulation, and this page is the only place a member can
prevent that. Retiring it without a replacement would let listings silently
expire with no member-facing way to keep them alive.

### 1.2 Does it expose unique data?

**Yes.** Tables and columns reached by no other user-facing route:

- `account_briefs` — this page and `lib/ai-vet.ts` only.
- `listing_translations` — `/marketplace/l/[ref]` and `lib/ai-vet.ts` only.
- `listing_media` (images) — rendered to members only at `/marketplace/l/[ref]`; otherwise admin-only and the submit API.
- `listing_connections` **owner side** — `interest_role`, `interest_target`, `interest_geography`, `interest_reason` are read for the listing owner here alone.

### 1.3 Inbound links and redirects

No redirects. **13 inbound links** from 11 files, several of them primary calls
to action:

| Source | Target |
|---|---|
| `app/manifest.ts` | PWA shortcuts to `/marketplace` and `/marketplace/new` |
| `app/sitemap.ts` | `/marketplace`, priority 0.9, weekly |
| `components/BottomNav.tsx` | two of the five mobile navigation slots |
| `app/[locale]/find/page.tsx` | "post an opportunity" secondary action |
| `components/find/FindChrome.tsx` | `/marketplace/new` in the Find nav |
| `app/[locale]/pricing/page.tsx` | the free-tier call to action |
| `account`, `contact`, `join`, `learn/duties`, `learn/trade-data`, `LiveDealsGrid`, `SiteFooter` | "Go to the marketplace" |

`app/[locale]/admin/listings/actions.ts:151` calls `revalidatePath("/marketplace")`,
so the admin approval flow assumes the route exists.

### 1.4 Is it covered by Market Signals, Member Opportunities, Start a Deal, Find or Workspace?

**Partly, and the uncovered part is the important part.**

| `/marketplace` does | Covered by |
|---|---|
| Browse approved listings | Find, Market Signals |
| Submit a listing | Start a Deal (`/structure`) |
| See your own listings and their status | `/opportunities` |
| Express interest in a listing | Find (`RequestIntroduction`) |
| **Decide on interest in YOUR listing** | **nothing** |
| **Reconfirm your listing is still live** | **nothing** |
| **Read your account brief** | **nothing** |

## 2. The API namespace is not the pages

`/api/marketplace/*` is shared infrastructure and is **not** part of any
retirement question:

| Endpoint | Called by |
|---|---|
| `/api/marketplace/submit` | **`StructureComposer` (Start a Deal)** and `ListingForm` |
| `/api/marketplace/interest` | **`RequestIntroduction` (Find)** and `InterestButton` |
| `/api/marketplace/assess` | `ListingForm` |

Start a Deal — the journey meant to replace listing composition — posts to
`/api/marketplace/submit`. The name is legacy; the endpoint is current and
load-bearing. Any future work must separate "retire the `/marketplace` **pages**"
from "retire the `/marketplace` **API**". Only the first is even arguable.

## 3. Finding

`/marketplace` is legacy **chrome** wrapped around **three current functions**.
Per the owner's instruction, a genuinely unique function exists, so this is
escalated rather than closed.

The design question is therefore not "retire or rebuild" but a product question
that has to be answered first:

> Where do the owner-side connection decision, listing reconfirmation and account
> brief live once `/marketplace` is gone?

Three shapes, offered as options rather than a recommendation, since this is a
product decision:

1. **Rebuild in place.** Lowest risk, keeps 13 inbound links working, but spends
   a full journey slice on chrome the product may not want.
2. **Redistribute, then retire.** Connection decisions and reconfirmation move to
   `/opportunities` (which already lists the member's own records and is already
   on the Desk); the account brief moves to `/account`. `/marketplace` becomes a
   redirect. Most work, best end state.
3. **Retire the browse surface only.** Keep `/marketplace/l/[ref]` as the public
   listing detail, move the three member functions to `/opportunities`, drop the
   board. Middle path.

Option 2 looks the strongest on the evidence, because `/opportunities` already
owns "the member's own records" and already renders on the target system. It is
not taken here.

**Nothing was removed, excluded or redirected by this PR**, as instructed.
