import "dotenv/config";
import { readFile } from "node:fs/promises";

process.env.NODE_ENV ??= "development";

const isProduction = process.env.NODE_ENV === "production";
const defaultBrokerBaseUrl = isProduction
  ? "https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu"
  : "http://localhost:8790";

function splitList(value: string | undefined, fallback: string[]): string[] {
  return (value ? value.split(",") : fallback)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const brokerConfig = {
  port: Number(process.env.BROKER_PORT ?? 8790),
  baseUrl: process.env.BROKER_BASE_URL ?? defaultBrokerBaseUrl,
  mainClientId: process.env.MAIN_CLIENT_ID ?? "uncsg-updates",
  mainRedirectUris: splitList(process.env.MAIN_REDIRECT_URIS, [
    "https://executivebranch.unc.edu/api/auth/oauth2/callback/unc-openshift",
    "http://localhost:4321/api/auth/oauth2/callback/unc-openshift",
  ]),
  openShiftOAuthBaseUrl:
    process.env.OPENSHIFT_OAUTH_BASE_URL ??
    "https://oauth-openshift.apps.cloudapps.unc.edu",
  openShiftApiBaseUrl:
    process.env.OPENSHIFT_API_BASE_URL ?? "https://api.cloudapps.unc.edu:6443",
  openShiftServiceAccount:
    process.env.OPENSHIFT_SERVICE_ACCOUNT ?? "uncsg-auth-broker",
  openShiftNamespace: process.env.OPENSHIFT_NAMESPACE,
  openShiftClientSecret: process.env.OPENSHIFT_CLIENT_SECRET,
  openShiftTokenFile:
    process.env.OPENSHIFT_TOKEN_FILE ??
    "/var/run/secrets/kubernetes.io/serviceaccount/token",
  openShiftNamespaceFile:
    process.env.OPENSHIFT_NAMESPACE_FILE ??
    "/var/run/secrets/kubernetes.io/serviceaccount/namespace",
  devOnyen: isProduction ? undefined : process.env.BROKER_DEV_ONYEN,
  isProduction,
};

export async function openShiftNamespace(): Promise<string> {
  if (brokerConfig.openShiftNamespace) return brokerConfig.openShiftNamespace;
  try {
    return (await readFile(brokerConfig.openShiftNamespaceFile, "utf8")).trim();
  } catch {
    if (!brokerConfig.isProduction) return "bhilberg";
    throw new Error("The OpenShift namespace could not be determined.");
  }
}

export async function openShiftClientSecret(): Promise<string> {
  if (brokerConfig.openShiftClientSecret) {
    return brokerConfig.openShiftClientSecret.trim();
  }
  try {
    return (await readFile(brokerConfig.openShiftTokenFile, "utf8")).trim();
  } catch {
    throw new Error("The OpenShift service-account token is unavailable.");
  }
}

export async function openShiftClientId(): Promise<string> {
  return `system:serviceaccount:${await openShiftNamespace()}:${brokerConfig.openShiftServiceAccount}`;
}
