import "dotenv/config";

process.env.NODE_ENV ??= "development";

const defaultBaseUrl = "http://localhost:4321";

function requiredInProduction(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production.`);
  }
  return fallback;
}

export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  baseUrl: process.env.PUBLIC_BASE_URL ?? defaultBaseUrl,
  databaseUrl: requiredInProduction(
    "DATABASE_URL",
    "postgres://uncsg:uncsg@localhost:5432/uncsg_updates",
  ),
  authSecret: requiredInProduction(
    "BETTER_AUTH_SECRET",
    "development-only-secret-change-before-deployment-32-characters",
  ),
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom:
    process.env.EMAIL_FROM ??
    "Updates Management <manageupdates@sgeb.bennetthilberg.com>",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "bhilberg@unc.edu",
  uncAuthBrokerUrl:
    process.env.UNC_AUTH_BROKER_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu"
      : "http://localhost:8790"),
  uncAuthBrokerClientId:
    process.env.UNC_AUTH_BROKER_CLIENT_ID ?? "uncsg-updates",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  microsoftTenantId:
    process.env.MICROSOFT_TENANT_ID ?? "58b3d54f-16c9-42d3-af08-1fcabd095666",
  isProduction: process.env.NODE_ENV === "production",
  maxImageBytes: 5 * 1024 * 1024,
};

export const microsoftAuthConfigured = Boolean(
  config.microsoftClientId && config.microsoftClientSecret,
);

export const uncOpenShiftAuthConfigured = Boolean(
  config.uncAuthBrokerUrl && config.uncAuthBrokerClientId,
);

export const trustedOrigins = Array.from(
  new Set([
    config.baseUrl,
    "http://localhost:4321",
    "http://127.0.0.1:4321",
  ]),
);
