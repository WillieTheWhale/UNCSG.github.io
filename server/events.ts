import { DateTime } from "luxon";

export const eventTimeZone = "America/New_York";

export function parseEventLocalBoundary(
  value: string | null,
  allDay: boolean,
  boundary: "start" | "end",
): Date | null {
  if (!value) return null;
  const dateTime = DateTime.fromISO(value, { zone: eventTimeZone });
  if (!dateTime.isValid) return null;
  const normalized = allDay
    ? boundary === "start"
      ? dateTime.startOf("day")
      : dateTime.endOf("day")
    : dateTime;
  return normalized.toUTC().toJSDate();
}

export function eventMonthBounds(month: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = DateTime.fromFormat(month, "yyyy-MM", { zone: eventTimeZone }).startOf("month");
  if (!start.isValid) return null;
  return {
    start: start.toUTC().toJSDate(),
    end: start.plus({ months: 1 }).toUTC().toJSDate(),
  };
}

export function eventPublicationIssue(row: Record<string, unknown>): string | null {
  const title = String(row.title ?? "").trim();
  if (!title || title.toLowerCase() === "untitled event") {
    return "Add an event title before publishing.";
  }
  const start = row.start_at ? new Date(String(row.start_at)) : null;
  const end = row.end_at ? new Date(String(row.end_at)) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return "Choose a start date before publishing.";
  }
  if (!end || Number.isNaN(end.getTime())) {
    return "Choose an end date before publishing.";
  }
  if (end.getTime() <= start.getTime()) {
    return "The event must end after it starts.";
  }
  return null;
}
