// The HS lookup endpoint must key its CDN cache on the query string.
//
// Run: npx tsx lib/hs/__tests__/search-route-cache.test.ts
//
// This is a regression test for a production outage of the Start a Deal
// journey. /api/hs/search answers five different questions off one path, and
// every answer is decided entirely by the query string:
//
//   ?chapters=1   the chapter grid
//   ?chapter=17   the headings in a chapter
//   ?heading=1701 the codes in a heading
//   ?code=170199  one code and its WCO unit
//   ?q=sugar      ranked search
//
// Netlify's CDN does not vary on query parameters by default. With a shared
// cache entry, the first request of the hour was served to all of them: in
// production that was `?chapters=1`, so the composer asked for headings and
// codes, got the chapter list, read an undefined field and rendered nothing.
// No product could be chosen by any route, so Continue never enabled.
//
// The endpoint is cached on purpose (published nomenclature, identical for
// every visitor), so the fix is a correct cache key, not the removal of the
// cache. A source assertion is the right shape here: the failure was a missing
// response header, and no unit test of the handler's return value would have
// caught it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const SRC = readFileSync("app/api/hs/search/route.ts", "utf8");

test("the cached response varies on the query string", () => {
  assert.ok(
    /"netlify-vary"\s*:\s*"query"/i.test(SRC),
    'app/api/hs/search/route.ts must send `Netlify-Vary: query`, or the CDN serves one cached answer for every different lookup',
  );
});

test("the vary header travels with the cache-control header, not separately", () => {
  const headerBlock = SRC.slice(SRC.indexOf("const headers"), SRC.indexOf("if (params.get"));
  assert.ok(headerBlock.includes("s-maxage"), "the headers object still carries the shared cache");
  assert.ok(
    headerBlock.includes("netlify-vary"),
    "every response that is cached must also be keyed, so the two headers stay in one object",
  );
});

test("every query-dependent answer is sent with those headers", () => {
  // Each branch returns NextResponse.json(..., { headers }). A branch that
  // forgot them would be cached under the default key again.
  // [\s\S] rather than the `s` flag: the repo targets an older lib.
  const returns = SRC.match(/return NextResponse\.json\([\s\S]*?\);/g) ?? [];
  const cached = returns.filter((r) => r.includes("{ headers }"));
  assert.ok(cached.length >= 5, `expected all five lookups to be cached, found ${cached.length}`);
  for (const r of returns) {
    if (r.includes("status: 429")) continue; // the rate-limit refusal is never cached
    assert.ok(r.includes("{ headers }"), `a lookup returns without the cache headers: ${r.slice(0, 60)}`);
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} hs search cache tests passed`);
