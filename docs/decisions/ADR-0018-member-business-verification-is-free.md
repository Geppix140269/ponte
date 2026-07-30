# ADR-0018: Member-business verification is free and commercially separate from a counterparty check

- **Status:** Accepted
- **Date:** 30 July 2026
- **Owner:** Giuseppe Funaro
- **Authority:** Issue #130 (single-generation cutover), Issue #135 (child launch blocker), `docs/plans/active/single-generation-cutover.md` section 5 and PR 6.
- **Supersedes:** nothing. It records a commercial boundary that was previously
  implicit and, in code, wrong.

## Context

Ponte performs two different acts that share one technical pipeline:

1. **`member_business`** - verifying the legal entity the member represents.
   A clean result sets the member's own Business checked status, which is what
   lets them publish an opportunity and receive an introduction.
2. **`counterparty_check`** - a private check on somebody else's company,
   against registers, VIES, GLEIF and the published sanctions lists. It changes
   nothing about the member's own account.

Until this decision both ran through the same paid path: `runLevel2` called
`spendCredits(...COST_VERIFICATION_L2...)` for every purpose, the verification
API read the balance and could answer HTTP 402 for every purpose, and
`/verify?for=business` displayed a balance, a cost and a top-up link.

The owner observed the consequence directly (Issue #135): a member verifying
their own business was shown a credit balance, a price and a Buy credits path.
That contradicts the product rule the owner had already accepted, and it charges
a member for the act that unlocks ordinary participation.

Charging for member-business verification is also strategically wrong for
Ponte. The upstream market must create liquidity; the paid commercial
environment is the Deal Room (ADR-0004). A toll in front of the act that lets a
member publish at all suppresses the supply the marketplace depends on.

## Decision

**Verifying the member's own business is free.** The `member_business` path
performs:

- no credit balance lookup;
- no cost display, and no shortfall or top-up affordance;
- no HTTP 402;
- no credit spend, no ledger entry and no refund.

It cannot reach a credit function at all. The guard is the purpose, which is
resolved before any payment decision is taken, in both the API route and the
pipeline.

**`counterparty_check` keeps its existing paid rule**, unchanged: the balance is
read before a case is opened, an insufficient balance answers 402, and
`spendCredits` charges the run. The two purposes remain technically and
commercially separate, and the free path must never be able to invoke the paid
one.

The member-business route states the distinction in words, so the difference is
visible to the member and not only true in code.

## Consequences

- A member can complete member-business verification with a zero balance.
- `verifications.credit_ledger_id` stays null for a member-business case. That
  is the intended record: no payment happened. No migration is required, because
  the column is already nullable and no existing row changes.
- The attestation gate is unaffected: a member-business run still requires the
  explicit attestation before a case is opened. Free does not mean unguarded.
- Verification remains a real blocker for publication. This decision changes who
  pays, never what a verification means or how strictly it is judged.
- Revenue continues to come from the Deal Room (ADR-0004, ADR-0005, ADR-0006)
  and from paid counterparty checks, not from member onboarding.
- The boundary is enforced by
  `lib/verification/__tests__/member-business-free.test.ts`, which fails if any
  credit call site on the shared path loses its purpose guard, if the free path
  regains a balance read, a 402 or a cost surface, or if the paid path loses its
  commercial rule.

## Alternatives considered

- **Give every member a free credit allowance.** Rejected: it keeps the member's
  own verification inside the credit system, so the balance, the cost and the
  top-up path stay on screen and the boundary stays one refactor away from
  returning.
- **Split the pipeline into two functions.** Rejected for now: the checks
  themselves are identical, and duplicating them would create two places for a
  registry or sanctions rule to drift. The purpose guard sits at the one point
  where the two acts genuinely differ, which is payment.
