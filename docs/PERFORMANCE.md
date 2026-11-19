# Performance

## Measured (10,000 seeded employees, local Postgres 17 in Docker, MacBook)

From `npm run measure -w @paywise/api`: 7 runs each (3 for heavier calls), API over HTTP.

| Call                                   | p50        | Notes                                      |
| -------------------------------------- | ---------- | ------------------------------------------ |
| List page 1 (25 rows)                  | 3 ms       | `LIMIT/OFFSET` + `count(*)` in parallel    |
| List sorted by salary, page 200        | 5 ms       |                                            |
| List filtered (IN, Engineering)        | 1 ms       | `(country_code, department)` index         |
| Search "shar" (name/email/code)        | 10 ms      | `ILIKE`; trigram GIN index on name         |
| Country summaries                      | 4 ms       | one `GROUP BY` with `percentile_cont`      |
| Job titles / distribution (IN)         | 2 ms       |                                            |
| Gender gaps / outliers (all)           | 8 ms       | one query each                             |
| Raise cost (IN)                        | 2 ms       |                                            |
| Export all (CSV, ~1 MB)                | 51 ms      |                                            |
| Import preview, 9,727 rows (2.6 MB)    | 177 ms     | three set-based lookups for the whole file |
| Import commit, 9,727 updates           | **853 ms** | was 2,637 ms; see below                    |
| Seed 10,000 employees + ~16k revisions | ~1.0 s     | batches of 1,000 in one transaction        |

The web app keeps the previous page on screen while the next loads, debounces search (300 ms), and caches aggregates for 5 minutes. Every write invalidates them.

**After moving to `pg` + Sequelize (19 Nov 2026), read-only calls re-timed** (8 runs, p50): list 2.2 ms, sorted page 200 3.6 ms, filtered 1.1 ms, search 9.0 ms, country summaries 3.7 ms, job titles 1.8 ms, gender gaps 7.7 ms, outliers 8.9 ms, export 41 ms. The SQL is the same, so timings match or beat the table above. The import and seed rows weren't re-run: the measure script commits a 9,727-row import, which would change the local data.

## What changed because of measuring

**Import commit: 2.6 s → 0.85 s, about 9,700 statements → about 20.** The first version updated each existing employee with its own `UPDATE`. That's fine locally, but it's one network round trip per row once the API (Vercel) and database (Neon) are on different machines. Updates now go out as one `UPDATE … FROM (VALUES …)` per 1,000 rows, and new employees and salary revisions are batch-inserted the same way.

**Fairness checks** weren't a speed problem but a usefulness one: see `DESIGN.md` §5.

## Design choices for scale

- **Never ship 10k rows to the browser**: server-side paging, sorting and filtering.
- **Aggregates in SQL**: no endpoint loads all employees into Node to compute statistics.
- **Indexes match the queries**: `(country_code, job_title)`, `(country_code, department)`, `status`, unique `employee_code`, unique `lower(email)`, trigram GIN on `full_name`, and `(employee_id, effective_on)` on revisions.
- **`salary_amount` is denormalised** onto `employees` as a cache of the **current** revision (the latest effective on or before today), so lists and aggregates never need a "latest revision per employee" subquery. It's written only in the same transaction as the revision, or by the idempotent due-revision promotion (planned).
- **Import limits**: at most 10,000 rows per file and a 4.4 MB request body (Vercel Functions cap at 4.5 MB), with a clear 413 message.
- **Small connection pool** (max 5) per function instance.

## Revision 2: planned changes and targets

Not measured yet; each gets a row in the table above once built (`PLAN.md` §7).

| Change                                                     | Cost model                                                                                                 | Target p50                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `promoteDueRevisions(today)` (daily, cold start, on write) | One `UPDATE employees … FROM (latest due revision per employee)` using the partial index on `effective_on` | < 50 ms at 10k with ~200 due        |
| Revision timeline reads                                    | Index `(employee_id, effective_on DESC, created_at DESC)`; `LAG` for the previous amount                   | < 5 ms per employee                 |
| Audit entries on import                                    | One batched `INSERT` per 1,000 rows in the same transaction                                                | Import commit < 1.2 s for 9.7k rows |
| Idempotency check                                          | One unique-index lookup before the transaction                                                             | < 2 ms                              |
| Login rate limit                                           | One upsert on `login_attempts` per failed login                                                            | < 5 ms                              |
| Ask Paywise                                                | Rule-based parse (< 1 ms) + one predefined aggregate query (same SQL as insights)                          | < 30 ms                             |
| Per-currency aggregates                                    | `GROUP BY …, salary_currency`; same indexes                                                                | Unchanged (2–8 ms)                  |

**Transaction boundaries and locking:** see `DESIGN.md` §8. Bulk writes lock employees in id order (no deadlocks between two raise plans or imports); a single salary change locks one row.

**Request limits:** page size ≤ 100, import ≤ 10,000 rows and 4.4 MB, Ask question ≤ 300 characters, JSON bodies only for writes.

## At 10× or 100× scale

- **About 100k employees**: still comfortable. The `count(*)` for paging is the first thing to cost; switch to an estimate or keyset pagination for deep pages.
- **About 1M employees, or many concurrent HR users**: precompute insights (materialized views refreshed after writes or imports), keyset pagination, and an import that streams in chunks through a background job instead of one request.
- **Name search across 1M**: the trigram index already covers `ILIKE` on names; add trigram indexes on email and code if that search becomes common.
