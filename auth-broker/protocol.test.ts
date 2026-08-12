import assert from "node:assert/strict";
import test from "node:test";
import {
  bearerToken,
  openShiftAccessTokenName,
  secureEqual,
  sha256Base64Url,
  validOnyen,
} from "./protocol.js";

test("creates and verifies an S256 PKCE challenge", () => {
  const verifier = "test-verifier-with-at-least-forty-three-characters-123456";
  const challenge = sha256Base64Url(verifier);
  assert.equal(challenge.length, 43);
  assert.equal(secureEqual(sha256Base64Url(verifier), challenge), true);
  assert.equal(secureEqual(sha256Base64Url(`${verifier}-wrong`), challenge), false);
});

test("parses bearer tokens and validates expected Onyen shapes", () => {
  assert.equal(bearerToken("Bearer abc123"), "abc123");
  assert.equal(bearerToken("basic abc123"), null);
  assert.equal(validOnyen("meredith.mckinney"), true);
  assert.equal(validOnyen("bhilberg"), true);
  assert.equal(validOnyen("bad onyen"), false);
});

test("uses the OpenShift sha256 token resource name format", () => {
  const name = openShiftAccessTokenName("secret-token");
  assert.match(name, /^sha256~[A-Za-z0-9_-]{43}$/);
});
