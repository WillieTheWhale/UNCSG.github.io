import assert from "node:assert/strict";
import test from "node:test";
import { allowedOnyens, isAllowedStaffEmail, normalizeUncEmail, onyenFromEmail } from "./access.js";

test("uses the approved staff Onyen allowlist exactly", () => {
  assert.deepEqual([...allowedOnyens].sort(), [
    "benbmj",
    "bhilberg",
    "bkohl",
    "campslee",
    "chlojo",
    "duncanda",
    "eprosser",
    "fwcullen",
    "harahim",
    "hmshap",
    "lsc",
    "mghoward",
    "rparse06",
    "sbp",
    "scant",
    "sophfont",
    "tpg",
    "usgsec",
  ]);
});

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
  assert.equal(isAllowedStaffEmail("BKohl@ad.unc.edu"), true);
  assert.equal(isAllowedStaffEmail("DUNCANDA@unc.edu"), true);
  assert.equal(isAllowedStaffEmail("RPARSE06@unc.edu"), true);
  assert.equal(isAllowedStaffEmail("USGSEC@ad.unc.edu"), true);
});

test("rejects former whitelist members", () => {
  assert.equal(isAllowedStaffEmail("meredith.mckinney@ad.unc.edu"), false);
});
