import express, { type Response } from "express";
import helmet from "helmet";
import {
  brokerConfig,
  openShiftClientId,
  openShiftClientSecret,
} from "./config.js";
import {
  accessTokenLifetimeMs,
  authorizationLifetimeMs,
  bearerToken,
  codeLifetimeMs,
  openShiftAccessTokenName,
  randomToken,
  secureEqual,
  sha256Base64Url,
  validOnyen,
} from "./protocol.js";

type AuthorizationTransaction = {
  clientState: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  createdAt: number;
};

type AuthorizationCode = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  onyen: string;
  scope: string;
  createdAt: number;
};

type BrokerAccessToken = {
  onyen: string;
  createdAt: number;
};

const openShiftTransactions = new Map<string, AuthorizationTransaction>();
const authorizationCodes = new Map<string, AuthorizationCode>();
const brokerAccessTokens = new Map<string, BrokerAccessToken>();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

function noStore(response: Response): void {
  response.set("Cache-Control", "no-store");
  response.set("Pragma", "no-cache");
}

function oauthError(
  response: Response,
  status: number,
  error: string,
  description: string,
): void {
  noStore(response);
  response.status(status).json({ error, error_description: description });
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of openShiftTransactions) {
    if (now - value.createdAt > authorizationLifetimeMs) {
      openShiftTransactions.delete(key);
    }
  }
  for (const [key, value] of authorizationCodes) {
    if (now - value.createdAt > codeLifetimeMs) authorizationCodes.delete(key);
  }
  for (const [key, value] of brokerAccessTokens) {
    if (now - value.createdAt > accessTokenLifetimeMs) {
      brokerAccessTokens.delete(key);
    }
  }
}

function redirectWithError(
  transaction: AuthorizationTransaction,
  response: Response,
  error: string,
  description: string,
): void {
  const target = new URL(transaction.redirectUri);
  target.searchParams.set("error", error);
  target.searchParams.set("error_description", description);
  target.searchParams.set("state", transaction.clientState);
  response.redirect(302, target.toString());
}

function redirectWithAuthorizationCode(
  transaction: AuthorizationTransaction,
  onyenValue: string,
  response: Response,
): void {
  const onyen = onyenValue.trim().toLowerCase();
  if (!validOnyen(onyen)) {
    redirectWithError(
      transaction,
      response,
      "access_denied",
      "UNC SSO returned an unsupported username.",
    );
    return;
  }

  const code = randomToken();
  authorizationCodes.set(code, {
    clientId: transaction.clientId,
    redirectUri: transaction.redirectUri,
    codeChallenge: transaction.codeChallenge,
    onyen,
    scope: transaction.scope,
    createdAt: Date.now(),
  });

  const target = new URL(transaction.redirectUri);
  target.searchParams.set("code", code);
  target.searchParams.set("state", transaction.clientState);
  response.redirect(302, target.toString());
}

async function exchangeOpenShiftCode(code: string): Promise<string> {
  const clientId = await openShiftClientId();
  const clientSecret = await openShiftClientSecret();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${brokerConfig.baseUrl}/oauth/callback`,
  });
  const response = await fetch(
    `${brokerConfig.openShiftOAuthBaseUrl}/oauth/token`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      redirect: "error",
    },
  );
  const result = (await response.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !result?.access_token) {
    throw new Error(
      result?.error_description ??
        result?.error ??
        `OpenShift rejected the authorization code (${response.status}).`,
    );
  }
  return result.access_token;
}

async function openShiftOnyen(accessToken: string): Promise<string> {
  const response = await fetch(
    `${brokerConfig.openShiftApiBaseUrl}/apis/user.openshift.io/v1/users/~`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "error",
    },
  );
  const result = (await response.json().catch(() => null)) as {
    metadata?: { name?: string };
    message?: string;
  } | null;
  const onyen = result?.metadata?.name?.trim().toLowerCase();
  if (!response.ok || !onyen || !validOnyen(onyen)) {
    throw new Error(
      result?.message ??
        `OpenShift did not return a usable UNC username (${response.status}).`,
    );
  }
  return onyen;
}

async function revokeOpenShiftToken(accessToken: string): Promise<void> {
  const tokenName = encodeURIComponent(openShiftAccessTokenName(accessToken));
  await fetch(
    `${brokerConfig.openShiftApiBaseUrl}/apis/oauth.openshift.io/v1/useroauthaccesstokens/${tokenName}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "error",
    },
  ).catch(() => undefined);
}

