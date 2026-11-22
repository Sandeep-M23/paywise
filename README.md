# Paywise

Salary management for an HR manager responsible for **10,000 employees across 8 countries**, replacing a set of Excel files.

- **Maintain** salary records: search, filter, add, edit, deactivate, with validation everywhere.
- **Trust** them: every salary change is kept (old → new, effective date, reason, source), and money is stored the way Stripe stores it.
- **Move off Excel**: import a CSV with column matching and a full preview before anything is saved; export any view back to Excel.
- **Answer "how do we pay people?"**: pay by country, job title and department, salary distribution, salary outliers, gender-based compensation differences (flagged as potential disparities, not findings), and a raise planner that applies changes in one step.

**Status:** every requirement in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) is built, including scheduled salary changes and the P1 pay fairness and raise planner. What was left out, and why, is listed there too.

> **Live demo:** _add the Vercel URL here after deploying (see [docs/DEPLOY.md](docs/DEPLOY.md))_
> **Demo video:** _add the link here_
> **Sign in:** use the HR credentials configured for the deployment.

## Start here (reviewers)

| Read                                         | Why                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | One page: goal, scope, what's left out and why. Written before any code.                                   |
| [docs/RESEARCH.md](docs/RESEARCH.md)         | What other submissions built, real HR problems (sourced), CSV import practice. Every feature traces to it. |
| [PLAN.md](PLAN.md)                           | Plan of action: priorities (P0/P1/P2), design decisions, build sequence, timeline, status                  |
| [docs/DESIGN.md](docs/DESIGN.md)             | Architecture, ER diagram, salary timeline rules, money, import flow, analytics definitions, transactions   |
| [docs/API.md](docs/API.md)                   | HTTP contract: every endpoint, payloads, errors                                                            |
| [docs/SECURITY.md](docs/SECURITY.md)         | Threat model, authentication (JWT), logging, assumptions, and what isn't covered                           |
| [docs/TRADEOFFS.md](docs/TRADEOFFS.md)       | Decisions and what they cost                                                                               |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md)   | Measured timings on the 10k dataset and what changed because of them                                       |
| [docs/ai/PROMPTS.md](docs/ai/PROMPTS.md)     | How AI was used, and where its output was wrong and corrected                                              |
| `git log`                                    | Small commits, `test:` before `feat:` for core logic                                                       |

## Stack

|        |                                                                                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API    | Node 24, TypeScript, **Express**, `http-errors`, JWT Bearer auth, **PostgreSQL** via `pg` + **Sequelize** (as in our other backends)                                        |
| Web    | **Next.js 16** (App Router), **shadcn/ui** + Tailwind, **TanStack Query** over an **axios** client, **Jotai**, **react-hook-form**, **Recharts**; sign-in token in a cookie |
| Shared | `packages/shared`: Zod schemas, money, CSV helpers, country config, DTO types used by both sides                                                                            |
| Tests  | **Vitest**; API tests run on **PGlite** (real Postgres, in-process, no Docker), reached by Sequelize over `pglite-socket`                                                   |
| Deploy | Vercel (web + API) and a managed Postgres (any host)                                                                                                                        |

## Folder structure

An npm-workspaces monorepo. The API follows our Outbox backend starter (as in domainstack); the web app follows our referral-stack frontend.

```
apps/
  api/                       Express API (deployed as one Vercel Function)
    src/
      routes/<feature>/      paths, with verifyAccessToken + validators per route
      controllers/<feature>/ HTTP only, wrapped in asyncHandler
      services/<feature>/    <feature>-service.ts (rules, transactions) + <feature>-repository.ts (SQL)
      validators/            shared Zod schemas as Express middleware
      middlewares/           JWT auth, body limit, central error handler (http-errors)
      models/                one Sequelize model per table
      config/                db, env, auth; schema.sql (constraints, indexes) for db:sync
      interfaces/            types for helpers, middlewares, services
      utils/                 auth (JWT, scrypt), helpers (errors, DTOs, http-response, clock)
      scripts/               db:sync, seed, hash-password, measure
    test/                    route, service and seed tests on PGlite (+ test db and server helpers)
  web/                       Next.js 16 app (App Router)
    app/
      (Auth)/login/          sign-in
      (Main)/<route>/        layout.tsx (page title) + page.tsx per page
    components/
      block/<feature>/       page sections: employees, insights, fairness, raises, import, ...
      shared/<Name>/         reusable components (index.ts barrel)
      layout/  icons/  ui/   page shell, icons, shadcn/ui
    context/                 auth, providers (TanStack Query, Jotai, theme)
    hooks/                   generic hooks
    utils/
      services/              axios client: Bearer token, 401 sign-out, ApiError
      apis/<feature>/        TanStack Query hooks per feature
      constants/  forms/  helpers/  atoms/
    @types/                  web-only types (API types come from packages/shared)
    proxy.ts                 server-side redirect to /login when signed out
    test/                    tests for web helpers (CSV parsing and mapping)
packages/
  shared/                    code both sides must agree on
    src/                     Zod schemas, money, currencies, countries, CSV helpers, DTO types
    test/
docs/                        requirements, research, design, API, security, trade-offs, performance, AI log
```

## Run it locally

Prerequisites: Node 24 (`nvm use`), Docker.

```bash
npm install
docker compose up -d db                     # Postgres on localhost:5433

cp apps/api/.env.example apps/api/.env       # DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
npm run hash-password -w @paywise/api -- 'choose-a-password'   # paste into HR_PASSWORD_HASH
# also set JWT_ACCESS_SECRET (e.g. `openssl rand -base64 48`)

npm run db:sync -w @paywise/api              # tables from the models + config/schema.sql
npm run db:seed -w @paywise/api             # 10,000 employees in ~1 s

npm run dev -w @paywise/api                 # http://localhost:4000/api/health
npm run dev -w @paywise/web -- --port 3100  # http://localhost:3100
```

Sign in with `HR_EMAIL` from `.env` and the password you hashed.

## Tests and checks

```bash
npm test          # 197 tests, ~5 s: shared logic, API on PGlite, web helpers
npm run check     # format + typecheck + lint + tests (the pre-commit gate; CI runs the same)
npm run measure -w @paywise/api   # time the main endpoints against a running API (needs HR_EMAIL/HR_PASSWORD)
```

What's covered: money parsing/formatting (Stripe exponents, Indian grouping, no float maths); validation schemas including multi-value filters; CSV header mapping, row parsing and injection-safe export; every employee/salary-history domain rule; raise plans (rounding, all-or-nothing apply); insights, outliers and gender-difference maths on small hand-computed fixtures; import preview/commit and import history including an **export → import round trip**; auth; the seed generator's determinism and planted patterns. Revision 2's added tests are listed in [PLAN.md](PLAN.md) §6.

## Seed data

`npm run db:seed -w @paywise/api` generates the same 10,000 people every time (fixed seed and reference date), with salary histories and a few **planted patterns** (a gender gap, pay compression, outliers) so the fairness features have something real to find. See [docs/SEED_DATA.md](docs/SEED_DATA.md).

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md): two Vercel projects (API, web) from this repo, and a managed Postgres database.
