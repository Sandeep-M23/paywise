# Deploying to Vercel + PostgreSQL

Two Vercel projects from this one repository, `paywise-api` (root `apps/api`) and `paywise-web` (root `apps/web`), plus one PostgreSQL database. The live setup uses **Neon from the Vercel Marketplace** in Singapore (`aws-ap-southeast-1`), with both projects' functions in the same region (`sin1`). Any Postgres 15+ host works: the API reads `DATABASE_URL`, or the `DB_*` variables.

## 1. Projects (Vercel CLI, from the repository root)

```bash
npm i -g vercel && vercel login
vercel project create paywise-api
vercel project create paywise-web
```

Settings (dashboard, or `vercel api /v9/projects/<name> -X PATCH`):

| Project       | Root Directory | Framework | Node.js | Function region |
| ------------- | -------------- | --------- | ------- | --------------- |
| `paywise-api` | `apps/api`     | Other     | 24.x    | `sin1`          |
| `paywise-web` | `apps/web`     | Next.js   | 24.x    | `sin1`          |

Link the monorepo so each folder resolves to its project: `.vercel/repo.json` maps `apps/api` → `paywise-api` and `apps/web` → `paywise-web` (`vercel link --repo` creates it when the projects are connected to Git). Check with `vercel project inspect --non-interactive` from each folder. Deploys then upload the whole repository and build the project's folder, so `packages/shared` is included.

## 2. Database

```bash
cd apps/api
vercel integration add neon --name paywise-db --meta region=sin1 --no-env-pull
```

This creates the database and adds about 18 variables to `paywise-api`, all holding the **owner** role's credentials (`DATABASE_URL`, `PGPASSWORD`, `POSTGRES_URL`, …) plus Neon Auth URLs. The first install asks you to accept Neon's terms in the browser. They are only needed for the steps below; step 2b replaces them.

Create the schema and load the 10,000 employees from your machine, as the owner, through the **direct** (unpooled) URL:

```bash
vercel env pull /tmp/neon.env --environment production   # keep this file private, delete it after
DATABASE_URL="<DATABASE_URL_UNPOOLED from that file>" npm run db:sync
DATABASE_URL="<DATABASE_URL_UNPOOLED from that file>" npm run db:seed
```

### 2b. A least-privilege role for the API

The API connects as its own role, `paywise_app`, which may only `SELECT`, `INSERT` and `UPDATE` the three app tables. It can't delete or truncate rows (so salary history is append-only in the database too), change the schema, create roles or read the `neon_auth` schema. `db:app-role` creates the role (or resets its password and grants), as the owner:

```bash
openssl rand -base64 36 | tr -d '\n/+=' > /tmp/app.pw            # never printed
DATABASE_URL="<owner, unpooled>" APP_DB_PASSWORD="$(cat /tmp/app.pw)" npm run db:app-role
```

Then point the API at it and drop the owner credentials from Vercel:

1. Build `postgresql://paywise_app:<url-encoded password>@<pooled host>/neondb?sslmode=require` (the pooled host is the one in the integration's `DATABASE_URL`).
2. `vercel env rm <NAME> --confirm-name <NAME>` for every variable the integration added.
3. `vercel env add DATABASE_URL production --sensitive` (and `preview`), reading the URL from a file, not typed on the command line. It is not added to Development, so `vercel env pull` on a laptop gets no production credentials.
4. Redeploy and delete the temporary files.

From then on Vercel holds no owner credentials: schema changes, re-seeding and role changes use the owner connection string from the Neon console (Project → Connect). Re-run `db:app-role` after adding a table. The integration also enables Neon Auth, which the app doesn't use; it is turned off (Neon console → Auth, or `neonctl neon-auth disable --delete-data`), so the `neon_auth` role and schema no longer exist.

`db:sync` creates the tables from the Sequelize models, then applies `src/config/schema.sql` (the `pg_trgm` extension, checks, foreign keys, indexes). It is safe to re-run; run it deliberately, after a backup, whenever the models change. The API never syncs on boot outside `NODE_ENV=local`.

TLS: the server certificate is verified. Neon's certificates are publicly trusted; a host with a private CA (e.g. RDS) supplies it through `NODE_EXTRA_CA_CERTS`.

## 3. API project

Environment variables (production and preview), besides `DATABASE_URL` from step 2b. These six are the only ones the project holds:

| Name                | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| `HR_EMAIL`          | the demo sign-in email                                                                 |
| `HR_PASSWORD_HASH`  | output of `npm run hash-password -w @paywise/api -- '<password>'`                      |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` (piped straight into `vercel env add`, never shown)          |
| `CORS_ORIGIN`       | leave unset: the web app proxies `/api`; set it only if browsers call the API directly |

The API ships as a **prebuilt function** (Vercel's Build Output API). `apps/api/vercel.json` runs `scripts/build-vercel.mjs`, which bundles `server.ts` (the exported Express app, `@paywise/shared` included) with esbuild into `.vercel/output/functions/index.func/index.mjs`, and routes every path to it. Vercel runs that file as it is.

Why not Vercel's native Express support: it compiled each TypeScript file separately into ES modules but kept our extensionless imports (`./src/app`), which Node's ES module loader rejects, so the live function crashed with `ERR_MODULE_NOT_FOUND`. Bundling avoids that, and the TypeScript source in `packages/shared`, in one step. (Native support also typechecked with TypeScript's defaults because `apps/api/tsconfig.json` extended a file outside the project root, which is why that tsconfig holds its options directly.)

Before deploying, `vercel build --prod` (after `vercel pull`) reproduces the build locally, and the built `index.mjs` can be loaded in Node as a `(req, res)` handler to smoke-test it against a database. Then `vercel deploy --prod`.

Check: `https://<api-url>/api/health` → `{"ok":true}`.

## 4. Web project

Environment variable: `API_URL` = the API's production URL (no trailing slash). `next build` typechecks with `tsconfig.build.json`, which leaves out the tests and the Vitest config (Vitest isn't installed in Vercel's build). The web app proxies `/api/*` there, so the browser only ever talks to the web domain. (Auth is a Bearer token, so calling the API directly with `NEXT_PUBLIC_BACKEND_API_URL` also works.) Then `vercel deploy --prod` from `apps/web`.

## 5. Git and firewall

Both projects are connected to `Sandeep-M23/paywise` (`vercel git connect <repo-url> --project <name>`), so every push to `main` deploys both to production and other branches get preview deployments. Vercel's GitHub login must be valid (Account Settings → Authentication) or the connection fails with "repository couldn't be found".

Sign-in rate limit (Vercel Firewall, per project): `POST /api/auth/login`, fixed 60-second window keyed by IP, 10 requests on `paywise-web` and 30 on `paywise-api` (proxied sign-ins may reach the API from shared addresses), then deny. Rules are staged with `vercel firewall rules add` and go live with `vercel firewall publish`.

## 6. Smoke test

Open the web URL → you're redirected to `/login` → sign in → the employees list shows 10,000 people. The browser walkthrough used locally (sign-in, every page, salary change, correction, raise plan, import, export, sign-out) is the full check.

## Notes

- Imports are capped at 10,000 rows and 4.4 MB per request (Vercel Functions accept at most 4.5 MB).
- Scheduled salary changes take effect on the first API request of each day; no cron job is configured.
