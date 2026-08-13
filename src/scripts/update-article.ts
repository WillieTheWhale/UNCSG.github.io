interface Article {
  title: string;
  slug: string;
  bodyHtml: string;
  heroImageUrl: string | null;
  status?: string;
  publishedAt?: string | null;
  publishAt?: string | null;
  createdAt?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

function slugFromLocation(preview: boolean): string {
  const explicit = new URLSearchParams(window.location.search).get("slug");
  if (explicit) return explicit;
  const prefix = preview ? "/preview-updates/" : "/updates/";
  return decodeURIComponent(window.location.pathname.slice(prefix.length).replace(/\/$/, ""));
}

async function loadArticle(root: HTMLElement): Promise<void> {
  const preview = root.dataset.mode === "preview";
  const slug = slugFromLocation(preview);
  const status = root.querySelector<HTMLElement>("[data-article-status]");
  const content = root.querySelector<HTMLElement>("[data-article-content]");
  const loading = root.querySelector<HTMLElement>("[data-article-loading]");
  const errorState = root.querySelector<HTMLElement>("[data-article-error]");
  const errorLabel = root.querySelector<HTMLElement>("[data-article-error-label]");
  const errorTitle = root.querySelector<HTMLElement>("[data-article-error-title]");
  const errorMessage = root.querySelector<HTMLElement>("[data-article-error-message]");
  const retry = root.querySelector<HTMLButtonElement>("[data-article-retry]");
  if (!status || !content || !loading || !errorState || !errorLabel || !errorTitle || !errorMessage || !retry) return;
  retry.addEventListener("click", () => window.location.reload());
  const showError = (notFound: boolean) => {
    loading.hidden = true;
    errorLabel.textContent = notFound ? "404 · Update not found" : "Update unavailable";
    errorTitle.textContent = notFound ? "This update could not be found." : "We couldn’t load this update.";
    errorMessage.textContent = notFound
      ? "The update may have moved, been archived, or may no longer be public."
      : "Please try again. If the problem continues, return to the updates page.";
    errorState.hidden = false;
    status.classList.add("update-article__status--error");
  };
  if (!slug || slug === "article") {
    showError(true);
    return;
  }
  const endpoint = preview
    ? `/api/staff/preview-updates/${encodeURIComponent(slug)}`
    : `/api/updates/${encodeURIComponent(slug)}`;

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
    if (response.status === 404) {
      showError(true);
      return;
    }
    if (!response.ok) throw new Error("Unable to load article");
    const data = (await response.json()) as { update: Article };
    const update = data.update;
    const title = root.querySelector<HTMLElement>("[data-article-title]");
    const date = root.querySelector<HTMLTimeElement>("[data-article-date]");
    const body = root.querySelector<HTMLElement>("[data-article-body]");
    const hero = root.querySelector<HTMLElement>("[data-article-hero]");
    const heroImage = root.querySelector<HTMLImageElement>("[data-article-hero-image]");
    const badge = root.querySelector<HTMLElement>("[data-article-badge]");
    if (!title || !date || !body || !hero || !heroImage || !badge) return;

    title.textContent = update.title;
    const rawDate = update.publishAt ?? update.publishedAt ?? update.createdAt;
    date.textContent = rawDate ? dateFormatter.format(new Date(rawDate)) : "Date forthcoming";
    date.dateTime = rawDate ?? "";
    body.innerHTML = update.bodyHtml;
    if (update.heroImageUrl) {
      heroImage.src = update.heroImageUrl;
      hero.hidden = false;
    }
    if (preview && update.status) {
      badge.textContent = update.status;
      badge.classList.add(`update-status--${update.status}`);
      badge.hidden = false;
    }
    document.title = `${update.title} | UNC Student Government Executive Branch`;
    status.hidden = true;
    content.hidden = false;
  } catch { showError(false); }
}

export function initializeUpdateArticles(): void {
  document.querySelectorAll<HTMLElement>("[data-update-article]").forEach((root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";
    void loadArticle(root);
  });
}
