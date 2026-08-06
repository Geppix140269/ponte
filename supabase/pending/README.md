# supabase/pending

**Migrations that are written, reviewed, and deliberately NOT applied.**

Nothing here is on the apply path. `npm run dev:db` applies a file from this
folder only when it is named explicitly, and prints that it did.

## What is in here, and why each one

| File | Why it is not applied | Who decides |
| --- | --- | --- |
| `20260722a_drop_legacy_shop.sql` | **Destructive.** Drops the retired report-shop tables, which still hold rows. | Owner, separately |
| `20260730a_market_signal_search.sql` | **Broken.** See below. | Not a decision; a defect |
| `20260731e_deal_room_paid_room_periods.sql` | **Billing schema.** `DECISION-20` steps 3, 4 and 5 apply, plus the four controls in `ADR-0031`. | Owner |
| `20260802a_waiver_entity_resolution.sql` | **Deferred by `ADR-0030`.** The first-activation waiver is specified and built and is not a launch requirement. | Owner, when the waiver is enabled |

### `20260730a` is broken, and it has been demonstrated

It creates `pg_trgm` `with schema extensions` and then references
`extensions.gin_trgm_ops`. Production already has `pg_trgm` installed **in
`public`**, so `create extension if not exists` is a silent no-op and the
operator class never resolves. Every index statement in the file fails.

The WO-2 reconciliation predicted this from production's catalogue. Running it
on the development database on 3 August **executed** it:

```
ERROR: operator class "extensions.gin_trgm_ops" does not exist for access method "gin"
```

Predicted and then demonstrated, with no production access.

**It is not fixed here.** `WO-8` section 3.2 is explicit: it stays unapplied and
out of the chain. A migration remedy belongs to the reconciliation, not to
whoever trips over it.

**It was merged to `main` in PR #107 on 30 July, the check failed, and the SQL
never applied.** That is also the best evidence available that the auto-apply
path is not live - see below.

## The auto-apply claim, corrected

**An earlier version of this file said the Supabase GitHub integration applies
`supabase/migrations/` to the production database `cptglsmjmzcfpjndqfmc` on push
to `main`.** That was inferred on 22 July from a check run's `details_url`, not
from the dashboard, and it is **very probably not the current state.**

What contradicts it:

- `docs/codex/DATABASE-STATE.md`, 28 and 30 July: the `Supabase Preview` check
  links to project `kltuzbxnldtmdfhakphv`, later `pyplitspfeeqwzdimltf`, and
  **neither is production and neither is reachable by the owner's token**. On
  PR #228 it pointed at `bfcqypmponrghnfjbuxh` - a fourth ref, and also not
  production.
- **The Supabase dashboard, 6 August:** the Ponte Trade project's GitHub
  integration shows *"Connect GitHub"* with **no repository named**.
- **PR #107, the empirical control.** It added `20260730a`, the check failed, it
  was merged anyway, and the migration never applied. If the path were live,
  something would have run.
- **No workflow in `.github/workflows/` applies migrations.** The claim rests
  entirely on the external GitHub App.

**This is not reassuring, it is differently alarming.** Something outside this
account receives the repository on every pull request and reports a check that a
reasonable person would read as a database gate. Removing or correcting that
installation is an owner decision and is deliberately not bundled into this
work.

**The hazard was always in the future rather than the present.** It arms itself
the day somebody connects the integration, and that day looks like a routine
setup task.

**`supabase/migrations/` is now empty**, so that day is safe by construction
rather than by memo. The three files above are the ones that would otherwise
have run: a billing schema, a deferred commercial feature, and a file that
fails.

## The standing rule, while `WO-8` is open

**Nobody connects GitHub to the Ponte Trade Supabase project, and nobody repairs
or re-points the existing installation.**

## Moving a file out of here

It goes to `supabase/migrations/` only when it is genuinely next to be applied,
and it reaches production only through `DECISION-20` steps 3, 4 and 5 and the
four assurance controls in `ADR-0031`.

`npm run verify` fails if a file is in both this folder and `migrations/`, so
the distinction is enforced rather than remembered.
