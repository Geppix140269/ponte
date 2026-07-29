import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signSumsubRequest } from "../sumsub";

const input = {
  secret: "test-secret",
  timestamp: "1720000000",
  method: "POST",
  path: "/resources/applicants?levelName=KYB",
  body: '{"externalUserId":"ponte-test"}',
};

const expected = createHmac("sha256", input.secret)
  .update(input.timestamp + input.method + input.path + input.body)
  .digest("hex");
assert.equal(signSumsubRequest(input), expected);

console.log("Commercial KYB provider tests passed");
