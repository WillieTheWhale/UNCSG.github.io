import type { ManagedEvent, PublicEvent } from "./event-types";
import { eventDateParts, eventDateTimeLabel, eventPlaceLabel } from "./event-types";

const apiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json() as { message?: string; error?: string };
    return data.message || data.error?.replaceAll("_", " ") || "Unable to load events.";
  } catch { return "Unable to load events."; }
};

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character] ?? character));

const card = (event: PublicEvent | ManagedEvent, preview: boolean): HTMLElement => {
  const article = document.createElement("article");
  article.className = "events-card";
  const { day, month } = eventDateParts(event);
  const href = `${preview ? "/preview-events" : "/events"}/${encodeURIComponent(event.slug)}`;
  const badge = preview && "status" in event
    ? `<span class="update-status update-status--${event.status}">${event.status}</span>`
    : "";
  const summary = event.summary ? `<p>${escapeHtml(event.summary)}</p>` : "";
  article.innerHTML = `
    <div class="events-card__date"><time datetime="${event.startAt}"><b>${day}</b><span>${month}</span></time>${badge}</div>
    <div class="events-card__body">
      <p class="events-card__when">${escapeHtml(eventDateTimeLabel(event))}</p>
      <h2><a href="${href}">${escapeHtml(event.title)}</a></h2>
      ${summary}
      <p class="events-card__place">${escapeHtml(eventPlaceLabel(event))}</p>
      <div class="events-card__actions">
        <button type="button" data-calendar-event aria-haspopup="dialog">Add to calendar</button>
        <a href="${href}">Event details <span aria-hidden="true">→</span></a>
      </div>
    </div>`;
  const calendar = article.querySelector<HTMLButtonElement>("[data-calendar-event]");
  if (calendar) {
    calendar.dataset.eventTitle = event.title;
    calendar.dataset.eventDescription = event.summary || "UNC Student Government Executive Branch event";
    calendar.dataset.eventStart = event.startAt;
    calendar.dataset.eventEnd = event.endAt;
    calendar.dataset.eventAllDay = String(event.allDay);
    calendar.dataset.eventLocation = event.location || "";
    calendar.dataset.eventUrl = `${window.location.origin}${href}`;
  }
  return article;
};

export function initializeEventListings(): void {
  document.querySelectorAll<HTMLElement>("[data-events-listing]").forEach((root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";
    const preview = root.dataset.mode === "preview";
    const form = root.querySelector<HTMLFormElement>("[data-event-filters]");
    const status = root.querySelector<HTMLElement>("[data-event-list-status]");
    const grid = root.querySelector<HTMLElement>("[data-event-list-grid]");
    const clear = root.querySelector<HTMLButtonElement>("[data-clear-event-filters]");
    if (!form || !status || !grid || !clear) return;
    const scope = form.elements.namedItem("scope") as HTMLSelectElement;
    const format = form.elements.namedItem("format") as HTMLSelectElement;
    const query = new URLSearchParams(window.location.search);
    scope.value = query.get("when") || "upcoming";
    format.value = query.get("format") || "";

    const load = async () => {
      status.hidden = false;
      status.innerHTML = '<span class="updates-loading" aria-hidden="true"></span> Loading events…';
      grid.hidden = true;
      const params = new URLSearchParams({ scope: scope.value, limit: "100" });
      if (format.value) params.set("format", format.value);
      try {
        const endpoint = preview ? "/api/staff/preview-events" : `/api/events?${params}`;
        const response = await fetch(endpoint, { credentials: "same-origin" });
        if (preview && response.status === 401) {
          window.location.assign(`/manage/events/?return=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        if (preview && response.status === 403) {
          window.location.assign("/?auth=unauthorized");
          return;
        }
        if (!response.ok) throw new Error(await apiError(response));
        let events = (await response.json() as { events: Array<PublicEvent | ManagedEvent> }).events;
        if (preview) {
          const now = Date.now();
          events = events.filter((event) => {
            const ends = new Date(event.endAt).getTime();
            if (scope.value === "upcoming" && ends < now) return false;
            if (scope.value === "past" && ends >= now) return false;
            if (format.value && event.format !== format.value) return false;
            return true;
          });
        }
        const nextQuery = new URLSearchParams();
        if (scope.value !== "upcoming") nextQuery.set("when", scope.value);
        if (format.value) nextQuery.set("format", format.value);
        history.replaceState(null, "", `${window.location.pathname}${nextQuery.size ? `?${nextQuery}` : ""}`);
        if (!events.length) {
          status.textContent = scope.value === "past" ? "No past events match these filters." : "No upcoming events match these filters.";
          return;
        }
        grid.replaceChildren(...events.map((event) => card(event, preview)));
        status.hidden = true;
        grid.hidden = false;
      } catch (error) {
        status.textContent = (error as Error).message;
        status.classList.add("events-listing__status--error");
      }
    };
    form.addEventListener("change", load);
    clear.addEventListener("click", () => {
      scope.value = "upcoming"; format.value = ""; load();
    });
    load();
  });
}
