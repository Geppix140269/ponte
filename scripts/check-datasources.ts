/*
 * Calls every configured datasource for real and prints what came back.
 *
 *   npm run check:data
 *
 * The companion to check-registry-apis.mjs, and for the same reason: an
 * integration that has only ever been reasoned about has not been tested. This
 * hits live upstreams, so it is a manual command and never part of CI, which
 * must not depend on somebody else's uptime.
 *
 * Everything runs inside main() rather than at the top level because tsx
 * compiles this to CommonJS, where top level await is a syntax error.
 */

import { readFileSync, existsSync } from "node:fs";

function loadLocalEnv(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function main(): Promise<number> {
  // Before the import, not after: http.ts reads the contact address at module
  // scope to build its User-Agent.
  loadLocalEnv();
  const { getFxRate } = await import("../lib/datasources");

  let failures = 0;

  console.log("FX median engine");
  console.log("-".repeat(64));

  const pairs: [string, string][] = [
    ["USD", "EUR"],
    ["EUR", "GBP"],
    ["USD", "CNY"],
  ];

  for (const [base, quote] of pairs) {
    const result = await getFxRate(base, quote);

    if (!result.ok) {
      console.log(`FAIL  ${base}/${quote}  ${result.error}`);
      failures++;
      continue;
    }

    console.log(
      `ok    ${base}/${quote}  median=${result.data.rate.toFixed(6)}` +
        `  ${result.data.providers.length} provider(s)` +
        `${result.stale ? "  [STALE]" : ""}` +
        `${result.data.disagreement ? "  [DISAGREEMENT]" : ""}`,
    );
    console.log(
      "      " +
        result.data.providers
          .map(
            (p) =>
              `${p.id.replace("fx.", "")}=${p.rate.toFixed(6)}${p.outlier ? " OUTLIER" : ""}`,
          )
          .join("  "),
    );

    if (result.data.providers.length < 2) {
      console.log("      NOTE: only one provider answered, nothing corroborates it");
    }
  }

  console.log("\nInput handling");
  console.log("-".repeat(64));

  const bad: [string, string, string][] = [
    ["US", "EUR", "two letter base"],
    ["USD", "USD", "same currency both sides"],
    ["USD", "E1R", "digit in the code"],
  ];

  for (const [base, quote, why] of bad) {
    const result = await getFxRate(base, quote);
    if (result.ok) {
      console.log(`FAIL  ${base}/${quote} accepted, expected rejection (${why})`);
      failures++;
    } else {
      console.log(`ok    ${base}/${quote} rejected: ${result.error}`);
    }
  }

  console.log(
    failures === 0 ? "\nAll datasource checks passed." : `\n${failures} check(s) failed.`,
  );
  return failures === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
