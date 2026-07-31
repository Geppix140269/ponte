# Feature flags

**Reconciled:** 25 July 2026

| Flag | Code behaviour | Default when absent | Production value | Safe disable |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIND_JOURNEY` | **Governs no destination since Issue #130 cutover PR 5.** The gateway Find intent opens `/find` in every flag state. Its fallback was the obsidian `/marketplace` board, which is retired and is now a permanent 308 to `/find` | Irrelevant | Irrelevant: `lib/landing/routing.ts` no longer reads it | **None, and none is needed.** There is no earlier surface to fall back to; a change to the Find journey is a change to `/find`. |
| `NEXT_PUBLIC_STRUCTURE_JOURNEY` | **Governs no destination since Issue #130 cutover PR 3.** A Structure intent opens `/structure` in every flag state. Its fallback was `/marketplace/new?type=requirement`, itself a redirect to `/structure` since LB-013, so the flag chose between arriving directly and arriving through a hop that discarded the member's captured intent, product and company | Irrelevant | Irrelevant: `lib/landing/routing.ts` no longer reads it, so whichever value the deployment host holds, behaviour is identical. **No production flag change was needed to complete the cutover** | **None, and none is needed.** There is no earlier composer to fall back to; a change to the Structure journey is a change to `/structure`. |
| `NEXT_PUBLIC_CHECK_JOURNEY` | `on` routes a Check intent to `/check`; otherwise to `/verify?for=counterparty` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; the counterparty handoff returns to `/verify`. |
| `NEXT_PUBLIC_DEAL_ROOM` | `on` exposes the `/deal-rooms` routes; anything else and every one of them answers 404 | Off | **Not set. The slice has never been activated in production.** | Unset it and redeploy. Nothing else changes: see below. |
| `DEAL_ROOM_ALLOWLIST` | Server-only. Comma-separated organisation or profile ids permitted to reach the Deal Room. Empty or absent means **nobody** | Nobody | Not set | Clear it and redeploy. |
| `DEAL_ROOM_BILLING` | Server-only. `on` is one of **four** conditions `chargingEnabled()` requires before Ponte may create a Deal Room charge; see below | **Off** | **Not set. Ponte has never taken a Deal Room payment** | Unset it. No charge can be created, and nothing else changes: no surface reads it. |

## The charging gate needs four things, and has none of them

`lib/deal-room/charging.ts` will not create a charge unless **all four** hold:

1. `DEAL_ROOM_BILLING === "on"` — the charging switch;
2. `NEXT_PUBLIC_DEAL_ROOM === "on"` — billing for a product nobody can reach is a
   contradiction, so this makes it an impossible one;
3. `STRIPE_SECRET_KEY` present;
4. `STRIPE_WEBHOOK_SECRET` present.

The fourth gates **checkout**, not only fulfilment, and that is deliberate: a
charge that could not be verifiably confirmed must never be started. Gating
checkout on the secret key alone would trade a member's money for a log line.

`DEAL_ROOM_BILLING` has **no** `NEXT_PUBLIC_` prefix, so unlike the Deal Room
routing flag it is never inlined into the browser bundle and cannot be read or
set by a client. Anything other than exactly `on` is off.

Setting any of these is an owner action under authority §20 and Stage 9 of
`docs/plans/active/deal-room-transaction-pricing.md`. Note that turning all four
on would still charge nobody today: the tables the billing records need are in
`20260731e`, which is **written and not applied**, and no route calls the
charging module at all.

## The Deal Room flag is a routing control, not a security boundary

`NEXT_PUBLIC_DEAL_ROOM` is a `NEXT_PUBLIC_*` variable, so its value is inlined
into the client bundle and readable by anyone. It decides whether the routes
exist for a visitor and nothing else.

Row Level Security is the boundary. Turning the flag on for the wrong person
shows them an empty portfolio, because every Deal Room policy returns zero rows
to a non-participant. That is the property that makes a public flag safe here.

`DEAL_ROOM_ALLOWLIST` has no `NEXT_PUBLIC_` prefix, is never shipped to the
browser, and is checked in every Deal Room server route and command handler. It
is a staged-rollout control: an allowlisted member still sees only their own
rooms.

**Safe disable.** Turning `NEXT_PUBLIC_DEAL_ROOM` off removes the slice and
regresses nothing, by construction rather than by care: the Deal Room adds only
new routes and new `deal_room_*` tables, and alters no existing table, column,
policy, route or journey. With the flag off there is nothing left of it but rows
nobody can reach. Existing Deals and every upstream journey behave identically
either way.

The flags are evaluated at build time because they are `NEXT_PUBLIC_*` variables. Changing them requires a new deployment.

**Updated 31 July 2026.** Production moved from Netlify to Vercel
(`docs/operations/OPERATIONS_LOG.md`). The build-time rule is unchanged - it is a
property of `NEXT_PUBLIC_*` in Next, not of the host - but two things around it
are. The dashboard the values live in is now Vercel's, and **a push no longer
triggers a build on its own**: deployment is explicitly controlled and
owner-held until the Vercel procedure is confirmed. So "set it and redeploy" in
this table now means two separate acts, and the second is not automatic.

"Unknown - must be checked in the deployment host" was already the honest answer
for the production value of three of these flags. It still is, and the host it
refers to has changed.

They govern the entrance's interpreted searches, and the Start a deal bridge route, through `destinationFor` in `lib/landing/routing.ts`, which remains the only place a destination is decided. `lib/landing/bridge.ts` maps the two North Star routes onto it and adds no flag of its own.

`/explore` has no flag. It is a new public route with no legacy seam to fall back to, and nothing behind it that a flag could safely disable; removing it would mean removing the Explore entrance itself.

Recorded 25 July 2026: `NEXT_PUBLIC_CHECK_JOURNEY` was already read by `lib/landing/routing.ts` but was missing from this table. Documented here rather than changed.

Do not describe Find or Structure as live until the production values and deployed routes have been checked directly.
