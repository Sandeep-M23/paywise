# Paywise

[![CI](https://github.com/Sandeep-M23/paywise/actions/workflows/ci.yml/badge.svg)](https://github.com/Sandeep-M23/paywise/actions/workflows/ci.yml)

Salary management for an HR manager running pay for **10,000 employees across 8 countries**, who today does it in a set of Excel files.

**Live demo:** https://paywise-web-tau.vercel.app · sign in as `hr@paywise.demo` (the password is shared with reviewers separately)

## What it does

- **Keep salary records.** Search, filter, sort and page through 10,000 people; add, edit and deactivate them, with the same validation in the form and the API.
- **Trust the history.** Every salary change is kept: old and new amount, effective date, reason, who made it and where it came from. Changes can be scheduled for a future date. Mistakes are fixed with a correction entry, never by editing or deleting history.
- **Move off Excel.** Import a CSV with automatic column matching and a full row-by-row review before anything is saved; export any filtered view back to a CSV that opens cleanly in Excel.
- **Answer "how do we pay people?"** Pay by country, job title and department, salary distribution, outliers against peers, gender pay gaps (shown as potential disparities, not findings, and hidden for small groups), and a raise planner that shows the cost per currency and applies the raises in one step.

Everything in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) is built; what was deliberately left out, and why, is listed there too.

## Engineering highlights

- **Money is never a float.** Amounts are integers in the currency's smallest unit with an ISO currency code, converted only through one module; amounts in different currencies are never added together.
- **Append-only salary history.** Corrections and cancellations are new entries. The API's database role can't delete rows at all, so this holds even if the code had a bug.
- **Aggregates in SQL.** Insights, fairness statistics and raise costs are computed in PostgreSQL, not in JavaScript loops, and stay fast at 10,000 employees ([measurements](docs/PERFORMANCE.md)).
- **One source of validation.** Zod schemas in `packages/shared` are used by both the API and the web forms, along with the money, CSV and country helpers.
- **Tested where it matters.** 235 fast, deterministic tests: money maths, every salary-history rule, raise plans, statistics on small hand-computed fixtures, import and export (including an export → import round trip), and auth. API tests run on a real in-process Postgres.
- **Secure by default.** JWT auth on every route, a sign-in rate limit, security headers, parameterised SQL, formula-safe CSV export and a least-privilege database role ([threat model](docs/SECURITY.md)).

## How it's built

```mermaid
flowchart LR
  B[Browser] -->|pages| W["Next.js web app"]
  B -->|"/api/* (same origin)"| W
  W -->|proxies /api| A["Express API"]
  A -->|"SQL (least-privilege role, TLS)"| D[(PostgreSQL)]
  S["packages/shared<br/>Zod schemas, money, CSV"] -.-> W
  S -.-> A
```

| Layer  | Technology                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------ |
| Web    | Next.js 16 (App Router), shadcn/ui + Tailwind, TanStack Query, axios, react-hook-form, Jotai, Recharts |
| API    | Node 24, TypeScript, Express 4, `http-errors`, JWT (Bearer) auth, Sequelize on PostgreSQL              |
| Shared | `packages/shared`: Zod schemas, money, CSV helpers, country config and the types both sides use        |
| Tests  | Vitest; API tests on PGlite (real Postgres, in-process, no Docker); CI on every push                   |
| Hosted | Vercel (web and API, Singapore region) and Neon PostgreSQL; every push to `main` deploys               |

The API is layered as routes → controllers (HTTP only) → services (business rules, transactions) → repositories (SQL). Details, diagrams and the salary-timeline rules are in [docs/DESIGN.md](docs/DESIGN.md).

## Documentation

| Document                               | What's in it                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Requirements](docs/REQUIREMENTS.md)   | One page, written before any code: goal, scope, what's left out and why                         |
| [Research](docs/RESEARCH.md)           | Real HR problems with sources, CSV import practice; every feature traces back to it             |
| [Plan](PLAN.md)                        | Priorities (P0/P1/P2), design decisions, build sequence and timeline                            |
| [Design](docs/DESIGN.md)               | Architecture, data model, salary timeline rules, money, import flow, analytics, transactions    |
| [Schema review](docs/SCHEMA_REVIEW.md) | Review of the salary data model before it was built: concurrency, effective dating, corrections |
| [API](docs/API.md)                     | Every endpoint, its payloads and errors                                                         |
| [Security](docs/SECURITY.md)           | Threat model, authentication, logging, assumptions and known limits                             |
| [Trade-offs](docs/TRADEOFFS.md)        | Each decision and what it costs                                                                 |
| [Performance](docs/PERFORMANCE.md)     | Measured timings on the 10,000-employee dataset and what changed because of them                |
| [Seed data](docs/SEED_DATA.md)         | How the 10,000 synthetic employees and their planted patterns are generated                     |
| [Deployment](docs/DEPLOY.md)           | Vercel and Neon setup, environment variables, database role, firewall                           |
| [AI usage](docs/ai/PROMPTS.md)         | How AI tools were used, and where their output was wrong and how that was caught                |

The commit history shows how the solution evolved: small commits, with tests committed before the code they cover.

## Run it locally

Requires Node 24 (`nvm use`) and Docker.

```bash
npm install
docker compose up -d db                       # PostgreSQL on localhost:5433

cp apps/api/.env.example apps/api/.env
npm run hash-password -w @paywise/api -- 'choose-a-password'   # put the output in HR_PASSWORD_HASH
# also set JWT_ACCESS_SECRET, e.g. the output of `openssl rand -base64 48`

npm run db:sync -w @paywise/api               # create the tables and constraints
npm run db:seed -w @paywise/api               # load 10,000 employees (about a second)

npm run dev -w @paywise/api                   # API on http://localhost:4000
npm run dev -w @paywise/web -- --port 3100    # app on http://localhost:3100
```

Sign in with `HR_EMAIL` from `.env` and the password you hashed.

## Tests

```bash
npm test         # 235 tests in under 10 s: shared logic, API on PGlite, web helpers
npm run check    # formatting, typecheck, lint and tests (what CI runs)
```

Concurrency tests also run against a real PostgreSQL server (CI always runs them). The database is wiped, so point them at a throwaway one:

```bash
docker compose exec db createdb -U paywise paywise_ci
TEST_PG_URL=postgres://paywise:paywise@localhost:5433/paywise_ci npm test
```

## Project structure

```
apps/
  api/          Express API
    src/        routes, controllers, services + repositories, validators, middlewares, models, config, scripts
    test/       route, service and seed tests
  web/          Next.js app
    app/        (Auth)/login and (Main)/<page>, each with its own layout
    components/ page sections (block/), reusable components (shared/), shadcn/ui (ui/)
    utils/      API client, TanStack Query hooks per feature, form schemas, helpers
    test/       component and helper tests
packages/
  shared/       Zod schemas, money, currencies, countries, CSV helpers, shared types
docs/           requirements, research, design, API, security, trade-offs, performance, deployment, AI log
```
