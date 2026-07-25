# Current state

**Reconciled:** 25 July 2026  
**Canonical `main`:** `9fa0aa63d82cdaa3f34251e8ca526677647680ff`

## Status vocabulary

Use only: Not started; Designed; Partially implemented; On branch; On main; Deployed; Production-verified; Blocked; Deprecated.

## Product surfaces

| Area | Repository state | Enablement / production state | Evidence and notes |
|---|---|---|---|
| “What’s your deal?” gateway | On main | Deployment must be reconciled | PR #15 merged. Deterministic route selection, voice/type entry and Brand v5 scoped landing. |
| Find entry and results, F01/F04/F05 | On main | Controlled by `NEXT_PUBLIC_FIND_JOURNEY` | `/find`; separates Qualified Opportunities and Market Signals. |
| Qualified Opportunity detail, F02 | On main | Same Find flag | `/find/o/[ref]`. |
| Controlled-introduction request, O05-O07 minimum | On main | Same Find flag; production exercise not recorded here | Uses existing account gate and introduction services. |
| Structure & Submit, S01-S06 | On main | Controlled by `NEXT_PUBLIC_STRUCTURE_JOURNEY` | `/structure`; complete composer shell and tests. |
| Workspace H04 reuse | On main | Must be exercised in production | Existing workspace surface receives submitted items. |
| Check a business, K01-K09 target | Partially implemented | Existing `/verify` is the seam | Purpose separation and verification pipeline exist; target connected Brand v5 journey is not yet recorded as complete. |
| Investigate a signal, I01-I07 target | Partially implemented | Existing `/market-signals` is the seam | Structured investigation request and admin lifecycle infrastructure exist from Blocks A-F; target journey remains incomplete. |
| Commercial Missions, M01-M07 | Not started as approved vertical slice | Not live | Architecture defines this as the first agentic vertical slice. |
| Commercial Developments, D01-D04 | Not started as approved vertical slice | Not live | No production claim. |
| Prepared actions/approvals, X01-X07 | Partially implemented infrastructure | Not assembled as target journey | Existing approval, lifecycle and introduction controls may be reusable. |
| Business Passport/Vault, B01-B08 | Partially implemented concepts/infrastructure | Not live as target journey | Must map existing profile, verification and storage structures before schema work. |
| Admin operation A01-A09 | Partially implemented | Individual queues exist | Opportunity, signal and verification surfaces exist; unified priority operation is not complete. |

## Completed engineering foundations

- Market Signals and Qualified Opportunities are separated.
- Imported signals are private by default and require individual approval.
- Publication integrity and expiry/reconfirmation rules exist.
- Member-business verification is separated from counterparty checks.
- Controlled introductions with pre-accept identity withholding exist.
- Account gating preserves the pending action.
- Signup credit defects and six-digit OTP mismatch were repaired.
- Ten-locale message validation, tests, TypeScript and production build are combined in `npm run verify`.

## Immediate blockers before Stage Two implementation

1. Reconcile what host and project currently serve `ponte.trade` against canonical `main`.
2. Confirm production values for the Find and Structure journey flags.
3. Import the long-form authority documents into `docs/ponte-authority/`.
4. Run a Codex onboarding audit against code, migrations, flags, deployment and documentation.
5. Select and approve the next milestone after that audit. The architecture suggests either the first agentic Mission vertical slice or the Check journey; Codex must not guess between them.
