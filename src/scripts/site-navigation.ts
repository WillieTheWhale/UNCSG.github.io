export function initializeSiteNavigation(): void {
  document.querySelectorAll<HTMLElement>("[data-site-header]").forEach((header) => {
    if (header.dataset.navigationInitialized) return;
    header.dataset.navigationInitialized = "true";

    const toggle = header.querySelector<HTMLButtonElement>("[data-site-nav-toggle]");
    const label = header.querySelector<HTMLElement>("[data-site-nav-label]");
    const navigation = header.querySelector<HTMLElement>(".site-nav");
    if (!toggle || !label || !navigation) return;

    const closeMenu = (restoreFocus = false) => {
      header.dataset.menuOpen = "false";
      toggle.setAttribute("aria-expanded", "false");
      label.textContent = "Open navigation";
      if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      header.dataset.menuOpen = String(open);
      toggle.setAttribute("aria-expanded", String(open));
      label.textContent = open ? "Close navigation" : "Open navigation";
    });

    navigation.addEventListener("click", (event) => {
      if ((event.target as Element).closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });

    const wideNavigation = window.matchMedia("(min-width: 60.01rem)");
    wideNavigation.addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });
  });
}
