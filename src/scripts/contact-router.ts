interface Destination { id: string; office: string; person: string; title: string; email: string; summary: string; }
interface Topic { id: string; label: string; detail: string; destination: string; }
interface Intent { id: string; label: string; shortLabel: string; description: string; topics: Topic[]; }
interface Model { intents: Intent[]; destinations: Destination[]; }

const query = <T extends Element>(root: ParentNode, selector: string) => root.querySelector<T>(selector);

function initializeRouter(root: HTMLElement) {
  if (root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";
  const modelNode = query<HTMLScriptElement>(root, "[data-contact-model]");
  if (!modelNode?.textContent) return;
  const model = JSON.parse(modelNode.textContent) as Model;
  let selectedIntent: Intent | undefined;
  let selectedTopic: Topic | undefined;
  let destination: Destination | undefined;

  const pathwayButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-intent]")];
  const questionTitle = query<HTMLElement>(root, "[data-question-title]");
  const questionCopy = query<HTMLElement>(root, "[data-question-copy]");
  const topicList = query<HTMLElement>(root, "[data-topic-list]");
  const resultEmpty = query<HTMLElement>(root, "[data-result-empty]");
  const resultContent = query<HTMLElement>(root, "[data-result-content]");
  const builder = query<HTMLElement>(root, "[data-message-builder]");
  const builderToggle = query<HTMLButtonElement>(root, "[data-builder-toggle]");
  const resetButton = query<HTMLButtonElement>(root, "[data-contact-reset]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stackedWorkspace = window.matchMedia("(max-width: 48rem)");

  const guideTo = (element: HTMLElement | null | undefined) => {
    if (!element) return;
    window.requestAnimationFrame(() => element.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start",
    }));
  };

  const updateProgress = () => {
    const reason = query<HTMLElement>(root, "[data-progress-reason]");
    const topic = query<HTMLElement>(root, "[data-progress-topic]");
    const contact = query<HTMLElement>(root, "[data-progress-contact]");
    [reason, topic, contact].forEach((item) => item?.classList.remove("is-current", "is-complete"));
    if (!selectedIntent) reason?.classList.add("is-current");
    else {
      reason?.classList.add("is-complete");
      const reasonText = query<HTMLElement>(reason ?? root, "strong");
      if (reasonText) reasonText.textContent = selectedIntent.shortLabel;
      if (!destination) topic?.classList.add("is-current");
      else {
        topic?.classList.add("is-complete");
        contact?.classList.add("is-current");
        const topicText = query<HTMLElement>(topic ?? root, "strong");
        const contactText = query<HTMLElement>(contact ?? root, "strong");
        if (topicText) topicText.textContent = selectedTopic?.label ?? "General routing";
        if (contactText) contactText.textContent = destination.office;
      }
    }
  };

  const updateDraft = () => {
    const subject = query<HTMLInputElement>(root, "[data-builder-subject]")?.value.trim() || selectedTopic?.label || "A question from a UNC student";
    const context = query<HTMLTextAreaElement>(root, "[data-builder-context]")?.value.trim();
    const ask = query<HTMLTextAreaElement>(root, "[data-builder-ask]")?.value.trim();
    const name = query<HTMLInputElement>(root, "[data-builder-name]")?.value.trim();
    const timing = query<HTMLInputElement>(root, "[data-builder-timing]")?.value.trim();
    const lines = ["Hello,", "", context || "I’m reaching out with a question and would appreciate your guidance."];
    if (timing) lines.push("", `Relevant timing: ${timing}`);
    if (ask) lines.push("", `A helpful next step would be: ${ask}`);
    lines.push("", "Thank you." + (name ? `\n\n${name}` : ""));
    const body = lines.join("\n");
    const subjectPreview = query<HTMLElement>(root, "[data-preview-subject]");
    const bodyPreview = query<HTMLElement>(root, "[data-preview-body]");
    const openEmail = query<HTMLAnchorElement>(root, "[data-open-email]");
    if (subjectPreview) subjectPreview.textContent = `Subject: ${subject}`;
    if (bodyPreview) bodyPreview.textContent = body;
    if (openEmail) openEmail.href = `mailto:${destination?.email ?? "usgsec@unc.edu"}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const showDestination = (topic: Topic) => {
    selectedTopic = topic;
    destination = model.destinations.find((item) => item.id === topic.destination);
    if (!destination) return;
    resultEmpty?.setAttribute("hidden", "");
    resultContent?.removeAttribute("hidden");
    const office = query<HTMLElement>(root, "[data-result-office]");
    const person = query<HTMLElement>(root, "[data-result-person]");
    const title = query<HTMLElement>(root, "[data-result-title]");
    const summary = query<HTMLElement>(root, "[data-result-summary]");
    const email = query<HTMLAnchorElement>(root, "[data-result-email]");
    const emailText = query<HTMLElement>(root, "[data-result-email-text]");
    if (office) office.textContent = destination.office;
    if (person) person.textContent = destination.person;
    if (title) title.textContent = destination.title;
    if (summary) summary.textContent = destination.summary;
    if (email) email.href = `mailto:${destination.email}`;
    if (emailText) emailText.textContent = destination.email;
    resetButton?.removeAttribute("hidden");
    updateProgress();
    updateDraft();
    root.classList.add("has-result");
    if (stackedWorkspace.matches) guideTo(query<HTMLElement>(root, "[data-result-panel]"));
  };

  const renderTopics = (intent: Intent) => {
    selectedIntent = intent;
    selectedTopic = undefined;
    destination = undefined;
    pathwayButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.intent === intent.id)));
    root.querySelectorAll<HTMLDetailsElement>("[data-intent-details]").forEach((details) => { details.open = details.dataset.intentDetails === intent.id; });
    if (questionTitle) questionTitle.textContent = intent.id === "unsure" ? "We’ll make sure it reaches the right place." : "Which topic is closest?";
    if (questionCopy) {
      questionCopy.textContent = intent.description;
      questionCopy.toggleAttribute("hidden", intent.id === "unsure");
    }
    if (topicList) {
      topicList.replaceChildren(...intent.topics.map((topic) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.topic = topic.id;
        button.innerHTML = `<span><strong>${topic.label}</strong><small>${topic.detail}</small></span><i aria-hidden="true">→</i>`;
        button.addEventListener("click", () => showDestination(topic));
        return button;
      }));
    }
    resultContent?.setAttribute("hidden", "");
    resultEmpty?.removeAttribute("hidden");
    root.classList.add("has-intent");
    root.classList.remove("has-result");
    updateProgress();
    guideTo(query<HTMLElement>(root, "[data-question-panel]"));
  };

  pathwayButtons.forEach((button) => button.addEventListener("click", () => {
    const intent = model.intents.find((item) => item.id === button.dataset.intent);
    if (intent) renderTopics(intent);
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-accordion-topic]").forEach((button) => button.addEventListener("click", () => {
    const intent = model.intents.find((item) => item.id === button.dataset.accordionIntent);
    const topic = intent?.topics.find((item) => item.id === button.dataset.accordionTopic);
    if (intent && topic) { renderTopics(intent); showDestination(topic); }
  }));

  const scrollPathways = (direction: number) => query<HTMLElement>(root, "[data-contact-pathways]")?.scrollBy({ left: direction * 360, behavior: "smooth" });
  query<HTMLButtonElement>(root, "[data-carousel-previous]")?.addEventListener("click", () => scrollPathways(-1));
  query<HTMLButtonElement>(root, "[data-carousel-next]")?.addEventListener("click", () => scrollPathways(1));

  const search = query<HTMLInputElement>(root, "[data-contact-search]");
  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    let count = 0;
    pathwayButtons.forEach((button) => {
      const matches = !term || button.dataset.searchText?.toLowerCase().includes(term);
      button.hidden = !matches;
      if (matches) count++;
    });
    const status = query<HTMLElement>(root, "[data-search-status]");
    if (status) status.textContent = term ? `${count} suggested ${count === 1 ? "pathway" : "pathways"}` : "Or browse the common reasons below.";
  });

  builderToggle?.addEventListener("click", () => {
    const isOpen = !builder?.hasAttribute("hidden");
    builder?.toggleAttribute("hidden", isOpen);
    builderToggle.setAttribute("aria-expanded", String(!isOpen));
    if (!isOpen) builder?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  query<HTMLButtonElement>(root, "[data-builder-close]")?.addEventListener("click", () => {
    builder?.setAttribute("hidden", "");
    builderToggle?.setAttribute("aria-expanded", "false");
    builderToggle?.focus();
  });
  query<HTMLFormElement>(root, "[data-builder-form]")?.addEventListener("input", updateDraft);
  query<HTMLButtonElement>(root, "[data-copy-message]")?.addEventListener("click", async () => {
    const subject = query<HTMLElement>(root, "[data-preview-subject]")?.textContent ?? "";
    const body = query<HTMLElement>(root, "[data-preview-body]")?.textContent ?? "";
    const status = query<HTMLElement>(root, "[data-copy-status]");
    try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); if (status) status.textContent = "Message copied."; }
    catch { if (status) status.textContent = "Copying was blocked. Select the draft text to copy it manually."; }
  });
  query<HTMLButtonElement>(root, "[data-copy-email]")?.addEventListener("click", async (event) => {
    if (!destination) return;
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    const label = query<HTMLElement>(button, "[data-copy-email-label]");
    const status = query<HTMLElement>(root, "[data-copy-email-status]");
    try {
      await navigator.clipboard.writeText(destination.email);
      if (label) label.textContent = "Copied";
      if (status) status.textContent = `${destination.email} copied to the clipboard.`;
      window.setTimeout(() => { if (label) label.textContent = "Copy email"; }, 1800);
    } catch {
      if (status) status.textContent = `Copying was blocked. The email address is ${destination.email}.`;
    }
  });
  resetButton?.addEventListener("click", () => {
    selectedIntent = undefined; selectedTopic = undefined; destination = undefined;
    pathwayButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    if (questionTitle) questionTitle.textContent = "Choose a reason above to begin.";
    if (questionCopy) {
      questionCopy.textContent = "We’ll ask one short follow-up when it helps us make a better match.";
      questionCopy.removeAttribute("hidden");
    }
    topicList?.replaceChildren();
    resultContent?.setAttribute("hidden", ""); resultEmpty?.removeAttribute("hidden"); resetButton.setAttribute("hidden", "");
    root.classList.remove("has-intent", "has-result"); updateProgress();
  });
  updateDraft();
}

export function initializeContactRouters() {
  document.querySelectorAll<HTMLElement>("[data-contact-router]").forEach(initializeRouter);
}
