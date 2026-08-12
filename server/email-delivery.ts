export type EmailDeliveryState =
  | { kind: "confirmed" }
  | { kind: "pending" }
  | { kind: "failed"; message: string };

export type OtpDeliveryResult =
  | { success: true; acceptedByRecipientServer: boolean; message?: never }
  | { success: false; acceptedByRecipientServer: false; message: string };

export function publicOtpDeliveryResult(
  result: OtpDeliveryResult & { recordedAt: number },
): OtpDeliveryResult {
  if (result.success) {
    return {
      success: true,
      acceptedByRecipientServer: result.acceptedByRecipientServer,
    };
  }
  return {
    success: false,
    acceptedByRecipientServer: false,
    message: result.message,
  };
}

const confirmedEvents = new Set(["delivered", "opened", "clicked", "complained"]);

export function classifyEmailDeliveryEvent(event: string): EmailDeliveryState {
  if (confirmedEvents.has(event)) return { kind: "confirmed" };

  switch (event) {
    case "bounced":
      return {
        kind: "failed",
        message:
          "UNC’s mail system rejected the sign-in email. Confirm your Onyen and try again. If the address is correct, contact bhilberg@unc.edu.",
      };
    case "suppressed":
      return {
        kind: "failed",
        message:
          "The sign-in email was not sent because this address is on the email provider’s suppression list, usually after a previous bounce or spam report. Contact bhilberg@unc.edu for help.",
      };
    case "failed":
    case "canceled":
      return {
        kind: "failed",
        message:
          "The email provider could not deliver the sign-in code. Please wait a moment and try again. If the problem continues, contact bhilberg@unc.edu.",
      };
    default:
      return { kind: "pending" };
  }
}

export function unconfirmedDeliveryMessage(lastEvent: string): string {
  if (lastEvent === "delivery_delayed") {
    return "UNC’s mail system has temporarily delayed the sign-in email. It may still arrive. Wait a minute, then check Inbox, Junk Email, and quarantine before requesting another code.";
  }

  return "The email provider accepted the sign-in code, but UNC’s mail system has not yet confirmed delivery. The message may still arrive. Wait a minute, then check Inbox, Junk Email, and quarantine before trying again.";
}

export class OtpDeliveryError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "OtpDeliveryError";
  }
}

export function otpEmailContent(otp: string) {
  return {
    subject: `${otp} is your code`,
    text: `Enter code ${otp} to proceed to manage updates.`,
    html: `<p>Enter code <strong>${otp}</strong> to proceed to manage updates.</p>`,
  };
}
