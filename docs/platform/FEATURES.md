# Features

What the product does today. Update when behaviour changes, not when code
moves.

## The commercial model

The marketplace is **free**: post, get vetted, connect. There are no listing
fees, no subscription to browse, and no commission on a deal the members close
themselves.

| Line | Price | What it is |
|---|---|---|
| Marketplace | Free | Post, vetting, anonymous matching, direct connect |
| Ponte AI | $19 per month, or $190 per year | Unlimited listing checks, AI account manager, match alerts |
| The desk, per deal | Success fee | Deal managed end to end. Percentage agreed in writing, due on closing. |
| The desk, retained | Monthly retainer | Standing sourcing or selling mandate |

This is the current model and it supersedes earlier ones. Do not reintroduce
the report shop, per report pricing, or subscription tiers for access.

## Marketplace

- Three listing kinds: an offer, a requirement, and a service.
- A stepped listing form: the product, the terms, photos and files, then a
  preview of exactly how it will appear on the board.
- Guests can build and preview a listing without an account. Sign in happens
  only at publish.
- Drafts survive the sign in trip, except photos, which must be re-attached.
- Nothing goes live until the desk approves it.
- Members stay anonymous until both sides agree to connect. Connecting is free.
- The board shows a live listing count only once there are enough listings to
  be worth stating. No invented numbers, no fake activity.
- Listings can be shared to WhatsApp with a short reference such as `PT-1234`.

## Vetting

- An AI co-pilot reviews every submission and scores it for the desk.
- A human approves or rejects. The AI does not publish anything on its own.
- Listings record who is submitting and how close they are to the goods, so a
  producer and an intermediary are not presented as the same thing.

## Ponte AI

- Free listing checks up to a limit, then $19 per month for unlimited.
- Scores and coaches a listing before it goes live.
- An account manager brief that reads the account and suggests the next move.

## Languages

Ten interface languages: English, Chinese, Spanish, Arabic, French,
Portuguese, Russian, German, Hindi, Italian. Arabic renders right to left.

Listing content is translated separately from the interface, through the
`listing_translations` table, and surfaced by the "Read in" bar on a listing.
On a prefixed URL that bar opens in the reader's language when a translation
already exists. These are two different systems and should stay that way.

Terms and Privacy are English only, deliberately: a translated contract would
be a second, unreviewed instrument. Admin is English only.

## Accounts

- Sign in by magic link or Google. No passwords.
- Signing in creates the account. There is no separate registration.
- Profile roles are locked against self promotion to admin.

## The desk and advisory

- An analyst desk for scoped questions, priced by engagement.
- Introductions are papered under NCNDA before they happen.
- Ponte acts as broker and intermediary, never as principal.

## Admin

Internal, English only. Listing vetting queue, users, and the legacy order and
product screens from the retired shop, which are still present in the tree.

## Retired, do not revive

- The report shop: catalogue, categories, product pages, cart, checkout. All
  now permanent redirects.
- The Deal Sheet as a separate page. It folded into the Marketplace under a
  single door. The digest mechanism itself is kept for alerts.
- Per report pricing and any subscription tier for access to the board.
