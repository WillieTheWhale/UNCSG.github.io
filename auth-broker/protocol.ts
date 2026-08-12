import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const authorizationLifetimeMs = 5 * 60 * 1000;
export const codeLifetimeMs = 60 * 1000;
export const accessTokenLifetimeMs = 2 * 60 * 1000;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function validOnyen(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value);
}

export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function openShiftAccessTokenName(accessToken: string): string {
  return `sha256~${sha256Base64Url(accessToken)}`;
}