app.get("/health", (_request, response) => {
  noStore(response);
  response.json({ ok: true });
});

app.get("/.well-known/oauth-authorization-server", (_request, response) => {
  noStore(response);
  response.json({
    issuer: brokerConfig.baseUrl,
    authorization_endpoint: `${brokerConfig.baseUrl}/authorize`,
    token_endpoint: `${brokerConfig.baseUrl}/token`,
    userinfo_endpoint: `${brokerConfig.baseUrl}/userinfo`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

app.get("/authorize", async (request, response) => {
  cleanupExpiredEntries();
  const clientId = typeof request.query.client_id === "string" ? request.query.client_id : "";
  const redirectUri =
    typeof request.query.redirect_uri === "string" ? request.query.redirect_uri : "";
  const state = typeof request.query.state === "string" ? request.query.state : "";
  const responseType =
    typeof request.query.response_type === "string" ? request.query.response_type : "";
  const codeChallenge =
    typeof request.query.code_challenge === "string" ? request.query.code_challenge : "";
  const codeChallengeMethod =
    typeof request.query.code_challenge_method === "string"
      ? request.query.code_challenge_method
      : "";
  const scope = typeof request.query.scope === "string" ? request.query.scope : "openid";

  if (clientId !== brokerConfig.mainClientId) {
    oauthError(response, 400, "unauthorized_client", "The OAuth client is not recognized.");
    return;
  }
  if (!brokerConfig.mainRedirectUris.includes(redirectUri)) {
    oauthError(response, 400, "invalid_request", "The redirect URI is not registered.");
    return;
  }
  if (responseType !== "code" || !state || state.length > 2048) {
    oauthError(response, 400, "invalid_request", "A valid code request and state are required.");
    return;
  }
  if (
    codeChallengeMethod !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
  ) {
    oauthError(response, 400, "invalid_request", "PKCE with S256 is required.");
    return;
  }

  const transaction: AuthorizationTransaction = {
    clientState: state,
    clientId,
    redirectUri,
    codeChallenge,
    scope,
    createdAt: Date.now(),
  };

  if (brokerConfig.devOnyen) {
    redirectWithAuthorizationCode(transaction, brokerConfig.devOnyen, response);
    return;
  }

  try {
    const brokerState = randomToken();
    openShiftTransactions.set(brokerState, transaction);
    const target = new URL(
      "/oauth/authorize",
      brokerConfig.openShiftOAuthBaseUrl,
    );
    target.searchParams.set("client_id", await openShiftClientId());
    target.searchParams.set("response_type", "code");
    target.searchParams.set("redirect_uri", `${brokerConfig.baseUrl}/oauth/callback`);
    target.searchParams.set("scope", "user:info");
    target.searchParams.set("state", brokerState);
    target.searchParams.set("approval_prompt", "auto");
    response.redirect(302, target.toString());
  } catch (error) {
    console.error("[auth broker] Could not begin OpenShift OAuth:", error);
    oauthError(
      response,
      503,
      "temporarily_unavailable",
      "UNC SSO could not be started. Please try again.",
    );
  }
});

app.get("/oauth/callback", async (request, response) => {
  cleanupExpiredEntries();
  const state = typeof request.query.state === "string" ? request.query.state : "";
  const transaction = openShiftTransactions.get(state);
  if (!transaction) {
    oauthError(response, 400, "invalid_request", "The sign-in transaction expired or is invalid.");
    return;
  }
  openShiftTransactions.delete(state);

  const upstreamError =
    typeof request.query.error === "string" ? request.query.error : undefined;
  if (upstreamError) {
    redirectWithError(
      transaction,
      response,
      "access_denied",
      "UNC sign-in was cancelled or denied.",
    );
    return;
  }

  const code = typeof request.query.code === "string" ? request.query.code : "";
  if (!code) {
    redirectWithError(
      transaction,
      response,
      "invalid_request",
      "UNC sign-in did not return an authorization code.",
    );
    return;
  }

  let accessToken: string | undefined;
  try {
    accessToken = await exchangeOpenShiftCode(code);
    const onyen = await openShiftOnyen(accessToken);
    await revokeOpenShiftToken(accessToken);
    redirectWithAuthorizationCode(transaction, onyen, response);
  } catch (error) {
    if (accessToken) await revokeOpenShiftToken(accessToken);
    console.error("[auth broker] OpenShift callback failed:", error);
    redirectWithError(
      transaction,
      response,
      "server_error",
      "UNC identity could not be verified. Please try again.",
    );
  }
});

app.post("/token", (request, response) => {
  cleanupExpiredEntries();
  const { grant_type, code, client_id, redirect_uri, code_verifier } = request.body as Record<
    string,
    string | undefined
  >;
  if (grant_type !== "authorization_code") {
    oauthError(response, 400, "unsupported_grant_type", "Only authorization_code is supported.");
    return;
  }
  if (!code) {
    oauthError(response, 400, "invalid_grant", "The authorization code is missing.");
    return;
  }

  const grant = authorizationCodes.get(code);
  authorizationCodes.delete(code);
  if (!grant || Date.now() - grant.createdAt > codeLifetimeMs) {
    oauthError(response, 400, "invalid_grant", "The authorization code is invalid or expired.");
    return;
  }
  if (
    client_id !== grant.clientId ||
    redirect_uri !== grant.redirectUri ||
    !code_verifier ||
    !secureEqual(sha256Base64Url(code_verifier), grant.codeChallenge)
  ) {
    oauthError(response, 400, "invalid_grant", "The authorization code could not be verified.");
    return;
  }

  const accessToken = randomToken();
  brokerAccessTokens.set(sha256Base64Url(accessToken), {
    onyen: grant.onyen,
    createdAt: Date.now(),
  });
  noStore(response);
  response.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(accessTokenLifetimeMs / 1000),
    scope: grant.scope,
  });
});

app.get("/userinfo", (request, response) => {
  cleanupExpiredEntries();
  const token = bearerToken(request.get("authorization"));
  const record = token
    ? brokerAccessTokens.get(sha256Base64Url(token))
    : undefined;
  if (!record || Date.now() - record.createdAt > accessTokenLifetimeMs) {
    response.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    oauthError(response, 401, "invalid_token", "The access token is invalid or expired.");
    return;
  }

  brokerAccessTokens.delete(sha256Base64Url(token!));
  const email = `${record.onyen}@ad.unc.edu`;
  noStore(response);
  response.json({
    sub: `unc:${record.onyen}`,
    id: `unc:${record.onyen}`,
    name: record.onyen,
    preferred_username: record.onyen,
    email,
    email_verified: true,
  });
});

app.use((_request, response) => {
  response.status(404).json({ error: "not_found" });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[auth broker] Unhandled request error:", error);
    oauthError(
      response,
      500,
      "server_error",
      "The authentication service encountered an unexpected error.",
    );
  },
);

app.listen(brokerConfig.port, "0.0.0.0", () => {
  console.info(
    `[auth broker] Listening on http://0.0.0.0:${brokerConfig.port} for ${brokerConfig.baseUrl}`,
  );
});
