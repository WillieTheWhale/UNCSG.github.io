# UNC OpenShift authentication broker

This document deploys a small OAuth broker into the `bhilberg` UNC CloudApps
project. The broker authenticates users through the cluster's existing UNC SSO
connection and returns a short-lived OAuth authorization code to the Executive
Branch updates API.

The broker is deliberately separate from the CloudApps project that owns
`executivebranch.unc.edu`. That project's owner does not need to create a service
account, Route, database, RoleBinding, or new secret for this authentication
flow.

## Pilot status (verified August 12, 2026)

The broker is currently deployed in the `bhilberg` project and its public Route
is healthy. A complete pilot sign-in was verified from the local Executive Branch
site through UNC SSO and OpenShift OAuth, back through the broker, and into the
updates manager as the whitelisted Onyen `bhilberg`.

This does **not** mean the feature is live on `executivebranch.unc.edu` yet. The
broker code and main-site integration still need to be reviewed, committed, and
deployed by the normal repository and main CloudApps project workflow. No commit
or push was made as part of the pilot deployment.

## Resulting request flow

1. `executivebranch.unc.edu/manage-updates` starts an OAuth authorization-code
   request with PKCE.
2. The browser visits
   `uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/authorize`.
3. The broker redirects the browser to UNC CloudApps OpenShift OAuth.
4. OpenShift delegates authentication to UNC SSO.
5. OpenShift returns a short-lived code to the broker's `/oauth/callback`.
6. The broker exchanges that code using its mounted service-account token,
   requests the current OpenShift `User`, and obtains the Onyen.
7. The OpenShift access token is discarded and a revocation is attempted.
8. The broker sends a different, single-use, 60-second code to the main site's
   Better Auth callback.
9. The main API proves possession of its PKCE verifier, obtains the canonical
   `<onyen>@ad.unc.edu` identity, checks the existing Onyen whitelist, and creates
   its normal 12-hour session.

No username or reusable credential is trusted from a browser query parameter.

## Resources created in `bhilberg`

`auth-broker/openshift.yaml` creates only namespace-scoped resources:

- `ServiceAccount/uncsg-auth-broker`, which also serves as the constrained
  OpenShift OAuth client.
- `ImageStream/uncsg-auth-broker`.
- `BuildConfig/uncsg-auth-broker` using a binary Docker build.
- `Deployment/uncsg-auth-broker` with exactly one replica.
- `Service/uncsg-auth-broker`.
- `Route/uncsg-auth-broker` at
  `https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu`.

There is intentionally no Role, RoleBinding, database, signing-key Secret, or
long-lived manually copied OpenShift token. The pod reads its automatically
mounted, rotating service-account token when it exchanges an OpenShift code.

Keep the Deployment at one replica in this version because login transactions
are intentionally short-lived and stored only in that pod's memory. A restart
during a login can invalidate that one attempt; the user can immediately retry.

## 1. Install the `oc` command-line client

The OpenShift web console offers the matching client from its help menu:

1. Open `https://console.apps.cloudapps.unc.edu`.
2. Open the `?` help menu near the upper-right corner.
3. Choose **Command line tools**.
4. Download **oc - OpenShift Command Line Interface** for macOS.
5. Extract the archive.
6. Move `oc` into a directory on `PATH`, for example `/usr/local/bin`, or invoke
   it using its full path.
7. Confirm it works:

   ```sh
   oc version --client
   ```

Installing the client does not authenticate it or modify the cluster.

## 2. Authenticate the CLI without sharing the token

1. In the CloudApps console, open the user menu.
2. Choose **Copy login command**.
3. Complete UNC sign-in if prompted.
4. Choose **Display Token**.
5. Copy the complete command beginning with `oc login --token=`.
6. Paste that command directly into a local terminal. Do not put it in source
   control, this document, chat, screenshots, or shell scripts.

Then select and verify the project:

```sh
oc project bhilberg
oc project --short
oc auth can-i create serviceaccounts
oc auth can-i create buildconfigs.build.openshift.io
oc auth can-i create deployments.apps
oc auth can-i create routes.route.openshift.io
```

Every `can-i` check should print `yes`. Stop if `oc project --short` prints any
project other than `bhilberg`.

## 3. Review the exact CloudApps manifest

Before applying anything, inspect:

```sh
oc diff -f auth-broker/openshift.yaml
```

For the first deployment, `oc diff` can return exit code `1` simply because the
resources do not exist yet. Review that every resource is named
`uncsg-auth-broker` and that the Route host ends in
`-bhilberg.apps.cloudapps.unc.edu`.

The service-account annotation must be exactly:

```text
serviceaccounts.openshift.io/oauth-redirecturi.production=
https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/oauth/callback
```

OpenShift requires an exact match between that annotation and the OAuth
`redirect_uri`.

## 4. Build and deploy the broker from the local working tree

The helper script deploys the manifest, creates a minimal temporary binary-build
directory, uploads it to the BuildConfig, waits for the rollout, and calls both
public health endpoints:

```sh
chmod +x auth-broker/deploy-binary.sh
./auth-broker/deploy-binary.sh
```

This binary build is useful before the feature is committed or merged. It sends
only the broker source, TypeScript configuration, package manifests, and broker
Dockerfile. It does not push Git, update `main`, or deploy the Executive Branch
website.

Expected final responses include:

```json
{"ok":true}
```

and an OAuth metadata document containing these URLs:

