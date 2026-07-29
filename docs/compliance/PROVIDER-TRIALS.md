# Commercial KYB provider trials

Status: integration harness prepared, providers not activated in production.

## Guardrail

OpenSanctions and Sumsub are optional comparison providers. Neither is allowed
to set a Ponte verification verdict, badge, trust score or rejection until the
trial has been reviewed and explicitly approved. The existing public-source
pipeline remains the decision authority.

No commercial trial should begin before the provider contract, licence, data
processing agreement, retention terms, sub-processors and international data
transfers have been reviewed. Use sandbox or trial credentials only.

## OpenSanctions trial

Purpose: compare sanctions, PEP, relatives-and-close-associates, debarment and
relationship coverage against Ponte's own authoritative-list screening.

1. Obtain a business trial API key and confirm the intended hosted-API licence
   in writing.
2. Set `OPENSANCTIONS_API_KEY` in a non-production environment.
3. Set `DATA_OPENSANCTIONS_ENABLED=true` only for the controlled trial.
4. Run `npm run check:kyb`.
5. Run a documented sample of known clean, known listed and ambiguous entities.
6. Record coverage, false positives, match explanations, latency, rate limits,
   permitted retention and expected monthly cost.

The adapter is read-only and sends company name plus any supplied country,
registration number, VAT number, LEI and address. It does not change a Ponte
case.

## Sumsub sandbox trial

Purpose: evaluate company-document collection, registry checks, ownership and
management structure, UBO capture, representative identity and AML workflow.

1. Create or select a Sumsub sandbox project and a KYB verification level.
2. Set `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY` and `SUMSUB_KYB_LEVEL` in a
   non-production environment.
3. Run `npm run check:kyb`. The probe only requests a deliberately non-existent
   applicant; an authenticated 404 is considered success and creates nothing.
4. Use `createSumsubCompanyApplicant` only from an explicit sandbox script or
   operator action. Never call it from page load, verification submission or CI.
5. Test one straightforward company, one multi-layer ownership structure and
   one case requiring manual review.
6. Record completion rate, user friction, document coverage, webhook behaviour,
   review time, data retention, regional hosting and expected cost.

## Acceptance decision

The trial owner must produce a short decision record covering:

- exact problem the provider solves beyond Ponte's current sources;
- countries and entity types covered;
- UBO depth and representative-authority evidence;
- PEP, sanctions, adverse-media and export-control coverage;
- false-positive and false-negative evidence from the test set;
- data-protection and contractual position;
- unit economics per verification and per monitored company;
- whether the provider is advisory, a review trigger or a required gate.

Production activation requires a separate pull request. It must identify which
provider result fields are stored, their retention period, the human-review
rules and the user-facing wording. No provider may be described as proving
solvency, performance or general legal compliance.
