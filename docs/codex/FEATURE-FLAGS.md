# Feature flags

**Reconciled:** 25 July 2026

| Flag | Code behaviour | Default when absent | Production value | Safe disable |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIND_JOURNEY` | `on` routes the gateway Find intent to `/find`; otherwise to `/marketplace` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; gateway returns to the legacy seam. |
| `NEXT_PUBLIC_STRUCTURE_JOURNEY` | `on` routes Structure to `/structure`; otherwise to `/marketplace/new?type=requirement` | Off | Unknown — must be checked in the deployment host | Set to anything other than `on` and redeploy; gateway returns to the legacy seam. |

The flags are evaluated at build time because they are `NEXT_PUBLIC_*` variables. Changing them requires a new deployment.

Do not describe Find or Structure as live until the production values and deployed routes have been checked directly.
