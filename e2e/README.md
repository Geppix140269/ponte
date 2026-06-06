# End-to-end tests (Playwright)

Smoke coverage for the top journeys: homepage, pricing, verify, and auth gating.

## Run against a deployed URL
```
PONTE_E2E_BASE_URL=https://ponte.trade npx playwright test
```

## Run against a local build
```
npm run build
PONTE_E2E_LOCAL=1 npx playwright test
```

First run only: install the browser once with `npx playwright install chromium`.

These are intentionally resilient (text/role selectors) so minor copy changes do not break them. Extend `smoke.spec.ts` as authenticated journeys (verify run, listing publish, deal room, settlement) get test fixtures/seed users.
