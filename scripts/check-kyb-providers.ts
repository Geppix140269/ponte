// Safe connectivity checks for optional commercial KYB providers.
//
//   npm run check:kyb
//
// Reads .env.local if present. Never prints credentials, raw provider records,
// identity documents or personal data. OpenSanctions performs one read-only
// company match only when explicitly enabled. Sumsub performs a read-only
// lookup for a deliberately non-existent external user id; HTTP 404 proves the
// signature was accepted without creating an applicant.

import { existsSync, readFileSync } from "node:fs";
import {
  isOpenSanctionsConfigured,
  isOpenSanctionsEnabled,
  screenOpenSanctionsCompany,
} from "@/lib/compliance/opensanctions";
import { checkSumsubCredentials, isSumsubConfigured } from "@/lib/compliance/sumsub";

type State = "LIVE" | "READY, DISABLED" | "AWAITING KEY" | "FAIL";
type Result = { source: string; state: State; detail: string };

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

async function checkOpenSanctions(): Promise<Result> {
  if (!isOpenSanctionsConfigured()) {
    return {
      source: "OpenSanctions",
      state: "AWAITING KEY",
      detail: "obtain a commercial trial key, then set OPENSANCTIONS_API_KEY",
    };
  }
  if (!isOpenSanctionsEnabled()) {
    return {
      source: "OpenSanctions",
      state: "READY, DISABLED",
      detail: "key present; set DATA_OPENSANCTIONS_ENABLED=true for the controlled trial",
    };
  }

  const result = await screenOpenSanctionsCompany({
    name: "1402 Celsius Ltd",
    country: "GB",
    regNumber: "12475013",
  });
  return result.available
    ? {
        source: "OpenSanctions",
        state: "LIVE",
        detail: `authenticated match returned ${result.matches.length} candidate(s)`,
      }
    : {
        source: "OpenSanctions",
        state: "FAIL",
        detail: result.reason ?? "provider did not return a usable answer",
      };
}

async function checkSumsub(): Promise<Result> {
  if (!isSumsubConfigured()) {
    return {
      source: "Sumsub sandbox",
      state: "AWAITING KEY",
      detail: "set SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY from the sandbox project",
    };
  }

  const result = await checkSumsubCredentials();
  return result.available && result.authenticated
    ? {
        source: "Sumsub sandbox",
        state: "LIVE",
        detail: `signature accepted (HTTP ${result.status}); no applicant was created`,
      }
    : {
        source: "Sumsub sandbox",
        state: "FAIL",
        detail: result.reason ?? `provider returned HTTP ${result.status}`,
      };
}

loadEnvLocal();
const results = await Promise.all([checkOpenSanctions(), checkSumsub()]);
const width = Math.max(...results.map((result) => result.source.length));
console.log("");
for (const result of results) {
  console.log(`  ${result.source.padEnd(width)}  ${result.state.padEnd(16)} ${result.detail}`);
}
console.log("");
if (results.every((result) => result.state === "LIVE")) {
  console.log("Both commercial KYB trial connections are live.");
} else {
  console.log("No provider was activated automatically; resolve the states above before a trial.");
}