```text
https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/authorize
https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/token
https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/userinfo
```

## 5. Verify the deployed resources

Run:

```sh
oc get serviceaccount,buildconfig,imagestream,deployment,service,route \
  -l app=uncsg-auth-broker
oc get route uncsg-auth-broker -o jsonpath='{.spec.host}{"\n"}'
oc get serviceaccount uncsg-auth-broker -o yaml
oc logs deployment/uncsg-auth-broker --tail=100
curl -i https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu/health
```

Healthy state means:

- The Deployment shows `1/1` ready.
- The Route prints
  `uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu`.
- `/health` returns HTTP `200` and `{"ok":true}`.
- Logs show the broker listening on port `8080` and do not show a missing
  namespace or service-account token.

## 6. Test the real UNC SSO flow against the local main site

Keep the broker deployed in CloudApps. Locally, configure the main API to use its
public URL. These are public identifiers, not secrets:

```dotenv
UNC_AUTH_BROKER_URL=https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu
UNC_AUTH_BROKER_CLIENT_ID=uncsg-updates
```

Restart the updates API after changing environment variables:

```sh
npm run dev:api
```

Run the Astro site if it is not already running:

```sh
npm run dev
```

Then:

1. Open `http://localhost:4321/manage-updates/`.
2. Select **Sign in with UNC SSO**.
3. Complete the normal UNC login.
4. If OpenShift asks whether to authorize the constrained client, approve the
   `user:info` request. It does not grant project or cluster-management access.
5. Confirm that the browser returns to the local Manage Updates page.
6. Confirm the toolbar shows `<your-onyen>@ad.unc.edu`.
7. Sign out and repeat with one whitelisted staffer who has never used CloudApps.

The second-person test is required before production launch. It proves that UNC
users can authenticate to the cluster identity provider without owning or being
members of a CloudApps project.

If sign-in fails, immediately collect:

```sh
oc logs deployment/uncsg-auth-broker --since=10m
```

Do not copy browser cookies, authorization codes, access tokens, or the output of
`oc whoami --show-token` into a ticket or chat.

## 7. Production integration with the existing site project

The main site code uses these non-secret defaults:

```text
broker URL: https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu
client ID:  uncsg-updates
callback:   https://executivebranch.unc.edu/api/auth/oauth2/callback/unc-openshift
```

Therefore the owner of the CloudApps project hosting
`executivebranch.unc.edu` does not have to add a broker ServiceAccount, Route,
RoleBinding, database, signing key, or client secret. They only deploy the normal
updated website and updates-API images after the code is merged to the branch
their BuildConfigs follow.

Before production use, confirm the site's existing nginx proxy still routes
`/api/*` to `uncsg-updates-api`, and then test:

```sh
curl -i https://executivebranch.unc.edu/api/auth/provider-status
```

The JSON response must include:

```json
{"uncOpenShift":true}
```

Finally, sign in at:

```text
https://executivebranch.unc.edu/manage-updates/
```

## 8. Remove the localhost callback after the pilot

The deployed broker initially accepts both the production callback and a
localhost callback so the full flow can be tested before the main-site project
deploys it. PKCE protects the localhost callback, but the production-only
configuration is smaller and should be used after verification.

Edit `auth-broker/openshift.yaml` so `MAIN_REDIRECT_URIS` contains only:

```text
https://executivebranch.unc.edu/api/auth/oauth2/callback/unc-openshift
```

Then apply that one configuration change:

```sh
oc apply -f auth-broker/openshift.yaml
oc rollout status deployment/uncsg-auth-broker --timeout=180s
```

The service-account redirect annotation remains the broker's own
`/oauth/callback`; it is unrelated to the main site's callback list.

## Operations

View recent logs:

```sh
oc logs deployment/uncsg-auth-broker --since=30m
```

Restart the broker:

```sh
oc rollout restart deployment/uncsg-auth-broker
oc rollout status deployment/uncsg-auth-broker --timeout=180s
```

Rebuild after local source changes:

```sh
./auth-broker/deploy-binary.sh
```

Confirm no privilege was attached:

```sh
oc get rolebindings -o json | jq -r \
  '.items[] | select(any(.subjects[]?; .name == "uncsg-auth-broker")) | .metadata.name'
```

The command should print nothing.

## Rollback and removal

Deleting the broker does not delete the main website, updates database, or any
article. It only prevents new UNC SSO sessions from being created:

```sh
oc project bhilberg
oc delete -f auth-broker/openshift.yaml
```

Existing main-site sessions remain governed by their normal expiry. If an
emergency requires invalidating those too, rotate `BETTER_AUTH_SECRET` in the
main site's project separately; that is intentionally outside this broker's
permissions.

## Security properties and limits

- The broker requests only OpenShift `user:info`.
- Its service account has no RoleBinding and no project-management permission.
- All callbacks are exact allowlisted URLs.
- The main client must use authorization code plus PKCE S256.
- Broker authorization codes are random, single-use, and valid for 60 seconds.
- Broker access tokens are random, single-use at `/userinfo`, and valid for two
  minutes.
- The main application independently enforces the Onyen whitelist on every
  staff API request.
- OpenShift access tokens are never returned to the browser or main site and are
  revoked on a best-effort basis after identity lookup.
- The broker stores no passwords, articles, profile data, refresh tokens, or
  permanent login history.
- In-memory transactions require one broker replica. A restart can interrupt
  only an in-progress sign-in.
