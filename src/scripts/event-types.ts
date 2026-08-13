export type EventStatus = "preview" | "scheduled" | "published" | "archived";
export type EventFormat = "in-person" | "virtual" | "hybrid";

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  summary: string;
  detailsHtml: string;
  heroImageUrl: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  format: EventFormat;
  location: string | null;
  virtualUrl: string | null;
  registrationUrl: string | null;
  contactEmail: string | null;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
}

export interface ManagedEvent extends PublicEvent {
  detailsMarkdown: string;
  heroMediaId: string | null;
  status: EventStatus;
  publishAt: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export const eventDateParts = (event: Pick<PublicEvent, "startAt">) => {
  const date = new Date(event.startAt);
  return {
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "America/New_York" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "America/New_York" }).format(date).toUpperCase(),
  };
};

export const eventDateTimeLabel = (event: Pick<PublicEvent, "startAt" | "endAt" | "allDay">): string => {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York",
  });
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/New_York",
  });
  const startDate = dateFormatter.format(start);
  const differentDay = dayKey.format(start) !== dayKey.format(end);
  if (event.allDay) return differentDay ? `${startDate}–${dateFormatter.format(end)} · All day` : `${startDate} · All day`;
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  });
  return differentDay
    ? `${startDate}, ${time.format(start)}–${dateFormatter.format(end)}, ${time.format(end)}`
    : `${startDate} · ${time.format(start)}–${time.format(end)}`;
};

export const eventPlaceLabel = (event: Pick<PublicEvent, "format" | "location">): string => {
  if (event.format === "virtual") return "Virtual event";
  if (event.format === "hybrid") return event.location ? `${event.location} · Hybrid` : "Hybrid event";
  return event.location || "Location to be announced";
};
