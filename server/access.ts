export const allowedOnyens = new Set([
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

const allowedDomains = new Set(["unc.edu", "ad.unc.edu", "live.unc.edu"]);
const canonicalUncDomain = "ad.unc.edu";

export function normalizeUncEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  const separator = email.lastIndexOf("@");
  if (separator <= 0) return null;

  const localPart = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (!localPart || !allowedDomains.has(domain)) return null;
  return `${localPart}@${canonicalUncDomain}`;
}

export function onyenFromEmail(value: string): string | null {
  const email = normalizeUncEmail(value);
  return email ? email.slice(0, email.lastIndexOf("@")) : null;
}

export function isAllowedStaffEmail(value: string): boolean {
  const onyen = onyenFromEmail(value);
  return Boolean(onyen && allowedOnyens.has(onyen));
}
