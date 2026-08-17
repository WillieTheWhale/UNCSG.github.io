# Updates publishing deployment

The public Astro site remains statically generated and served by unprivileged
nginx on port 8080. nginx proxies only `/api/*` to the internal
`uncsg-updates-api` service. The API stores articles, sessions, one-time codes,
and uploaded images in PostgreSQL.

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

## Create the CloudApps secret

Run these commands while logged into the correct CloudApps project. They create
random database and session secrets and do not put credentials in Git.

```sh
UPDATES_DB_PASSWORD="$(openssl rand -hex 24)"
UPDATES_AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
UPDATES_DATABASE_URL="postgresql://uncsg:${UPDATES_DB_PASSWORD}@uncsg-updates-postgres:5432/uncsg_updates"

oc create secret generic uncsg-updates-secrets \
  --from-literal=postgres-password="${UPDATES_DB_PASSWORD}" \
  --from-literal=database-url="${UPDATES_DATABASE_URL}" \
  --from-literal=better-auth-secret="${UPDATES_AUTH_SECRET}" \
  --from-literal=resend-api-key="PASTE_RESEND_API_KEY" \
  --from-literal=email-from="Updates Management <manageupdates@sgeb.bennetthilberg.com>"

unset UPDATES_DB_PASSWORD UPDATES_AUTH_SECRET UPDATES_DATABASE_URL
```

If the Secret already exists, update it through the OpenShift console or delete
and recreate only that exact Secret before deploying.

## Deploy in CloudApps

```sh
oc apply -f openshift.yaml
oc start-build uncsg-updates-api --follow
oc start-build uncsg-website --follow
oc rollout status deployment/uncsg-updates-postgres
oc rollout status deployment/uncsg-updates-api
oc rollout status deployment/uncsg-website
```

The API runs Better Auth's supported PostgreSQL migrations and creates the
updates/media tables at startup. Scheduled posts become public at their saved
Eastern Time without a cron job; public queries treat due scheduled posts as
published.

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
- Database storage is a 2 GiB persistent volume. Monitor its utilization because
  image uploads are stored in PostgreSQL for this initial, low-volume version.
- Back up the PostgreSQL volume before upgrades or destructive maintenance.
