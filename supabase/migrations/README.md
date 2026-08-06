# supabase/migrations

**This folder is empty, and that is the point.**

It holds migrations written **after** the genesis snapshot, and there are none
yet. Anything here is on the apply path.

## Where everything went

`WO-8`, executing `docs/plans/active/migration-chain-reconciliation.md`
(written 26 July, status *proposed, not started*) with the five updates in that
work order's section 3.

| Folder | What is in it | On the apply path? |
| --- | --- | --- |
| `schema-snapshots/` | **The genesis.** A schema-only dump of production's `public` schema, 1 August 2026. | It **is** the starting point |
| `migrations/` | Files written after the genesis | **Yes** |
| `pending/` | Written, reviewed, deliberately **not** applied | **No, and must never be** |
| `archive/` | The 53 files applied to production before the genesis | **No.** History, not replayable steps |
| `deprecated/` | Superseded, must never reappear | **No** |

## Why the chain now starts from a snapshot

The migration history cannot rebuild this database. Two independent reasons,
both established from production's own catalogue by the WO-2 reconciliation:

1. **There is no genesis.** No file in the history creates `profiles`,
   `organizations`, `products`, `categories`, `orders`, `order_items`,
   `order_notes`, `bundle_items` or `newsletter_subscribers`. The chain begins by
   altering tables nothing creates.
2. **`supabase/schema.sql` is not a substitute.** It creates `profiles` with
   **7** columns; production has **31**. Its own header has said since 22 July
   that applying this repository to an empty project does not reproduce
   production.

So the alternative - a hand-written `00_base_schema.sql` - would build *a*
database and not *production's*. `DECISION-20` step 4 requires a rehearsal on a
copy, and rehearsing against the wrong schema is worse than not rehearsing,
because it produces confidence rather than doubt.

The snapshot is what CI has restored since PR #203, and what `npm run dev:db`
restores locally. Adopting it as the genesis makes one mechanism where there
were three.

**The cost, stated plainly:** history before 1 August 2026 is archive rather
than replay. That is not a loss. It was already unreplayable; this records the
fact instead of implying otherwise every time somebody opens the folder.

## The safety consequence, which was not the goal but matters more than it

An empty `migrations/` means **there is nothing for an auto-apply integration to
apply.**

`supabase/pending/README.md` recorded on 22 July that a Supabase GitHub
integration applies this folder to production on merge. `WO-8` section 1
established that is very probably not the current state - the dashboard shows no
repository connected, the check points at project refs outside this account, and
PR #107 merged a migration that never applied. But the hazard was always in the
future rather than the present: it arms itself the day somebody connects the
integration, and that day looks like a routine setup task.

Now that day is safe by construction rather than by memo.

**The standing rule while `WO-8` is open still applies:** nobody connects GitHub
to the Ponte Trade Supabase project, and nobody repairs or re-points the
existing installation.

## Adding a migration

1. Write it here, named after today's date.
2. `npm run dev:db` applies it on top of the genesis and fails loudly if it
   cannot. A migration that will not apply to production's own schema cannot be
   applied to production either, and this is where you find that out.
3. It reaches production only through `DECISION-20` steps 3, 4 and 5 and the
   four assurance controls in `ADR-0031`.
