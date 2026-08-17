import type { ManagedEvent, PublicEvent } from "./event-types";
import { eventDateTimeLabel, eventPlaceLabel } from "./event-types";

export function initializeEventArticles(): void {
  document.querySelectorAll<HTMLElement>("[data-event-article]").forEach(async (root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";
    const preview = root.dataset.mode === "preview";
    const status = root.querySelector<HTMLElement>("[data-event-article-status]");
    const content = root.querySelector<HTMLElement>("[data-event-article-content]");
    const loading = root.querySelector<HTMLElement>("[data-event-loading]");
    const errorState = root.querySelector<HTMLElement>("[data-event-error]");
    const errorLabel = root.querySelector<HTMLElement>("[data-event-error-label]");
    const errorTitle = root.querySelector<HTMLElement>("[data-event-error-title]");
    const errorMessage = root.querySelector<HTMLElement>("[data-event-error-message]");
    const retry = root.querySelector<HTMLButtonElement>("[data-event-retry]");
    if (!status || !content || !loading || !errorState || !errorLabel || !errorTitle || !errorMessage || !retry) return;
    retry.addEventListener("click", () => window.location.reload());
    const showError = (notFound: boolean) => {
      loading.hidden = true;
      errorLabel.textContent = notFound ? "404 · Event not found" : "Event unavailable";
      errorTitle.textContent = notFound ? "This event could not be found." : "We couldn’t load this event.";
      errorMessage.textContent = notFound
        ? "The event may have moved, been archived, or may no longer be public."
        : "Please try again. If the problem continues, return to the events page.";
      errorState.hidden = false;
      status.classList.add("update-article__status--error");
    };
    const slug = new URLSearchParams(window.location.search).get("slug") || window.location.pathname.split("/").filter(Boolean).at(-1) || "";
    const endpoint = preview ? `/api/staff/preview-events/${encodeURIComponent(slug)}` : `/api/events/${encodeURIComponent(slug)}`;
    try {
      const response = await fetch(endpoint, { credentials: "same-origin" });
      if (preview && response.status === 401) {
        window.location.assign(`/manage/events/?return=${encodeURIComponent(window.location.pathname)}`); return;
      }
      if (preview && response.status === 403) { window.location.assign("/?auth=unauthorized"); return; }
      if (response.status === 404) { showError(true); return; }
      if (!response.ok) throw new Error("event_load_failed");
      const event = (await response.json() as { event: PublicEvent | ManagedEvent }).event;
      const title = root.querySelector<HTMLElement>("[data-event-article-title]");
      const summary = root.querySelector<HTMLElement>("[data-event-article-summary]");
      const badge = root.querySelector<HTMLElement>("[data-event-article-badge]");
      const hero = root.querySelector<HTMLElement>("[data-event-article-hero]");
      const heroImage = root.querySelector<HTMLImageElement>("[data-event-article-hero-image]");
      const when = root.querySelector<HTMLElement>("[data-event-article-when]");
      const place = root.querySelector<HTMLElement>("[data-event-article-place]");
      const links = root.querySelector<HTMLElement>("[data-event-article-links]");
      const body = root.querySelector<HTMLElement>("[data-event-article-body]");
      const calendar = root.querySelector<HTMLButtonElement>("[data-calendar-event]");
      if (!title || !summary || !badge || !hero || !heroImage || !when || !place || !links || !body || !calendar) return;
      title.textContent = event.title;
      if (event.summary) { summary.textContent = event.summary; summary.hidden = false; }
      if (preview && "status" in event) {
        badge.textContent = event.status; badge.className = `update-status update-status--${event.status}`; badge.hidden = false;
      }
      if (event.heroImageUrl) { heroImage.src = event.heroImageUrl; heroImage.alt = `Hero image for ${event.title}`; hero.hidden = false; }
      when.textContent = eventDateTimeLabel(event);
      place.textContent = eventPlaceLabel(event);
      const linkItems: HTMLElement[] = [];
      const addLink = (label: string, href: string) => {
        const anchor = document.createElement("a"); anchor.href = href; anchor.textContent = label;
        if (href.startsWith("http")) { anchor.target = "_blank"; anchor.rel = "noreferrer"; }
        linkItems.push(anchor);
      };
      if (event.virtualUrl) addLink("Join virtual event", event.virtualUrl);
      if (event.registrationUrl) addLink("Registration or details", event.registrationUrl);
      if (event.contactEmail) addLink("Contact the event organizer", `mailto:${event.contactEmail}`);
      if (linkItems.length) links.replaceChildren(...linkItems);
      else links.remove();
      body.innerHTML = event.detailsHtml || "<p>More details will be shared soon.</p>";
      calendar.dataset.eventTitle = event.title;
      calendar.dataset.eventDescription = event.summary || "UNC Student Government Executive Branch event";
      calendar.dataset.eventStart = event.startAt;
      calendar.dataset.eventEnd = event.endAt;
      calendar.dataset.eventAllDay = String(event.allDay);
      calendar.dataset.eventLocation = event.location || "";
      calendar.dataset.eventUrl = window.location.href;
      document.title = `${event.title} | UNC Student Government Executive Branch`;
      status.hidden = true; content.hidden = false;
    } catch { showError(false); }
  });
}
