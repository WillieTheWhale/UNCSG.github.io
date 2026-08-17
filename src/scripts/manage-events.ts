import { Crepe } from "@milkdown/crepe";
import type { EventFormat, EventStatus, ManagedEvent } from "./event-types";
import { eventDateTimeLabel } from "./event-types";
import { requireStaffSession, signOutStaff, watchStaffSession } from "./staff-route-auth";

const slugify = (value: string): string => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "") || "untitled-event";
const easternInput = (value: string | Date, allDay = false): string => new Intl.DateTimeFormat("sv-SE", {
  year: "numeric", month: "2-digit", day: "2-digit", ...(allDay ? {} : { hour: "2-digit", minute: "2-digit", hour12: false }), timeZone: "America/New_York",
}).format(new Date(value)).replace(" ", "T");
const apiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json() as { message?: string; error?: string | { message?: string }; issues?: Array<{ message?: string }> };
    if (data.issues?.[0]?.message) return data.issues[0].message;
    if (typeof data.error === "object" && data.error.message) return data.error.message;
    return data.message || (typeof data.error === "string" ? data.error.replaceAll("_", " ") : "Something went wrong.");
  } catch { return "Something went wrong. Please try again."; }
};
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers } });
  if (response.status === 401) {
    window.location.assign("/manage/events/?auth=session-expired");
    throw new Error("sign_in_required");
  }
  if (response.status === 403) { window.location.assign("/?auth=unauthorized"); throw new Error("access_denied"); }
  if (!response.ok) throw new Error(await apiError(response));
  return await response.json() as T;
}

