// Connection check for the four company verification sources.
//
//   node scripts/check-registry-apis.mjs
//
// Two of them need no account at all and are tested live. The other two need
// a key that only Giuseppe can create, so they are reported as "awaiting key"
// rather than failed. Run this again after pasting a key to confirm it works
// before wiring it into anything.
//
// Reads .env.local if present. Never prints a key.

import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
}

async function withTimeout(fn, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
function report(source, state, detail) {
  results.push({ source, state, detail });
}

// --------------------------------------------------------------------------
// 1. UK Companies House. Needs a free key.
// --------------------------------------------------------------------------
async function checkCompaniesHouse() {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    return report(
      "Companies House (UK)",
      "AWAITING KEY",
      "register at developer.company-information.service.gov.uk, then set COMPANIES_HOUSE_API_KEY",
    );
  }
  try {
    // 1402 Celsius Ltd, the operating company, is a real and stable test subject.
    const res = await withTimeout((signal) =>
      fetch("https://api.company-information.service.gov.uk/company/12475013", {
        headers: {
          Authorization: "Basic " + Buffer.from(`${key}:`).toString("base64"),
        },
        signal,
      }),
    );
    if (res.status === 401) return report("Companies House (UK)", "BAD KEY", "401, the key was rejected");
    if (!res.ok) return report("Companies House (UK)", "FAIL", `http ${res.status}`);
    const json = await res.json();
    report(
      "Companies House (UK)",
      "LIVE",
      `${json.company_name}, status ${json.company_status}, incorporated ${json.date_of_creation}`,
    );
  } catch (err) {
    report("Companies House (UK)", "FAIL", err.name === "AbortError" ? "timeout" : err.message);
  }
}

// --------------------------------------------------------------------------
// 2. OpenCorporates. Key optional, free tier needs attribution.
// --------------------------------------------------------------------------
async function checkOpenCorporates() {
  const key = process.env.OPENCORPORATES_API_KEY;
  try {
    const url = new URL("https://api.opencorporates.com/v0.4/companies/search");
    url.searchParams.set("q", "1402 Celsius");
    url.searchParams.set("per_page", "1");
    if (key) url.searchParams.set("api_token", key);

    const res = await withTimeout((signal) => fetch(url, { signal }));
    if (res.status === 401 || res.status === 403) {
      return report(
        "OpenCorporates",
        key ? "BAD KEY" : "AWAITING KEY",
        key
          ? `http ${res.status}, the key was rejected`
          : "anonymous access is refused, register at opencorporates.com/api_accounts/new and set OPENCORPORATES_API_KEY",
      );
    }
    if (res.status === 429) {
      return report("OpenCorporates", key ? "RATE LIMITED" : "AWAITING KEY", "http 429, rate limited");
    }
    if (!res.ok) return report("OpenCorporates", "FAIL", `http ${res.status}`);
    const json = await res.json();
    const n = json?.results?.companies?.length ?? 0;
    report(
      "OpenCorporates",
      key ? "LIVE" : "LIVE (anonymous)",
      `search returned ${n} result(s)${key ? "" : ", but a key is needed for reliable use"}`,
    );
  } catch (err) {
    report("OpenCorporates", "FAIL", err.name === "AbortError" ? "timeout" : err.message);
  }
}

// --------------------------------------------------------------------------
// 3. VIES. No key. Tested against the operating company's own VAT number.
// --------------------------------------------------------------------------
async function checkVies() {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>BG</urn:countryCode>
      <urn:vatNumber>207314767</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const res = await withTimeout((signal) =>
      fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
        method: "POST",
        headers: { "content-type": "text/xml; charset=utf-8" },
        body: envelope,
        signal,
      }),
    );
    const body = await res.text();
    const fault = body.match(/<(?:\w+:)?faultstring>([^<]*)<\/(?:\w+:)?faultstring>/i)?.[1];
    if (fault) return report("VIES (EU VAT)", "UPSTREAM FAULT", `${fault}, this is normal and transient`);
    // VIES namespaces its response elements, for example <ns2:valid>. Matching
    // only the bare tag silently reports every VAT number as invalid.
    const valid = /<(?:\w+:)?valid>\s*true\s*<\/(?:\w+:)?valid>/i.test(body);
    const name = body.match(/<(?:\w+:)?name>([^<]*)<\/(?:\w+:)?name>/i)?.[1]?.trim();
    if (!res.ok && !valid) return report("VIES (EU VAT)", "FAIL", `http ${res.status}`);
    report(
      "VIES (EU VAT)",
      "LIVE, NO KEY NEEDED",
      `BG207314767 valid=${valid}${name && name !== "---" ? `, ${name}` : ""}`,
    );
  } catch (err) {
    report("VIES (EU VAT)", "FAIL", err.name === "AbortError" ? "timeout" : err.message);
  }
}

// --------------------------------------------------------------------------
// 4. GLEIF. No key.
// --------------------------------------------------------------------------
async function checkGleif() {
  try {
    const url =
      "https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=Maersk&page%5Bsize%5D=1";
    const res = await withTimeout((signal) =>
      fetch(url, { headers: { accept: "application/vnd.api+json" }, signal }),
    );
    if (!res.ok) return report("GLEIF (LEI)", "FAIL", `http ${res.status}`);
    const json = await res.json();
    const rec = json?.data?.[0];
    report(
      "GLEIF (LEI)",
      "LIVE, NO KEY NEEDED",
      rec
        ? `lookup returned ${rec.attributes?.entity?.legalName?.name ?? "a record"}, LEI ${rec.id}`
        : "reachable, query returned no rows",
    );
  } catch (err) {
    report("GLEIF (LEI)", "FAIL", err.name === "AbortError" ? "timeout" : err.message);
  }
}

loadEnvLocal();
await Promise.all([checkCompaniesHouse(), checkOpenCorporates(), checkVies(), checkGleif()]);

const width = Math.max(...results.map((r) => r.source.length));
console.log("");
for (const r of results) {
  console.log(`  ${r.source.padEnd(width)}  ${r.state.padEnd(20)} ${r.detail}`);
}
const blocked = results.filter((r) => r.state.includes("AWAITING") || r.state === "BAD KEY");
console.log("");
console.log(
  blocked.length === 0
    ? "All four sources reachable."
    : `${blocked.length} source(s) need a key before they can be used: ${blocked.map((b) => b.source).join(", ")}`,
);
