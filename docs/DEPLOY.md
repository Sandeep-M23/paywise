# Deploying to Vercel + Neon

Two Vercel projects from this one repository, plus one Neon Postgres database.

## 1. Database (Neon)

1. In Vercel: **Storage → Marketplace → Neon → Create**. Copy the **pooled** connection string (`postgres://…-pooler…/neondb?sslmode=require`).
2. From your machine, create the schema and load the 10,000 employees:
   ```bash
   DATABASE_URL='<neon url>' npm run db:migrate -w @paywise/api
   DATABASE_URL='<neon url>' npm run db:seed -w @paywise/api
   ```

## 2. API project

New Vercel project → import this repo:

| Setting          | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Root Directory   | `apps/api`                                             |
| Framework Preset | Other (`vercel.json` sets the build: `npm run bundle`) |
| Node.js version  | 24.x                                                   |

Environment variables:

| Name               | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| `DATABASE_URL`     | Neon pooled URL                                                   |
| `HR_EMAIL`         | the HR sign-in email                                              |
| `HR_PASSWORD_HASH` | output of `npm run hash-password -w @paywise/api -- '<password>'` |
| `SESSION_SECRET`   | `openssl rand -base64 48`                                         |

Check: `https://<api-project>.vercel.app/api/health` → `{"ok":true}`.

## 3. Web project

New Vercel project → same repo:

| Setting          | Value      |
| ---------------- | ---------- |
| Root Directory   | `apps/web` |
| Framework Preset | Next.js    |
| Node.js version  | 24.x       |

Environment variable: `API_URL` = `https://<api-project>.vercel.app` (no trailing slash). The web app proxies `/api/*` there, so the browser only ever talks to the web domain and the session cookie is first-party.

## 4. Smoke test

Open the web URL → you're redirected to `/login` → sign in → the employees list shows 10,000 people. Try an import using the template from the Import page.

## Notes

- The API is bundled with esbuild into `apps/api/api/index.js` at build time (`scripts/bundle.mjs`), so the deploy doesn't depend on how Vercel compiles TypeScript inside workspace packages.
- Imports are capped at 10,000 rows and 4.4 MB per request (Vercel Functions accept at most 4.5 MB).
- The bundle was smoke-tested locally by calling its handlers with `Request` objects. The Vercel deployment itself has not been exercised from this repo yet.
