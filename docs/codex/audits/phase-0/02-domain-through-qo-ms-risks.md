**7. Domain Object Mapping**
- Member: `auth.users` plus `profiles`, partially aligned.
- Business: collapsed into `profiles.company/country/business_verification_id`, missing as separate object.
- Team Membership: missing.
- Business Passport Field: missing.
- Vault Asset: listing/verification documents are reusable but not a purpose-approved vault.
- Evidence Item/Receipt: scattered listing, verification and signal facts; no universal evidence chain.
- Verification Case: implemented for L2.
- Qualified Opportunity: approved/current/eligible `listings`, partially aligned.
- Market Signal: `desk_radar` approved-signal model, partially aligned.
- Trade Movement, Price Observation: missing.
- Ponte Inference: AI outputs exist, but not consistently modelled.
- Commercial Mission, Mission Criteria, Permission Policy: missing.
- Commercial Development: missing.
- Work Item, Prepared Action, Approval Request, Execution: missing as first-class workflow.
- Introduction Request: `listing_connections`, partial.
- Investigation: `signal_investigations`, partial.
- Conversation Thread, Activity Event, Outcome, Mission Memory: missing or weakly implied.

**8. Corrected J01-J10 Mapping**
- `J01 - Intelligent entry`: partially implemented by homepage capture, deterministic extraction and route handoff. Unsupported/unsafe handling is missing.
- `J02 - Create and activate a Commercial Mission`: missing. Structure/homepage inputs are reusable only.
- `J03 - Receive and act on a Commercial Development`: missing. No Development object, threshold engine, evidence chain or recommendation workflow exists.
- `J04 - Find and request a Qualified Opportunity`: partially implemented by `/find`, QO detail and intro request components. Passport reuse, owner-facing preview, Workspace entry and full controlled-introduction handoff are incomplete.
- `J05 - Structure and submit`: partially implemented by `/structure`; review begins through legacy listing submission, not Passport/Vault-backed architecture.
- `J06 - Check or verify a business`: partially aligned for L2. Candidate selection, purpose separation and credit boundary exist; full K01-K09 evidence receipt/L3/L4 compatibility is incomplete.
- `J07 - Investigate a Market Signal`: partially implemented by signal detail, investigation request API and admin signal statuses. Scope, thread, investigation progress and confirmed-case conversion are incomplete.
- `J08 - Controlled introduction`: partially implemented by structured request and owner accept/decline. Required disclosure approval, recorded disclosure, T01 thread and T03 document sharing are missing.
- `J09 - Workspace return`: mostly missing. `/workspace` is not yet the governed Do now / Waiting / New intelligence / Active Missions / Recent outcomes surface.
- `J10 - Admin/reviewer operation`: partially implemented for listing, signal and verification queues; priority ordering, investigation cases, blocked disclosures and agent/action/source failures are incomplete.

**9. Material Area Classification**
- Homepage: partially aligned; retain and revise.
- Find/QO: partially aligned.
- Market Signals: partially aligned.
- QO/MS separation: aligned in current new surfaces, with obsolete remnants.
- Structure: partially aligned and reusable.
- Legacy marketplace: reusable infrastructure, partly obsolete as primary UX.
- Verification L2: partially aligned.
- L3/L4: missing.
- AccountGate: partially aligned.
- Commercial Mission/Development: missing.
- Prepared action/approval/execution: missing.
- Admin/reviewer: reusable infrastructure, partially aligned.
- Credits/Stripe: reusable but unsafe/contradictory around fulfilment idempotency.
- AI: reusable but contradictory because `lib/ai-vet.ts` bypasses central wrapper.
- Legal/privacy/static copy: obsolete/contradictory.
- Migrations: partially aligned but hazardous.
- CI/localisation: aligned for repository verification.

**10. Visual Debt**
Brand v5 is applied primarily to homepage, Find and Structure. Legacy dark/glass/gold and lime/cyan/violet styling remains in marketplace, admin, verification, pricing, join, legal/static pages and older home/design components. This is visual debt only; it should not become a global repaint. The governing programme defers broad Brand v5 convergence until Phase 9.

**11. L1-L4 And Trust Score Dependencies**
Dependencies include `profiles.verification_level`, `profiles.verified_at`, `profiles.business_verification_id`, `verifications`, `verification_documents`, `trust_score_components`, `trust_score`, `sanctions_entries`, `sanctions_refresh_log`, `lib/verification/*`, verification APIs/pages, admin verification pages/actions, listing publication gates, QO services and marketplace/detail badges.

L2 is materially implemented. L1 is mostly account/profile state. L3 has private document/admin infrastructure but no complete user journey. L4 is not implemented beyond explanatory copy. Trust Score is deterministic in `lib/verification/trust-score.ts`, but the Master Brief says it must not become the primary trust model.

**12. QO/MS Blend Or Misrepresentation Points**
Current `/find` separates QOs and Market Signals, and public Market Signal services avoid internal provenance. Remaining blend/confusion risks:

- obsolete components and type names still carry `radar` as a deal source;
- old design previews imply radar/signal items can look like opportunities;
- `desk_radar` naming preserves the older mental model;
- Market Signal import can publicize workbook-marked rows as `approved_signal`;
- admin signal confirmation requires a linked QO while helper comments suggest looser semantics;
- legacy marketplace fallback can make Find feel like a marketplace if `NEXT_PUBLIC_FIND_JOURNEY` is off;
- legal copy still uses Deal Sheet and third-party summary language.

