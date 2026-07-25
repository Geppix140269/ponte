# Feature flags

**Reconciled:** 25 July 2026

| Flag | Code behaviour | Default when absent | Production value | Safe disable |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIND_JOURNEY` | `on` routes the gateway Find intent to `/find`; otherwise to `/marketplace` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; gateway returns to the legacy seam. |
| `NEXT_PUBLIC_STRUCTURE_JOURNEY` | `on` routes Structure to `/structure`; otherwise to `/marketplace/new?type=requirement` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; gateway returns to the legacy seam. |
| `NEXT_PUBLIC_CHECK_JOURNEY` | `on` routes a Check intent to `/check`; otherwise to `/verify?for=counterparty` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; the counterparty handoff returns to `/verify`. |

The flags are evaluated at build time because they are `NEXT_PUBLIC_*` variables. Changing them requires a new deployment.

They govern the entrance's interpreted searches, and the Start a deal bridge route, through `destinationFor` in `lib/landing/routing.ts`, which remains the only place a destination is decided. `lib/landing/bridge.ts` maps the two North Star routes onto it and adds no flag of its own.

`/explore` has no flag. It is a new public route with no legacy seam to fall back to, and nothing behind it that a flag could safely disable; removing it would mean removing the Explore entrance itself.

Recorded 25 July 2026: `NEXT_PUBLIC_CHECK_JOURNEY` was already read by `lib/landing/routing.ts` but was missing from this table. Documented here rather than changed.

Do not describe Find or Structure as live until the production values and deployed routes have been checked directly.
