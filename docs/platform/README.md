# Ponte Trade platform documentation

The operating record for the platform. If something about how Ponte Trade is
built, deployed, connected or recovered is not written down here, it is not
agreed.

| Document | Answers |
|---|---|
| [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md) | Which copy of the code is real, and why the others were retired |
| [CONNECTIONS.md](CONNECTIONS.md) | Every third party service the platform depends on |
| [SECRETS.md](SECRETS.md) | What credentials exist, where they live, when they were rotated. No values. |
| [VERSIONS.md](VERSIONS.md) | What shipped, when, and what changed |
| [FEATURES.md](FEATURES.md) | What the product currently does |
| [RUNBOOK.md](RUNBOOK.md) | Deploy, back up, restore, and what to do in an incident |

## The two rules

**1. One source of truth.** `main` on `github.com/Geppix140269/ponte` is the
only real copy. Everything else is a working copy or a backup. See
[SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md).

**2. No secret values in this repository, ever.** Not in docs, not in code, not
in a comment, not "temporarily". [SECRETS.md](SECRETS.md) records that a
credential exists and where it lives. The value itself lives only in the
password manager and in the hosting provider's environment settings. A
repository is copied, cloned, backed up and shared. Anything written here
should be assumed public one day.

## Keeping this current

These files are updated in the same pull request as the change they describe.
A deploy that changes a connection, adds a service, or rotates a credential is
not finished until the matching document is updated.
