import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "./markdown.js";
import { articlePatchSchema, scheduleSchema, slugifyTitle } from "./validation.js";

test("creates clean editable slugs", () => {
  assert.equal(slugifyTitle("First in Excellence: Fall 2026!"), "first-in-excellence-fall-2026");
});

test("validates article fields and rejects unsafe slugs", () => {
  assert.equal(articlePatchSchema.safeParse({ title: "An update", slug: "an-update" }).success, true);
  assert.equal(articlePatchSchema.safeParse({ slug: "../admin" }).success, false);
  assert.equal(scheduleSchema.safeParse({ publishAtLocal: "2026-09-01T09:30" }).success, true);
});

test("sanitizes rendered Markdown", () => {
  const html = renderMarkdown("## Hello\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))");
  assert.match(html, /<h2>Hello<\/h2>/);
  assert.doesNotMatch(html, /<script|javascript:/);
});
