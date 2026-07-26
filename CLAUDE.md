# Claude instructions for Ponte Trade

Claude must follow the same repository operating procedure as every other
contributor. This file does not contain a separate Claude-specific product
architecture.

Before planning, editing or reviewing Ponte Trade:

1. Read `AGENTS.md` in full.
2. Read `docs/codex/00-START-HERE.md` and the authorities it requires for the
   task.
3. Read `docs/codex/SOURCE-OF-TRUTH-SOP.md`.
4. Review relevant accepted ADRs in `docs/decisions/`.
5. Review `docs/codex/CURRENT-STATE.md`, known issues and the active ExecPlan.
6. Inspect the existing implementation before proposing replacement work.

Do not treat a Claude conversation, Project instruction, prompt, local file,
deployment or earlier handover as more authoritative than the merged repository
record.

A material conclusion reached in Claude becomes authoritative only after the
owner accepts it, the affected canonical records are updated and the change is
merged to `main`.

For substantial work, follow `.agent/PLANS.md`. Do not merge, deploy, alter
production schemas, change production flags, secrets or hosting without the
explicit approval required by `AGENTS.md`.

Finish every change by updating the affected authority, ADR, schema, plan and
current-state records so that the next agent does not need the original
conversation.
