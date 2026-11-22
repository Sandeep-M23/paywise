# Paywise: API Contract

REST + JSON under `/api`, served by Express. The browser calls the web app's origin, which proxies `/api/*` to the API; it can also call the API directly (`NEXT_PUBLIC_BACKEND_API_URL`), since auth is a header, not a cookie. Every endpoint below is built; request and response types live in `packages/shared` (`schemas.ts`, `dto.ts`).

## Conventions

- **Auth:** every route needs `Authorization: Bearer <authToken>` (the JWT from `POST /api/auth/login`) except `GET /api/health` and `POST /api/auth/login`.
- **CSRF:** not applicable: the browser never attaches the token by itself, so a cross-site page can't send an authenticated request.
- **Money:** amounts are integers in the currency's smallest unit, with a lowercase ISO 4217 code (`{ "amount": 9200000, "currency": "usd" }`). JPY has 0 decimals, BHD/KWD 3, most others 2. Amounts in different currencies are never added together.
- **Dates:** `YYYY-MM-DD` (the organisation's date, UTC). **Lists:** `?page=1&pageSize=25` (max 100) → `{ data, page, pageSize, total }`. Multi-value filters repeat the key: `?country=IN&country=DE` means "any of".
- **Scheduled changes:** on the first request of each day the API makes any scheduled salary change that has come due the current one (no cron job).
- **Errors:** `{ "error": { "code": "…", "message": "…", "details": [{ "path", "message" }] } }`. Unexpected errors are a `500 internal` with a generic message.

| Status | Codes                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid_json`, `invalid_query`                                                                                                                    |
| 401    | `unauthenticated`, `invalid_credentials`                                                                                                           |
| 404    | `not_found`                                                                                                                                        |
| 409    | `duplicate_employee_code`, `duplicate_email`, `revision_date_taken`, `already_corrected`, `stale_salary`, `employee_inactive`, `concurrent_change` |
| 413    | `import_too_large`, `payload_too_large`                                                                                                            |
| 422    | `validation_failed` (field `details`, or a broken domain rule such as backdating before the current salary)                                        |

## Auth

| Method & path          | Request               | Response                                                       |
| ---------------------- | --------------------- | -------------------------------------------------------------- |
| `POST /api/auth/login` | `{ email, password }` | `{ status, message, data: { authToken, email } }` (8-hour JWT) |
| `GET /api/auth/me`     |                       | `{ email }`                                                    |

Signing out is client-side: the web app drops the token. A token can't be revoked before it expires (`docs/SECURITY.md`).

## Employees

| Method & path                        | Request                                                                                                 | Response                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `GET /api/employees`                 | `?page&pageSize&sort&order&q&country*&jobTitle*&department*&status` (sort defaults to `employeeCode`)   | `Page<EmployeeSummary>`                        |
| `GET /api/employees/:id`             |                                                                                                         | `EmployeeDetail` with `revisions[]`            |
| `POST /api/employees`                | employee fields + `salaryAmount`, `salaryCurrency?` (defaults from country), `hireDate` (may be future) | `201 EmployeeDetail` (with a `hire` revision)  |
| `PATCH /api/employees/:id`           | non-salary fields only                                                                                  | `EmployeeDetail`                               |
| `POST /api/employees/:id/deactivate` | `{ reason }`                                                                                            | `EmployeeDetail` (scheduled changes cancelled) |
| `POST /api/employees/raises`         | `{ percent, country*, department*, jobTitle*, overrides[], effectiveOn, reason, note? }`                | `201 { applied, skipped, scheduled }`          |

`EmployeeSummary.salary` is the **current** salary: the latest revision effective on or before today. A raise plan's `reason` is `merit`, `promotion` or `market_adjustment`; a future `effectiveOn` makes every revision scheduled.

### Salary revisions

| Method & path                              | Request                                                                                      | Response             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------- |
| `POST /api/employees/:id/salary-revisions` | `{ amount, currency?, effectiveOn, reason, note?, correctsRevisionId?, basedOnRevisionId? }` | `201 EmployeeDetail` |

Each revision in `EmployeeDetail.revisions`:

```json
{
  "id": "…",
  "amount": 9200000,
  "previousAmount": 8500000,
  "currency": "usd",
  "effectiveOn": "2027-04-01",
  "reason": "promotion",
  "note": "Q2 cycle",
  "importId": null,
  "correctsRevisionId": null,
  "state": "scheduled",
  "createdBy": "hr@acme.test",
  "createdAt": "2026-11-19T10:02:11Z"
}
```

`state`: `historical` · `current` · `scheduled` · `corrected` (superseded by a correction) · `cancelled` (a scheduled change dropped when the employee was deactivated).

Rules (details in `DESIGN.md` §2.1): `effectiveOn` ≥ hire date; not before the current revision unless it is a correction; one original per date (`409 revision_date_taken`, "record a correction instead"); a correction names `correctsRevisionId` and uses that revision's date, and only the newest one on a date can be corrected (`409 already_corrected`); a different currency needs the reason `currency_change`; `basedOnRevisionId` that is no longer the latest → `409 stale_salary`. The web app records merit, promotion and market adjustment changes, and corrections from the salary history; currency changes are API-only.

## Insights and fairness

| Method & path                                    | Request                                                 | Response                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/insights/countries`                    |                                                         | `CountrySummary[]`: per country and currency, headcount, total, min, median, mean, max                            |
| `GET /api/insights/countries/:code/job-titles`   |                                                         | `JobTitleSummary[]`                                                                                               |
| `GET /api/insights/countries/:code/departments`  |                                                         | `DepartmentSummary[]`                                                                                             |
| `GET /api/insights/countries/:code/distribution` | `?buckets=2..50` (default 10)                           | `{ currency, buckets: [{ from, to, count }] }`                                                                    |
| `GET /api/insights/fairness/outliers`            | `?country&jobTitle`                                     | `PayOutlier[]` with `peerCount`, `peerMedian`, fences, `direction`, `deviation`                                   |
| `GET /api/insights/fairness/gender-gaps`         | `?country&jobTitle`                                     | `GenderGapGroup[]` with counts, means, medians, gaps, `flagged` (≥ 5%), `significant`, `suppressed` (small group) |
| `POST /api/insights/raise-cost`                  | raise plan (as `/employees/raises` without date/reason) | `RaiseCost[]` per currency: headcount, current total, increase, new total                                         |

## Import and export

| Method & path                   | Request                         | Response                                                               |
| ------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `GET /api/imports/template.csv` |                                 | CSV (UTF-8 BOM)                                                        |
| `POST /api/imports/preview`     | `{ filename, mapping, rows[] }` | per-row `create / update / unchanged / error` + summary; nothing saved |
| `POST /api/imports`             | same body                       | `201 { importId, created, updated, unchanged, skipped }`               |
| `GET /api/imports`              |                                 | `ImportLogEntry[]` (who ran each import and what it changed)           |
| `GET /api/imports/:id`          |                                 | `ImportDetail` (per-row outcomes)                                      |
| `GET /api/export/employees.csv` | directory filters               | CSV (UTF-8 BOM, formula-injection safe, re-importable)                 |

Limits: ≤ 10,000 rows, ≤ 4.4 MB body → `413 import_too_large`. Valid rows are saved in one transaction; a failed commit saves nothing.

## Meta

| Method & path           | Response                                                 |
| ----------------------- | -------------------------------------------------------- |
| `GET /api/meta/filters` | countries (with their currency), job titles, departments |
| `GET /api/health`       | `{ ok: true }`, public                                   |
