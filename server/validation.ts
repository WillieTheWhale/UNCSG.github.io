import { z } from "zod";

export const articlePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")
      .optional(),
    bodyMarkdown: z.string().max(500_000).optional(),
    heroMediaId: z.uuid().nullable().optional(),
  })
  .strict();

export const scheduleSchema = z
  .object({
    publishAtLocal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a valid date and time."),
  })
  .strict();

const optionalUrl = (fieldLabel: string) => z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, `${fieldLabel}: enter a complete URL beginning with http:// or https://.`);

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.");

const eventLocalDate = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/,
    "Choose a valid date and time.",
  )
  .nullable();

export const eventPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")
      .optional(),
    summary: z.string().trim().max(600).optional(),
    detailsMarkdown: z.string().max(500_000).optional(),
    heroMediaId: z.uuid().nullable().optional(),
    startAtLocal: eventLocalDate.optional(),
    endAtLocal: eventLocalDate.optional(),
    allDay: z.boolean().optional(),
    format: z.enum(["in-person", "virtual", "hybrid"]).optional(),
    location: z.string().trim().max(240).nullable().optional(),
    virtualUrl: optionalUrl("Virtual link").nullable().optional(),
    registrationUrl: optionalUrl("Registration or details link").nullable().optional(),
    contactEmail: optionalEmail.nullable().optional(),
  })
  .strict();

export const eventFeatureSchema = z
  .object({ featured: z.boolean() })
  .strict();

export function slugifyTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug || "untitled-update";
}

export function slugifyEventTitle(title: string): string {
  const slug = slugifyTitle(title);
  return slug === "untitled-update" ? "untitled-event" : slug;
}
