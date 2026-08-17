# Updates publishing deployment

The public Astro site remains statically generated and served by unprivileged
nginx on port 8080. nginx proxies only `/api/*` to the internal
`uncsg-updates-api` service. The API stores articles, sessions, one-time codes,
and uploaded images in a Neon-managed PostgreSQL database. CloudApps does not
run a PostgreSQL pod or allocate a database PVC for this application.

## One-time email setup

UNC's Shibboleth documentation says a new service provider's certificate and
metadata may need to be submitted to Identity & Access Management. Because this
version is intentionally avoiding that application-registration step, staff
sign in with six-digit codes sent to their UNC email addresses.

1. Create a free Resend account.
2. Verify the dedicated sending subdomain `sgeb.bennetthilberg.com` by adding the
   SPF and DKIM records Resend provides. This domain is verified for the current
   deployment.
3. Create a Resend API key.
4. Use the verified sender
   `Updates Management <manageupdates@sgeb.bennetthilberg.com>`.
5. Publish a DMARC policy scoped to the sending subdomain. In the
   `bennetthilberg.com` DNS zone, add one TXT record with name `_dmarc.sgeb`,
   value `v=DMARC1; p=reject; adkim=s; aspf=s; pct=100`, and TTL `Auto` or
   `3600`. Do not replace the organizational-domain `_dmarc` record unless
   every other service sending as `@bennetthilberg.com` has also been audited.

Resend's free transactional tier currently permits 3,000 emails per month and
100 per day, which is well above the expected sign-in volume for the staff
whitelist.

## Configure Neon and the CloudApps secret

Create a Neon project in a US region and copy its PostgreSQL connection string.
Store that connection string as the `database-url` key in the existing
`uncsg-updates-secrets` Secret. Never put the connection string in this
repository, a build argument, or an unencrypted manifest.

For a new environment, run these commands while logged into the correct
CloudApps project. They create a random session secret and do not put
credentials in Git. Replace the placeholders only in your local shell.

```sh
UPDATES_AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
UPDATES_DATABASE_URL="PASTE_NEON_CONNECTION_STRING"

oc create secret generic uncsg-updates-secrets \
  --from-literal=database-url="${UPDATES_DATABASE_URL}" \
  --from-literal=better-auth-secret="${UPDATES_AUTH_SECRET}" \
  --from-literal=resend-api-key="PASTE_RESEND_API_KEY" \
  --from-literal=email-from="Updates Management <manageupdates@sgeb.bennetthilberg.com>"

unset UPDATES_AUTH_SECRET UPDATES_DATABASE_URL
```

If the Secret already exists, update its individual values through the
OpenShift console before deploying.

The API BuildConfig uses a dedicated GitHub webhook Secret. Create it once in
OpenShift; keep its generated value out of Git and separate from the frontend
webhook Secret:

```sh
UPDATES_WEBHOOK_SECRET="$(openssl rand -hex 32)"
oc create secret generic uncsg-updates-api-webhook-secret \
  --from-literal=WebHookSecretKey="${UPDATES_WEBHOOK_SECRET}"
unset UPDATES_WEBHOOK_SECRET
```

## Deploy in CloudApps

```sh
oc apply -f openshift.api.yaml
oc start-build uncsg-updates-api --follow
oc rollout status deployment/uncsg-updates-api
```

The API runs Better Auth's supported PostgreSQL migrations and creates the
updates/media tables at startup. Scheduled posts become public at their saved
Eastern Time without a cron job; public queries treat due scheduled posts as
published.

The API deployment uses the `Recreate` strategy because this quota-constrained
namespace cannot reserve memory for two API pods during a rolling update. The
frontend remains online while the API pod is replaced.

## Local development

Start PostgreSQL locally, copy `.env.example` to `.env`, and replace the
development auth secret if desired:

```sh
docker run --name uncsg-updates-db \
  -e POSTGRES_USER=uncsg \
  -e POSTGRES_PASSWORD=uncsg \
  -e POSTGRES_DB=uncsg_updates \
  -p 5432:5432 \
  -d postgres:16-alpine

cp .env.example .env
npm run dev:full
```

When `RESEND_API_KEY` is blank outside production, requested codes are printed
to the API terminal as `[updates auth] Development code ...`. `.env` is ignored
by Git.

## Operational notes

- Uploaded images are limited to JPEG, PNG, WebP, or GIF files of 5 MB or less.
- Archive is a soft delete. There is no permanent-delete API in v1.
- All whitelisted Onyens have equal create, edit, schedule, publish, and archive
  permission in v1.
- Neon Free provides 0.5 GB per project. Monitor database use because image
  uploads are stored in PostgreSQL for this initial, low-volume version.
- Use Neon's restore/backup capabilities before destructive schema changes.
