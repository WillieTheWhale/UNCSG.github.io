import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "./markdown.js";
import {
  articlePatchSchema,
  eventFeatureSchema,
  eventPatchSchema,
  scheduleSchema,
  slugifyEventTitle,
  slugifyTitle,
} from "./validation.js";
import {
  eventMonthBounds,
  eventPublicationIssue,
  parseEventLocalBoundary,
} from "./events.js";

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

test("validates event fields and feature changes", () => {
  assert.equal(slugifyEventTitle("Carolina Community Forum"), "carolina-community-forum");
  assert.equal(
    eventPatchSchema.safeParse({
      title: "Community forum",
      startAtLocal: "2026-09-01T17:30",
      endAtLocal: "2026-09-01T19:00",
      format: "hybrid",
      virtualUrl: "https://zoom.us/example",
      contactEmail: "execbranch@unc.edu",
    }).success,
    true,
  );
  assert.equal(eventPatchSchema.safeParse({ virtualUrl: "javascript:alert(1)" }).success, false);
  const invalidRegistration = eventPatchSchema.safeParse({ registrationUrl: "go.unc.edu/event" });
  assert.equal(invalidRegistration.success, false);
  if (!invalidRegistration.success) {
    assert.equal(
      invalidRegistration.error.issues[0]?.message,
      "Registration or details link: enter a complete URL beginning with http:// or https://.",
    );
  }
  assert.equal(eventFeatureSchema.safeParse({ featured: true }).success, true);
  assert.equal(eventPatchSchema.safeParse({
    location: null,
    virtualUrl: null,
    registrationUrl: null,
    contactEmail: null,
  }).success, true);
});

test("normalizes event boundaries in Eastern Time", () => {
  assert.equal(
    parseEventLocalBoundary("2026-09-01T17:30", false, "start")?.toISOString(),
    "2026-09-01T21:30:00.000Z",
  );
  assert.equal(
    parseEventLocalBoundary("2026-09-01", true, "end")?.toISOString(),
    "2026-09-02T03:59:59.999Z",
  );
  assert.equal(eventMonthBounds("2026-09")?.start.toISOString(), "2026-09-01T04:00:00.000Z");
});

test("requires complete event timing before publication", () => {
  assert.equal(eventPublicationIssue({ title: "Untitled event" }), "Add an event title before publishing.");
  assert.equal(
    eventPublicationIssue({
      title: "A complete event",
      start_at: "2026-09-01T21:30:00.000Z",
      end_at: "2026-09-01T22:30:00.000Z",
    }),
    null,
  );
});
