# Paywise: Requirements

**Persona:** HR Manager of a 10,000-employee organisation spread across countries.
**Today:** salaries live in Excel files. They are error-prone, have no history, can't answer questions quickly, and are hard to share safely.
**Evidence:** problem numbers (#) refer to [`RESEARCH.md` §3](RESEARCH.md#3-real-hr-problems).

## Goal

Give the HR manager **one trustworthy place** to maintain salary data and to **answer "how do we pay people?"** in a few clicks, without exporting to Excel.

**Success looks like:**

- She can move her Excel data in without losing or corrupting it.
- Any salary change is traceable: who it affected, when, and why.
- She can answer the common pay questions per country (typical pay, spread, fairness, cost of a raise) in under a minute.

## In Scope

| Feature                         | What the HR manager can do                                                                                                                                                                                                          | Why (#)     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Employee directory**          | Search 10k people by name, email or code; filter by country, job title, department and status; sort; page through results. Views are shareable by URL.                                                                              | Core need   |
| **Add / edit / deactivate**     | Maintain records with validation (required fields, unique code and email, currency follows country). Deactivating keeps the history.                                                                                                | #1, #2      |
| **Salary changes with history** | Change a salary as its own action with an effective date and a reason (merit, promotion, market, correction). Every change is kept: old → new, when, why, and source.                                                               | #2, #12     |
| **Import from CSV**             | Download a template, upload her file, match columns, **preview every row before saving** (new / updated / unchanged / error with the exact reason), download the errors, then confirm. Valid rows are saved together or not at all. | #9, #1      |
| **Export to CSV**               | Download any filtered view so it opens cleanly in Excel and can be edited and imported back.                                                                                                                                        | #2, #11     |
| **Pay insights**                | Per country: headcount, total, min / median / average / max. Per job title and department within a country. Salary distribution. Medians match Excel's `PERCENTILE.INC`.                                                            | #11, #12    |
| **Pay fairness check**          | See people paid unusually far from peers in the same role and country, and gender pay gaps of 5% or more per role and country (small groups hidden).                                                                                | #4, #5, #10 |
| **Raise cost calculator**       | "What does X% for this group cost?", per currency, without changing any data.                                                                                                                                                       | #6, #11     |
| **Sign-in**                     | A single HR login protects salary data.                                                                                                                                                                                             | #8          |
| **Seed data**                   | 10,000 realistic, reproducible employees with known patterns for the features to surface.                                                                                                                                           | Brief       |

**Money rule:** salaries are stored as whole numbers in each currency's smallest unit (the Stripe approach) and always stay in local currency.

## Deliberately Left Out

| Not built                                     | Why                                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Payroll, tax, net pay, payslips               | A different product (country tax engines, compliance). The brief is about _managing_ and _understanding_ pay.                                |
| Currency conversion / one-currency org totals | Needs a live rate source and goes stale; HR compares pay within a country. Data already stores currency per row, so this can be added later. |
| Pay ranges and compa-ratio                    | HR must define the ranges first. **First item for v2.** The fairness check covers the immediate need.                                        |
| Multiple users, roles, approvals, SSO         | One persona. A single sign-in covers confidentiality for now.                                                                                |
| Bonus, equity, benefits                       | Base salary answers the core questions; total rewards needs product decisions we don't have.                                                 |
| `.xlsx` upload                                | Excel saves CSV (UTF-8) natively; avoids a heavy parser dependency.                                                                          |
| Relocation (changing an employee's country)   | Means re-pricing in a new currency, a policy decision for HR. v2.                                                                            |
| Mobile layout, i18n, multi-tenant             | Desktop internal tool for one organisation.                                                                                                  |

## Constraints & Assumptions

- About 10,000 employees, 8 countries, one HR user. Imports of up to 10,000 rows per file.
- Gender is recorded only to compute aggregate gaps. It is never shown in lists or exports.
- Deployed on Vercel with managed PostgreSQL; the demo uses synthetic data only.
