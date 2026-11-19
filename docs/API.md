# Paywise: API Contract

REST + JSON under `/api`. The browser calls the web app's origin, which proxies `/api/*` to the API, so the session cookie is first-party.

**Status:** **Built** = in the code today · **Changed** = built, and revision 2 changes the contract · **Planned** = revision 2 (see `PLAN.md` §5).

## Conventions

- **Auth:** every route needs the session cookie except `GET /api/health`, `POST /api/auth/login`, and `POST /api/internal/*` (which needs `Authorization: Bearer <CRON_SECRET>`).
- **CSRF (Planned):** `POST`, `PATCH` and `DELETE` must be `Content-Type: application/json` and come from the app's own `Origin`; otherwise `403 forbidden_origin`.
- **Money:** always `{ "amount": <integer minor units>, "currency": "<lowercase ISO 4217>" }`. JPY has 0 decimals, BHD/KWD 3, most others 2.
- **Dates:** `YYYY-MM-DD` (organisation date, UTC). **Lists:** `?page=1&pageSize=25` (max 100) → `{ data, page, pageSize, total }`. Multi-value filters repeat the key: `?country=IN&country=DE` means "any of".
- **Errors:** `{ "error": { "code": "…", "message": "…", "details": [{ "path", "message" }] } }`.

| Status | Code examples                                                                         |
| ------ | ------------------------------------------------------------------------------------- |
| 400    | `invalid_query`, `validation_failed`, `unsupported_currency`                          |
| 401    | `unauthenticated`, `invalid_credentials`                                              |
| 403    | `forbidden`, `forbidden_origin` (Planned)                                             |
| 404    | `not_found`                                                                           |
| 409    | `duplicate`, `revision_date_taken`, `not_scheduled`, `idempotency_conflict` (Planned) |
| 413    | `import_too_large`                                                                    |
| 422    | `invalid` (domain rule broken, e.g. backdating before the current revision)           |
| 429    | `too_many_attempts` with `Retry-After` (Planned)                                      |

## Auth

| Method & path           | Request               | Response                   | Status                                                           |
| ----------------------- | --------------------- | -------------------------- | ---------------------------------------------------------------- |
| `POST /api/auth/login`  | `{ email, password }` | `{ email }` + `Set-Cookie` | Changed: rate limited (5 failures / 15 min per email + IP → 429) |
| `POST /api/auth/logout` |                       | `{ ok: true }`             | Built                                                            |
| `GET /api/auth/me`      |                       | `{ email }`                | Built                                                            |

## Employees

