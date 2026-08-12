import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyEmailDeliveryEvent,
  otpEmailContent,
  publicOtpDeliveryResult,
  unconfirmedDeliveryMessage,
} from "./email-delivery.js";

test("treats only recipient-server receipt events as confirmed delivery", () => {
  for (const event of ["delivered", "opened", "clicked", "complained"]) {
    assert.deepEqual(classifyEmailDeliveryEvent(event), { kind: "confirmed" });
  }

  for (const event of ["queued", "scheduled", "sent", "delivery_delayed"]) {
    assert.deepEqual(classifyEmailDeliveryEvent(event), { kind: "pending" });
  }
});

test("returns descriptive messages for terminal delivery failures", () => {
  for (const event of ["bounced", "suppressed", "failed", "canceled"]) {
    const result = classifyEmailDeliveryEvent(event);
    assert.equal(result.kind, "failed");
    if (result.kind === "failed") assert.match(result.message, /bhilberg@unc\.edu|try again/);
  }
});

test("distinguishes delayed delivery from an unconfirmed send", () => {
  assert.match(unconfirmedDeliveryMessage("delivery_delayed"), /temporarily delayed/);
  assert.match(unconfirmedDeliveryMessage("sent"), /not yet confirmed delivery/);
});

test("preserves confirmed delivery when removing internal status metadata", () => {
  assert.deepEqual(
    publicOtpDeliveryResult({
      success: true,
      acceptedByRecipientServer: true,
      recordedAt: Date.now(),
    }),
    { success: true, acceptedByRecipientServer: true },
  );
});

test("builds the concise updates-management OTP message", () => {
  assert.deepEqual(otpEmailContent("123456"), {
    subject: "123456 is your code",
    text: "Enter code 123456 to proceed to manage updates.",
    html: "<p>Enter code <strong>123456</strong> to proceed to manage updates.</p>",
  });
});
