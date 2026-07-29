import assert from "node:assert/strict";
import { parseUsCsl, US_CSL_ATTRIBUTION } from "../csl";

const rows = parseUsCsl(
  JSON.stringify({
    results: [
      {
        id: "entity-1",
        name: "Example Export Co",
        alt_names: ["Example Export Company", { name: "EEC Trading" }],
        addresses: [{ country: "United States", city: "New York" }],
        source: "Entity List",
        programs: ["EAR"],
        type: "Entity",
        start_date: "2026-01-02",
      },
    ],
  }),
);

assert.equal(rows.length, 1);
assert.equal(rows[0].entry_id, "entity-1");
assert.equal(rows[0].primary_name, "Example Export Co");
assert.deepEqual(rows[0].aliases, ["Example Export Company", "EEC Trading"]);
assert.equal(rows[0].country, "United States");
assert.equal(rows[0].entity_type, "entity");
assert.equal(rows[0].listed_date, "2026-01-02");
assert.ok(rows[0].programs.includes("Entity List"));
assert.equal(rows[0].raw.attribution, US_CSL_ATTRIBUTION);

console.log("US CSL parser tests passed");
