# Feature flags

**Reconciled:** 25 July 2026

| Flag | Code behaviour | Default when absent | Production value | Safe disable |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIND_JOURNEY` | **Governs no destination since Issue #130 cutover PR 5.** The gateway Find intent opens `/find` in every flag state. Its fallback was the obsidian `/marketplace` board, which is retired and is now a permanent 308 to `/find` | Irrelevant | Irrelevant: `lib/landing/routing.ts` no longer reads it | **None, and none is needed.** There is no earlier surface to fall back to; a change to the Find journey is a change to `/find`. |
| `NEXT_PUBLIC_STRUCTURE_JOURNEY` | `on` routes Structure to `/structure`; otherwise to `/marketplace/new?type=requirement` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; gateway returns to the legacy seam. |
| `NEXT_PUBLIC_CHECK_JOURNEY` | `on` routes a Check intent to `/check`; otherwise to `/verify?for=counterparty` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; the counterparty handoff returns to `/verify`. |
| `NEXT_PUBLIC_DEAL_ROOM` | `on` exposes the `/deal-rooms` routes; anything else and every one of them answers 404 | Off | **Not set. The slice has never been activated in production.** | Unset it and redeploy. Nothing else changes: see below. |
| `DEAL_ROOM_ALLOWLIST` | Server-only. Comma-separated organisation or profile ids permitted to reach the Deal Room. Empty or absent means **nobody** | Nobody | Not set | Clear it and redeploy. |

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

They govern the entrance's interpreted searches, and the Start a deal bridge route, through `destinationFor` in `lib/landing/routing.ts`, which remains the only place a destination is decided. `lib/landing/bridge.ts` maps the two North Star routes onto it and adds no flag of its own.

`/explore` has no flag. It is a new public route with no legacy seam to fall back to, and nothing behind it that a flag could safely disable; removing it would mean removing the Explore entrance itself.

Recorded 25 July 2026: `NEXT_PUBLIC_CHECK_JOURNEY` was already read by `lib/landing/routing.ts` but was missing from this table. Documented here rather than changed.

Do not describe Find or Structure as live until the production values and deployed routes have been checked directly.
