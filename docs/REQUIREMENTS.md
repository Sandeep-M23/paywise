# Paywise: Requirements

**Persona:** HR Manager of a 10,000-employee organisation spread across countries.
**Today:** salaries live in Excel files. They are error-prone, have no history, can't answer questions quickly, and are hard to share safely.
**Evidence:** problem numbers (#) refer to [`RESEARCH.md` §3](RESEARCH.md#3-real-hr-problems).

## Goal

Give the HR manager **one trustworthy place** to maintain salary data and to **answer "how do we pay people?"** in a few clicks, without exporting to Excel.

**Success looks like:**

- She can move her Excel data in without losing, duplicating or corrupting it.
- Any salary change is traceable: who it affected, from when, why, and who made it.
- She can schedule next quarter's changes without the current salary changing early.
- She can answer the common pay questions per country (typical pay, spread, potential disparities, cost of a raise) in under a minute, in each pay currency.

## In Scope

### P0: must ship

| Feature                         | What the HR manager can do                                                                                                                                                                                                                                                                                              | Why (#)   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Employee directory**          | Search 10k people by name, email or code; filter by one or several countries, job titles and departments, and by status; sort (by employee code by default). Views are shareable by URL.                                                                                                                                | Core need |
| **Add / edit / deactivate**     | Maintain records with validation (required fields, unique code and email). Deactivating keeps the history and cancels scheduled changes.                                                                                                                                                                                | #1, #2    |
| **Salary changes with history** | Record a change with an effective date in the **past, today or future** and a reason. Future changes show as **scheduled** and don't alter the current salary until their date. Mistakes are fixed with a **correction** entry, never by editing history. Only one change per person per date.                          | #2, #12   |
| **Country and pay currency**    | Country is where someone works; currency is what they're paid in. The currency defaults from the country and can be overridden (e.g. a USD contract in Singapore). JPY (no decimals) and BHD/KWD (three decimals) are handled exactly.                                                                                  | #1        |
| **Import from CSV**             | Template → upload → match columns → **preview every row before saving** → confirm. Invalid rows are listed with the exact reason and **not imported**; all valid rows are saved together or not at all. Submitting twice (double click, retry) never imports twice. Each import records who ran it and what it changed. | #9, #1    |
| **Export to CSV**               | Download any filtered view so it opens cleanly in Excel and can be edited and imported back.                                                                                                                                                                                                                            | #2, #11   |
| **Pay insights**                | Per country and pay currency: headcount, total, min / median / average / max; per job title and department; salary distribution. Medians match Excel's `PERCENTILE.INC`. Nothing is added across currencies.                                                                                                            | #11, #12  |
| **Audit trail**                 | Every employee change, salary change, raise plan and import is logged (who, what, when) separately from salary history, and can't be edited through the app.                                                                                                                                                            | #8, #12   |
| **Sign-in and protection**      | A single HR login, rate-limited, with signed, expiring access tokens (JWT, sent as a Bearer header, so cross-site requests can't borrow the session).                                                                                                                                                                   | #8        |
| **Seed data**                   | 10,000 realistic, reproducible employees with known patterns for the features to surface.                                                                                                                                                                                                                               | Brief     |

### P1: differentiators

| Feature                   | What the HR manager can do                                                                                                                                                                                                                                                                                                | Why (#)     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Pay fairness analysis** | See **salary outliers** (far from peers in the same country and job title) and **gender-based compensation differences** with sample sizes; differences at or above a configurable threshold (default 5%) are flagged as a **potential pay disparity**. Small groups are hidden. Clear wording: indicators, not findings. | #4, #5, #10 |
| **Raise planner**         | "What does X% for this group cost?" plus custom raises for individual people, per currency; apply the plan as salary changes in one all-or-nothing step, now or from a future date.                                                                                                                                       | #6, #11     |
| **Ask Paywise**           | Ask questions in plain language ("What is the median salary for engineers in the US?") and get a number, table or chart, with the interpretation shown. Unsupported questions get a clear explanation and examples.                                                                                                       | #11         |

### P2: stretch

Undo an import (if nothing changed since), a pay compression view (new hires vs. tenured staff), advanced analytics (bands per level, trends over time), an audit log viewer.

**Money rule:** salaries are stored as whole numbers in each currency's smallest unit (the Stripe approach) and always stay in their own currency.

## Deliberately Left Out

| Not built                                       | Why                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payroll, tax, net pay, payslips                 | A different product (country tax engines, compliance). The brief is about _managing_ and _understanding_ pay.                                                               |
| Currency conversion / one-currency org totals   | Needs a rate source and an explicit policy (which rate, which date) and goes stale. Every figure stays in its own currency; adding dated rates later needs no migration.    |
| Pay ranges and compa-ratio                      | HR must define the ranges first. **First item for v2.**                                                                                                                     |
| Multiple users, roles, approvals, SSO           | One persona. The code has an authorization seam so roles can be added in one place.                                                                                         |
| Bonus, equity, benefits                         | Base salary answers the core questions; total rewards needs product decisions we don't have.                                                                                |
| `.xlsx` upload                                  | Excel saves CSV (UTF-8) natively; avoids a heavy parser dependency.                                                                                                         |
| **Relocation** (changing an employee's country) | Means a new default currency, possibly a new peer group, and a pay decision. **v2 workflow:** country change plus an optional currency-change revision in one audited step. |
| Free-form "ask anything" with generated SQL     | Unsafe and unpredictable over salary data. Ask Paywise maps questions to a fixed set of validated query types.                                                              |
| Legal compliance assessments                    | Fairness figures are statistical indicators; they don't account for level, performance or tenure and aren't legal advice.                                                   |
| Mobile layout, i18n, multi-tenant               | Desktop internal tool for one organisation.                                                                                                                                 |

## Constraints & Assumptions

- About 10,000 employees, 8 countries, one HR user. Imports of up to 10,000 rows per file.
- "Today" is the organisation's date in UTC; scheduled changes take effect from that date.
- "Comparable job title" means the same job title; there is no levelling data.
- Gender is recorded only to compute aggregate differences. It is never shown in lists or exports.
- Deployed on Vercel with managed PostgreSQL; every environment uses synthetic data only.
