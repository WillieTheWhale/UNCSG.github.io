import { Crepe } from "@milkdown/crepe";
import {
  requireStaffSession,
  signOutStaff,
  watchStaffSession,
  type StaffSession,
} from "./staff-route-auth";

type UpdateStatus = "preview" | "scheduled" | "published" | "archived";

interface ManagedUpdate {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  heroMediaId: string | null;
  heroImageUrl: string | null;
  status: UpdateStatus;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

const apiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string | { message?: string };
      issues?: Array<{ message?: string }>;
    };
    if (data.issues?.[0]?.message) return data.issues[0].message;
    if (typeof data.error === "object" && data.error?.message) return data.error.message;
    if (data.message) return data.message;
    if (typeof data.error === "string") {
      return data.error.replaceAll("_", " ");
    }
  } catch {
    // Fall through to a useful generic message.
  }
  return "Something went wrong. Please try again.";
};

const slugify = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "") || "untitled-update";

const updatedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

function easternDateTimeInput(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  })
    .format(date)
    .replace(" ", "T");
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    window.location.assign("/manage/updates/?auth=session-expired");
    throw new Error("sign_in_required");
  }
  if (response.status === 403) {
    window.location.assign("/?auth=unauthorized");
    throw new Error("access_denied");
  }
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return (await response.json()) as T;
}

