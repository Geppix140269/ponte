**19. Production Schema And Migration Hazards**
Production Supabase state is not verified. The repo contains explicit warnings that migrations after the early bucket policy failure may require manual application. `schema.sql` does not recreate production. The `verification_level` contradiction must be resolved before any publication, seed or verification-dependent Phase 1 work. Stripe replay safety should be fixed in design before expanding paid credit functions, matching the Master Brief warning at [section 12](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:1213).

**20. Security, Privacy And Provenance Risks**
Market Signal public reads are generally allow-listed, which is good. Main remaining risks are contact disclosure without governed approval/execution records, stale legal consent language, direct AI calls outside central audit, in-memory rate limiting, best-effort email delivery without deterministic recovery, service-role import scripts, and unverified production deployment/schema settings.

**21. Missing Tests And Unexercised Production Paths**
Missing coverage includes end-to-end AccountGate resumption, Supabase RLS integration for anon/member/admin paths, migration replay against blank and production-like schemas, Stripe webhook replay/partial-failure tests, exact disclosure preview and approval tests, T01/T02/T03 thread/document-share tests, L3 upload/certificate delivery tests, AI metering enforcement tests and mobile Playwright coverage.

**22. Exact Result Of Verification**
The direct PowerShell invocation of `npm run verify` failed before project checks because `npm.ps1` is blocked by local execution policy. The Windows shim `npm.cmd run verify` completed successfully with exit `0` in `98.6s`.

It ran message validation, encoding checks, all listed TSX tests, `tsc --noEmit --incremental false`, and `next build`. All 10 locales validated with 1033 strings each. Build generated 271 static pages. Warnings were limited to repeated missing `metadataBase` fallback to `http://localhost:3000` and npm upgrade notices.

**23. Corrected Phase 1 Scope**
Phase 1 must stay exactly aligned with [Implementation Programme Phase 1](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:1252):

Primary deliverable screen IDs:

- `E01-E03` as needed from current landing;
- `M01-M04`;
- `D01-D04`;
- `X01-X07`;
- `G01-G06`;
- `H01-H03` and `H07`.

Do not make `F`, `O` or `K` primary Phase 1 deliverables. Current Find/QO, controlled-introduction and verification code should be reused only as infrastructure where useful.

Smallest truthful vertical slice: intelligent entry preserves original objective, creates/activates one Commercial Mission, generates one meaningful Commercial Development with cited evidence chain and facts/inference separated, prepares one response or investigation, shows exact disclosure/action preview, requires human approval, executes one idempotent approved action, and records the outcome in Workspace.

Likely additions after approval and production schema inspection: `commercial_missions`, `mission_criteria`, permission policy fields, `commercial_developments`, evidence/development links, `prepared_actions`, `approval_requests`, `executions`, `activity_events`, outcome records and idempotency keys. No change to the existing L1-L4 model.

Security and privacy controls: QO, MS, Trade Movement, Business Evidence, Ponte Inference and Commercial Development remain distinct; no public MS provenance; no contact or document disclosure before exact approval; AI output labelled as inference; immutable approval/execution records; feature flag default off; safe disable back to existing routes.

Unresolved Giuseppe approvals: Phase 1 schema, production Supabase inspection, `verification_level` type resolution, disclosure/NCNDA policy, what illustrative Balcorp-style data may be used, and whether any action execution is email-only or needs a fuller thread surface in Phase 1.

**24. Immediate Recommendation**
Proceed only after production schema/flag/deploy reality is inspected and the `verification_level`, Stripe fulfilment and disclosure-policy decisions are resolved. Then build the Phase 1 M/D/X/G/H vertical slice behind an off-by-default flag, reusing Find, Structure, verification and introduction code only as supporting infrastructure.
