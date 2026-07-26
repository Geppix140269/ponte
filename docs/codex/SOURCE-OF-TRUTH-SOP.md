# Ponte Trade source-of-truth operating procedure

**Status:** Proposed for adoption by this pull request  
**Owner:** Giuseppe Funaro  
**Canonical repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`

## 1. Purpose

Ponte Trade is developed through conversations with Giuseppe, ChatGPT, Codex,
Claude and human contributors. Those conversations are working sessions, not
product authority.

> Conversations are workshops. The repository is the operating memory and the
> only canonical source of truth.

A decision becomes binding only when it is recorded in the repository and
merged to `main`. A feature becomes real only when its implementation and
current status are also recorded. No agent may treat a chat transcript, local
clone, deployed screenshot, prompt, design export or private note as a silent
override of the repository.

## 2. Roles

### Product owner

Giuseppe decides whether a material product, architecture, brand, commercial or
lifecycle proposal is accepted, rejected, deferred or superseded. He approves
merges and every production action that existing guardrails reserve for the
owner.

### Recorder

The person or agent carrying the accepted decision creates or updates the
canonical repository record. The recorder is responsible for making the result
understandable without the originating conversation.

### Implementer

Codex, Claude, ChatGPT or a human developer may implement work. The implementer
must follow `AGENTS.md`, the relevant canonical authorities, accepted decisions,
the active ExecPlan when required, and this procedure. Tool choice does not
change the rules.

### Reviewer

The reviewer checks that the proposal, authority update, implementation and
current-state update agree. A technically correct change that leaves the source
of truth stale is incomplete.

No AI is the permanent owner of Ponte Trade. The procedure survives changes of
tool, model, developer or conversation.

## 3. Canonical records

| Record | Purpose | Authority |
|---|---|---|
| `AGENTS.md` | Mandatory entry instructions for every contributor and agent | Binding |
| `CLAUDE.md` | Claude entry point; delegates to the same common instructions | Binding |
| `docs/codex/00-START-HERE.md` | Authority order and required reading path | Binding |
| `docs/ponte-authority/*` | Governing product, experience, route, copy and design authorities | Binding in the order recorded by Start Here |
| `docs/decisions/ADR-*.md` | Durable architecture and product decisions, including rationale and consequences | Binding when status is Accepted and merged |
| `docs/codex/DECISION-LOG.md` | Chronological index of owner decisions and supersessions | Binding summary |
| `lib/taxonomy/*` and `docs/schemas/*` | Shared machine-readable or code-level domain contracts | Binding implementation contract |
| `docs/codex/CURRENT-STATE.md` | What is actually implemented, merged, deployed and production-verified | Binding status record |
| `docs/plans/active/*` | Approved execution plan and progress for substantial work | Operational, not product authority |
| GitHub Issues | Proposal inbox and implementation backlog | Non-authoritative until accepted and recorded elsewhere |
| Pull requests | Reviewable change set and evidence | Proposed until merged |

## 4. Decision states

Every material proposal has one of these states:

- **Proposed** — under discussion; not authority.
- **Accepted** — approved by Giuseppe and recorded in an ADR or governing
  authority; binding after merge.
- **Deferred** — valid question, not approved for current implementation.
- **Rejected** — considered and deliberately not adopted.
- **Superseded** — previously accepted, replaced by a later accepted decision.

Silence, an unmerged branch and an AI recommendation never mean Accepted.

## 5. Intake: recombining separate conversations

A meaningful idea from ChatGPT, Claude, Codex, a meeting or a private note enters
GitHub through the Product Decision proposal issue template.

The proposal must state:

1. the problem and intended user or business outcome;
2. the proposed decision in one clear sentence;
3. evidence, constraints and alternatives considered;
4. affected product areas, routes, data, copy, design and operations;
5. the source conversation or a self-contained summary of it;
6. open questions and requested owner decision.

The issue is an inbox item only. It does not alter the architecture.

When Giuseppe accepts the proposal, the recorder must, in the same change set:

1. create or supersede an ADR when the decision is durable;
2. update every affected governing authority;
3. update the shared code or schema contract when the decision defines domain
   structure;
4. create or update the implementation issue or ExecPlan;
5. update `CURRENT-STATE.md` truthfully;
6. add the decision to `DECISION-LOG.md`.

## 6. Implementation workflow

```text
Conversation, research or observation
        ↓
GitHub proposal issue — Proposed
        ↓
Owner decision — Accepted / Deferred / Rejected
        ↓
ADR and canonical authorities updated
        ↓
ExecPlan when substantial
        ↓
Implementation branch and pull request
        ↓
Tests, preview and review evidence
        ↓
Owner-approved merge
        ↓
Current state, deployment and production verification recorded
```

Substantial work is defined by `.agent/PLANS.md`. Production migrations,
secrets, hosting changes, feature flags, deployments and merges remain subject
to the stop conditions in `AGENTS.md`.

## 7. Mandatory pull-request discipline

Every substantial pull request must answer:

- Which accepted decision or authority does this implement?
- Which canonical documents and schemas are affected?
- Does it create, supersede or conflict with an ADR?
- Does it alter the domain model, route atlas, copy, design, permissions,
  lifecycle, privacy or production schema?
- What did the implementer inspect before changing behaviour?
- What tests and evidence support the change?
- What is the accurate status after this pull request?
- What remains explicitly out of scope?

The pull-request template enforces these questions. A pull request that changes
behaviour but leaves affected authority or current-state records stale is not
complete.

## 8. Agent start and finish protocol

Before work, every agent must:

1. read `AGENTS.md`;
2. read `docs/codex/00-START-HERE.md` and the authorities it names for the task;
3. inspect accepted ADRs, current state, known issues and the active plan;
4. inspect existing code and data behaviour rather than assuming the brief is
   already implemented;
5. identify conflicts before changing direction.

At the end of work, every agent must:

1. state exactly what changed and what did not;
2. update affected authorities, ADRs, schemas, plans and current-state records;
3. provide test, check, preview and deployment evidence without exaggeration;
4. record unresolved questions and stop conditions;
5. leave the repository understandable without the conversation.

## 9. Cross-agent handover format

When a conversation reaches a material conclusion but no repository change can
be made immediately, end with this self-contained block:

```markdown
## Proposed source-of-truth update

Decision:
Status: Proposed
Rationale:
Authorities affected:
ADR required:
Schema or code contract affected:
Routes and journeys affected:
Data or migration impact:
Implementation work:
Open questions:
Evidence or source summary:
```

The next agent may use this block to open the proposal issue. It must not treat
the block itself as accepted authority.

## 10. Enforcement and exceptions

The repository verification checks the presence and cross-links of the
governance entry points. Tests enforce the canonical market taxonomy. Human
review enforces semantic accuracy.

An emergency technical or legal constraint may temporarily override a document
only when the evidence is recorded, the conflict is reported, the safest action
is taken, and the repository is reconciled immediately afterward.

## 11. Adoption

After this procedure is merged to `main`, it applies to ChatGPT, Codex, Claude,
human developers and future agents equally. Existing chats remain useful
research history, but only their accepted, merged outcomes govern Ponte Trade.