export function initializeUpdatesManager(): void {
  const authSection = document.querySelector<HTMLElement>("[data-staff-auth]");
  const manager = document.querySelector<HTMLElement>("[data-updates-manager]");
  if (!authSection || !manager || manager.dataset.initialized) return;
  manager.dataset.initialized = "true";

  const uncSignIn = document.querySelector<HTMLButtonElement>("[data-unc-sign-in]");
  const authReset = document.querySelector<HTMLButtonElement>("[data-auth-reset]");
  const authMessage = document.querySelector<HTMLElement>("[data-auth-message]");
  const staffIdentity = document.querySelector<HTMLElement>("[data-staff-identity]");
  const list = document.querySelector<HTMLElement>("[data-manager-list]");
  const filter = document.querySelector<HTMLSelectElement>("[data-status-filter]");
  const empty = document.querySelector<HTMLElement>("[data-manager-empty]");
  const editorShell = document.querySelector<HTMLElement>("[data-manager-editor]");
  const titleInput = document.querySelector<HTMLInputElement>("[data-update-title]");
  const slugInput = document.querySelector<HTMLInputElement>("[data-update-slug]");
  const statusBadge = document.querySelector<HTMLElement>("[data-editor-status]");
  const saveState = document.querySelector<HTMLElement>("[data-save-state]");
  const editorRoot = document.querySelector<HTMLElement>("[data-markdown-editor]");
  const heroInput = document.querySelector<HTMLInputElement>("[data-hero-input]");
  const heroPreview = document.querySelector<HTMLElement>("[data-hero-preview]");
  const heroPreviewImage = heroPreview?.querySelector<HTMLImageElement>("img");
  const removeHero = document.querySelector<HTMLButtonElement>("[data-remove-hero]");
  const scheduleDialog = document.querySelector<HTMLDialogElement>("[data-schedule-dialog]");
  const scheduleForm = document.querySelector<HTMLFormElement>("[data-schedule-form]");
  const scheduleAt = document.querySelector<HTMLInputElement>("[data-schedule-at]");
  const scheduleMessage = document.querySelector<HTMLElement>("[data-schedule-message]");
  const confirmDialog = document.querySelector<HTMLDialogElement>("[data-confirm-dialog]");
  const confirmTitle = document.querySelector<HTMLElement>("[data-confirm-title]");
  const confirmMessage = document.querySelector<HTMLElement>("[data-confirm-message]");
  const confirmAccept = document.querySelector<HTMLButtonElement>("[data-confirm-accept]");
  const toastRegion = document.querySelector<HTMLElement>("[data-toast-region]");

  if (
    !uncSignIn || !authReset || !authMessage ||
    !staffIdentity || !list || !filter || !empty || !editorShell ||
    !titleInput || !slugInput || !statusBadge || !saveState || !editorRoot ||
    !heroInput || !heroPreview || !heroPreviewImage || !removeHero ||
    !scheduleDialog || !scheduleForm || !scheduleAt || !scheduleMessage ||
    !confirmDialog || !confirmTitle || !confirmMessage || !confirmAccept || !toastRegion
  ) return;

  let updates: ManagedUpdate[] = [];
  let current: ManagedUpdate | null = null;
  let crepe: Crepe | null = null;
  let saveTimer: number | null = null;
  let savePromise: Promise<void> | null = null;
  let dirty = false;
  let changeVersion = 0;
  let loadingEditor = false;
  let slugTouched = false;
  let toastTimer: number | null = null;

  const setMessage = (
    element: HTMLElement,
    message: string,
    tone: "error" | "success" | "neutral" = "neutral",
  ) => {
    element.textContent = message;
    element.dataset.tone = tone;
  };

  const setButtonBusy = (button: HTMLButtonElement | null, busy: boolean) => {
    if (!button) return;
    button.disabled = busy;
    if (busy) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  };

  const showToast = (
    message: string,
    tone: "loading" | "success" | "error" = "success",
  ) => {
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    const toast = document.createElement("div");
    toast.className = "manager-toast";
    toast.dataset.tone = tone;
    toast.setAttribute("role", tone === "error" ? "alert" : "status");

    const indicator = document.createElement("span");
    indicator.className = "manager-toast__indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = tone === "success" ? "✓" : tone === "error" ? "!" : "";

    const copy = document.createElement("p");
    copy.textContent = message;

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.setAttribute("aria-label", "Dismiss notification");
    dismiss.textContent = "×";
    dismiss.addEventListener("click", () => {
      if (toastTimer !== null) window.clearTimeout(toastTimer);
      toastRegion.replaceChildren();
    });

    toast.append(indicator, copy, dismiss);
    toastRegion.replaceChildren(toast);
    if (tone !== "loading") {
      toastTimer = window.setTimeout(() => toastRegion.replaceChildren(), 4800);
    }
  };

  const reservePreviewTab = (): Window | null => {
    const tab = window.open("", "_blank");
    if (!tab) return null;
    tab.opener = null;
    tab.document.title = "Preparing preview…";
    tab.document.body.style.margin = "0";
    tab.document.body.style.padding = "3rem";
    tab.document.body.style.color = "#13294b";
    tab.document.body.style.background = "#f8f8f8";
    tab.document.body.style.fontFamily = "Montserrat, Arial, sans-serif";
    const status = tab.document.createElement("p");
    status.textContent = "Saving preview…";
    status.style.fontSize = "1rem";
    status.style.fontWeight = "700";
    tab.document.body.append(status);
    return tab;
  };

  const confirmAction = (
    title: string,
    message: string,
    confirmLabel: string,
  ): Promise<boolean> => {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmAccept.textContent = confirmLabel;
    confirmDialog.returnValue = "cancel";
    confirmDialog.showModal();
    confirmAccept.focus();
    return new Promise((resolve) => {
      confirmDialog.addEventListener("close", () => {
        resolve(confirmDialog.returnValue === "confirm");
      }, { once: true });
    });
  };

  const runAction = async (
    button: HTMLButtonElement | null,
    pendingMessage: string,
    successMessage: string,
    operation: () => Promise<void>,
  ) => {
    setButtonBusy(button, true);
    showToast(pendingMessage, "loading");
    try {
      await Promise.all([
        operation(),
        new Promise((resolve) => window.setTimeout(resolve, 300)),
      ]);
      showToast(successMessage, "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setButtonBusy(button, false);
    }
  };

  const setStatusBadge = (status: UpdateStatus) => {
    statusBadge.textContent = status;
    statusBadge.className = `update-status update-status--${status}`;
  };

  const mergeUpdate = (next: ManagedUpdate) => {
    updates = updates.map((item) => (item.id === next.id ? next : item));
    current = next;
    setStatusBadge(next.status);
  };

  const filteredUpdates = (): ManagedUpdate[] => {
    const selected = filter.value;
    if (selected === "all") return updates;
    if (selected === "current") return updates.filter((item) => item.status !== "archived");
    return updates.filter((item) => item.status === selected);
  };

  const renderList = () => {
    const visible = filteredUpdates();
    if (!visible.length) {
      const message = document.createElement("p");
      message.className = "manager-list-message";
      message.textContent = filter.value === "archived"
        ? "No archived updates."
        : "No updates match this view.";
      list.replaceChildren(message);
      return;
    }
    const buttons = visible.map((update) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "manager-list-item";
      button.dataset.articleId = update.id;
      button.setAttribute("aria-current", String(current?.id === update.id));

      const title = document.createElement("strong");
      title.textContent = update.title;
      const meta = document.createElement("span");
      meta.className = "manager-list-item__meta";
      const badge = document.createElement("span");
      badge.className = `update-status update-status--${update.status}`;
      badge.textContent = update.status;
      const updated = document.createElement("span");
      updated.textContent = updatedFormatter.format(new Date(update.updatedAt));
      meta.append(badge, updated);
      button.append(title, meta);
      button.addEventListener("click", () => void selectUpdate(update.id));
      return button;
    });
    list.replaceChildren(...buttons);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append("image", file);
    const result = await request<{ media: { id: string; url: string } }>(
      "/api/staff/media",
      { method: "POST", body: data },
    );
    return result.media.url;
  };

  const createEditor = async (update: ManagedUpdate) => {
    if (crepe) await crepe.destroy();
    editorRoot.replaceChildren();
    loadingEditor = true;
    crepe = new Crepe({
      root: editorRoot,
      defaultValue: update.bodyMarkdown,
      features: { [Crepe.Feature.TopBar]: true },
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: { onUpload: uploadImage },
        [Crepe.Feature.Placeholder]: {
          text: "Write the update here. Type / to add headings, images, lists, quotes, and more.",
        },
      },
    });
    crepe.on((listener) => {
      listener.markdownUpdated((_context, markdown) => {
        if (loadingEditor || !current) return;
        current.bodyMarkdown = markdown;
        scheduleSave();
      });
    });
    await crepe.create();
    loadingEditor = false;
  };

  const updateHeroPreview = (update: ManagedUpdate) => {
    if (update.heroImageUrl) {
      heroPreviewImage.src = update.heroImageUrl;
      heroPreview.hidden = false;
      removeHero.hidden = false;
    } else {
      heroPreviewImage.removeAttribute("src");
      heroPreview.hidden = true;
      removeHero.hidden = true;
    }
  };

  const selectUpdate = async (id: string) => {
    if (current?.id === id) return;
    await flushSave();
    const update = updates.find((item) => item.id === id);
    if (!update) return;
    current = update;
    slugTouched = update.title !== "Untitled update";
    titleInput.value = update.title;
    slugInput.value = update.slug;
    setStatusBadge(update.status);
    updateHeroPreview(update);
    saveState.textContent = "All changes saved";
    dirty = false;
    empty.hidden = true;
    editorShell.hidden = false;
    renderList();
    await createEditor(update);
    titleInput.focus();
  };

  const persistCurrent = async () => {
    if (!current || !dirty) return;
    saveState.textContent = "Saving…";
    const targetId = current.id;
    const versionAtStart = changeVersion;
    const snapshot = {
      title: current.title,
      slug: current.slug,
      bodyMarkdown: current.bodyMarkdown,
      heroMediaId: current.heroMediaId,
    };
    const result = await request<{ update: ManagedUpdate }>(`/api/staff/updates/${targetId}`, {
      method: "PATCH",
      body: JSON.stringify(snapshot),
    });
    if (current?.id !== targetId) return;
    if (changeVersion === versionAtStart) {
      dirty = false;
      mergeUpdate(result.update);
      saveState.textContent = "All changes saved";
    } else {
      const localChanges = current;
      current = {
        ...result.update,
        title: localChanges.title,
        slug: localChanges.slug,
        bodyMarkdown: localChanges.bodyMarkdown,
        heroMediaId: localChanges.heroMediaId,
        heroImageUrl: localChanges.heroImageUrl,
      };
      updates = updates.map((item) => item.id === current?.id ? current : item) as ManagedUpdate[];
      saveState.textContent = "Unsaved changes";
    }
    renderList();
  };

  const flushSave = async () => {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (savePromise) await savePromise;
    if (!current || !dirty) return;
    savePromise = persistCurrent()
      .catch((error: Error) => {
        saveState.textContent = error.message;
        saveState.setAttribute("role", "alert");
        throw error;
      })
      .finally(() => { savePromise = null; });
    await savePromise;
    if (dirty) await flushSave();
  };

  const scheduleSave = () => {
    dirty = true;
    changeVersion += 1;
    saveState.removeAttribute("role");
    saveState.textContent = "Unsaved changes";
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      if (!savePromise) {
        savePromise = persistCurrent()
          .catch((error: Error) => {
            saveState.textContent = error.message;
            saveState.setAttribute("role", "alert");
          })
          .finally(() => { savePromise = null; });
      }
    }, 900);
  };

  const loadUpdates = async () => {
    const result = await request<{ updates: ManagedUpdate[] }>("/api/staff/updates?archived=true");
    updates = result.updates;
    renderList();
  };

  const createUpdate = async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-new-update], [data-empty-new-update]");
    buttons.forEach((button) => setButtonBusy(button, true));
    showToast("Creating update…", "loading");
    try {
      await flushSave();
      const result = await request<{ update: ManagedUpdate }>("/api/staff/updates", {
        method: "POST",
        body: JSON.stringify({}),
      });
      updates.unshift(result.update);
      filter.value = "current";
      current = null;
      renderList();
      await selectUpdate(result.update.id);
      showToast("Update created as a preview.", "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      buttons.forEach((button) => setButtonBusy(button, false));
    }
  };

  const action = async (name: "preview" | "publish" | "archive") => {
    if (!current) return;
    await flushSave();
    const result = await request<{ update: ManagedUpdate }>(
      `/api/staff/updates/${current.id}/${name}`,
      { method: "POST", body: JSON.stringify({}) },
    );
    mergeUpdate(result.update);
    updateHeroPreview(result.update);
    renderList();
  };

  const showManager = async (staff: StaffSession) => {
    staffIdentity.textContent = staff.email;
    await loadUpdates();
    authSection.setAttribute("aria-busy", "false");
    authSection.hidden = true;
    manager.hidden = false;
    watchStaffSession("/manage/updates/");
    const requested = new URLSearchParams(window.location.search).get("update");
    if (requested && updates.some((item) => item.id === requested)) {
      await selectUpdate(requested);
    }
  };

  document.querySelector("[data-sign-out]")?.addEventListener("click", () => void signOutStaff((error) => {
    manager.hidden = true;
    authSection.hidden = false;
    authSection.setAttribute("aria-busy", "false");
    setMessage(authMessage, error, "error");
    uncSignIn.hidden = false;
    authReset.hidden = false;
  }));

  document.querySelectorAll("[data-new-update], [data-empty-new-update]").forEach((button) => {
    button.addEventListener("click", () => void createUpdate());
  });

  filter.addEventListener("change", renderList);
  titleInput.addEventListener("input", () => {
    if (!current) return;
    current.title = titleInput.value;
    if (!slugTouched) {
      current.slug = slugify(titleInput.value);
      slugInput.value = current.slug;
    }
    scheduleSave();
  });
  slugInput.addEventListener("input", () => {
    if (!current) return;
    slugTouched = true;
    current.slug = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (slugInput.value !== current.slug) slugInput.value = current.slug;
    scheduleSave();
  });

  document.querySelector("[data-choose-hero]")?.addEventListener("click", () => heroInput.click());
  heroInput.addEventListener("change", async () => {
    const file = heroInput.files?.[0];
    if (!file || !current) return;
    saveState.textContent = "Uploading image…";
    showToast("Uploading image…", "loading");
    try {
      const url = await uploadImage(file);
      const id = url.split("/").pop() ?? null;
      current.heroMediaId = id;
      current.heroImageUrl = url;
      updateHeroPreview(current);
      scheduleSave();
      showToast("Image uploaded.", "success");
    } catch (error) {
      saveState.textContent = (error as Error).message;
      saveState.setAttribute("role", "alert");
      showToast((error as Error).message, "error");
    } finally {
      heroInput.value = "";
    }
  });
  removeHero.addEventListener("click", () => {
    if (!current) return;
    current.heroMediaId = null;
    current.heroImageUrl = null;
    updateHeroPreview(current);
    scheduleSave();
  });

  const savePreviewButton = document.querySelector<HTMLButtonElement>("[data-save-preview]");
  savePreviewButton?.addEventListener("click", async () => {
    if (!current) return;
    if (["published", "scheduled"].includes(current.status)) {
      const confirmed = await confirmAction(
        "Move this update to preview?",
        "This update will be removed from the public or scheduled view and returned to preview.",
        "Move to preview",
      );
      if (!confirmed) return;
    }
    await runAction(savePreviewButton, "Saving as preview…", "Saved as preview.", () => action("preview"));
  });

  const previewPageButton = document.querySelector<HTMLButtonElement>("[data-preview-page]");
  previewPageButton?.addEventListener("click", async () => {
    if (!current) return;
    const previewTab = reservePreviewTab();
    if (!previewTab) {
      showToast("Your browser blocked the preview tab. Allow pop-ups for this site and try again.", "error");
      return;
    }
    await runAction(previewPageButton, "Saving full-page preview…", "Preview opened in a new tab.", async () => {
      try {
        await action("preview");
        previewTab.location.replace(`/preview-updates/${encodeURIComponent(current?.slug ?? "")}`);
      } catch (error) {
        previewTab.close();
        throw error;
      }
    });
  });

  const publishNowButton = document.querySelector<HTMLButtonElement>("[data-publish-now]");
  publishNowButton?.addEventListener("click", async () => {
    if (!current) return;
    const confirmed = await confirmAction(
      "Publish this update now?",
      "This update will become visible to everyone immediately.",
      "Publish now",
    );
    if (!confirmed) return;
    await runAction(publishNowButton, "Publishing update…", "Update published.", () => action("publish"));
  });

  const archiveButton = document.querySelector<HTMLButtonElement>("[data-archive-update]");
  archiveButton?.addEventListener("click", async () => {
    if (!current) return;
    const confirmed = await confirmAction(
      "Archive this update?",
      "It will be removed from public and preview pages, but it can still be restored later.",
      "Archive update",
    );
    if (!confirmed) return;
    await runAction(archiveButton, "Archiving update…", "Update archived.", async () => {
      const archivedId = current?.id;
      await action("archive");
      filter.value = "current";
      current = null;
      editorShell.hidden = true;
      empty.hidden = false;
      if (crepe) await crepe.destroy();
      crepe = null;
      updates = updates.map((item) => item.id === archivedId ? { ...item, status: "archived" } : item);
      renderList();
    });
  });

  const openScheduleButton = document.querySelector<HTMLButtonElement>("[data-open-schedule]");
  openScheduleButton?.addEventListener("click", async () => {
    if (!current) return;
    await runAction(openScheduleButton, "Preparing schedule…", "Schedule ready.", async () => {
      await flushSave();
      scheduleAt.value = current?.publishAt
        ? easternDateTimeInput(new Date(current.publishAt))
        : easternDateTimeInput(new Date(Date.now() + 60 * 60 * 1000));
      setMessage(scheduleMessage, "");
      scheduleDialog.showModal();
    });
  });

  scheduleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!current || !scheduleAt.value) return;
    const submit = scheduleForm.querySelector<HTMLButtonElement>("button[type=submit]");
    setButtonBusy(submit, true);
    setMessage(scheduleMessage, "Scheduling…");
    try {
      const result = await request<{ update: ManagedUpdate }>(
        `/api/staff/updates/${current.id}/schedule`,
        { method: "POST", body: JSON.stringify({ publishAtLocal: scheduleAt.value }) },
      );
      mergeUpdate(result.update);
      renderList();
      scheduleDialog.close();
      showToast("Update scheduled.", "success");
    } catch (error) {
      setMessage(scheduleMessage, (error as Error).message, "error");
      showToast((error as Error).message, "error");
    } finally {
      setButtonBusy(submit, false);
    }
  });

  requireStaffSession({
    authSection,
    authMessage,
    retryButton: uncSignIn,
    resetButton: authReset,
    defaultCallback: "/manage/updates/",
    allowedReturnPrefix: "/preview-updates",
  })
    .then(showManager)
    .catch((error) => {
      if (["redirecting", "access_denied"].includes((error as Error).message)) return;
      manager.hidden = true;
      authSection.hidden = false;
      authSection.setAttribute("aria-busy", "false");
      setMessage(authMessage, (error as Error).message, "error");
      uncSignIn.hidden = false;
      authReset.hidden = false;
    });
}
