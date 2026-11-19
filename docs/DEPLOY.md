# Deploying to Vercel + PostgreSQL

Two Vercel projects from this one repository, plus one PostgreSQL database on any host. The API talks to Postgres through `pg` + Sequelize (as in the Outbox services); there is no vendor-specific driver.

## 1. Database (any Postgres 15+)

1. Create a database on a host reachable from Vercel, e.g. **Supabase**, **Railway**, **Render** or **AWS RDS**. Use the host's **connection pooler** if it has one (Supabase's pooled port, RDS Proxy): each Vercel Function instance opens its own small pool (5 connections).
2. Note the host, port, database name, user and password. Hosted databases usually need TLS (`DB_SSL=true`).
3. From your machine, create the schema and load the 10,000 employees:
   ```bash
   cd apps/api
   DB_HOST=… DB_PORT=5432 DB_DATABASE=… DB_USERNAME=… DB_PASSWORD=… DB_SSL=true npm run db:sync
   DB_HOST=… DB_PORT=5432 DB_DATABASE=… DB_USERNAME=… DB_PASSWORD=… DB_SSL=true npm run db:seed
   ```
   `db:sync` creates the tables from the Sequelize models (`sync({ alter: true })`), then applies `src/config/schema.sql` (the `pg_trgm` extension, checks, foreign keys and indexes). It is safe to re-run. In production run it deliberately, after a backup, whenever the models change; the API never syncs on boot outside `NODE_ENV=local`.

## 2. API project

New Vercel project → import this repo:

| Setting          | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Root Directory   | `apps/api`                                             |
| Framework Preset | Other (`vercel.json` sets the build: `npm run bundle`) |
| Node.js version  | 24.x                                                   |

Environment variables:

| Name                                                              | Value                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | the database from step 1 (pooled host/port if available)          |
| `DB_SSL`                                                          | `true` for hosted Postgres                                        |
| `HR_EMAIL`                                                        | the HR sign-in email                                              |
| `HR_PASSWORD_HASH`                                                | output of `npm run hash-password -w @paywise/api -- '<password>'` |
| `JWT_ACCESS_SECRET`                                               | `openssl rand -base64 48`                                         |

Check: `https://<api-project>.vercel.app/api/health` → `{"ok":true}`.

## 3. Web project

New Vercel project → same repo:

| Setting          | Value      |
| ---------------- | ---------- |
| Root Directory   | `apps/web` |
| Framework Preset | Next.js    |
| Node.js version  | 24.x       |

Environment variable: `API_URL` = `https://<api-project>.vercel.app` (no trailing slash). The web app proxies `/api/*` there, so the browser only ever talks to the web domain. (Auth is a Bearer token, so calling the API domain directly with `NEXT_PUBLIC_BACKEND_API_URL` also works.)

## 4. Smoke test

Open the web URL → you're redirected to `/login` → sign in → the employees list shows 10,000 people. Try an import using the template from the Import page.

## Notes

- The API is bundled with esbuild into `apps/api/api/index.js` at build time (`scripts/bundle.mjs`), so the deploy doesn't depend on how Vercel compiles TypeScript inside workspace packages.
- Imports are capped at 10,000 rows and 4.4 MB per request (Vercel Functions accept at most 4.5 MB).
- The bundle was smoke-tested locally on Sequelize by calling its handlers with `Request` objects (health, and an authenticated insights query against Postgres). The Vercel deployment itself has not been exercised from this repo yet.
