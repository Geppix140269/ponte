// Validates the live ADAMftd integration against the real API before flipping
// ADAMFTD_LIVE. Run locally where outbound network is allowed:
//   ADAMFTD_API_KEY=... node scripts/adamftd-smoke.mjs "Adidas"
//   ADAMFTD_API_KEY=... node scripts/adamftd-smoke.mjs "Cytrox Holdings"   (sanctioned demo)
const base = (process.env.ADAMFTD_API_URL || "https://api.adamftd.org").replace(/\/$/, "");
const key = process.env.ADAMFTD_API_KEY;
if (!key) { console.error("Set ADAMFTD_API_KEY"); process.exit(1); }
const H = { headers: { "X-API-KEY": key, accept: "application/json" } };
const g = async (p) => { const r = await fetch(base + p, H); if (!r.ok) throw new Error(`${p} -> ${r.status}`); return r.json(); };

const name = process.argv[2] || "Adidas";
const enc = encodeURIComponent(name);
const end = new Date(), start = new Date(); start.setFullYear(end.getFullYear() - 1);
const iso = (d) => d.toISOString().slice(0, 10);
const common = `keyword=${enc}&start_date=${iso(start)}&end_date=${iso(end)}&is_buyer=true`;

console.log(`\nADAMftd live smoke test for: ${name}\n`);
const s = await g(`/sanction-service/public/v1/search?q=${enc}&limit=5&offset=0`);
console.log("Sanctions  : total_records =", s.total_records,
  "| first =", s?.data?.results?.[0]?.caption ?? "none");
const m = await g(`/trade-service/public/v1/company-transactions/analytics/monthly?${common}&limit=12&offset=0&sort_by=month&order=asc`);
const bol = (m.data || []).reduce((a, b) => a + (Number(b.bol) || 0), 0);
console.log("Trade      : months =", m.total_records, "| total BoL =", bol);
const hs = await g(`/trade-service/public/v1/company-transactions/hs-code-analytics/list?${common}&tab=HSCode&limit=5&offset=0&sort_by=value_usd&order=desc`);
console.log("Top HS     :", (hs.data || []).map((x) => x.hscode));
const tc = await g(`/trade-service/public/v1/company-transactions/trading-countries/list?${common}&tab=TradingArea&limit=10&offset=0&sort_by=value_usd&order=desc`);
console.log("Countries  :", (tc.data || []).map((x) => x.country_code));
console.log("\nIf these look right, the field mapping in live-provider.ts is correct.\n");
