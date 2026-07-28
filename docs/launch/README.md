# Launch Mode workflow

Ponte Trade is operating in Launch Mode until the repository owner explicitly closes it.

The governing policy is in `AGENTS.md`. These files are the operational registers:

- `LAUNCH-BLOCKERS.md` — only issues that prevent safe launch.
- `POST-LAUNCH-BACKLOG.md` — all useful but non-blocking work deferred until after launch.
- `docs/operations/OPERATIONS_LOG.md` — verified production and material operating changes.

## Mandatory decision rule

Ask:

> Does this stop a real user from safely completing a core Ponte Trade journey before launch, prevent production deployment, or create an immediate material security, data-integrity or compliance risk?

- **Yes:** propose or record a Launch Blocker and implement only the minimum fix.
- **No:** record a Post-Launch Ticket and continue the authorised task.
- **Uncertain:** default to Post-Launch and request owner reclassification only if necessary.

## Required task opening

Every implementation task must state:

- authorised objective;
- classification: planned launch work or Launch Blocker;
- expected systems or files;
- explicit exclusions.

## Required task closing

Every task report and pull request must include:

- Delivered;
- Launch Blockers discovered;
- Post-Launch Tickets created or updated;
- Production changes;
- Scope confirmation.

Use `None` explicitly when a section has no entries.

## Prohibited behaviour

Discovery is not approval. Do not create an implementation branch, edit adjacent code, add migrations, add unrelated tests, refactor, or expand a pull request for a non-blocking discovery. Log it and return to the authorised objective.
