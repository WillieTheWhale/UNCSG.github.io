interface UpdateSummary {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  status?: "preview" | "scheduled" | "published" | "archived";
  publishedAt?: string | null;
  publishAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

function displayDate(update: UpdateSummary): string {
  const raw = update.publishAt ?? update.publishedAt ?? update.createdAt ?? update.updatedAt;
  if (!raw) return "Date forthcoming";
  return dateFormatter.format(new Date(raw));
}

function card(update: UpdateSummary, preview: boolean): HTMLElement {
  const article = document.createElement("article");
  article.className = "updates-card";

  const href = `${preview ? "/preview-updates" : "/updates"}/${encodeURIComponent(update.slug)}`;
  if (update.heroImageUrl) {
    const link = document.createElement("a");
    link.className = "updates-card__image";
    link.href = href;
    link.tabIndex = -1;
    link.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = update.heroImageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    link.append(image);
    article.append(link);
  }

  const body = document.createElement("div");
  body.className = "updates-card__body";
  const meta = document.createElement("div");
  meta.className = "updates-card__meta";
  const time = document.createElement("time");
  time.dateTime = update.publishAt ?? update.publishedAt ?? update.createdAt ?? "";
  time.textContent = displayDate(update);
  meta.append(time);
  if (preview && update.status) {
    const badge = document.createElement("span");
    badge.className = `update-status update-status--${update.status}`;
    badge.textContent = update.status;
    meta.append(badge);
  }

  const heading = document.createElement("h2");
  const headingLink = document.createElement("a");
  headingLink.href = href;
  headingLink.textContent = update.title;
  heading.append(headingLink);

  const read = document.createElement("a");
  read.className = "updates-card__read";
  read.href = href;
  read.setAttribute("aria-label", `${preview ? "Preview" : "Read"} ${update.title}`);
  read.innerHTML = `${preview ? "Preview update" : "Read update"} <span aria-hidden="true">→</span>`;

  body.append(meta, heading, read);
  article.append(body);
  return article;
}

async function loadListing(root: HTMLElement): Promise<void> {
  const preview = root.dataset.mode === "preview";
  const endpoint = preview ? "/api/staff/preview-updates" : "/api/updates";
  const status = root.querySelector<HTMLElement>("[data-list-status]");
  const grid = root.querySelector<HTMLElement>("[data-list-grid]");
  if (!status || !grid) return;

  try {
    const response = await fetch(endpoint, { credentials: "same-origin" });
    if (response.status === 401 && preview) {
      window.location.assign(`/manage/updates/?return=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (response.status === 403 && preview) {
      window.location.assign("/?auth=unauthorized");
      return;
    }
    if (!response.ok) throw new Error("Unable to load updates.");
    const data = (await response.json()) as { updates: UpdateSummary[] };
    status.hidden = true;
    grid.replaceChildren(...data.updates.map((update) => card(update, preview)));
    if (!data.updates.length) {
      status.hidden = false;
      status.textContent = preview
        ? "There are no public or preview updates yet."
        : "No updates have been published yet. Check back soon.";
    }
  } catch {
    status.hidden = false;
    status.classList.add("updates-listing__status--error");
    status.textContent = "Updates could not be loaded right now. Please try again shortly.";
  }
}

export function initializeUpdateListings(): void {
  document.querySelectorAll<HTMLElement>("[data-updates-listing]").forEach((root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";
    void loadListing(root);
  });
}
