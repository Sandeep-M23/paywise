# Plan of Action: Paywise (Salary Management Tool)

> **Assessment:** build salary management software for an org with 10,000 employees.
> **Persona:** an HR Manager who now manages salaries in Excel sheets across countries.
> **Deliverables:** requirements doc, a working backend and UI, a seed script for 10k employees, unit tests, a deployed app, a demo video, incremental commits, and AI/design artifacts.
> **Research:** [`docs/RESEARCH.md`](docs/RESEARCH.md) covers competitor analysis, real HR problems (numbered #1–#12) and CSV import research. Features below cite those problem numbers.

**Revision 2.1 (data layer).** Drizzle and Neon are replaced by **PostgreSQL through `pg` + Sequelize**, the same data layer as the Outbox backends: Sequelize models for CRUD, `sequelize.query` with named replacements for analytical SQL, schema from the models via a `db:sync` script, and any Postgres host configured by `DB_*` environment variables. See §3.11. **Done (Day 0, 19 Nov 2026):** the API runs on Sequelize; all tests pass; Drizzle, `drizzle-kit`, the migrations folder and `DATABASE_URL` are gone.

**Revision 2 (plan review).** The baseline, import/export, history, fairness and the raise planner are built (see §11 for status). This revision answers a staff-level review: effective-dated salaries, country/currency separation, import idempotency, audit logs, security hardening, careful fairness wording, and a controlled "Ask Paywise" query feature, reprioritised as P0 / P1 / P2. Nothing in the stack or architecture changes.

---

## 0. Revision 2: change summary

**Kept (sound decisions, now with evidence from the build):** Hono + PostgreSQL, Next.js + shadcn + TanStack Query + Jotai, Vitest + PGlite; routes → controllers → services → repositories; Stripe-style integer money; append-only revisions under a row lock; import matched by `employee_code`, stateless preview, all-or-nothing commit of valid rows; statistics in SQL (`percentile_cont` = Excel `PERCENTILE.INC`); small-group suppression; the web app proxying `/api/*` so the session cookie is first-party; deterministic seed with planted patterns.

**Contradictions resolved:**

| Was                                                                            | Problem                                                                          | Now                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Rule 5: `effective_on` ≤ today                                                 | Blocks scheduling next quarter's raise                                           | Past, current and **scheduled** revisions (§3.3)                                          |
| Rules 1 and 6: currency derived from country, never typed                      | Expat and USD-contract employees can't be represented                            | Currency **defaults** from country; HR may override (§3.4)                                |
| Gender gap "≥ 5% = EU Directive trigger", UI label "Review: gap ≥ 5%"          | Reads as a legal finding                                                         | "Potential pay disparity", configurable analytical threshold, disclaimers (§3.6)          |
| Raise cost "read-only"                                                         | The built planner applies plans                                                  | Documented as built: plan → confirm → one transaction of revisions                        |
| "No per-user audit" (TRADEOFFS)                                                | No answer to "who changed this?"                                                 | `audit_logs` table written in the same transaction as each change (§3.7)                  |
| "Two Vercel projects plus CORS"; "Jotai holds filters"; old repo layout        | Out of date                                                                      | Same-origin proxy, URL-held filters, Outbox-style folders (§4)                            |
| Import commit has no protection against a double click or a network retry      | A retried request imports twice (new revisions each time)                        | `Idempotency-Key` + request hash (§3.5)                                                   |
| No login throttling; CSRF relies on `SameSite=Lax` alone; threshold hard-coded | Review findings                                                                  | Rate limit, Origin check, configurable thresholds (§3.8)                                  |
| Frontend tests promised (RTL + MSW), one helper test exists                    | Gap against P0                                                                   | Core UI tests are P0 work (§7)                                                            |
| Drizzle ORM + `drizzle-kit` migrations; Neon (rev 1)                           | Unlike every other backend the team maintains (`pg` + Sequelize, plain Postgres) | Sequelize + `pg`, `db:sync` + `schema.sql`, any Postgres host via `DB_*` (rev 2.1, §3.11) |

**Added:** scheduled revisions and their promotion, same-date corrections, currency override and three-decimal support, import idempotency and provenance, audit logs, login rate limiting, an authorization seam, Ask Paywise (P1), `docs/API.md`, `docs/SECURITY.md`.

---

## 1. Strategy in One Paragraph

More than 150 candidates build the same baseline (list, CRUD, averages, seed). We build that baseline well, then add features tied to researched HR problems: safe **CSV import**, **export**, **salary history**, a **pay fairness check**, a **raise planner**, and **Ask Paywise** for the brief's core question, "how does the organisation pay people?". We prefer numbers HR can trust over breadth: every salary change is dated and traceable, money never touches floating point, statistics are never presented as legal findings, and nothing is aggregated across currencies.

---

## 2. Locked Decisions

| Area         | Choice                                                                                                                                                       | Notes                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Backend      | **Node.js + TypeScript**, **Hono**                                                                                                                           | Small, typed, runs natively as a Vercel Function. Validates requests with Zod.                                      |
| Data access  | **Sequelize** (`pg` driver), as in the Outbox backends: PascalCase models for CRUD; `sequelize.query` with **named replacements** for analytics and bulk SQL | Rev 2.1 replaces Drizzle. Statistics stay hand-written SQL (`percentile_cont`, `UPDATE … FROM (VALUES …)`).         |
| Database     | **PostgreSQL**, any host reachable from Vercel, configured by `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSL`; Docker locally    | Rev 2.1 drops Neon. Options: Supabase, Railway, Render, AWS RDS (§3.11).                                            |
| Frontend     | **Next.js (App Router) + shadcn/ui + TailwindCSS + Recharts**                                                                                                | Virtualised, infinite directory over server pagination.                                                             |
| Client state | **TanStack Query** (server state), **URL** (directory filters), **Jotai** (transient UI state)                                                               | Filters in the URL are shareable and reloadable.                                                                    |
| CSV          | **Papa Parse** in the browser for an instant preview + a small serializer for export                                                                         | The server re-validates everything; it never trusts the client.                                                     |
| Deploy       | **Vercel**: two projects (web, API) from one monorepo + a managed Postgres. The web app proxies `/api/*`                                                     | First-party cookie, no CORS. Trade-off vs one project in §3.10.                                                     |
| Money        | **Stripe-style:** integer amount in the **smallest currency unit** + lowercase ISO 4217 code                                                                 | Exponent table: 0 (JPY), 2 (default), 3 (BHD, KWD, OMR).                                                            |
| Tests        | **Vitest**, **PGlite** served over `@electric-sql/pglite-socket` so Sequelize connects to it like a server; React Testing Library + MSW                      | Fast and deterministic; no Docker for unit and service tests. Concurrency tests need real Postgres (`TEST_PG_URL`). |
| Tooling      | npm workspaces (`@paywise/api`, `@paywise/web`, `@paywise/shared`), ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI                                      | One gate (`npm run check`) locally and in CI.                                                                       |
| Infra        | **No Redis, queues or extra services.** Postgres holds rate-limit counters and idempotency keys; Vercel Cron runs one daily job                              | Every moving part has to earn its place at 10k employees and one HR user.                                           |

---

## 3. Design

### 3.1 Feature scope and priorities

**P0: must ship** (the assessment fails without these)

| Feature                                                           | Status at revision 2                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Employee directory and CRUD (deactivate)                          | Built                                                                               |
| Salary management with dated history                              | Built for past/current dates; **scheduled revisions, same-date corrections: to do** |
| Country/currency separation                                       | **To do** (currency override, three-decimal coverage)                               |
| 10,000 deterministic employee seed                                | Built; **extend** with currency overrides and scheduled raises                      |
| Compensation analytics (country, title, department, distribution) | Built                                                                               |
| CSV import and export                                             | Built; **idempotency, provenance and clearer summary: to do**                       |
| Authentication and protected APIs                                 | Built; **rate limiting, Origin check, authorization seam, log hygiene: to do**      |
| Audit logs                                                        | **To do**                                                                           |
| Core backend and frontend tests                                   | Backend built (187 tests); **frontend component tests: to do**                      |
| Deployment                                                        | **To do** (runbook written, not exercised)                                          |

**P1: differentiators**

| Feature                                                               | Status                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Pay fairness analysis (outliers, gender-based differences)            | Built; **terminology, disclaimers, configurable thresholds: to do** |
| Raise planner (cost per currency; apply as revisions, all or nothing) | Built; future-dated plans become scheduled revisions                |
| Ask Paywise (controlled analytics queries)                            | **To do**                                                           |

**P2: stretch**: undo an import (if nothing changed since), pay compression view, advanced analytics (percentile bands per level, trends over time), audit log viewer UI.

**Cut order if time runs short:** P2 entirely → Ask Paywise charts (keep KPI and table answers) → audit viewer → cancel-scheduled-revision UI (API stays). P0 is never cut.

**Deliberately out of scope** (reasons in REQUIREMENTS): payroll and tax; currency conversion and org-wide totals in one currency; pay ranges and compa-ratio (first v2 item); multiple users, roles, approvals and SSO; bonus and equity; `.xlsx`; **relocation** (a v2 workflow, §3.4); unrestricted natural-language SQL.

### 3.2 Data model (PostgreSQL; Sequelize models + `schema.sql`)

```
employees
  id                    uuid PK
  employee_code         text NOT NULL UNIQUE          -- "EMP-00001"; import matching key
  full_name, email      text NOT NULL                 -- unique index on lower(email)
  job_title, department text NOT NULL
  country_code          char(2) NOT NULL              -- ISO 3166-1 alpha-2: work location
  salary_amount         bigint NOT NULL CHECK (> 0)   -- CURRENT salary, minor units (cache, §3.3)
  salary_currency       char(3) NOT NULL              -- ISO 4217 (lowercase): compensation currency
  salary_effective_on   date NOT NULL                 -- NEW: date of the revision salary_amount came from
  gender, employment_type, hire_date, status, deactivated_at, deactivation_reason
  created_at, updated_at

salary_revisions                                       -- append-only: never UPDATEd or DELETEd
  id                    uuid PK
  employee_id           uuid FK → employees
  amount                bigint NOT NULL CHECK (> 0)
  currency              char(3) NOT NULL               -- may differ from the previous revision (§3.4)
  effective_on          date NOT NULL
  reason                text NOT NULL                  -- hire | merit | promotion | market_adjustment | correction | import | currency_change
  note                  text NULL
  corrects_revision_id  uuid NULL FK → salary_revisions  -- NEW: set on corrections
  cancelled_at          timestamptz NULL               -- NEW: only ever set on a SCHEDULED revision (§3.3)
  import_id             uuid NULL FK → imports
  created_by            text NOT NULL                  -- NEW: actor id
  created_at            timestamptz NOT NULL
  (previous_amount is no longer stored: it is derived at read time with LAG over the effective timeline)

imports
  id, filename, row_count, created_count, updated_count, unchanged_count, skipped_count,
  status (committed | reverted), created_by, rows jsonb (per-row outcome, errors; no raw file),
  idempotency_key text UNIQUE NOT NULL                 -- NEW
  request_hash   char(64) NOT NULL                     -- NEW: sha256 of the normalised mapping + rows
  file_hash      char(64) NOT NULL                     -- NEW: warns "this file was imported on …"
  created_at

audit_logs                                             -- NEW, append-only (§3.7)
  id uuid PK, actor_id text NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL,
  action text NOT NULL, before jsonb NULL, after jsonb NULL,
  import_id uuid NULL, request_id text NULL, created_at timestamptz NOT NULL

login_attempts                                         -- NEW (§3.8)
  key text PK (hash of email + IP), window_start timestamptz, failures int

INDEXES
  employees        (country_code, job_title), (country_code, department), (status),
                   gin (full_name gin_trgm_ops), unique (employee_code), unique lower(email)
  salary_revisions (employee_id, effective_on DESC, created_at DESC)             -- timeline reads
                   UNIQUE (employee_id, effective_on) WHERE corrects_revision_id IS NULL
                                                    AND cancelled_at IS NULL     -- one original per date
                   UNIQUE (corrects_revision_id)                                 -- a revision is corrected at most once
                   (effective_on) WHERE cancelled_at IS NULL                    -- due-revision promotion
  audit_logs       (entity_type, entity_id, created_at DESC)
  imports          UNIQUE (idempotency_key)
```

The ER diagram is in `docs/DESIGN.md` §2; the API contract is in `docs/API.md`.

### 3.3 Salary history and effective dates

**Vocabulary.** For an employee and a date _D_ (the organisation's date, UTC):

- The **effective timeline** is the non-cancelled revisions, ordered by `(effective_on, created_at)`. On one date, the latest-recorded revision wins, which is always the newest correction.
- **Current** revision: the last one on the timeline with `effective_on ≤ today`. **Historical**: earlier ones. **Scheduled**: `effective_on > today`.
- `employees.salary_amount / salary_currency / salary_effective_on` are a **cache of the current revision**. Lists, sorting and every aggregate read the cache (measured fast at 10k; §3.9).

**Domain rules** (each covered by a test; replaces the v1 list):

1. A salary changes **only** by inserting a revision, inside the salary-revision service, in one transaction that holds `SELECT … FOR UPDATE` on the employee row.
2. Revisions are append-only. The application never updates or deletes a revision, with one exception: a **scheduled** revision may be cancelled (`cancelled_at` set), because it has not happened yet. Cancelling is audited.
3. `effective_on` ≥ hire date. Creating an employee writes the `hire` revision on the hire date (which may itself be in the future: a pre-boarded hire).
4. **Conflicts:** at most one original (non-correction) revision per employee per date, enforced by the partial unique index and checked first in the service (409 `revision_date_taken` with "record a correction instead").
5. **Backdating:** a new original revision may not be dated before the **current** revision (that would rewrite paid history). It may be dated between today and a scheduled revision; the scheduled one keeps its absolute amount.
6. **Corrections:** reason `correction`, `corrects_revision_id` set, `effective_on` equal to the corrected revision's date. Any revision (historical, current or scheduled) can be corrected; a correction can itself be corrected (chain), never edited.
7. **Cache:** when the change affects the current revision (effective ≤ today), the cache is updated in the same transaction. Scheduled revisions do **not** touch the cache.
8. **Promotion:** `promoteDueRevisions(today)` moves the cache to the latest due revision for every employee whose cache is older than a due revision. It is idempotent and set-based (one `UPDATE … FROM`), run daily by Vercel Cron at 00:10 UTC (`POST /api/internal/promote-due`, `CRON_SECRET`), on API cold start, and at the end of each write transaction for the employee being written. A test asserts `cache == derived current` for every employee after each scenario.
9. **Deactivation** cancels the employee's scheduled revisions in the same transaction (audited).
10. **Concurrency:** per-employee writes serialise on the row lock; bulk writes (raise plans, imports) lock employees **in id order** to avoid deadlocks; the unique indexes are the backstop if two transactions race.

**Why a cache plus promotion, not "derive current salary at read time":** every list, sort and analytics query (already measured at 1–10 ms) reads one table. Deriving the current revision per employee in each query is correct by construction but touches every query and costs a `LATERAL` lookup per employee. Promotion lag is bounded to minutes after UTC midnight and is closed by the cold-start and on-write runs. Trade-off recorded in TRADEOFFS; derivation is the fallback if a reviewer considers any lag unacceptable.

**API changes** (full contract in `docs/API.md`):

```
POST /api/employees/:id/salary-revisions   { amount, currency?, effectiveOn, reason, note?, correctsRevisionId? }
POST /api/employees/:id/salary-revisions/:revisionId/cancel     -- scheduled only; 409 otherwise
GET  /api/employees/:id                    -- revisions[] each with state: historical | current | scheduled | corrected | cancelled
POST /api/employees/raises                 -- effectiveOn may be future → scheduled revisions
POST /api/internal/promote-due             -- Vercel Cron only (Authorization: Bearer CRON_SECRET)
```

**UI:** the salary history timeline shows a "Scheduled" group above "Current" (with Cancel), corrections render the corrected entry struck through, and the change-salary dialog accepts future dates ("Takes effect on 1 Apr 2027. The current salary stays ₹28,20,000 until then.").

### 3.4 Country and currency

- **Country** (`country_code`, ISO 3166-1 alpha-2) is the work location: it drives grouping, fairness peers and the default currency. Still immutable after creation in v1.
- **Currency** (`salary_currency`, ISO 4217) is what pay is denominated in. Defaults from the country on create; HR may choose another supported currency. Changing an existing employee's currency is a **salary revision** with reason `currency_change`, since amount and currency change together (one point in history, audited).
- **Supported currencies** live in `packages/shared` with their exponent: the 8 country defaults plus `usd`, `eur`, `gbp` overrides and `bhd`/`kwd` (three-decimal) and `jpy` (zero-decimal). Validation rejects anything else (400).
- **No cross-currency aggregation.** Every aggregate groups by currency. A country summary with two currencies returns one row per currency; the UI labels the minority row ("12 people paid in USD"). Fairness peers are country × job title × currency. Raise cost is per currency (as built).
- **Forms and import:** a currency select (default pre-filled from country, "Override" shown when it differs); an optional `currency` CSV column (blank = country default; a change on an existing employee becomes a `currency_change` revision).
- **Relocation (v2, documented):** changing country means a new default currency, possibly a new peer group and a pay decision. v2 flow: "Relocate" action = country change + optional `currency_change` revision in one transaction, audited.

### 3.5 CSV import reliability

The flow stays: **Template → Upload → Map columns → Preview (nothing saved) → Confirm.**

| Concern                    | Design                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate submit / retries | The wizard creates an **`Idempotency-Key`** (UUID) when the preview is accepted and sends it on commit. The server stores it with a SHA-256 of the normalised request. Same key + same hash → returns the original result (`200`, `replayed: true`); same key + different body → `409`. The key is written inside the commit transaction, so a failed commit leaves no key and can be retried. |
| Same file twice            | `file_hash` match → a non-blocking warning in the preview: "This file was imported on 18 Nov by hr@acme.test".                                                                                                                                                                                                                                                                                 |
| Invalid rows               | Never silently dropped. The preview lists every error (line, column, message); the confirm button says "Import 9,712 valid rows · 15 rows with errors will not be imported"; the errors CSV is downloadable before and after; `imports.rows` keeps line + code + messages (no raw values).                                                                                                     |
| Duplicates                 | Within the file: duplicate `employee_code` or email → both rows are errors. Against the database: an email belonging to a different employee → error.                                                                                                                                                                                                                                          |
| Atomicity                  | All valid rows commit in **one transaction** (batched `INSERT`/`UPDATE … FROM (VALUES …)`, 1,000 rows per statement). Employees are locked in id order.                                                                                                                                                                                                                                        |
| Rollback                   | Any failure rolls back everything (employees, revisions, audit, import record, idempotency key). The UI says "Nothing was saved" with the reason, and the same file can be retried.                                                                                                                                                                                                            |
| Salary history             | A changed salary or currency writes a revision (`reason=import`, `import_id`), dated the import day (an optional `effective_date` column is P2).                                                                                                                                                                                                                                               |
| Provenance                 | `imports` records actor, filename, file hash, counts and per-row outcomes; revisions and audit entries carry `import_id`; employee history shows "Imported from _file.csv_ on _date_".                                                                                                                                                                                                         |
| Limits                     | ≤ 10,000 rows and a 4.4 MB body (Vercel's 4.5 MB cap) → 413 with a clear message.                                                                                                                                                                                                                                                                                                              |

**Summary shown after commit:** created, updated, unchanged, not imported (errors), plus links to the import detail and the errors CSV.

### 3.6 Pay fairness and statistical insights

**Terminology** (UI, API and docs): **Salary outliers**; **Gender-based compensation differences**; **Potential pay disparity** (a flag, not a finding). Labels "Review: gap ≥ 5%" and "EU Directive trigger" are retired.

| Item                 | Definition                                                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparison group     | Active, full-time employees with the same **country × job title × currency**. "Comparable job title" means the same title (no levelling data exists); stated in the UI.                                                                       |
| Sample sizes         | Every group shows `n` (women / men for differences; peer count for outliers).                                                                                                                                                                 |
| Suppression          | A difference is computed only when **both** women and men number ≥ 5 (configurable `FAIRNESS_MIN_GROUP`, default 5); otherwise the row says "Too few to compare" with no averages.                                                            |
| Difference           | `(mean_men − mean_women) / mean_men`, median difference alongside. If `mean_men` is 0 or a gender is absent, the result is `null` ("not comparable"), never a division error.                                                                 |
| Flag                 | \|difference\| ≥ `FAIRNESS_GAP_THRESHOLD` (default 0.05) → "Potential pay disparity". The threshold is an **analytical flag**, chosen to match a common reporting convention, not a legal standard; configurable via env and shown in the UI. |
| Confidence           | Welch t-test, \|t\| ≥ 1.96 → "less likely to be chance". With ~150 groups some flags are chance; the UI says so.                                                                                                                              |
| Outliers             | Tukey fences per group (n ≥ 5): below Q1 − 1.5·IQR or above Q3 + 1.5·IQR (`percentile_cont`). Peers with IQR = 0 produce no outliers (no division).                                                                                           |
| Disclaimer (UI, CSV) | "These are statistical indicators. Differences can reflect tenure, level, performance or location within a country, which Paywise doesn't record. They are not evidence of discrimination or of legal non-compliance."                        |

The "How to read this" panel shows the formulas with a worked example.

### 3.7 Audit logging

- **Table** `audit_logs` (§3.2). **Separate from salary history:** history answers "what was the salary on a date"; the audit log answers "who did what, when".
- **Recorded actions:** `employee.created`, `employee.updated` (changed fields only), `employee.deactivated`, `salary_revision.created`, `salary_revision.cancelled`, `raise_plan.applied` (one summary entry + per-revision entries), `import.committed` (summary entry; per-employee entries carry `import_id`), `auth.login_failed` counts are **not** audited (rate-limit table only).
- **What is stored:** identifiers, action, and a minimal diff. Salary amounts are **not** copied into audit entries (they live in history; the entry references the revision id). Gender changes are recorded as "changed" without values. No passwords, tokens or full request bodies.
- **Integration:** an `AuditService.record(tx, entries)` called by services **inside the same transaction** as the change, with an `actor` passed down from the controller (`c.get("actor")`). If the audit insert fails, the change rolls back.
- **Tamper resistance:** no update/delete code path exists; a trigger raises on `UPDATE` or `DELETE` of `audit_logs`; in production the app's database role is granted `INSERT, SELECT` only on the table. (Not tamper-proof against a database owner; stated in SECURITY.md.)
- **API:** `GET /api/audit-logs?entityType=&entityId=&page=` (P0: for tests and the employee panel's "Activity" list; full viewer is P2).

### 3.8 Security and authentication

| Area             | Decision                                                                                                                                                                                      | Status             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Passwords        | scrypt (salted) hash in env; `timingSafeEqual`; the hash runs even for an unknown email                                                                                                       | Built              |
| Session          | Signed (HMAC) cookie: `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, 8-hour expiry; first-party via the `/api` proxy                                                           | Built              |
| CSRF             | `SameSite=Lax` blocks cross-site POSTs carrying the cookie; **plus** reject state-changing requests whose `Origin` (or `Sec-Fetch-Site`) isn't the app's own, and require `application/json`  | Origin check to do |
| Authentication   | Middleware on every route except `/api/health` and `/api/auth/login`; the cron route uses `CRON_SECRET` instead                                                                               | Built              |
| Authorization    | `authorize(actor, action)` in services for sensitive actions (salary change, currency override, import, raise apply, deactivate, audit read). One role (`hr_admin`) in v1; the seam is tested | To do              |
| Login rate limit | 5 failures per email+IP per 15 minutes → 429 with `Retry-After`; counters in Postgres (`login_attempts`), not in memory (serverless instances don't share memory)                             | To do              |
| Logs             | Structured: method, route, status, duration, request id. Never bodies, salaries or cookies; errors logged by code and stack only                                                              | To do (redaction)  |
| Headers          | CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` from Next.js config                                                                                       | To do              |
| Data             | Synthetic seed only in every environment; reviewer credentials shared out of band                                                                                                             | Built              |

Assumptions and limits (single shared account, no server-side session revocation other than rotating `SESSION_SECRET`, audit not tamper-proof against the DB owner) are in `docs/SECURITY.md`.

### 3.9 Ask Paywise (P1): controlled analytics queries

**Goal:** answer "how does the organisation pay people?" in plain language, **without** letting text become SQL.

```
question ──► parser (pure, shared) ──► QueryPlan (Zod-validated) ──► executor (API) ──► predefined repository query ──► typed result
                                         │ unsupported?                                    (parameterised, whitelisted)
                                         └──► { supported: false, reason, suggestions }
```

- **Parser:** deterministic rules over a vocabulary built from `/meta/filters`: countries (names, codes, "US", "UK", "Germany"), departments, job titles with simple synonyms ("engineers" → titles containing "Engineer"), metrics (average/mean, median, total payroll, count, min, max, distribution) and numbers with currency ("above 100k", "more than ₹20 lakh").
- **QueryPlan intents** (each maps to one existing or new SQL function):

| Intent                 | Example                                                | Result kind                                                                      |
| ---------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `metric`               | "What is the average salary in India?"                 | KPI card                                                                         |
| `metric` + filters     | "What is the median salary for engineers in the US?"   | KPI card + titles used                                                           |
| `top_group`            | "Which department has the highest payroll in Germany?" | Ranked table + bar                                                               |
| `count_threshold`      | "How many employees earn above 100,000 in the US?"     | KPI card                                                                         |
| `compare_distribution` | "Compare salary distributions across countries"        | Per-country table (median, quartiles) + box-style chart, **in local currencies** |

- **Rules:** a threshold needs one currency (from the country, or stated); otherwise the answer asks for a country. Cross-country answers are per currency, never summed. Every response echoes the interpretation ("Median salary · Software Engineer, Senior Software Engineer · United States · USD"). Suppression rules from §3.6 apply to any gender breakdown.
- **Unsupported** questions (names, individuals' salaries, "who should we fire", free-form SQL) get `supported: false`, a reason and three example questions. Individual-level answers are out of scope by design.
- **Safety:** the only inputs to SQL are the plan's validated enum values and bound parameters; question length ≤ 300 characters; no LLM in v1. A v2 option is an LLM that emits a `QueryPlan` JSON only, validated by the same schema.
- **API:** `POST /api/ask { question }` → `{ supported, interpretation, result: { kind: kpi | table | chart, … } }`; `GET /api/ask/examples`.

### 3.10 Architecture, transactions and deployment

```
Next.js (Vercel project 1) ── same-origin /api/* rewrite ──► Hono API (Vercel project 2, one Function)
  shadcn + Tailwind + Recharts                                routes → controllers → services → repositories
  TanStack Query (server state) · URL (filters) · Jotai (UI)    │ middlewares: auth, origin check, body limit, errors
  Papa Parse (import preview)                                   └► PostgreSQL (any host, pooled) ◄── Vercel Cron: promote-due
packages/shared: Zod schemas, DTO types, money, CSV helpers, countries/currencies, Ask Paywise parser
```

**Transaction boundaries** (one database transaction each): create employee (+ hire revision + audit); update employee (+ audit); deactivate (+ cancel scheduled + audit); salary revision / correction / cancel (+ cache + audit); raise plan apply (all revisions + cache + audit); import commit (employees + revisions + import record + idempotency key + audit); promote-due (cache only, idempotent). Reads (lists, analytics, Ask) need no transaction.

**Separate Vercel projects vs one Next.js deployment:**

| Option                                             | For                                                                                                                 | Against                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Two projects** (chosen): web proxies `/api/*`    | API testable and deployable without Next; clear layering for reviewers; API cold starts don't affect page rendering | Two deploys and env sets; an extra proxy hop (~ms); versions must stay in step                                          |
| One project (Hono mounted in a Next route handler) | One deploy, no proxy hop, shared env                                                                                | Couples the API to Next's runtime and build; weaker separation; the API's tests and bundle get tangled with the web app |

Both keep one browser origin. We keep two projects; the rewrite makes switching later a configuration change.

### 3.11 Data access and schema management (revision 2.1)

Follows the Outbox backends (`outbox-backend-starter`, domainstack, clavis, saasmetrics): `pg` + Sequelize, no other ORM, no Neon-specific driver.

| Concern             | Decision                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection          | `config/db.ts` creates one `new Sequelize(DB_DATABASE, DB_USERNAME, DB_PASSWORD, { host, port, dialect: "postgres", logging: false, pool: { max: 5 }, define: { freezeTableName: true, underscored: true }, dialectOptions: DB_SSL ? { ssl: … } : {} })`, as in the starter's `shared/config/db.ts`.                                                                                              |
| Models              | `models/Employee.ts`, `SalaryRevision.ts`, `Import.ts`, `AuditLog.ts`, `LoginAttempt.ts`: `Model<InferAttributes, InferCreationAttributes>` classes with `declare`d fields and `init`, associations in `models/index.ts`. Table and column names are unchanged (snake_case), so existing data carries over.                                                                                       |
| Simple reads/writes | Model methods inside managed transactions: `sequelize.transaction(async (t) => …)`; row locks with `lock: t.LOCK.NO_KEY_UPDATE` and `order: [["id", "ASC"]]` (SCHEMA_REVIEW §5).                                                                                                                                                                                                                  |
| Analytics and bulk  | `sequelize.query(sql, { replacements: { … }, type: QueryTypes.SELECT, transaction })` with **named replacements only**: medians, IQR fences, gender differences, raise plans, `UPDATE … FROM (VALUES …)` batches, promotion. User input never reaches SQL text; sort columns stay whitelisted.                                                                                                    |
| Typing              | Raw-query results get explicit row types and one mapping function each (`toEmployeeSummary`, …); `bigint` columns come back as strings from `pg` and are converted in that mapper, never with floats.                                                                                                                                                                                             |
| Schema              | `npm run db:sync` (`scripts/sync-db.ts`, as in clavis): `authenticate()`, `sync({ alter: true })` from the models, then an idempotent `config/schema.sql` for what `sync()` can't express: `pg_trgm`, `CHECK`s, partial and covering indexes, the deferred composite FKs and the `audit_logs` trigger from SCHEMA_REVIEW §4. As in domainstack, the API syncs on boot only when `NODE_ENV=local`. |
| Production schema   | Never synced on boot. `db:sync` is run deliberately before a deploy that changes models, after a backup; never `force`. One-off data changes are separate scripts (`scripts/<name>.ts`), as in referral-stack.                                                                                                                                                                                    |
| Hosting             | Any Postgres 15+ reachable from Vercel: Supabase, Railway, Render or AWS RDS. Use the host's connection pooler (e.g. Supabase's pooled port, RDS Proxy) because each Function instance opens its own small pool.                                                                                                                                                                                  |
| Removed             | `drizzle-orm`, `drizzle-kit`, `drizzle.config.ts`, `apps/api/drizzle/` (migrations 0000–0002; the tables they created are what the models describe). Added: `sequelize`, `pg` (already present), `@electric-sql/pglite-socket` (dev).                                                                                                                                                             |

**Relation to `docs/SCHEMA_REVIEW.md`** (a proposal written alongside this plan): its DDL maps onto models (tables, columns, plain FKs, unique and functional indexes) plus `schema.sql` (everything else). Its "one migration per step" path becomes one `db:sync` change per step, with the same tests written first.

---

## 4. Repo Layout (after the Outbox restructure)

```
/
├── README.md  CLAUDE.md  PLAN.md
├── docs/  RESEARCH  REQUIREMENTS  DESIGN  API  SECURITY  TRADEOFFS  PERFORMANCE  SEED_DATA  DEPLOY  ai/PROMPTS
├── apps/api/src/
│   ├── routes/<feature>/<feature>.ts (+ index.ts)   controllers/<feature>/<feature>.ts
│   ├── services/<feature>/<feature>-service.ts, <feature>-repository.ts
│   ├── middlewares/  validators/  interfaces/  config/  models/ (Sequelize: Employee, SalaryRevision, Import, AuditLog, LoginAttempt)
│   └── utils/helpers/  scripts/ (sync-db, seed, measure)   config/schema.sql          test/ (PGlite)
├── apps/web/  app/(Main) app/(Auth)  components/{ui,Block,Shared,Icons}  hooks/  context/
│              utils/{apis,atoms,constants,helpers,forms,services}
├── packages/shared/src/  schemas  money  csv  countries  currencies  ask/ (parser, plan schema)
└── docker-compose.yml  .github/workflows/ci.yml
```

New feature folders: `services/audit/`, `services/ask/`, `controllers/ask/`, `routes/ask/`, `routes/internal/`, `components/Block/Ask/`.

---

## 5. Build Sequence

Commits 1–36 of revision 1 are done (see `git log`). Revision 2 continues with small Conventional Commits; `test:` before `feat:` for shared logic and services; `npm run check` before every commit; a migration per schema step.

### Day 0: Data layer on Sequelize (revision 2.1, P0 enabler): done

Behaviour doesn't change, so the existing tests were the safety net. Shipped as two commits (the plan, then the switch) rather than six, because the intermediate states don't build: every repository and the test harness depend on the database handle. Verified: 188 tests; `db:sync` on the existing local database (data and defaults intact, no duplicate constraints); the Vercel bundle answering an authenticated query; read-only timings unchanged (PERFORMANCE.md).

0. `docs: plan revision 2.1: PostgreSQL via pg + Sequelize, db:sync, any Postgres host` _(this commit)_
1. `test(api): Sequelize test harness on PGlite via pglite-socket (sync + schema.sql per file, truncate between tests)`
2. `refactor(api): Sequelize connection from DB_* env and models (Employee, SalaryRevision, Import)`
3. `refactor(api): employees repository and service on Sequelize (models, locks, sequelize.query for raise plans)`
4. `refactor(api): insights, fairness, imports and exports on sequelize.query with named replacements`
5. `chore(api): db:sync script (sync + schema.sql), seed on Sequelize; remove drizzle-orm, drizzle-kit and migrations`
6. `docs: DEPLOY and README for any Postgres host`

### Day 1: Effective dating and currency (P0)

1. `docs: revision 2 plan, API contract, security notes` _(this commit)_
2. `test(shared)` → `feat(shared): supported currencies with exponents (jpy 0, bhd/kwd 3), currency on employee schemas`
3. `feat(api): models and schema.sql: revision corrections/cancellation, salary_effective_on, current_revision_id, created_by; CHECKs and RESTRICT (SCHEMA_REVIEW steps 1 and 3)`
4. `test(api)` → `feat(api): scheduled revisions, date conflicts (409), backdating rule, corrections`
5. `test(api)` → `feat(api): promoteDueRevisions + cron route + cold-start run; cache == derived invariant`
6. `test(api)` → `feat(api): cancel scheduled revisions; deactivation cancels them`
7. `test(api)` → `feat(api): currency override on create; currency_change revisions; per-currency aggregates`
8. `feat(api): seed adds currency overrides and scheduled raises (tests assert them)`

### Day 2: Import reliability, audit, security (P0)

9. `test(api)` → `feat(api): import idempotency key + request hash; replay and conflict`
10. `test(api)` → `feat(api): import provenance (file hash warning, actor, counts); rollback leaves no import or key`
11. `test(api)` → `feat(api): audit_logs table, AuditService, immutability trigger`
12. `feat(api): audit entries for employee, salary, raise plan and import writes (same transaction)`
13. `test(api)` → `feat(api): login rate limit (Postgres counters), Origin check, authorize() seam`
14. `chore(api): structured request logs without bodies or salaries`
15. `fix(api): lock employees in id order for raise plans and imports`

### Day 3: Fairness wording and Ask Paywise backend (P1)

16. `test(api)` → `feat(api): configurable fairness thresholds; null-safe differences; currency in peer groups`
17. `feat(web): fairness terminology, sample sizes, disclaimers, worked example`
18. `test(shared)` → `feat(shared): Ask Paywise parser and QueryPlan schema (supported and unsupported questions)`
19. `test(api)` → `feat(api): Ask executor (metric, top_group, count_threshold, compare_distribution) + /ask routes`

### Day 4: UI and frontend tests

20. `feat(web): scheduled and corrected revisions in history; future-dated change salary; cancel`
21. `feat(web): currency select with override; import currency column; import summary and idempotent confirm`
22. `feat(web): employee Activity list (audit)`
23. `feat(web): Ask Paywise page (examples, KPI/table/chart answers, unsupported explanations)`
24. `test(web): forms (money, currency), filter bar multi-select, import mapping and summary, Ask results (RTL + MSW)`
25. `perf: re-measure (promotion, import with audit, ask) → PERFORMANCE.md`

### Day 5 (half): Ship

26. `chore: managed Postgres (DB_* vars), db:sync + seed, two Vercel projects, CRON_SECRET, Vercel Cron`; smoke test
27. `docs: README (live URL, credentials out of band, video), final AI log`
28. Demo video; review commit history

---

## 6. Testing Strategy

| Layer               | What (revision 2 additions in **bold**)                                                                                                                                                                                                                                                                                           | Tooling                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Money + currencies  | Exponents, Indian/Western grouping, rejects; **JPY (0) and BHD/KWD (3) parse, format and raise rounding**                                                                                                                                                                                                                         | Vitest (pure)                     |
| Schemas             | Field rules; **currency defaults and allowed overrides; revision payloads (future dates, correction target)**                                                                                                                                                                                                                     | Vitest (pure)                     |
| Salary revisions    | **Future-dated → scheduled (cache unchanged); current salary = latest ≤ today; promotion moves the cache on the due date and is idempotent; same-date original → 409; correction chain; backdating before current → 422; cancel only scheduled; deactivation cancels; concurrent writes serialise (two transactions, one waits)** | Vitest + PGlite, injected `today` |
| Currency            | **Override on create; currency_change revision; aggregates split per currency; three-decimal amounts round-trip**                                                                                                                                                                                                                 | Vitest + PGlite                   |
| Import              | Classify/commit, export round trip; **same key replays, different body → 409; failure mid-commit rolls back everything and leaves no key; file-hash warning; duplicate code/email in file and vs DB**                                                                                                                             | Vitest + PGlite                   |
| Audit               | **Each write produces the expected entries in the same transaction; failed write → no entry; UPDATE/DELETE on audit_logs raise; entries contain no salary amounts**                                                                                                                                                               | Vitest + PGlite                   |
| Fairness            | Medians, fences, gaps on hand-computed fixtures; **suppression at < 5 per gender, configurable threshold, absent gender and zero mean → null, IQR = 0 → no outliers**                                                                                                                                                             | Vitest + PGlite                   |
| Security            | Auth required, 401s; **rate limit → 429 after 5 failures and resets; cross-origin POST → 403; authorize() denies a non-admin actor; cron route needs `CRON_SECRET`**                                                                                                                                                              | `app.request()`                   |
| Ask Paywise         | **Parser: each supported example → expected plan; unsupported and adversarial inputs ("; DROP TABLE", names, other currencies) → `supported: false`; executor results on fixtures**                                                                                                                                               | Vitest (pure) + PGlite            |
| Analytics           | Country/title/department/distribution on fixtures (even-count median)                                                                                                                                                                                                                                                             | Vitest + PGlite                   |
| Seed                | Determinism, uniqueness, planted patterns; **currency overrides and scheduled raises present**                                                                                                                                                                                                                                    | Vitest (pure)                     |
| UI                  | **Change-salary form (future date copy, currency), filter bar multi-select, import summary, Ask results and unsupported state**                                                                                                                                                                                                   | RTL + MSW                         |
| End to end (manual) | Scripted Playwright walkthrough of every page (53 checks at revision 2)                                                                                                                                                                                                                                                           | Playwright (local)                |

Rules: no network; fixed seed; injected clock; an isolated PGlite database per file, reached by Sequelize over `pglite-socket` (one connection, so the pool is 1 in tests); concurrency tests from SCHEMA_REVIEW §8 run against real Postgres when `TEST_PG_URL` is set (a CI service container); fixtures of a handful of hand-computed employees; **never 10,000 rows in a unit test** (the seed generator is tested as a pure function). Target: the whole suite under 15 s.

---

## 7. Performance → `docs/PERFORMANCE.md`

Already measured at 10k (p50): list 1–5 ms, search 10 ms, insights 2–4 ms, fairness 8 ms, export 51 ms, import preview 177 ms, import commit 853 ms, seed ~1 s.

Revision 2 work to measure and record:

- `promoteDueRevisions` on 10k employees with ~200 due revisions (one `UPDATE … FROM`, target < 50 ms).
- Import commit with audit entries (+1 batched insert per 1,000 rows; target < 1.2 s for 9.7k rows).
- Ask Paywise end to end (parse < 1 ms; queries reuse insight SQL; target p50 < 30 ms).
- Revision timeline reads with the new `(employee_id, effective_on DESC, created_at DESC)` index.

Unchanged principles: server-side pagination and filtering; aggregates in SQL; indexes match the queries; small pool (max 5) per Function; no 10k rows in the browser. At 1M employees: keyset pagination, materialized insight views refreshed after writes, and streamed imports via a background job.

---

## 8. AI Usage Artifacts → `docs/ai/`

`CLAUDE.md` holds the rules the agent must follow (money module, shared schemas, revision service, SQL aggregates, layering, CSV safety; revision 2 adds audit-in-transaction and no salaries in logs). `docs/ai/PROMPTS.md` records prompts, accepted output, and every correction, including this plan review.

---

## 9. Demo Video (4–5 min), told as the HR manager's day

1. Import her CSV: mapping, preview with errors, "15 rows will not be imported", confirm; click again and nothing is duplicated. _(#9)_
2. Find someone across 10k rows; open their history. _(#2)_
3. Schedule a promotion for next quarter: current salary unchanged, "Scheduled" in history. Correct a typo with a correction entry. _(#2, #12)_
4. An expat on a USD contract in Singapore: currency override, shown per currency in insights.
5. "How do we pay engineers in India?" in Ask Paywise; then an unsupported question and its explanation. _(#11)_
6. Fairness: an outlier and a potential disparity, with sample sizes and the disclaimer. _(#4, #5)_
7. Raise planner: 6% for Germany Engineering from 1 Jan → scheduled revisions. _(#6)_
8. The employee's Activity log: who did what. Export to Excel.
9. A minute of code: layering, tests, CI, commit history, what's next.

---

## 10. Timeline

| Day   | Work                                                                                                              | Risk and mitigation                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0     | Data layer: Sequelize models, repositories on `sequelize.query`, `db:sync`, PGlite-socket harness; remove Drizzle | Wide but mechanical; behaviour unchanged, 187 tests as the net. Riskiest: raw-query typing and `bigint` mapping. |
| 1     | Effective dating (models/schema.sql, rules, promotion, cancel), currency override, seed updates                   | Highest-risk change (touches salary writes). Test-first; cache invariant test.                                   |
| 2     | Import idempotency and provenance, audit logs, rate limit, Origin check, authorization seam, logs                 | Audit touches every write: one `AuditService`, added service by service.                                         |
| 3     | Fairness wording and thresholds; Ask Paywise parser and executor                                                  | Ask scope creep: five intents only; unsupported is a valid answer.                                               |
| 4     | UI for scheduled revisions, currency, import summary, activity, Ask; frontend tests; re-measure                   | Cut Ask charts first if late (KPI and tables stay).                                                              |
| 5 (½) | Deploy (managed Postgres, two projects, Cron), smoke test, README, video                                          | Deployment never exercised: do a preview deploy at the end of day 2 to de-risk.                                  |

About **5.5 working days** for revisions 2 and 2.1, on top of the built baseline (Day 0 adds one day). To stay at 4.5 days: Ask Paywise ships `metric` and `top_group` with table answers only, and the Activity UI moves to P2. If only 3 days remain: drop Ask Paywise to `metric` and `top_group` intents with table answers, and the Activity UI.

---

## 11. Submission Checklist

- [x] Research and requirements committed before the first feature commit
- [x] Incremental Conventional Commits; `test:` before `feat:` for core logic
- [x] Money: integer minor units + currency; no floats in the money path
- [x] Import: preview before save, row-level errors, one-transaction commit, history provenance
- [x] Export: UTF-8 BOM + formula-injection safe + round trip tested
- [x] Seed: 10,000 deterministic employees with documented planted patterns
- [x] Data layer on Sequelize + pg (no Drizzle, no Neon); `db:sync` with `schema.sql`; tests on PGlite-socket
- [ ] Scheduled revisions, corrections and the current-salary invariant
- [ ] Currency override, per-currency aggregates, three-decimal tests
- [ ] Import idempotency and rollback tests
- [ ] Audit logs written in the same transaction as every change
- [ ] Login rate limit, Origin check, authorization seam, log hygiene
- [ ] Fairness terminology and disclaimers; configurable threshold
- [ ] Ask Paywise (P1)
- [ ] Frontend component tests
- [ ] API and web live on Vercel; Cron configured; credentials shared out of band
- [ ] Demo video linked at the top of README
- [ ] All docs current (REQUIREMENTS, DESIGN, API, SECURITY, TRADEOFFS, PERFORMANCE, SEED_DATA, AI log)
- [ ] Can explain every decision in the technical interview
