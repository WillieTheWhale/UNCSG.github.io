const easternDate = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/New_York",
});

const compactDate = (value: string): string =>
  easternDate.format(new Date(value)).replaceAll("-", "");

const nextCompactDate = (value: string): string => {
  const localDate = easternDate.format(new Date(value));
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
};

const compactUtcDateTime = (value: string): string =>
  new Date(value).toISOString().replaceAll(/[-:]/g, "").replace(".000", "");

const escapeCalendarText = (value: string): string =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");

const slugify = (value: string): string =>
  value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";

export function initializeEventCalendar(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-calendar-dialog]");
  const eventName = dialog?.querySelector<HTMLElement>("[data-calendar-dialog-event]");
  const appleLink = dialog?.querySelector<HTMLAnchorElement>("[data-calendar-apple]");
  const googleLink = dialog?.querySelector<HTMLAnchorElement>("[data-calendar-google]");
  const outlookLink = dialog?.querySelector<HTMLAnchorElement>("[data-calendar-outlook]");
  if (!dialog || !eventName || !appleLink || !googleLink || !outlookLink || dialog.dataset.initialized) return;
  dialog.dataset.initialized = "true";
  let downloadUrl = "";

  document.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-calendar-event]");
    if (!button) return;
    const title = button.dataset.eventTitle ?? "Executive Branch event";
    const description = button.dataset.eventDescription ?? "";
    const start = button.dataset.eventStart ?? "";
    const end = button.dataset.eventEnd ?? "";
    const allDay = button.dataset.eventAllDay === "true";
    const location = button.dataset.eventLocation ?? "";
    const eventUrl = button.dataset.eventUrl ?? window.location.href;
    if (!start || !end) return;

    const calendarStart = allDay ? compactDate(start) : compactUtcDateTime(start);
    const calendarEnd = allDay ? nextCompactDate(end) : compactUtcDateTime(end);
    const dateProperty = allDay ? ";VALUE=DATE" : "";
    eventName.textContent = title;

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    const calendarFile = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UNC Student Government Executive Branch//Events//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${slugify(title)}-${calendarStart}@executivebranch.unc.edu`,
      `DTSTART${dateProperty}:${calendarStart}`,
      `DTEND${dateProperty}:${calendarEnd}`,
      `SUMMARY:${escapeCalendarText(title)}`,
      `DESCRIPTION:${escapeCalendarText(description)}`,
      ...(location ? [`LOCATION:${escapeCalendarText(location)}`] : []),
      `URL:${escapeCalendarText(eventUrl)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    downloadUrl = URL.createObjectURL(new Blob([calendarFile], { type: "text/calendar;charset=utf-8" }));
    appleLink.href = downloadUrl;
    appleLink.download = `${slugify(title)}.ics`;

    const dates = `${calendarStart}/${calendarEnd}`;
    const googleUrl = new URL("https://calendar.google.com/calendar/render");
    googleUrl.search = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates,
      details: description,
      location,
    }).toString();
    googleLink.href = googleUrl.toString();

    const outlookUrl = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
    outlookUrl.search = new URLSearchParams({
      subject: title,
      startdt: start,
      enddt: end,
      body: description,
      location,
      allday: String(allDay),
    }).toString();
    outlookLink.href = outlookUrl.toString();
    dialog.showModal();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (!downloadUrl) return;
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = "";
  });
}
