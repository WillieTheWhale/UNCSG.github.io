import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import {
  genericOAuth,
  microsoftEntraId,
} from "better-auth/plugins/generic-oauth";
import { Resend } from "resend";
import { pool } from "./db.js";
import {
  config,
  microsoftAuthConfigured,
  trustedOrigins,
  uncOpenShiftAuthConfigured,
} from "./config.js";
import { normalizeUncEmail } from "./access.js";
import {
  classifyEmailDeliveryEvent,
  otpEmailContent,
  OtpDeliveryError,
  type OtpDeliveryResult,
  publicOtpDeliveryResult,
  unconfirmedDeliveryMessage,
} from "./email-delivery.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
const developmentOtps = new Map<string, string>();
const otpDeliveryResults = new Map<
  string,
  OtpDeliveryResult & { recordedAt: number }
>();

function recordOtpDelivery(
  requestId: string | null,
  result: OtpDeliveryResult,
): void {
  if (!requestId || !/^[a-f0-9-]{36}$/i.test(requestId)) return;
  const now = Date.now();
  for (const [id, entry] of otpDeliveryResults) {
    if (now - entry.recordedAt > 2 * 60 * 1000) otpDeliveryResults.delete(id);
  }
  otpDeliveryResults.set(requestId, { ...result, recordedAt: now });
}

export function consumeOtpDeliveryResult(
  requestId: string,
): OtpDeliveryResult | null {
  const result = otpDeliveryResults.get(requestId);
  if (!result) return null;
  otpDeliveryResults.delete(requestId);
  return publicOtpDeliveryResult(result);
}

export function developmentOtpForEmail(emailValue: string): string | null {
  if (config.isProduction) return null;
  const email = normalizeUncEmail(emailValue);
  return email ? developmentOtps.get(email) ?? null : null;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function resendRequestFailureMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit")) {
    return "The email service is receiving too many requests. Wait one minute before requesting another code.";
  }
  if (normalized.includes("api key") || normalized.includes("unauthorized")) {
    return "Sign-in email is temporarily unavailable because the email service is not configured correctly. Contact bhilberg@unc.edu.";
  }
  if (normalized.includes("domain") || normalized.includes("from")) {
    return "Sign-in email is temporarily unavailable because the sender domain could not be verified. Contact bhilberg@unc.edu.";
  }
  return "The email provider could not accept the sign-in message. Please wait a moment and try again. If the problem continues, contact bhilberg@unc.edu.";
}

async function confirmOtpDelivery(emailId: string): Promise<void> {
  if (!resend) throw new OtpDeliveryError("Email delivery is not configured.");

  const deadline = Date.now() + 12_000;
  let lastEvent = "sent";

  while (Date.now() < deadline) {
    const { data, error } = await resend.emails.get(emailId);
    if (!error && data) {
      lastEvent = data.last_event;
      const state = classifyEmailDeliveryEvent(lastEvent);
      if (state.kind === "confirmed") return;
      if (state.kind === "failed") throw new OtpDeliveryError(state.message);
    }
    await wait(750);
  }

  throw new OtpDeliveryError(unconfirmedDeliveryMessage(lastEvent));
}

async function deliverOtp(
  emailValue: string,
  otp: string,
): Promise<"delivered" | "development"> {
  const email = normalizeUncEmail(emailValue);
  if (!email) {
    throw new Error("Sign-in is limited to UNC email addresses.");
  }

  if (!config.isProduction) {
    developmentOtps.set(email, otp);
    console.info(`[updates auth] Development code for ${email}: ${otp}`);
  }

  if (!resend) {
    if (config.isProduction) {
      throw new OtpDeliveryError(
        "Sign-in email is temporarily unavailable because the email service is not configured. Contact bhilberg@unc.edu.",
      );
    }
    return "development";
  }

  const idempotencyKey = `otp-${createHash("sha256")
    .update(`${email}:${otp}`)
    .digest("hex")}`;
  const retryableErrors = new Set([
    "application_error",
    "internal_server_error",
    "rate_limit_exceeded",
  ]);
  const retryDelays = [0, 300, 900];
  let lastError: { name?: string; message: string } | null = null;

  for (const delay of retryDelays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const content = otpEmailContent(otp);
    const { data, error } = await resend.emails.send(
      {
        from: config.emailFrom,
        replyTo: config.emailReplyTo,
        to: email,
        ...content,
      },
      { idempotencyKey },
    );

    if (!error && data?.id) {
      await confirmOtpDelivery(data.id);
      return "delivered";
    }
    if (!error) {
      throw new OtpDeliveryError(
        "The email provider accepted the request without a delivery receipt. For safety, the code was not marked as delivered. Please try again.",
      );
    }
    lastError = error;
    if (!retryableErrors.has(error.name ?? "")) break;
  }

  throw new OtpDeliveryError(
    resendRequestFailureMessage(lastError?.message ?? "Unknown email error"),
  );
}

export const auth = betterAuth({
  appName: "UNC Student Government Executive Branch",
  baseURL: config.baseUrl,
  basePath: "/api/auth",
  database: pool,
  secret: config.authSecret,
  trustedOrigins,
  emailAndPassword: { enabled: false },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 12,
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  plugins: [
    ...(uncOpenShiftAuthConfigured || microsoftAuthConfigured
      ? [
          genericOAuth({
            config: [
              ...(uncOpenShiftAuthConfigured
                ? [
                    {
                      providerId: "unc-openshift",
                      authorizationUrl: `${config.uncAuthBrokerUrl}/authorize`,
                      tokenUrl: `${config.uncAuthBrokerUrl}/token`,
                      userInfoUrl: `${config.uncAuthBrokerUrl}/userinfo`,
                      clientId: config.uncAuthBrokerClientId,
                      scopes: ["openid", "profile", "email"],
                      pkce: true,
                    },
                  ]
                : []),
              ...(microsoftAuthConfigured
                ? [
                    microsoftEntraId({
                      clientId: config.microsoftClientId!,
                      clientSecret: config.microsoftClientSecret!,
                      tenantId: config.microsoftTenantId,
                      scopes: ["openid", "profile", "email"],
                    }),
                  ]
                : []),
            ],
          }),
        ]
      : []),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }, context) {
        if (type !== "sign-in") return;
        const requestId = context?.request?.headers.get("x-otp-request-id") ?? null;
        try {
          const delivery = await deliverOtp(email, otp);
          recordOtpDelivery(requestId, {
            success: true,
            acceptedByRecipientServer: delivery === "delivered",
          });
        } catch (error) {
          const message =
            error instanceof OtpDeliveryError
              ? error.publicMessage
              : "We couldn’t verify delivery of the sign-in code. Please try again. If the problem continues, contact bhilberg@unc.edu.";
          recordOtpDelivery(requestId, {
            success: false,
            acceptedByRecipientServer: false,
            message,
          });
          throw error;
        }
      },
    }),
  ],
});