| Method & path                        | Request                                                                                                 | Response                                    | Status                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/employees`                 | `?page&pageSize&sort&order&q&country*&jobTitle*&department*&status` (sort defaults to `employeeCode`)   | `Page<EmployeeSummary>`                     | Built                                                                       |
| `GET /api/employees/:id`             |                                                                                                         | `EmployeeDetail` with `revisions[]`         | Changed: each revision gets `state` (below) and `previousAmount` is derived |
| `POST /api/employees`                | employee fields + `salaryAmount`, `salaryCurrency?` (defaults from country), `hireDate` (may be future) | `201 EmployeeDetail` (with `hire` revision) | Changed: `salaryCurrency` override                                          |
| `PATCH /api/employees/:id`           | non-salary fields only                                                                                  | `EmployeeDetail`                            | Built                                                                       |
| `POST /api/employees/:id/deactivate` | `{ reason }`                                                                                            | `EmployeeDetail`                            | Changed: also cancels scheduled revisions                                   |
| `POST /api/employees/raises`         | `{ percent, country*, department*, jobTitle*, overrides[], effectiveOn, reason, note? }`                | `201 { applied, skipped, scheduled }`       | Changed: future `effectiveOn` → scheduled                                   |

`EmployeeSummary.salary` is the **current** salary (the cache of the latest revision effective on or before today).

### Salary revisions

| Method & path                                                 | Request                                                                  | Response             | Status  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------- | ------- |
| `POST /api/employees/:id/salary-revisions`                    | `{ amount, currency?, effectiveOn, reason, note?, correctsRevisionId? }` | `201 SalaryRevision` | Changed |
| `POST /api/employees/:id/salary-revisions/:revisionId/cancel` | `{ note? }`                                                              | `SalaryRevision`     | Planned |

`SalaryRevision`:

```json
{
  "id": "…",
  "amount": 9200000,
  "currency": "usd",
  "effectiveOn": "2027-04-01",
  "reason": "promotion",
  "note": "Q2 cycle",
  "state": "scheduled",
  "previousAmount": 8500000,
  "correctsRevisionId": null,
  "importId": null,
  "createdBy": "hr@acme.test",
  "createdAt": "2026-11-19T10:02:11Z"
}
```

`state`: `historical` · `current` · `scheduled` · `corrected` (superseded by a correction) · `cancelled`.

Rules (details in `DESIGN.md` §2.1): `effectiveOn` ≥ hire date; not before the current revision unless it is a correction; one original per date (`409 revision_date_taken`, "record a correction instead"); a correction must use the corrected revision's date; only scheduled revisions can be cancelled (`409 not_scheduled`); a different `currency` requires reason `currency_change`.

## Insights and fairness

| Method & path                                    | Request                                                 | Response                                                                                                                                                                                   | Status                         |
| ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `GET /api/insights/countries`                    |                                                         | `CountrySummary[]`, one row per country **and currency**                                                                                                                                   | Changed (per currency)         |
| `GET /api/insights/countries/:code/job-titles`   |                                                         | `JobTitleSummary[]` per currency                                                                                                                                                           | Changed                        |
| `GET /api/insights/countries/:code/departments`  |                                                         | `DepartmentSummary[]` per currency                                                                                                                                                         | Changed                        |
| `GET /api/insights/countries/:code/distribution` | `?buckets=2..50`                                        | `{ currency, buckets[] }[]`                                                                                                                                                                | Changed                        |
| `GET /api/insights/fairness/outliers`            | `?country&jobTitle`                                     | `SalaryOutlier[]` with `peerCount`                                                                                                                                                         | Changed (naming)               |
| `GET /api/insights/fairness/gender-gaps`         | `?country&jobTitle`                                     | `GenderDifferenceGroup[]` with `femaleCount`, `maleCount`, `difference` (null when not comparable), `potentialDisparity`, `lessLikelyChance`, `suppressed`, plus `{ threshold, minGroup }` | Changed (naming, configurable) |
| `POST /api/insights/raise-cost`                  | raise plan (as `/employees/raises` without date/reason) | `RaiseCost[]` per currency                                                                                                                                                                 | Built                          |

## Ask Paywise (Planned, P1)

| Method & path           | Request                      | Response   |
| ----------------------- | ---------------------------- | ---------- |
| `POST /api/ask`         | `{ question }` (≤ 300 chars) | see below  |
| `GET /api/ask/examples` |                              | `string[]` |

```json
{
  "supported": true,
  "interpretation": "Median salary · Software Engineer, Senior Software Engineer · United States · USD",
  "plan": {
    "intent": "metric",
    "metric": "median",
    "filters": { "country": ["US"], "jobTitle": ["Software Engineer", "Senior Software Engineer"] }
  },
  "result": { "kind": "kpi", "value": { "amount": 14200000, "currency": "usd" }, "n": 812 }
}
```

```json
{
  "supported": false,
  "reason": "Paywise answers questions about groups of people, not named individuals.",
  "suggestions": [
    "What is the average salary in India?",
    "Which department has the highest payroll in Germany?",
    "Compare salary distributions across countries"
  ]
}
```

`result.kind`: `kpi` · `table` (`columns`, `rows`) · `chart` (`series` per currency). Amounts are never summed across currencies.

## Import and export

| Method & path                   | Request                                          | Response                                                                                                                                           | Status  |
| ------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `GET /api/imports/template.csv` |                                                  | CSV (UTF-8 BOM)                                                                                                                                    | Built   |
| `POST /api/imports/preview`     | `{ filename, mapping, rows[] }`                  | per-row `create / update / unchanged / error` + summary; **`alreadyImported`** warning                                                             | Changed |
| `POST /api/imports`             | same body + header **`Idempotency-Key: <uuid>`** | `201 { importId, created, updated, unchanged, skipped }`; replay → `200` + `replayed: true`; same key, different body → `409 idempotency_conflict` | Changed |
| `GET /api/imports`              |                                                  | `ImportLogEntry[]`                                                                                                                                 | Built   |
| `GET /api/imports/:id`          |                                                  | `ImportDetail` (per-row outcomes, no raw values)                                                                                                   | Built   |
| `GET /api/export/employees.csv` | directory filters                                | CSV (UTF-8 BOM, formula-injection safe, re-importable)                                                                                             | Built   |
| `POST /api/imports/:id/revert`  |                                                  |                                                                                                                                                    | P2      |

Limits: ≤ 10,000 rows, ≤ 4.4 MB body → `413 import_too_large`. A failed commit rolls back everything, including the idempotency key, so the same key can be retried.

## Audit (Planned)

| Method & path         | Request                              | Response           |
| --------------------- | ------------------------------------ | ------------------ |
| `GET /api/audit-logs` | `?entityType&entityId&page&pageSize` | `Page<AuditEntry>` |

`AuditEntry`: `{ id, actorId, entityType, entityId, action, before, after, importId, createdAt }`. No salary amounts; salary entries reference the revision id.

## Meta and internal

| Method & path                    | Notes                                                                               | Status               |
| -------------------------------- | ----------------------------------------------------------------------------------- | -------------------- |
| `GET /api/meta/filters`          | countries, currencies, job titles, departments                                      | Changed (currencies) |
| `GET /api/health`                | `{ ok: true }`, public                                                              | Built                |
| `POST /api/internal/promote-due` | Vercel Cron, daily 00:10 UTC; `Authorization: Bearer <CRON_SECRET>`; `{ promoted }` | Planned              |
