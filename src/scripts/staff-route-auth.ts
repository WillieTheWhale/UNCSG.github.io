export interface StaffSession { email: string; onyen: string; }

const serviceUnavailableMessage =
  "The management sign-in service is temporarily unavailable. Try again in a moment.";

const errorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json() as { message?: string; error?: string };
    if (data.message) return data.message;
    if (data.error === "internal_server_error") return serviceUnavailableMessage;
    if (data.error) return data.error.replaceAll("_", " ");
  } catch {
    // Non-JSON proxy responses are handled by status below.
  }
  if (response.status >= 500) return serviceUnavailableMessage;
  return "Sign-in could not be completed. Please try again.";
};

const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(serviceUnavailableMessage);
  }
};

export async function beginStaffSignIn(callbackURL: string, errorCallbackURL: string): Promise<never> {
  const statusResponse = await authFetch("/api/auth/provider-status", { credentials: "same-origin", cache: "no-store" });
  if (!statusResponse.ok) throw new Error(await errorMessage(statusResponse));
  const status = await statusResponse.json() as { uncOpenShift: boolean };
  if (!status.uncOpenShift) throw new Error("UNC SSO is not configured yet. Contact bhilberg@unc.edu.");
  const response = await authFetch("/api/auth/sign-in/oauth2", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: "unc-openshift", callbackURL, errorCallbackURL }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const result = await response.json() as { url?: string };
  if (!result.url) throw new Error("UNC sign-in could not be started. Please try again.");
  window.location.replace(result.url);
  throw new Error("redirecting");
}

export async function clearStaffSession(): Promise<void> {
  const response = await authFetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error(await errorMessage(response));
}

export async function requireStaffSession(options: {
  authSection: HTMLElement;
  authMessage: HTMLElement;
  retryButton: HTMLButtonElement;
  resetButton?: HTMLButtonElement;
  defaultCallback: string;
  allowedReturnPrefix?: string;
}): Promise<StaffSession> {
  const {
    authSection,
    authMessage,
    retryButton,
    resetButton,
    defaultCallback,
    allowedReturnPrefix,
  } = options;

  const setBusy = (message: string) => {
    authSection.setAttribute("aria-busy", "true");
    authMessage.textContent = message;
    authMessage.removeAttribute("data-tone");
    retryButton.hidden = true;
    if (resetButton) resetButton.hidden = true;
  };

  const showRecovery = (message: string) => {
    authSection.hidden = false;
    authSection.setAttribute("aria-busy", "false");
    authMessage.textContent = message;
    authMessage.dataset.tone = "error";
    retryButton.hidden = false;
    if (resetButton) resetButton.hidden = false;
  };

  const signIn = async () => {
    setBusy("Redirecting to sign-in…");
    const requested = new URLSearchParams(window.location.search).get("return");
    const callbackURL = requested && allowedReturnPrefix && requested.startsWith(allowedReturnPrefix)
      ? requested
      : defaultCallback;
    await beginStaffSignIn(callbackURL, `${defaultCallback}?auth=unc-sso-error`);
  };

  const runRecovery = (operation: () => Promise<unknown>) => void (async () => {
    const startedAt = Date.now();
    try {
      await operation();
    } catch (error) {
      if ((error as Error).message === "redirecting") return;
      const remainingFeedbackTime = 350 - (Date.now() - startedAt);
      if (remainingFeedbackTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingFeedbackTime));
      }
      showRecovery((error as Error).message || serviceUnavailableMessage);
    }
  })();

  retryButton.addEventListener("click", () => runRecovery(signIn));
  resetButton?.addEventListener("click", () => runRecovery(async () => {
    setBusy("Signing you out…");
    await clearStaffSession();
    await signIn();
  }));

  let response: Response;
  try {
    response = await authFetch("/api/staff/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    showRecovery((error as Error).message);
    throw error;
  }
  if (response.status === 401) {
    if (new URLSearchParams(window.location.search).get("auth") === "unc-sso-error") {
      const error = new Error("UNC sign-in could not be completed. Try again or contact bhilberg@unc.edu.");
      showRecovery(error.message);
      throw error;
    }
    await signIn();
  }
  if (response.status === 403) { window.location.assign("/?auth=unauthorized"); throw new Error("access_denied"); }
  if (!response.ok) {
    const error = new Error(await errorMessage(response));
    showRecovery(error.message);
    throw error;
  }
  return (await response.json() as { staff: StaffSession }).staff;
}

export function watchStaffSession(returnPath: string): () => void {
  let lastCheck = Date.now();
  let checking = false;

  const check = async (force = false) => {
    if (checking || (!force && Date.now() - lastCheck < 5 * 60 * 1000)) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const response = await authFetch("/api/staff/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) {
        window.location.assign(`${returnPath}?auth=session-expired`);
      } else if (response.status === 403) {
        window.location.assign("/?auth=unauthorized");
      }
    } catch {
      // A temporary network interruption should not discard an open draft.
      // The next staff API action will surface a useful error or restart sign-in.
    } finally {
      checking = false;
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") void check();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void check(true);
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pageshow", onPageShow);
  };
}

export async function signOutStaff(onError?: (message: string) => void): Promise<void> {
  try {
    await clearStaffSession();
    window.location.assign("/");
  } catch (error) {
    onError?.((error as Error).message || serviceUnavailableMessage);
  }
}
