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
