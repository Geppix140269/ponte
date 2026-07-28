# Ponte Trade Post-Launch Backlog

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical index of useful work that does not prevent safe launch. Detailed implementation discussion may live in GitHub issues, but every deferred item discovered during Launch Mode must also be indexed here.

Post-launch work must not be implemented during an unrelated launch task unless the repository owner explicitly promotes it to a Launch Blocker or separately authorises it.

## Open tickets

| ID | Title | Category | Discovered | Source task or audit | Problem and evidence | Recommended action | Risk if deferred | GitHub issue | Status |
|---|---|---|---|---|---|---|---|---|---|
| PL-001 | Supabase Preview integration points to an unavailable project | DevOps | 2026-07-28 | Production migration reconciliation | Preview check is misconfigured and permanently red; it is not a production gate | Disable until an owned non-production project is reproducible | Low for launch; creates misleading CI noise | #87 | Open |
| PL-002 | Reproducible non-production database baseline | Infrastructure | 2026-07-28 | Production migration reconciliation | Repository cannot currently reproduce all retained production schema dependencies | Classify and baseline retained objects without a wholesale production dump | Medium; local development remains constrained | #84 | Open |
| PL-003 | Retire or replace broken `match_hs_codes` function | Data architecture | 2026-07-28 | Schema baseline classification | Function references absent objects and is unused | Remove through a separately reviewed migration after launch | Low; dead production object remains | — | Open |

## Completed tickets

Move completed items here and preserve the original ID.

| ID | Title | Completed | Resolution PR or issue | Verification |
|---|---|---|---|---|
| — | None recorded | — | — | — |

## Rules

- Use sequential IDs: `PL-001`, `PL-002`, and so on.
- Do not delete deferred work because it is inconvenient or old; close it with evidence.
- A GitHub issue does not replace this index.
- When a ticket is promoted to a Launch Blocker, record the owner decision and move it to `LAUNCH-BLOCKERS.md`.
- Architecture, cleanup, refactoring, additional guards, hypothetical hardening and future capability default here unless they meet the blocker definition.
