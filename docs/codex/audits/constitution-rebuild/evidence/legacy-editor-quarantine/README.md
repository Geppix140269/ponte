# LB-013 — Legacy listing-editor quarantine: route and link audit

**Date:** 30 July 2026
**Branch:** `claude/remove-legacy-ponte-routes-342bdc`
**Blocker:** `docs/launch/LAUNCH-BLOCKERS.md` LB-013

## The failure

A live transactional email, `listing_needs_information` ("Complete your Ponte
requirement to publish it"), rendered a CTA "Complete your listing" pointing at:

```
https://ponte.trade/marketplace/new?id=<listing-uuid>
```

`app/[locale]/marketplace/new/page.tsx` rendered the legacy obsidian `ListingForm`
and read `searchParams.edit` — **not** `id`. So the CTA both (a) sent the member
into a deprecated application (lowercase `ponte.` identity, legacy
Marketplace/Fees navigation, dark `ListingForm`) and (b) opened a **blank new
form** rather than the saved listing named in the email.

## Canonical resume mechanism (already existed)

`/structure?edit=<uuid>` — `app/[locale]/structure/page.tsx` reads
`searchParams.edit`, loads the member's own row (`user_id` + RLS), and rebuilds a
family-correct draft via `lib/structure/resume.ts` (`draftFromRow`), which throws
on an unknown family rather than silently resuming as a product. `/structure` is a
route in every deployment; the `NEXT_PUBLIC_STRUCTURE_JOURNEY` flag governs only
the landing seam, not the route's existence. **No data-contract change was
required**, so the primary stop condition did not trigger.

## What changed

| Area | File | Before | After |
|---|---|---|---|
| Email edit CTA | `lib/email/templates.ts` `editLink` | `/marketplace/new?id=<id>` | `/structure?edit=<id>` |
| Editor page | `app/[locale]/marketplace/new/page.tsx` | renders `ListingForm` | redirect via `legacyNewListingTarget` |
| Redirect contract | `lib/marketplace/legacy-redirect.ts` (new) | — | pure `id`/`edit`/none/malformed rules |
| PWA shortcut | `app/manifest.ts` | `/marketplace/new?source=pwa` | `/structure?source=pwa` |
| Mobile nav "Post" | `components/BottomNav.tsx` | `/marketplace/new` | `/structure` |
| Find nav submit | `components/find/FindChrome.tsx` | `/marketplace/new` | `/structure` |
| Pricing CTA | `app/[locale]/pricing/page.tsx` | `/marketplace/new` | `/structure` |
| Find empty-state | `app/[locale]/find/page.tsx` | `/marketplace/new` | `/structure` |
| Board CTAs + edit | `app/[locale]/marketplace/page.tsx` (×5) | `/marketplace/new[?edit=]` | `/structure[?edit=]` |
| Listing-detail CTA | `app/[locale]/marketplace/l/[ref]/page.tsx` | `/marketplace/new` | `/structure` |

## Redirect contract (`legacyNewListingTarget`)

| Input | Redirect (temporary, 307) |
|---|---|
| `?id=<valid uuid>` (the email's parameter) | `/structure?edit=<uuid>` |
| `?edit=<valid uuid>` | `/structure?edit=<uuid>` |
| both valid | `/structure?edit=<edit-uuid>` (edit wins) |
| none | `/structure` |
| malformed / repeated / empty id | `/structure` (discarded, not forwarded) |
| unknown params (`type`, `source`, `restore`) | discarded — a legacy `type` is **not** mapped to a family, to avoid silent misclassification |

Ownership and record existence fail closed **downstream** at `/structure`
(`loadDraft`: `user_id` match + RLS + null-on-error), so the redirect forwards
only a well-formed id and never leaks another member's draft.

## Reachable-surface audit

Every generated link to the retired editor, by originating action, with its
correction. "Chrome" = the shell the destination now renders in.

| Originating action | Old destination | New destination | Constitutional chrome | Correction |
|---|---|---|---|---|
| Email: "Complete your listing" (`listing_needs_information`) | `/marketplace/new?id=` | `/structure?edit=` | yes (`/structure` bared) | editLink |
| Email: "Improve your listing" (`listing_published`) | `/marketplace/new?id=` | `/structure?edit=` | yes | editLink |
| Email: "Open your listing" (`listing_suspended`) | `/marketplace/new?id=` | `/structure?edit=` | yes | editLink |
| Email: "Edit your listing" (`listing_rejected`) | `/marketplace/new?id=` | `/structure?edit=` | yes | editLink |
| Email: "Extend this listing" (`listing_expiring`) | `/marketplace/new?id=` | `/structure?edit=` | yes | editLink |
| Email verification-only CTA (`listing_needs_information` route=verification) | `/verify?for=business` | unchanged | yes | none needed |
| PWA "Post" shortcut | `/marketplace/new?source=pwa` | `/structure` | yes | repointed |
| Mobile BottomNav "Post" | `/marketplace/new` | `/structure` | yes | repointed |
| Find chrome "submit" | `/marketplace/new` | `/structure` | yes | repointed |
| Pricing free-tier CTA | `/marketplace/new` | `/structure` | yes | repointed |
| Find qualified empty-state | `/marketplace/new` | `/structure` | yes | repointed |
| Marketplace board: new / sign-in-to-new / mine-new / start CTA | `/marketplace/new`, `/login?next=/marketplace/new` | `/structure`, `/login?next=/structure` | yes | repointed |
| Marketplace board: per-listing "Edit" | `/marketplace/new?edit=<id>` | `/structure?edit=<id>` | yes | repointed |
| Public listing-detail "post" link | `/marketplace/new` | `/structure` | yes | repointed |
| Landing "Structure" intent, flag OFF (`lib/landing/routing.ts`) | `/marketplace/new?type=requirement` | unchanged; rides the quarantine redirect to `/structure` | yes (via redirect) | left by design (flag safe-disable, pinned by tests) |
| Any old external `/marketplace/new` bookmark or already-sent email | `/marketplace/new[?id=/edit=]` | redirect to `/structure[?edit=]` | yes | quarantine redirect |

## Deliberately NOT changed (out of scope, logged)

- **Five email links to the `/marketplace` board** (`route("/marketplace")` in
  `listing_published`, `listing_flagged_member`, `listing_expiring`,
  `connection_requested`, `connection_accepted`). The board renders in legacy
  chrome but carries three unique member functions with no approved
  constitutional home (`MARKETPLACE-DEPENDENCY-FINDING.md`), a stop condition.
  Logged as **PL-029**.
- **`components/ListingForm.tsx`** — now unreachable dead code; its physical
  removal is **PL-030**. Pinned in the `check-governance.mjs` route-audit baseline
  until removed.

## Tests added

- `lib/email/__tests__/email-system.test.ts` — every editor CTA resolves to
  `/structure?edit=<uuid>` carrying the id; no rendered email anywhere contains
  `/marketplace/new`; verification-only and mixed-route cases.
- `lib/marketplace/__tests__/legacy-redirect.test.ts` — the redirect contract
  (id, edit, both, none, malformed, repeated, empty).
- `lib/structure/__tests__/resume.test.ts` (pre-existing) — Products, Trade
  services and Distribution resume family-correct; unknown family fails closed.
- `scripts/check-governance.mjs` — LB-013 route-audit ratchet.

## Verification

`npm run verify` passes end to end. In this git worktree `check-deps` reports the
declared packages "not installed" because it checks the worktree-local
`node_modules`, which does not exist — a worktree resolves modules by walking up
to `C:/dev/ponte/node_modules`. This is an environment artefact identical on a
clean `origin/main` (this branch changes no dependency; the only `package.json`
edit is one test-script entry). The gate was run with the worktree `node_modules`
junctioned to the parent to exercise the full chain including `next build`.

## Rendered evidence

**Live redirect verification (captured against the running dev server):**
`live-redirect-verification.json` in this folder. Run against `next dev` on port
51520, it records the browser's own resolution of five legacy-editor URLs — the
LB-013 defect URL `/marketplace/new?id=<uuid>` and four variants — every one of
which `redirected: true` to `/structure` (with `?edit=<uuid>` preserved for a
valid id). The destination page served `<title>` **"Start a deal | Ponte Trade"**
and `<h1>` **"Tell Ponte what you supply, in your own words."** — the
constitutional Structure composer with the title-case wordmark, not the obsidian
`ListingForm`, whose own heading is no longer served because the route is a
redirect stub. `next build` corroborates: `/[locale]/marketplace/new` is 198 B.

**Pixel frames (desktop 1280×800 / mobile 390×844) — deferred.** Not captured in
this session: the in-app browser pane did not composite frames, and Chrome blocks
embedded credentials in a main-frame navigation to the Basic-auth-gated local
site, so a rendered screenshot could not be taken without weakening the site gate
(an explicit stop condition). A screenshot of a *real* saved record resuming
additionally needs a signed-in member with a draft against the production
database. Both are folded into the post-deploy production verification, where the
reviewer views the authenticated deploy preview directly. Recorded as outstanding
in `docs/launch/LAUNCH-BLOCKERS.md` LB-013.
