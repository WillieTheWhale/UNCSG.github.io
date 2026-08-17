(() => {
  const storageKey = "uncsg_front_door_welcome_v2";

  try {
    const forceWelcome = new URLSearchParams(window.location.search).get("welcome") === "1";
    if (forceWelcome || window.localStorage.getItem(storageKey) !== "seen") {
      document.documentElement.classList.add("launch-welcome-pending");
    }
  } catch {
    document.documentElement.classList.add("launch-welcome-pending");
  }
})();
