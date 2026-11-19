# Paywise

Salary management for an HR manager responsible for **10,000 employees across 8 countries**, replacing a set of Excel files.

- **Maintain** salary records: search, filter, add, edit, deactivate, with validation everywhere.
- **Trust** them: every salary change is kept (old → new, effective date, reason, source), and money is stored the way Stripe stores it.
- **Move off Excel**: import a CSV with column matching and a full preview before anything is saved; export any view back to Excel.
- **Answer "how do we pay people?"**: pay by country, job title and department, salary distribution, salary outliers, gender-based compensation differences (flagged as potential disparities, not findings), and a raise planner that applies changes in one step.

**Status:** P0 and the P1 fairness and raise planner are built. Revision 2 of the plan adds scheduled salary changes, currency overrides, import idempotency, audit logs, security hardening and Ask Paywise; see [PLAN.md](PLAN.md) §3.1 and §5 for what is built and what is next.

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
| [docs/API.md](docs/API.md)                   | HTTP contract: every endpoint, payloads, errors; built vs planned                                          |
| [docs/SECURITY.md](docs/SECURITY.md)         | Threat model, authentication, CSRF, rate limiting, logging, assumptions and limits                         |
| [docs/TRADEOFFS.md](docs/TRADEOFFS.md)       | Decisions and what they cost                                                                               |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md)   | Measured timings on the 10k dataset and what changed because of them                                       |
| [docs/ai/PROMPTS.md](docs/ai/PROMPTS.md)     | How AI was used, and where its output was wrong and corrected                                              |
| `git log`                                    | Small commits, `test:` before `feat:` for core logic                                                       |

## Stack

|        |                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| API    | Node 24, TypeScript, **Hono**, **Drizzle ORM**, **PostgreSQL**                                                               |
| Web    | **Next.js 16** (App Router), **shadcn/ui** + Tailwind, **TanStack Query** (server state), **Jotai** (UI state), **Recharts** |
| Shared | `packages/shared`: Zod schemas, money, CSV helpers, country config, DTO types used by both sides                             |
| Tests  | **Vitest**; API tests run on **PGlite** (real Postgres, in-process, no Docker)                                               |
| Deploy | Vercel (web + API) and Neon Postgres                                                                                         |

```
apps/api         Hono API: routes -> controllers -> services -> repositories, seed, migrations
apps/web         Next.js app: Block/Shared components, utils/apis per feature; /api/* is proxied to the API
packages/shared  Code both sides must agree on
docs/            Requirements, research, design, trade-offs, performance, AI log
```

## Run it locally

Prerequisites: Node 24 (`nvm use`), Docker.

```bash
npm install
docker compose up -d db                     # Postgres on localhost:5433

cp apps/api/.env.example apps/api/.env
npm run hash-password -w @paywise/api -- 'choose-a-password'   # paste into HR_PASSWORD_HASH
# also set SESSION_SECRET (e.g. `openssl rand -base64 48`)

npm run db:migrate -w @paywise/api
npm run db:seed -w @paywise/api             # 10,000 employees in ~1 s

npm run dev -w @paywise/api                 # http://localhost:4000/api/health
npm run dev -w @paywise/web -- --port 3100  # http://localhost:3100
```

Sign in with `HR_EMAIL` from `.env` and the password you hashed.

## Tests and checks

```bash
npm test          # 187 tests, ~6 s: shared logic, API on PGlite, web helpers
npm run check     # format + typecheck + lint + tests (the pre-commit gate; CI runs the same)
npm run measure -w @paywise/api   # time the main endpoints against a running API (needs HR_EMAIL/HR_PASSWORD)
```

What's covered: money parsing/formatting (Stripe exponents, Indian grouping, no float maths); validation schemas including multi-value filters; CSV header mapping, row parsing and injection-safe export; every employee/salary-history domain rule; raise plans (rounding, all-or-nothing apply); insights, outliers and gender-difference maths on small hand-computed fixtures; import preview/commit and import history including an **export → import round trip**; auth; the seed generator's determinism and planted patterns. Revision 2's added tests are listed in [PLAN.md](PLAN.md) §6.

## Seed data

`npm run db:seed -w @paywise/api` generates the same 10,000 people every time (fixed seed and reference date), with salary histories and a few **planted patterns** (a gender gap, pay compression, outliers) so the fairness features have something real to find. See [docs/SEED_DATA.md](docs/SEED_DATA.md).

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md): two Vercel projects (API, web) from this repo, and Neon Postgres via the Vercel Marketplace.