export function initializeEventsManager(): void {
  const one = <T extends Element>(selector: string) => document.querySelector<T>(selector);
  const auth = one<HTMLElement>("[data-staff-auth]");
  const authMessage = one<HTMLElement>("[data-auth-message]");
  const retry = one<HTMLButtonElement>("[data-unc-sign-in]");
  const reset = one<HTMLButtonElement>("[data-auth-reset]");
  const manager = one<HTMLElement>("[data-events-manager]");
  const identity = one<HTMLElement>("[data-staff-identity]");
  const list = one<HTMLElement>("[data-manager-list]");
  const filter = one<HTMLSelectElement>("[data-status-filter]");
  const empty = one<HTMLElement>("[data-manager-empty]");
  const editorShell = one<HTMLElement>("[data-manager-editor]");
  const title = one<HTMLInputElement>("[data-event-title]");
  const slug = one<HTMLInputElement>("[data-event-slug]");
  const summary = one<HTMLTextAreaElement>("[data-event-summary]");
  const featured = one<HTMLInputElement>("[data-event-featured]");
  const allDay = one<HTMLInputElement>("[data-event-all-day]");
  const start = one<HTMLInputElement>("[data-event-start]");
  const end = one<HTMLInputElement>("[data-event-end]");
  const format = one<HTMLSelectElement>("[data-event-format]");
  const location = one<HTMLInputElement>("[data-event-location]");
  const virtualUrl = one<HTMLInputElement>("[data-event-virtual]");
  const registrationUrl = one<HTMLInputElement>("[data-event-registration]");
  const contactEmail = one<HTMLInputElement>("[data-event-contact]");
  const statusBadge = one<HTMLElement>("[data-editor-status]");
  const saveState = one<HTMLElement>("[data-save-state]");
  const editorRoot = one<HTMLElement>("[data-markdown-editor]");
  const heroInput = one<HTMLInputElement>("[data-hero-input]");
  const heroPreview = one<HTMLElement>("[data-hero-preview]");
  const heroImage = heroPreview?.querySelector<HTMLImageElement>("img");
  const removeHero = one<HTMLButtonElement>("[data-remove-hero]");
  const scheduleDialog = one<HTMLDialogElement>("[data-schedule-dialog]");
  const scheduleForm = one<HTMLFormElement>("[data-schedule-form]");
  const scheduleAt = one<HTMLInputElement>("[data-schedule-at]");
  const scheduleMessage = one<HTMLElement>("[data-schedule-message]");
  const confirmDialog = one<HTMLDialogElement>("[data-confirm-dialog]");
  const confirmTitle = one<HTMLElement>("[data-confirm-title]");
  const confirmMessage = one<HTMLElement>("[data-confirm-message]");
  const confirmAccept = one<HTMLButtonElement>("[data-confirm-accept]");
  const easternTimeNotice = one<HTMLElement>("[data-eastern-time-notice]");
  const featureExampleButton = one<HTMLButtonElement>("[data-feature-example]");
  const featureExampleDialog = one<HTMLDialogElement>("[data-feature-example-dialog]");
  const featureExampleClose = one<HTMLButtonElement>("[data-feature-example-close]");
  const toastRegion = one<HTMLElement>("[data-toast-region]");
  if (!auth || !authMessage || !retry || !reset || !manager || !identity || !list || !filter || !empty || !editorShell || !title || !slug || !summary || !featured || !allDay || !start || !end || !format || !location || !virtualUrl || !registrationUrl || !contactEmail || !statusBadge || !saveState || !editorRoot || !heroInput || !heroPreview || !heroImage || !removeHero || !scheduleDialog || !scheduleForm || !scheduleAt || !scheduleMessage || !confirmDialog || !confirmTitle || !confirmMessage || !confirmAccept || !toastRegion || manager.dataset.initialized) return;
  manager.dataset.initialized = "true";

  if (easternTimeNotice) {
    const now = new Date();
    const longName = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "long" }).formatToParts(now).find((part) => part.type === "timeZoneName")?.value || "Eastern Time";
    const shortName = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" }).formatToParts(now).find((part) => part.type === "timeZoneName")?.value || "ET";
    easternTimeNotice.textContent = `Enter start and end times in ${longName} (${shortName})`;
  }
  featureExampleButton?.addEventListener("click", () => featureExampleDialog?.showModal());
  featureExampleClose?.addEventListener("click", () => featureExampleDialog?.close());
  featureExampleDialog?.addEventListener("click", (event) => { if (event.target === featureExampleDialog) featureExampleDialog.close(); });

  let events: ManagedEvent[] = [];
  let current: ManagedEvent | null = null;
  let crepe: Crepe | null = null;
  let saveTimer: number | null = null;
  let savePromise: Promise<void> | null = null;
  let dirty = false;
  let version = 0;
  let loadingEditor = false;
  let slugTouched = false;
  let toastTimer: number | null = null;

  const busy = (button: HTMLButtonElement | null, value: boolean) => {
    if (!button) return; button.disabled = value;
    if (value) button.setAttribute("aria-busy", "true"); else button.removeAttribute("aria-busy");
  };
  const toast = (message: string, tone: "loading" | "success" | "error" = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    const item = document.createElement("div"); item.className = "manager-toast"; item.dataset.tone = tone; item.setAttribute("role", tone === "error" ? "alert" : "status");
    const indicator = document.createElement("span"); indicator.className = "manager-toast__indicator"; indicator.textContent = tone === "success" ? "✓" : tone === "error" ? "!" : "";
    const copy = document.createElement("p"); copy.textContent = message;
    const close = document.createElement("button"); close.type = "button"; close.ariaLabel = "Dismiss notification"; close.textContent = "×"; close.onclick = () => toastRegion.replaceChildren();
    item.append(indicator, copy, close); toastRegion.replaceChildren(item);
    if (tone !== "loading") toastTimer = window.setTimeout(() => toastRegion.replaceChildren(), 4800);
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
  const confirm = (heading: string, copy: string, label: string) => new Promise<boolean>((resolve) => {
    confirmTitle.textContent = heading; confirmMessage.textContent = copy; confirmAccept.textContent = label; confirmDialog.returnValue = "cancel"; confirmDialog.showModal(); confirmAccept.focus();
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
  });
  const run = async (button: HTMLButtonElement | null, pending: string, success: string, operation: () => Promise<void>) => {
    busy(button, true); toast(pending, "loading");
    try { await Promise.all([operation(), new Promise((resolve) => setTimeout(resolve, 300))]); toast(success); }
    catch (error) {
      const message = (error as Error).message;
      const invalidField = message.startsWith("Virtual link:") ? virtualUrl : message.startsWith("Registration or details link:") ? registrationUrl : null;
      if (invalidField) { invalidField.setAttribute("aria-invalid", "true"); invalidField.focus(); }
      toast(message, "error");
    }
    finally { busy(button, false); }
  };
  const setStatus = (value: EventStatus) => { statusBadge.textContent = value; statusBadge.className = `update-status update-status--${value}`; };
  const merge = (event: ManagedEvent) => { events = events.map((item) => item.id === event.id ? event : item); current = event; setStatus(event.status); };
  const visibleEvents = () => events.filter((event) => {
    const now = Date.now(); const past = event.endAt ? new Date(event.endAt).getTime() < now : false;
    if (filter.value === "all") return true;
    if (filter.value === "current") return event.status !== "archived" && !past;
    if (filter.value === "upcoming") return event.status !== "archived" && !past;
    if (filter.value === "past") return event.status !== "archived" && past;
    return event.status === filter.value;
  });
  const renderList = () => {
    const visible = visibleEvents();
    if (!visible.length) { const p = document.createElement("p"); p.className = "manager-list-message"; p.textContent = "No events match this view."; list.replaceChildren(p); return; }
    list.replaceChildren(...visible.map((event) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "manager-list-item"; button.setAttribute("aria-current", String(current?.id === event.id));
      const name = document.createElement("strong"); name.textContent = `${event.isFeatured ? "Featured · " : ""}${event.title}`;
      const meta = document.createElement("span"); meta.className = "manager-list-item__meta";
      const badge = document.createElement("span"); badge.className = `update-status update-status--${event.status}`; badge.textContent = event.status;
      const date = document.createElement("span"); date.textContent = event.startAt ? eventDateTimeLabel(event).split(" · ")[0] : "Date not set";
      meta.append(badge, date); button.append(name, meta); button.onclick = () => void select(event.id); return button;
    }));
  };
  const upload = async (file: File): Promise<{ id: string; url: string }> => {
    const data = new FormData(); data.append("image", file);
    return (await request<{ media: { id: string; url: string } }>("/api/staff/media", { method: "POST", body: data })).media;
  };
  const updateHero = (event: ManagedEvent) => {
    if (event.heroImageUrl) { heroImage.src = event.heroImageUrl; heroPreview.hidden = false; removeHero.hidden = false; }
    else { heroImage.removeAttribute("src"); heroPreview.hidden = true; removeHero.hidden = true; }
  };
  const updateDateInputs = (event: ManagedEvent) => {
    start.type = event.allDay ? "date" : "datetime-local"; end.type = event.allDay ? "date" : "datetime-local";
    start.value = event.startAt ? easternInput(event.startAt, event.allDay) : "";
    end.value = event.endAt ? easternInput(event.endAt, event.allDay) : "";
  };
  const createEditor = async (event: ManagedEvent) => {
    if (crepe) await crepe.destroy(); editorRoot.replaceChildren(); loadingEditor = true;
    crepe = new Crepe({ root: editorRoot, defaultValue: event.detailsMarkdown || "", features: { [Crepe.Feature.TopBar]: true }, featureConfigs: {
      [Crepe.Feature.ImageBlock]: { onUpload: async (file: File) => (await upload(file)).url },
      [Crepe.Feature.Placeholder]: { text: "Add full event details here. Type / for headings, images, lists, and more." },
    } });
    crepe.on((listener) => listener.markdownUpdated((_context, markdown) => { if (loadingEditor || !current) return; current.detailsMarkdown = markdown; scheduleSave(); }));
    await crepe.create(); loadingEditor = false;
  };
  const select = async (id: string) => {
    if (current?.id === id) return; await flushSave(); const event = events.find((item) => item.id === id); if (!event) return;
    current = event; slugTouched = event.title !== "Untitled event"; title.value = event.title; slug.value = event.slug; summary.value = event.summary || ""; featured.checked = event.isFeatured; allDay.checked = event.allDay; format.value = event.format; location.value = event.location || ""; virtualUrl.value = event.virtualUrl || ""; registrationUrl.value = event.registrationUrl || ""; contactEmail.value = event.contactEmail || "";
    updateDateInputs(event); updateHero(event); setStatus(event.status); saveState.textContent = "All changes saved"; dirty = false; empty.hidden = true; editorShell.hidden = false; renderList(); await createEditor(event); title.focus();
  };
  const snapshot = () => current ? ({ title: current.title, slug: current.slug, summary: current.summary, detailsMarkdown: current.detailsMarkdown, heroMediaId: current.heroMediaId, startAtLocal: start.value || null, endAtLocal: end.value || null, allDay: current.allDay, format: current.format, location: current.location || null, virtualUrl: current.virtualUrl || null, registrationUrl: current.registrationUrl || null, contactEmail: current.contactEmail || null }) : null;
  const persist = async () => {
    if (!current || !dirty) return; saveState.textContent = "Saving…"; const id = current.id; const started = version; const local = current; const payload = snapshot();
    const result = await request<{ event: ManagedEvent }>(`/api/staff/events/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (current?.id !== id) return;
    if (version === started) { dirty = false; merge(result.event); saveState.textContent = "All changes saved"; updateDateInputs(result.event); }
    else { current = { ...result.event, ...local }; events = events.map((item) => item.id === id ? current as ManagedEvent : item); saveState.textContent = "Unsaved changes"; }
    renderList();
  };
  const flushSave = async (): Promise<void> => {
    if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
    if (savePromise) await savePromise;
    if (!current || !dirty) return;
    savePromise = persist().catch((error) => { saveState.textContent = (error as Error).message; saveState.setAttribute("role", "alert"); throw error; }).finally(() => { savePromise = null; });
    await savePromise; if (dirty) await flushSave();
  };
  const scheduleSave = () => {
    dirty = true; version += 1; saveState.removeAttribute("role"); saveState.textContent = "Unsaved changes";
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { saveTimer = null; if (!savePromise) savePromise = persist().catch((error) => { saveState.textContent = (error as Error).message; }).finally(() => { savePromise = null; }); }, 900);
  };
  const load = async () => { events = (await request<{ events: ManagedEvent[] }>("/api/staff/events?archived=true")).events; renderList(); };
  const create = async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-new-event], [data-empty-new-event]"); buttons.forEach((button) => busy(button, true)); toast("Creating event…", "loading");
    try { await flushSave(); const result = await request<{ event: ManagedEvent }>("/api/staff/events", { method: "POST", body: "{}" }); events.unshift(result.event); filter.value = "current"; current = null; renderList(); await select(result.event.id); toast("Event created."); }
    catch (error) { toast((error as Error).message, "error"); } finally { buttons.forEach((button) => busy(button, false)); }
  };
  const action = async (name: "preview" | "publish" | "archive") => { if (!current) return; await flushSave(); const result = await request<{ event: ManagedEvent }>(`/api/staff/events/${current.id}/${name}`, { method: "POST", body: "{}" }); merge(result.event); updateHero(result.event); renderList(); };
  const bindInput = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, apply: () => void, eventName = "input") => element.addEventListener(eventName, () => { if (!current) return; element.removeAttribute("aria-invalid"); apply(); scheduleSave(); });
  bindInput(title, () => { if (!current) return; current.title = title.value; if (!slugTouched) { current.slug = slugify(title.value); slug.value = current.slug; } });
  bindInput(slug, () => { if (!current) return; slugTouched = true; current.slug = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); slug.value = current.slug; });
  bindInput(summary, () => { if (current) current.summary = summary.value; });
  bindInput(start, () => undefined, "change"); bindInput(end, () => undefined, "change");
  bindInput(format, () => { if (current) current.format = format.value as EventFormat; }, "change");
  bindInput(location, () => { if (current) current.location = location.value || null; });
  bindInput(virtualUrl, () => { if (current) current.virtualUrl = virtualUrl.value || null; });
  bindInput(registrationUrl, () => { if (current) current.registrationUrl = registrationUrl.value || null; });
  bindInput(contactEmail, () => { if (current) current.contactEmail = contactEmail.value || null; });
  allDay.addEventListener("change", () => { if (!current) return; const oldStart = start.value; const oldEnd = end.value; current.allDay = allDay.checked; start.type = current.allDay ? "date" : "datetime-local"; end.type = current.allDay ? "date" : "datetime-local"; start.value = current.allDay ? oldStart.slice(0, 10) : `${oldStart.slice(0, 10)}T09:00`; end.value = current.allDay ? oldEnd.slice(0, 10) : `${oldEnd.slice(0, 10)}T10:00`; scheduleSave(); });
  featured.addEventListener("change", async () => {
    if (!current) return; const next = featured.checked;
    if (next) {
      const existing = events.find((event) => event.isFeatured && event.id !== current?.id);
      if (existing && !await confirm("Replace the featured event?", `“${existing.title}” is currently featured. Featuring this event will remove it from the homepage hero.`, "Replace featured event")) { featured.checked = false; return; }
    }
    featured.disabled = true;
    try {
      const result = await request<{ event: ManagedEvent; replacedFeaturedEvent: { id: string; title: string } | null }>(`/api/staff/events/${current.id}/feature`, { method: "POST", body: JSON.stringify({ featured: next }) });
      events = events.map((event) => event.id === result.event.id ? result.event : next ? { ...event, isFeatured: false } : event); current = result.event; renderList(); toast(next ? "Event selected for the homepage hero." : "Event removed from the homepage hero.");
    } catch (error) { featured.checked = !next; toast((error as Error).message, "error"); } finally { featured.disabled = false; }
  });
  one("[data-choose-hero]")?.addEventListener("click", () => heroInput.click());
  heroInput.addEventListener("change", async () => { const file = heroInput.files?.[0]; if (!file || !current) return; toast("Uploading image…", "loading"); try { const media = await upload(file); current.heroMediaId = media.id; current.heroImageUrl = media.url; updateHero(current); scheduleSave(); toast("Image uploaded."); } catch (error) { toast((error as Error).message, "error"); } finally { heroInput.value = ""; } });
  removeHero.addEventListener("click", () => { if (!current) return; current.heroMediaId = null; current.heroImageUrl = null; updateHero(current); scheduleSave(); });
  document.querySelectorAll("[data-new-event], [data-empty-new-event]").forEach((button) => button.addEventListener("click", () => void create()));
  filter.addEventListener("change", renderList);
  const publishButton = one<HTMLButtonElement>("[data-publish-now]");
  publishButton?.addEventListener("click", async () => { if (!current || !await confirm("Publish this event?", "The event will be visible on the public calendar immediately.", "Publish event")) return; await run(publishButton, "Publishing event…", "Event published.", () => action("publish")); });
  const previewButton = one<HTMLButtonElement>("[data-save-preview]");
  previewButton?.addEventListener("click", async () => { if (!current) return; if (["published", "scheduled"].includes(current.status) && !await confirm("Move this event to preview?", "It will be removed from the public calendar and returned to preview.", "Move to preview")) return; await run(previewButton, "Saving preview…", "Event saved as preview.", () => action("preview")); });
  const archiveButton = one<HTMLButtonElement>("[data-archive-event]");
  archiveButton?.addEventListener("click", async () => { if (!current || !await confirm("Archive this event?", "It will be removed from public and preview event views, but retained for staff.", "Archive event")) return; await run(archiveButton, "Archiving event…", "Event archived.", async () => { await action("archive"); current = null; editorShell.hidden = true; empty.hidden = false; if (crepe) await crepe.destroy(); crepe = null; filter.value = "current"; renderList(); }); });
  const fullPreview = one<HTMLButtonElement>("[data-preview-page]");
  fullPreview?.addEventListener("click", async () => {
    if (!current) return;
    const previewTab = reservePreviewTab();
    if (!previewTab) { toast("Your browser blocked the preview tab. Allow pop-ups for this site and try again.", "error"); return; }
    await run(fullPreview, "Saving preview…", "Preview opened in a new tab.", async () => {
      try {
        await action("preview");
        previewTab.location.replace(`/preview-events/${encodeURIComponent(current?.slug || "")}`);
      } catch (error) { previewTab.close(); throw error; }
    });
  });
  const scheduleButton = one<HTMLButtonElement>("[data-open-schedule]");
  scheduleButton?.addEventListener("click", async () => { if (!current) return; await flushSave(); scheduleAt.value = current.publishAt ? easternInput(current.publishAt) : easternInput(new Date(Date.now() + 3600000)); scheduleMessage.textContent = ""; scheduleDialog.showModal(); });
  scheduleForm.addEventListener("submit", async (submitEvent) => { submitEvent.preventDefault(); if (!current || !scheduleAt.value) return; const submit = scheduleForm.querySelector<HTMLButtonElement>("button[type=submit]"); busy(submit, true); scheduleMessage.textContent = "Scheduling…"; try { const result = await request<{ event: ManagedEvent }>(`/api/staff/events/${current.id}/schedule`, { method: "POST", body: JSON.stringify({ publishAtLocal: scheduleAt.value }) }); merge(result.event); renderList(); scheduleDialog.close(); toast("Event scheduled."); } catch (error) { scheduleMessage.textContent = (error as Error).message; scheduleMessage.dataset.tone = "error"; } finally { busy(submit, false); } });
  one("[data-sign-out]")?.addEventListener("click", () => void signOutStaff((error) => {
    manager.hidden = true;
    auth.hidden = false;
    auth.setAttribute("aria-busy", "false");
    authMessage.textContent = error;
    authMessage.dataset.tone = "error";
    retry.hidden = false;
    reset.hidden = false;
  }));

  requireStaffSession({ authSection: auth, authMessage, retryButton: retry, resetButton: reset, defaultCallback: "/manage/events/", allowedReturnPrefix: "/preview-events" })
    .then(async (staff) => {
      identity.textContent = staff.email;
      await load();
      auth.hidden = true;
      manager.hidden = false;
      watchStaffSession("/manage/events/");
      const requested = new URLSearchParams(window.location.search).get("event");
      if (requested && events.some((event) => event.id === requested)) await select(requested);
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
