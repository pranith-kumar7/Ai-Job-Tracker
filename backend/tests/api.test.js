import test from "node:test";
import assert from "node:assert/strict";

test("API test harness is available", () => {
  assert.equal(typeof fetch, "function");
});
