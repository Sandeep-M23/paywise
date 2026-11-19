# Seed Data

`npm run db:seed -w @paywise/api` replaces all data with **10,000 synthetic employees** of a fictional company, ACME.

## Reproducible

Generation is a pure function, `generateEmployees({ count, seed, today })` in `apps/api/src/scripts/seed/generate.ts`. The runner fixes `seed = 42` and the reference date `2026-11-15`, so every run produces identical people, salaries and histories. Measured locally: generation ~60 ms, insert ~1 s (batches of 1,000 in one transaction).

## Shape

| Aspect     | How it's generated                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Countries  | US 25%, IN 30%, GB 10%, DE 10%, CA 7%, JP 7%, AU 6%, SG 5%                                                                                                                                                    |
| Roles      | 20 job titles in 10 departments; engineering and support roles most common                                                                                                                                    |
| Salary     | Role's US median × local market factor (e.g. ×25 for INR, ×95 for JPY) × random spread (±12%, a typical in-role range) × small tenure premium, rounded to a nice number (₹10,000 / ¥10,000 / 1,000 elsewhere) |
| Part-time  | 60% of the full-time rate                                                                                                                                                                                     |
| Hire dates | 2012 to one month before the reference date, skewed towards recent years                                                                                                                                      |
| History    | ~33% of people with 1+ year of tenure get 1–3 raises (4–12% each; merit, promotion or market adjustment)                                                                                                      |
| Inactive   | ~3% are deactivated ("Resigned")                                                                                                                                                                              |
| Gender     | 42% female, 54% male, 2% non-binary, 2% undisclosed                                                                                                                                                           |
| Names      | Locale-appropriate (Indian, German, English; romanised Japanese so emails stay ASCII)                                                                                                                         |

## Planted patterns (so features have something real to find)

| Pattern                                                                          | Where                         | Feature that should surface it                |
| -------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| ~8% gender pay gap (women paid 0.92×)                                            | Software Engineers in Germany | Fairness: gender gap ≥ 5% flag                |
| Pay compression: hires from the last 18 months paid ~18% more than tenured peers | Software Engineers in India   | Compression view (stretch) / job-title spread |
| ~0.5% paid 2.2× and ~0.5% paid 0.45× their market rate                           | Random, all countries         | Fairness: outliers (IQR)                      |

### Planned additions (revision 2)

| Pattern                                                              | Where            | Feature that should surface it                   |
| -------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| ~1% paid in a currency other than their country's default (e.g. USD) | Singapore and UK | Currency override; per-currency rows in insights |
| ~2% with a scheduled raise effective in the next 1–6 months          | All countries    | Scheduled revisions; current salary unchanged    |
| A handful of same-date corrections in history                        | Random           | Corrections shown struck through in history      |

Three-decimal currencies (BHD, KWD) aren't seeded (no seeded country uses them); they're covered by unit tests. The seed writes no audit entries: it's a data load, not user activity, and the runner truncates everything first.

Tests in `apps/api/test/seed.generate.test.ts` assert these patterns exist, so a change to the generator can't silently remove them.
