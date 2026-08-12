import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedStaffEmail, normalizeUncEmail, onyenFromEmail } from "./access.js";

test("normalizes accepted UNC email domains", () => {
  assert.equal(normalizeUncEmail("  Meredith.Mckinney@LIVE.UNC.EDU "), "meredith.mckinney@ad.unc.edu");
  assert.equal(normalizeUncEmail("bhilberg@unc.edu"), "bhilberg@ad.unc.edu");
  assert.equal(onyenFromEmail("bhilberg@ad.unc.edu"), "bhilberg");
});

test("rejects non-UNC domains and non-whitelisted Onyens", () => {
  assert.equal(normalizeUncEmail("bhilberg@example.com"), null);
  assert.equal(isAllowedStaffEmail("not-listed@unc.edu"), false);
});

test("accepts whitelist members case-insensitively", () => {
  assert.equal(isAllowedStaffEmail("Meredith.Mckinney@unc.edu"), true);
  assert.equal(isAllowedStaffEmail("BKOHL@ad.unc.edu"), true);
});
