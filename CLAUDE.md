# CLAUDE.md: instructions for AI agents working on Paywise

Read `docs/REQUIREMENTS.md` and `docs/DESIGN.md` before changing behaviour. If a change contradicts them, update the doc in the same commit or stop and ask.

## Stack

- npm workspaces: `apps/api` (Hono + PostgreSQL via `pg` + Sequelize; schema from models + `config/schema.sql` via `npm run db:sync`), `apps/web` (Next.js App Router + shadcn/ui + Tailwind + Jotai + TanStack Query + Recharts), `packages/shared` (Zod schemas, money, CSV helpers, countries).
- TypeScript strict everywhere. Vitest for all tests; PGlite for DB tests.

## Non-negotiable rules

1. **Money:** integer minor units + lowercase ISO currency. Convert only through `packages/shared/src/money.ts`. Never use floats for money, and never `parseFloat(x) * 100`.
2. **Validation:** define it once as a Zod schema in `packages/shared`; the API and the web forms both import it.
3. **Salary changes** go only through the salary-revision service (one transaction that inserts the revision and updates `employees.salary_amount`).
4. **SQL:** aggregates in SQL, not in JS loops. Whitelist sort columns. No string-built SQL from user input.
5. **Layering:** routes (paths) → controllers (HTTP only) → services (rules, transactions) → repositories (queries). Only repositories touch the database (Sequelize models, or `select`/`execute` from `config/db.ts` with named replacements). Never build SQL from user input; pass the `db` handle through so queries join the open transaction.
6. **CSV export:** always UTF-8 BOM + formula-injection escaping.
7. **Audit:** every write that changes an employee, a salary, a raise plan or an import also writes `audit_logs` entries in the same transaction, through the audit service. Never update or delete audit rows.
8. **Logs and wording:** never log request bodies, cookies or salary amounts. Fairness figures are "indicators" or "potential disparities", never legal findings; amounts in different currencies are never added together.

## Folder structure (after the Outbox backend starter and frontends)

Names: kebab-case for files and folders; camelCase for variables; PascalCase for components, classes and data models.

- **API** `apps/api/src/`: `routes/<feature>/<feature>.ts` (+ `routes/index.ts`), `controllers/<feature>/<feature>.ts`, `services/<feature>/<feature>-service.ts` and `<feature>-repository.ts`, `middlewares/`, `validators/`, `interfaces/`, `config/`, `models/` (one file per table), `utils/helpers/`, `scripts/`.
- **Web** `apps/web/`: `app/(Main)/` and `app/(Auth)/` route groups; `components/ui/` (shadcn), `components/Block/<Feature>/` (page sections), `components/Shared/<Component>/<Component>.tsx` (reusable), `components/Icons/`; `hooks/useX.ts`; `context/`; `utils/apis/<feature>/` (TanStack Query hooks), `utils/atoms/<feature>/`, `utils/constants/`, `utils/helpers/`, `utils/forms/`, `utils/services/` (HTTP client).

## Workflow

- **Test first** for `packages/shared` and services: commit `test:` and then `feat:`, or one commit that contains both, with the test visible.
- Tests must be fast and deterministic: no network, no real clock (inject `today`), no unseeded randomness, small hand-computed fixtures.
- Conventional Commits (`feat(api): …`, `test(shared): …`, `docs: …`). Keep commits small and focused.
- Run `npm run typecheck && npm test` before every commit.
- Log notable AI prompts, accepted output and corrections in `docs/ai/PROMPTS.md`.

## Style

- Match the surrounding code. Comments explain _why_, not _what_.
- Prefer small pure functions; keep side effects at the edges.
- No new dependencies without a reason noted in the commit message.
