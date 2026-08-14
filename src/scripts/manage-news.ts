import type { ManagedNewsItem, NewsStatus } from "./news-types";
import { requireStaffSession, signOutStaff, watchStaffSession } from "./staff-route-auth";

const apiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json() as { message?: string; error?: string; issues?: Array<{ message?: string }> };
    if (data.issues?.[0]?.message) return data.issues[0].message;
    return data.message || data.error?.replaceAll("_", " ") || "Something went wrong.";
  } catch {
    return "Something went wrong. Please try again.";
  }
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 401) {
    window.location.assign("/manage/news/?auth=session-expired");
    throw new Error("sign_in_required");
  }
  if (response.status === 403) {
    window.location.assign("/?auth=unauthorized");
    throw new Error("access_denied");
  }
  if (!response.ok) throw new Error(await apiError(response));
  return await response.json() as T;
}

export function initializeNewsManager(): void {
  const one = <T extends Element>(selector: string) => document.querySelector<T>(selector);
  const auth = one<HTMLElement>("[data-staff-auth]");
  const authMessage = one<HTMLElement>("[data-auth-message]");
  const retry = one<HTMLButtonElement>("[data-unc-sign-in]");
  const reset = one<HTMLButtonElement>("[data-auth-reset]");
  const manager = one<HTMLElement>("[data-news-manager]");
  const identity = one<HTMLElement>("[data-staff-identity]");
  const list = one<HTMLElement>("[data-manager-list]");
  const filter = one<HTMLSelectElement>("[data-status-filter]");
  const empty = one<HTMLElement>("[data-manager-empty]");
  const editor = one<HTMLElement>("[data-manager-editor]");
  const title = one<HTMLInputElement>("[data-news-title]");
  const outlet = one<HTMLInputElement>("[data-news-outlet]");
  const date = one<HTMLInputElement>("[data-news-date]");
  const articleUrl = one<HTMLInputElement>("[data-news-url]");
  const statusBadge = one<HTMLElement>("[data-editor-status]");
  const saveState = one<HTMLElement>("[data-save-state]");
  const previewMeta = one<HTMLElement>("[data-preview-meta]");
  const previewTitle = one<HTMLElement>("[data-preview-title]");
  const openArticle = one<HTMLAnchorElement>("[data-open-news]");
  const confirmDialog = one<HTMLDialogElement>("[data-confirm-dialog]");
  const confirmTitle = one<HTMLElement>("[data-confirm-title]");
  const confirmMessage = one<HTMLElement>("[data-confirm-message]");
  const confirmAccept = one<HTMLButtonElement>("[data-confirm-accept]");
  const toastRegion = one<HTMLElement>("[data-toast-region]");
  if (!auth || !authMessage || !retry || !reset || !manager || !identity || !list || !filter || !empty || !editor || !title || !outlet || !date || !articleUrl || !statusBadge || !saveState || !previewMeta || !previewTitle || !openArticle || !confirmDialog || !confirmTitle || !confirmMessage || !confirmAccept || !toastRegion || manager.dataset.initialized) return;
  manager.dataset.initialized = "true";

  let news: ManagedNewsItem[] = [];
  let current: ManagedNewsItem | null = null;
  let saveTimer: number | null = null;
  let savePromise: Promise<void> | null = null;
  let dirty = false;
  let version = 0;
  let toastTimer: number | null = null;

  const busy = (button: HTMLButtonElement | null, value: boolean) => {
    if (!button) return;
    button.disabled = value;
    if (value) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  };
  const toast = (message: string, tone: "loading" | "success" | "error" = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    const item = document.createElement("div");
    item.className = "manager-toast";
    item.dataset.tone = tone;
    item.setAttribute("role", tone === "error" ? "alert" : "status");
    const indicator = document.createElement("span");
    indicator.className = "manager-toast__indicator";
    indicator.textContent = tone === "success" ? "✓" : tone === "error" ? "!" : "";
    const copy = document.createElement("p");
    copy.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.ariaLabel = "Dismiss notification";
    close.textContent = "×";
    close.onclick = () => toastRegion.replaceChildren();
    item.append(indicator, copy, close);
    toastRegion.replaceChildren(item);
    if (tone !== "loading") toastTimer = window.setTimeout(() => toastRegion.replaceChildren(), 4800);
  };
  const confirm = (heading: string, copy: string, label: string) => new Promise<boolean>((resolve) => {
    confirmTitle.textContent = heading;
    confirmMessage.textContent = copy;
    confirmAccept.textContent = label;
    confirmDialog.returnValue = "cancel";
    confirmDialog.showModal();
    confirmAccept.focus();
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
  });
  const setStatus = (value: NewsStatus) => {
    statusBadge.textContent = value;
    statusBadge.className = `update-status update-status--${value}`;
  };
  const merge = (item: ManagedNewsItem) => {
    news = news.map((candidate) => candidate.id === item.id ? item : candidate);
    current = item;
    setStatus(item.status);
  };
  const updatePreview = () => {
    if (!current) return;
    previewTitle.textContent = current.title.trim() || "Article headline";
    const dateText = current.publishedOn
      ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${current.publishedOn.slice(0, 10)}T12:00:00Z`))
      : "Date";
    previewMeta.textContent = `${current.outlet.trim() || "Publication"} · ${dateText}`;
    try {
      const url = new URL(current.articleUrl);
      openArticle.href = url.href;
      openArticle.hidden = !["http:", "https:"].includes(url.protocol);
    } catch {
      openArticle.hidden = true;
      openArticle.removeAttribute("href");
    }
  };
  const visible = () => news.filter((item) => {
    if (filter.value === "all") return true;
    if (filter.value === "current") return item.status !== "archived";
    return item.status === filter.value;
  });
  const renderList = () => {
    const items = visible();
    if (!items.length) {
      const message = document.createElement("p");
      message.className = "manager-list-message";
      message.textContent = "No articles match this view.";
      list.replaceChildren(message);
      return;
    }
    list.replaceChildren(...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "manager-list-item";
      button.setAttribute("aria-current", String(current?.id === item.id));
      const name = document.createElement("strong");
      name.textContent = item.title || "Untitled article";
      const meta = document.createElement("span");
      meta.className = "manager-list-item__meta";
      const badge = document.createElement("span");
      badge.className = `update-status update-status--${item.status}`;
      badge.textContent = item.status;
      const outletLabel = document.createElement("span");
      outletLabel.textContent = item.outlet || "Publication not set";
      meta.append(badge, outletLabel);
      button.append(name, meta);
      button.onclick = () => void select(item.id);
      return button;
    }));
  };
  const select = async (id: string) => {
    if (current?.id === id) return;
    await flushSave();
    const item = news.find((candidate) => candidate.id === id);
    if (!item) return;
    current = item;
    title.value = item.title;
    outlet.value = item.outlet;
    date.value = item.publishedOn?.slice(0, 10) || "";
    articleUrl.value = item.articleUrl;
    setStatus(item.status);
    saveState.textContent = "All changes saved";
    dirty = false;
    empty.hidden = true;
    editor.hidden = false;
    updatePreview();
    renderList();
    title.focus();
  };
  const snapshot = () => current ? {
    title: current.title,
    outlet: current.outlet,
    articleUrl: current.articleUrl,
    publishedOn: current.publishedOn || null,
  } : null;
  const persist = async () => {
    if (!current || !dirty) return;
    saveState.textContent = "Saving…";
    const id = current.id;
    const started = version;
    const local = current;
    const result = await request<{ newsItem: ManagedNewsItem }>(`/api/staff/news/${id}`, { method: "PATCH", body: JSON.stringify(snapshot()) });
    if (current?.id !== id) return;
    if (version === started) {
      dirty = false;
      merge(result.newsItem);
      saveState.textContent = "All changes saved";
    } else {
      current = { ...result.newsItem, ...local };
      news = news.map((item) => item.id === id ? current as ManagedNewsItem : item);
      saveState.textContent = "Unsaved changes";
    }
    renderList();
  };
  const flushSave = async (): Promise<void> => {
    if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
    if (savePromise) await savePromise;
    if (!current || !dirty) return;
    savePromise = persist().catch((error) => {
      saveState.textContent = (error as Error).message;
      saveState.setAttribute("role", "alert");
      throw error;
    }).finally(() => { savePromise = null; });
    await savePromise;
    if (dirty) await flushSave();
  };
  const scheduleSave = () => {
    dirty = true;
    version += 1;
    saveState.removeAttribute("role");
    saveState.textContent = "Unsaved changes";
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      if (!savePromise) savePromise = persist().catch((error) => {
        saveState.textContent = (error as Error).message;
      }).finally(() => { savePromise = null; });
    }, 800);
  };
  const load = async () => {
    news = (await request<{ news: ManagedNewsItem[] }>("/api/staff/news?archived=true")).news;
    renderList();
  };
  const create = async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-new-news], [data-empty-new-news]");
    buttons.forEach((button) => busy(button, true));
    toast("Adding article…", "loading");
    try {
      await flushSave();
      const result = await request<{ newsItem: ManagedNewsItem }>("/api/staff/news", { method: "POST", body: "{}" });
      news.unshift(result.newsItem);
      filter.value = "current";
      current = null;
      renderList();
      await select(result.newsItem.id);
      toast("Article added. Complete the details, then publish when ready.");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      buttons.forEach((button) => busy(button, false));
    }
  };
  const action = async (name: "publish" | "draft" | "archive") => {
    if (!current) return;
    await flushSave();
    const result = await request<{ newsItem: ManagedNewsItem }>(`/api/staff/news/${current.id}/${name}`, { method: "POST", body: "{}" });
    merge(result.newsItem);
    renderList();
  };
  const run = async (button: HTMLButtonElement | null, pending: string, success: string, operation: () => Promise<void>) => {
    busy(button, true);
    toast(pending, "loading");
    try {
      await Promise.all([operation(), new Promise((resolve) => setTimeout(resolve, 300))]);
      toast(success);
    } catch (error) {
      const message = (error as Error).message;
      const field = message.startsWith("Add a headline") ? title
        : message.startsWith("Add the publication name") ? outlet
          : message.startsWith("Add the publication date") ? date
            : message.startsWith("Article link:") ? articleUrl
              : null;
      field?.setAttribute("aria-invalid", "true");
      field?.focus();
      toast(message, "error");
    } finally {
      busy(button, false);
    }
  };
  const bind = (element: HTMLInputElement, apply: () => void) => element.addEventListener("input", () => {
    if (!current) return;
    element.removeAttribute("aria-invalid");
    apply();
    updatePreview();
    scheduleSave();
  });
  bind(title, () => { if (current) current.title = title.value; });
  bind(outlet, () => { if (current) current.outlet = outlet.value; });
  bind(date, () => { if (current) current.publishedOn = date.value || null; });
  bind(articleUrl, () => { if (current) current.articleUrl = articleUrl.value; });
  document.querySelectorAll("[data-new-news], [data-empty-new-news]").forEach((button) => button.addEventListener("click", () => void create()));
  filter.addEventListener("change", renderList);

  const publishButton = one<HTMLButtonElement>("[data-publish-news]");
  publishButton?.addEventListener("click", async () => {
    if (!current || !await confirm("Publish this news article?", "It will appear in the homepage In the News section immediately, ordered by its publication date.", "Publish article")) return;
    await run(publishButton, "Publishing article…", "Article published on the homepage.", () => action("publish"));
  });
  const draftButton = one<HTMLButtonElement>("[data-save-draft]");
  draftButton?.addEventListener("click", async () => {
    if (!current) return;
    if (current.status === "published" && !await confirm("Remove this article from the homepage?", "The article will remain saved as a draft but will no longer be public.", "Save as draft")) return;
    await run(draftButton, "Saving draft…", "Article saved as a draft.", () => action("draft"));
  });
  const archiveButton = one<HTMLButtonElement>("[data-archive-news]");
  archiveButton?.addEventListener("click", async () => {
    if (!current || !await confirm("Archive this news article?", "It will be removed from the homepage but retained for staff.", "Archive article")) return;
    await run(archiveButton, "Archiving article…", "Article archived.", async () => {
      await action("archive");
      current = null;
      editor.hidden = true;
      empty.hidden = false;
      filter.value = "current";
      renderList();
    });
  });
  one("[data-sign-out]")?.addEventListener("click", () => void signOutStaff((error) => {
    manager.hidden = true;
    auth.hidden = false;
    auth.setAttribute("aria-busy", "false");
    authMessage.textContent = error;
    authMessage.dataset.tone = "error";
    retry.hidden = false;
    reset.hidden = false;
  }));

  requireStaffSession({ authSection: auth, authMessage, retryButton: retry, resetButton: reset, defaultCallback: "/manage/news/" })
    .then(async (staff) => {
      identity.textContent = staff.email;
      await load();
      auth.hidden = true;
      manager.hidden = false;
      watchStaffSession("/manage/news/");
    })
    .catch((error) => {
      if (["redirecting", "access_denied"].includes((error as Error).message)) return;
      manager.hidden = true;
      auth.hidden = false;
      auth.setAttribute("aria-busy", "false");
      authMessage.textContent = (error as Error).message;
      authMessage.dataset.tone = "error";
      retry.hidden = false;
      reset.hidden = false;
    });
}
