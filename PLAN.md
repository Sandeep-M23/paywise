# Plan of Action: Paywise (Salary Management Tool)

> **Assessment:** build salary management software for an org with 10,000 employees.
> **Persona:** an HR Manager who now manages salaries in Excel sheets across countries.
> **Deliverables:** requirements doc, a working backend and UI, a seed script for 10k employees, unit tests, a deployed app, a demo video, incremental commits, and AI/design artifacts.
> **Research:** [`docs/RESEARCH.md`](docs/RESEARCH.md) covers competitor analysis, real HR problems (numbered #1–#12) and CSV import research. Features below cite those problem numbers.

Note: parts of the brief came through truncated ("Ctries…", "agentic AI toof code quality…", "typically…ughtful"). Re-read the original email and update this plan if those gaps held any constraints.

---

## 0. Strategy in One Paragraph

More than 150 candidates build the same baseline (list, CRUD, averages, seed). We build that baseline well, then add **five features, each tied to a researched HR problem**: safe **CSV import** (moving off Excel), **CSV export**, **salary history**, a **pay fairness check**, and a **raise cost calculator**. We prefer depth over breadth, numbers HR can trust, a process reviewers can see in the commits, and code we can defend line by line in the technical interview.

---

## 1. Locked Decisions

| Area | Choice | Notes |
|---|---|---|
| Backend | **Node.js + TypeScript**, **Hono** | Small, typed, runs natively as Vercel Functions. Validates requests with Zod. |
| ORM / SQL | **Drizzle ORM** + `drizzle-kit` migrations | Type-safe schema, but stays close to SQL for `GROUP BY` and `percentile_cont`. |
| Database | **PostgreSQL** (Neon via the Vercel Marketplace; Docker locally) | `percentile_cont` = Excel `PERCENTILE.INC`, so medians reconcile with HR's spreadsheets. |
| Frontend | **Next.js (App Router) + shadcn/ui + TailwindCSS** | shadcn `DataTable` (TanStack Table) for the grid. |
| Client state | **Jotai** | UI state only: filters, sort, page, selected country, dialogs, import wizard step and column mapping. |
| Server state | **TanStack Query** | All API reads and writes: caching, `keepPreviousData`, mutations with invalidation. |
| Charts | **Recharts** (via shadcn `chart`) | |
| CSV | **Papa Parse** (browser parsing for an instant preview) + a small serializer for export | Server re-validates everything; it never trusts the client. |
| Deploy | **Vercel** (web + api as two projects in one monorepo) + Neon | 4.5 MB request limit, so imports are capped at 10k rows. |
| Money | **Stripe-style:** integer amount in the **smallest currency unit** + lowercase ISO 4217 code | See §3.2. |
| Tests | **Vitest**, **PGlite** (in-process Postgres), React Testing Library + MSW | Fast and deterministic, with no Docker needed to run the tests. |
| Tooling | npm workspaces (`@paywise/api`, `@paywise/web`, `@paywise/shared`), ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI | npm over pnpm: zero extra install for reviewers; workspaces cover our needs. |

**Why a separate API rather than Next.js route handlers?** Clear layering (routes → services → repositories), testable without Next, and the backend stays visible as its own piece for reviewers. Trade-off: two Vercel projects plus CORS. Recorded in `docs/TRADEOFFS.md`.

---

## 2. Feature Scope

### Core (the baseline: must be solid)
| Feature | Details |
|---|---|
| Employee directory | Server-side pagination, sort, debounced search (name / email / code), filters (country, job title, department, status). Filters live in the URL. |
| Add / edit employee | Shared Zod schema on client and server; currency derived from country. Salary is **not** edited here (see Change salary). |
| Remove employee | **Deactivate** (soft delete) with a reason. History is kept; insights count active employees only. |
| Insights | Per country: headcount, total, min / max / avg / **median**. Per job title in a country: min / median / avg / max. Department breakdown. Salary distribution histogram. |
| Seed | 10,000 deterministic employees across 8 countries (includes JPY, a zero-decimal currency), **with planted patterns** for the features to find. |

### Researched additions
| # | Feature | Solves (RESEARCH §3) | Priority |
|---|---|---|---|
| A | **CSV import**: template, column mapping, preview, row errors, all-or-nothing commit | #9, #1 | **Must** |
| B | **Salary history**: change salary as its own action; old → new, effective date, reason, source | #2, #12 | **Must** |
| C | **CSV export**: current filtered view, Excel-safe, re-importable | #2, #9, #11 | **Must** |
| D | **Pay fairness**: outliers vs. peers (IQR) + gender gap ≥ 5% per job title × country | #4, #5, #10 | Should |
| E | **Raise cost calculator**: pick a group + %, see the cost per currency (read-only) | #6, #11 | Should |
| F | **Single-user login**: an HR password gate (env-configured, httpOnly session cookie) | #8 | Should |
| G | **Undo import**: revert a whole import batch if nothing changed since | #9 | Stretch |
| H | **Pay compression view**: new hires vs. 3+ years in the same role and country | #3 | Stretch |

**If time is short, cut in this order:** H → G → E → F → D. A, B and C stay.

### Deliberately out of scope (goes in REQUIREMENTS with reasons)
- Payroll, tax, net pay, payslips: a different product (country tax engines).
- Live FX / one-currency org totals: needs a rate source and has staleness; comparisons stay within a country.
- Pay ranges / compa-ratio: needs HR to define ranges first. First v2 item after import.
- Multi-user roles, approvals, SSO: single persona.
- Bonus / equity / total rewards: base salary answers the core questions.
- Excel `.xlsx` parsing: CSV covers it (Excel's "Save as CSV UTF-8"); fewer dependencies.

---

## 3. Design

### 3.1 Data model (Drizzle / Postgres)
```
employees
  id               uuid PK
  employee_code    text  NOT NULL UNIQUE        -- "EMP-00001"; stable identity for import matching
  full_name        text  NOT NULL
  email            text  NOT NULL               -- unique index on lower(email)
  job_title        text  NOT NULL
  department       text  NOT NULL
  country_code     char(2) NOT NULL             -- ISO 3166-1 alpha-2
  salary_amount    bigint NOT NULL CHECK (> 0)  -- minor units; denormalised copy of latest revision
  salary_currency  char(3) NOT NULL             -- lowercase ISO 4217, derived from country
  gender           text  NOT NULL               -- female | male | non_binary | undisclosed (aggregates only)
  employment_type  text  NOT NULL               -- full_time | part_time | contract
  hire_date        date  NOT NULL
  status           text  NOT NULL default 'active'   -- active | inactive
  created_at, updated_at timestamptz

salary_revisions                                -- append-only
  id               uuid PK
  employee_id      uuid FK → employees
  amount           bigint NOT NULL
  previous_amount  bigint NULL                  -- NULL for the hire revision
  currency         char(3) NOT NULL
  effective_on     date NOT NULL
  reason           text NOT NULL                -- hire | merit | promotion | market_adjustment | correction | import
  note             text NULL
  import_id        uuid NULL FK → imports
  created_at       timestamptz

imports
  id, filename, row_count, created_count, updated_count, skipped_count,
  status (committed | reverted), created_at

INDEXES
  employees (country_code, job_title), (country_code, department), (status),
            gin (full_name gin_trgm_ops), unique (employee_code), unique lower(email)
  salary_revisions (employee_id, effective_on)
```

**Domain rules** (each one covered by a test):
1. Currency is derived from the country, never typed in.
2. `employees.salary_amount` changes **only** by writing a revision, in the same transaction.
3. Revisions are append-only. Mistakes are fixed with a `correction` revision.
4. Creating an employee writes a `hire` revision.
5. `effective_on` ≤ today, ≥ hire date, ≥ the latest revision's date.
6. `country_code` is immutable after creation (relocation means re-pricing in another currency, which is v2).
7. Gender is used only in aggregates; groups with < 5 of either gender are suppressed.

### 3.2 Money (Stripe-style)
- `salary_amount` is an integer in the smallest unit: `usd 85,000.00` → `8500000`, `jpy ¥9,000,000` → `9000000`.
- `packages/shared/money.ts` is the **only** place that converts:
  - `CURRENCY_EXPONENT` (default 2; `jpy`/`krw`/`vnd` = 0; `bhd`/`kwd`/`omr` = 3)
  - `parseMoneyInput("₹12,00,000.00", "inr")` → `120000000`. Parses the string, never `parseFloat * 100`. Accepts Indian and Western grouping; rejects the ambiguous `12.000,50`.
  - `formatMoney(amount, currency, locale)` via `Intl.NumberFormat`
- API shape: `{ "salary": { "amount": 8500000, "currency": "usd" } }`.
- Aggregates are computed in minor units in SQL and rounded to an integer in the repository layer.

### 3.3 API (REST, Hono + Zod)
```
POST   /api/auth/login | /api/auth/logout | GET /api/auth/me

GET    /api/employees?page=&pageSize=&sort=&order=&q=&country=&jobTitle=&department=&status=
GET    /api/employees/:id                       -> includes salary history
POST   /api/employees                           -> creates employee + hire revision
PATCH  /api/employees/:id                       -> non-salary fields only
POST   /api/employees/:id/deactivate            -> { reason }
POST   /api/employees/:id/salary-revisions      -> { amount, effectiveOn, reason, note }

GET    /api/insights/countries
GET    /api/insights/countries/:code/job-titles
GET    /api/insights/countries/:code/departments
GET    /api/insights/countries/:code/distribution?buckets=10
GET    /api/insights/fairness/outliers?country=&jobTitle=
GET    /api/insights/fairness/gender-gap?country=
POST   /api/insights/raise-cost                 -> { filters, percent } → per-currency current / increase / new

GET    /api/export/employees.csv?<same filters as list>
GET    /api/import/template.csv
POST   /api/imports/preview                     -> { filename, mapping, rows[] } → per-row result, nothing saved
POST   /api/imports                             -> same body; re-validates, commits in one transaction
GET    /api/imports                             -> import log
POST   /api/imports/:id/revert                  -> stretch

GET    /api/meta/filters | GET /api/health
```
- Zod schemas live in `packages/shared` and are reused by the API and the web forms.
- Errors: `{ error: { code, message, details? } }`. 400 bad query, 401, 404, 409 duplicate, 413 import too large, 422 validation.
- Sort columns are whitelisted.

### 3.4 CSV import design
```
[1 Template] → [2 Upload + map columns] → [3 Preview (nothing saved)] → [4 Confirm]
   download     Papa Parse in browser         POST /imports/preview        POST /imports
                auto-map headers (synonyms)   server classifies each row:  re-validate everything,
                user overrides mapping        create / update / unchanged  ONE transaction:
                (Jotai wizard state)          / error (row, column, msg)   employees + revisions
                                              + diff for updates           (reason=import, import_id)
                                              + download errors CSV        + imports row
```
- **Matching:** by `employee_code`. A known code is an update; a new code is a create. Duplicate codes or emails within the file are errors.
- **Salary change via import** writes a revision with `reason=import` and `import_id`, so history shows "Imported from *file.csv* on *date*".
- **Preview is stateless:** the commit request re-sends the rows and the server re-validates them. Nothing is staged, so there is no stale state to manage.
- **Commit policy:** error rows are **skipped** (the user sees exactly which ones in the preview and confirms). Valid rows are saved **all-or-nothing** in one transaction. Documented as a trade-off vs. "reject the whole file".
- **Limits:** ≤ 10,000 rows (Vercel 4.5 MB body). Over that returns a 413 with a clear message.
- **Parsing helpers (pure, in `shared`, heavily tested):** header synonym mapping, money parsing, ISO date parsing, trimming and normalisation, BOM stripping.
- **Export:** UTF-8 **with BOM**, formula-injection-safe (`=`, `+`, `-`, `@`, tab and CR prefixed with `'`), and its columns are a superset of the import columns, so the round trip works.

### 3.5 Fairness and raise calculations
- **Outliers:** within a job title × country group (n ≥ 5), salary < Q1 − 1.5·IQR or > Q3 + 1.5·IQR (Tukey fences via `percentile_cont`).
- **Gender gap:** per job title × country, `(avg_male − avg_female) / avg_male`, with the median gap shown too. Flagged at |gap| ≥ 5% (EU Directive threshold). Suppressed if either gender has < 5 people.
- **Raise cost:** for the filtered active employees, per currency: current total, increase, new total. Read-only, nothing saved.

### 3.6 Architecture
```
Next.js (Vercel) ──fetch/JSON + cookie──► Hono API (Vercel Functions)
  shadcn + Tailwind + Recharts              routes       (HTTP, Zod parse, auth middleware)
  Jotai (UI state)                            └► services      (domain rules, transactions)
  TanStack Query (server state)                 └► repositories (Drizzle + SQL aggregates)
  Papa Parse (import preview)                      └► Postgres (Neon)

packages/shared: Zod schemas, DTO types, money, CSV helpers, country/currency config
```

### 3.7 Seed (deterministic, with planted patterns)
- `generateEmployees(count, seed)` is a **pure function** using a seeded faker. Salary = title base band × country multiplier × spread.
- 8 countries: US/usd, IN/inr, DE/eur, GB/gbp, JP/jpy, CA/cad, AU/aud, SG/sgd.
- Each employee gets a hire revision; about 30% get 1–3 historical raises.
- **Planted on purpose** (documented in `docs/SEED_DATA.md`): about 1% outliers; one role and country with a ~8% gender gap; compression in one role (recent hires above tenured staff).
- The runner truncates and then inserts in batches of 1,000 in one transaction.

---

## 4. Repo Layout
```
/
├── README.md  CLAUDE.md  PLAN.md
├── docs/
│   ├── RESEARCH.md  REQUIREMENTS.md  DESIGN.md
│   ├── TRADEOFFS.md  PERFORMANCE.md  SEED_DATA.md
│   └── ai/PROMPTS.md
├── apps/
│   ├── api/   src/{routes,services,repositories,db,db/seed}  test/
│   └── web/   app/(employees|insights|import)  components/ atoms/ queries/ lib/  test/
├── packages/shared/   schemas/ money.ts csv/ countries.ts
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## 5. Build Sequence (incremental commits; `test:` before `feat:` for core logic)

### Foundation
1. `chore: init npm workspaces monorepo, tsconfig, eslint, prettier, vitest`
2. `docs: add research` → `docs: one-page requirements` → `docs: design notes` → `docs: CLAUDE.md agent instructions`
3. `test(shared)` → `feat(shared): money parse/format with currency exponents`
4. `test(shared)` → `feat(shared): countries and employee/revision zod schemas`

### Backend core
5. `chore(api): Hono app, drizzle schema, migrations, docker-compose postgres`
6. `test(api): PGlite harness (migrated DB per file, truncate between tests)`
7. `feat(api): create/read/update/deactivate employee + hire revision`
8. `feat(api): salary revisions with domain rules 2–5` (row lock, transaction)
9. `feat(api): paginated/filtered/sorted listing + trigram search`
10. `feat(api): country / job-title / department / distribution insights` (hand-computed fixture; even-count median)
11. `feat(api): deterministic seed with planted patterns` (pure generator tests: count, validity, determinism, uniqueness)
12. `ci: lint, typecheck, test on GitHub Actions`

### Import / export
13. `test(shared)` → `feat(shared): CSV helpers` (header synonyms, BOM, date, money, normalisation, formula escaping)
14. `feat(api): import preview` (classify create/update/unchanged/error, in-file duplicates, diffs)
15. `feat(api): import commit` (one transaction, revisions with import_id, imports log, 413 limit)
16. `feat(api): CSV export + template` (BOM, injection-safe, round-trip test: export → import = all unchanged)

### Fairness and calculator
17. `feat(api): outlier and gender-gap endpoints` (fixture tests: fences, 5% flag, suppression)
18. `feat(api): raise cost endpoint`
19. `feat(api): single-user auth (session cookie) + middleware`
20. `perf(api): indexes, EXPLAIN ANALYZE, timings in docs/PERFORMANCE.md`

### Frontend
21. `chore(web): Next.js, Tailwind, shadcn, Jotai, TanStack Query provider, typed API client`
22. `feat(web): login page + auth guard`
23. `feat(web): employees table` (URL-synced Jotai filters, `useQuery` + `keepPreviousData`)
24. `feat(web): employee detail drawer with salary history timeline`
25. `feat(web): add/edit employee + change salary dialogs` (shared schemas, mutations + invalidation)
26. `feat(web): deactivate with reason + toasts`
27. `feat(web): import wizard` (template → upload/map → preview table with error filter + "download errors" → confirm → result)
28. `feat(web): export current view`
29. `feat(web): insights dashboard` (country table, job-title chart, distribution histogram, departments)
30. `feat(web): fairness page + raise calculator`
31. `test(web): form validation, column mapping, preview rendering, filter atoms ↔ URL` (RTL + MSW)
32. `feat(web): loading skeletons, empty and error states`

### Ship
33. `chore: Vercel projects (api + web), env vars, CORS, Neon via Marketplace`
34. `chore: run migrations + seed in prod`
35. `docs: README (live URL, video, start-here), TRADEOFFS, SEED_DATA, ai/PROMPTS`
36. Stretch commits: undo import, compression view

---

## 6. Testing Strategy

| Layer | What | Tooling |
|---|---|---|
| Money + CSV helpers | Exponents, Indian/Western grouping, rejects, BOM, dates, header synonyms, formula escaping | Vitest (pure) |
| Schemas | Field rules, country ↔ currency | Vitest (pure) |
| Services | Domain rules 1–7, revision transactions, import classify/commit, export round trip | Vitest + **PGlite** |
| Insights / fairness | Hand-computed fixtures: medians, IQR fences, gap %, suppression | Vitest + PGlite |
| API routes | Status codes, error shape, auth required, 413 | Vitest + Hono `app.request()` |
| Seed generator | Count, validity, determinism, uniqueness, planted patterns present | Vitest (pure) |
| UI | Forms, import mapping and preview, filter ↔ URL | RTL + MSW |

Rules: no network, a fixed seed and clock, an isolated DB per file, no 10k rows in unit tests. Target: the whole suite in under 15 s.

---

## 7. Performance → `docs/PERFORMANCE.md`
- Server-side pagination; never ship 10k rows to the browser.
- Composite indexes match the filter and group-by patterns; `pg_trgm` covers search. Verify with `EXPLAIN ANALYZE`.
- Each insight is one SQL query. TanStack Query uses a long `staleTime` for insights and metadata; mutations and import commits invalidate `['employees']` and `['insights']`.
- Import: the browser parses; the server validates in one pass with set-based lookups (fetch the existing codes and emails once, not per row); commit uses batched inserts in one transaction.
- Neon serverless driver + pooling for Vercel Functions.
- Record measured p50 timings: list, insights, import preview of 10k rows, commit of 10k rows, seed.

---

## 8. AI Usage Artifacts → `docs/ai/`
- `CLAUDE.md`: stack, folder conventions, test-first for `shared/` and services, "money only via `money.ts`", Conventional Commits.
- `docs/ai/PROMPTS.md`: key prompts, what was accepted, and **what was corrected and why**.
- "Where AI was wrong" log, e.g. float money math, unbounded sort params, wrong even-count median, missing BOM, CSV injection.

---

## 9. Demo Video (4–5 min), told as the HR manager's day
1. "We live in Excel." Import her CSV: mapping, preview with 3 errors, download errors, confirm. *(#9)*
2. Find someone across 10k rows; open their history. *(#2)*
3. Give a promotion raise and see it in the history. Try a bad effective date and see the validation.
4. "How do we pay engineers in India?": medians and the distribution. *(#11)*
5. Fairness: the planted outlier and the gender gap flagged at 5%. *(#4, #5)*
6. "What does 6% for Germany Engineering cost?": the calculator. *(#6)*
7. Export to Excel; names render correctly. *(#2)*
8. A minute of code: monorepo, money and CSV tests, a green fast suite, CI, commit history, what's next.

---

## 10. Suggested Timeline (about 4 working days)

| Day | Work |
|---|---|
| 1 | Monorepo, docs (research, requirements, design, CLAUDE.md), shared money/schemas (TDD), API skeleton + PGlite harness |
| 2 | Employee CRUD + revisions, listing, insights, seed, CI |
| 3 | CSV helpers, import preview/commit, export, fairness, raise calculator, auth |
| 4 | Frontend: table, detail/history, forms, import wizard, insights, fairness |
| 5 (half) | Deploy, performance numbers, README, demo video, review commit history |

---

## 11. Submission Checklist
- [ ] Research + requirements committed before the first feature commit
- [ ] Incremental Conventional Commits; `test:` before `feat:` visible for core logic
- [ ] Money: integer minor units + currency; no floats anywhere in the money path
- [ ] Import: preview before save, row-level errors, one-transaction commit, history provenance
- [ ] Export: UTF-8 BOM + formula-injection safe + round trip tested
- [ ] All tests green locally and in CI; fast and deterministic
- [ ] Seed: 10,000 deterministic employees with documented planted patterns
- [ ] API and web live on Vercel; login credentials for reviewers in README
- [ ] Demo video linked at the top of README
- [ ] RESEARCH, REQUIREMENTS, DESIGN, TRADEOFFS, PERFORMANCE, SEED_DATA and AI docs committed
- [ ] Can explain every decision in the technical interview
- [ ] Repo link sent as a reply to the original email
