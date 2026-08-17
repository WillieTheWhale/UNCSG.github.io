type NewsItem = {
  id: string;
  title: string;
  outlet: string;
  articleUrl: string;
  publishedOn: string;
};

const dateLabel = (value: string): string => new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));

function createNewsItem(item: NewsItem): HTMLLIElement {
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.href = item.articleUrl;
  link.target = "_blank";
  link.rel = "noreferrer";

  const meta = document.createElement("span");
  meta.className = "news-list__meta";
  const outlet = document.createElement("span");
  outlet.textContent = item.outlet;
  const time = document.createElement("time");
  time.dateTime = item.publishedOn;
  time.textContent = dateLabel(item.publishedOn);
  meta.append(outlet, time);

  const title = document.createElement("span");
  title.className = "news-list__title";
  title.textContent = item.title;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "20");
  icon.setAttribute("height", "20");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M7 17 17 7M9 7h8v8");
  icon.append(path);

  link.append(meta, title, icon);
  li.append(link);
  return li;
}

export function initializeHomeNews(): void {
  document.querySelectorAll<HTMLElement>("[data-home-news]").forEach((section) => {
    if (section.dataset.initialized) return;
    section.dataset.initialized = "true";
    const list = section.querySelector<HTMLUListElement>("[data-home-news-list]");
    const status = section.querySelector<HTMLElement>("[data-home-news-status]");
    if (!list || !status) return;

    fetch("/api/news?limit=8")
      .then(async (response) => {
        if (!response.ok) throw new Error("news_unavailable");
        return await response.json() as { news: NewsItem[] };
      })
      .then(({ news }) => {
        if (!news.length) {
          status.textContent = "No news coverage has been added yet.";
          return;
        }
        list.replaceChildren(...news.map(createNewsItem));
        list.hidden = false;
        status.hidden = true;
      })
      .catch(() => {
        status.textContent = "News coverage could not be loaded right now.";
      });
  });
}
