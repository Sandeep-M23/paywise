# Research: What to Build and Why

> **Date:** 2026-11-17
> **Purpose:** before writing requirements, understand (1) what other candidates built for this same assessment, (2) the real problems HR teams have with salary data, and (3) how to build a CSV import HR can trust. Every feature in [`REQUIREMENTS.md`](REQUIREMENTS.md) traces back to a finding here.
> **Method:** GitHub repository search (public API), reading 15 submission READMEs and source files, and web research on HR/compensation industry surveys, pay transparency law, data-migration guides and CSV import UX/security. Sources are listed at the end.

---

## 1. Summary

- **About 125–230 public repos** exist for this assessment. Almost all build the same baseline: list, search, CRUD, averages, seed. The baseline doesn't differentiate.
- **No public data shows which submissions were selected.** We don't guess; we study what the strongest-looking ones do differently.
- HR's real problems are **trust and change**: spreadsheet errors, no audit trail, unfair pay they can't see, cost questions from finance, and the painful **move off Excel**.
- So our product bets are:
  1. **Import from Excel/CSV**, done safely (preview, column mapping, row-level errors, all-or-nothing commit)
  2. **Salary history** (every change has a date, a reason and a source)
  3. **Pay fairness check** (outliers vs. peers, gender gap ≥ 5% per role and country)
  4. **Raise cost calculator**
  5. **Excel-safe CSV export** that can be imported back

---

## 2. Competitor Landscape (other submissions)

### 2.1 How many
| Search | Results |
|---|---|
| `incubyte salary` | 149 repos |
| `salary management incubyte` | 126 repos |
| `incubyte` in README + `salary` | ~233 repos |

Most were created between Aug and Nov 2026, and new ones appear daily. Many more never mention Incubyte (e.g. `acme-salary-management`), so the real number is higher.
Stacks: Java/Spring + Angular, Node/TS + React/Next.js, Rails, FastAPI/Django.

### 2.2 Selection outcomes
Not publicly available. No README mentions an outcome, and Incubyte doesn't publish results. Glassdoor rates the Software Developer interview **2.8/5 (about 60% positive)**, with several "No offer" reports. After the take-home there is a **1-hour technical round with 2 interviewers discussing the submission**, so **every decision must be explainable by the candidate.**

### 2.3 What almost everyone built (the baseline)
- An employee directory with search, filters, sorting and server-side pagination
- Create / edit / delete
- Min / max / average by country, job title and department
- A deterministic seed of 10,000 employees
- `docs/` with requirements, architecture, trade-offs and AI prompts

### 2.4 What is now common (close to expected)
- Salary history (append-only revisions with a reason)
- Median shown next to average
- Money as integer minor units; currency derived from country
- Filters kept in the URL
- CSV export

### 2.5 What the strongest submissions add
| Repo | Notable |
|---|---|
| samrocks03/acme-salary-management | Append-only revisions with a row lock in a transaction; written domain rules, each covered by a spec; `percentile_cont` medians with a cache keyed by data version; a test that fails on N+1 queries; CI with a security scanner; a sharp "left out and why" table; `.claude/` agent instructions committed |
| Furqan-Bunny/salary-management | Pay bands, compa-ratio, a gender pay gap flagged at 5% with small groups suppressed, pay compression, optimistic locking, a `RESEARCH.md` on real compensation tools, and seed data with patterns planted on purpose |
| dixitshishir/salary-management | Pay outliers, a raise planner, CSV import/export round trip |
| pruthvirajjadhav1 / BijuDey | Statistics that match Excel's `PERCENTILE.INC`, so HR's numbers reconcile |
| SwapnilRaj1708/Salary-Management | Node/TS on Vercel; test-first commit pairs; measured performance published |
| VNT1998/acme-salary-management | Measured timings in the README (list ~1.4 ms, seed 0.16 s) |

### 2.6 Weak patterns to avoid
- "Enterprise" dashboards with invented features (cost-of-living indices, inflated KPIs) and no user need behind them
- Emoji-heavy, very long READMEs
- Docs linking to local `file:///D:/...` paths
- No live link or demo video

### 2.7 CSV import in other submissions
Only **2 of the 15** READMEs reviewed include import:
| Repo | Approach | Gap |
|---|---|---|
| KaushikRishabh | Fixed column order, create-only, one bad row rejects the whole file | No preview, no mapping, unforgiving |
| dixitshishir | Upsert by employee code, bad rows skipped and reported per line, export round trip | **Saves immediately (no preview)**, no column mapping, no undo |

**Opening for us:** preview before save, column mapping, a downloadable error report, and import provenance in salary history.

---

## 3. Real HR Problems

| # | Problem | Evidence | Our response |
|---|---|---|---|
| 1 | **Spreadsheets contain errors nobody notices**: typos, broken formulas, scrambled sorts | Studies report 94% of business spreadsheets contain critical errors; in Ventana Research's study 83% of companies had paycheck errors after compensation spreadsheets went to payroll; ~44% of HR leaders still plan pay in spreadsheets | Validation at every entry point; integer money; one shared schema |
| 2 | **No single version of the truth, no audit trail**: "Salary_FINAL_v3.xlsx", nobody knows who changed what or why | Version-control and governance risk is the top complaint in compensation-software research | One database; **salary history** (old → new, effective date, reason, source) |
| 3 | **Pay compression**: new hires earn more than loyal staff | US merit budgets ~3.6% (2026) while offers rise faster; long-tenured staff are among the most affected | Stretch: new-hire vs. tenured comparison per role and country |
| 4 | **Fair pay is becoming law (EU)** | EU Pay Transparency Directive: employers with 250+ staff report by **7 June 2027**; an unexplained gap of **≥ 5%** in a worker category means a mandatory joint pay assessment; only ~19% of companies feel ready | **Gender gap per job title and country, flagged at 5%**, small groups suppressed |
| 5 | **Can't see who is under- or overpaid vs. peers** | Compa-ratio and pay-equity analysis are standard HR metrics | **Outlier check** within role + country (IQR rule) |
| 6 | **Raise season takes days of manual work** | 2–3 days of spreadsheet work vs. minutes in a tool | **Raise cost calculator** (what-if, read-only) |
| 7 | **Multiple countries and currencies** | Mixed-currency totals mean nothing | Local currency per row; per-country statistics; no FX (scoped out) |
| 8 | **Salary data is confidential** | Spreadsheets are forwarded and over-shared | Simple single-user login; full roles scoped out |
| 9 | **Moving off Excel brings the mess along**: duplicates, missing values, inconsistent names | Migration guides: "clean before you import; bad data imported becomes permanent"; cleaning effort is routinely underestimated | **Safe CSV import**: preview, mapping, row errors, duplicate detection |
| 10 | **Pay laws spreading in the US too** | 18 states + DC with pay transparency laws (ranges in job ads, ranges on request, equity reporting) | Fairness reporting; pay ranges noted as v2 |
| 11 | **Finance wants cost answers, not just headcount** | Finance expects cost projections and scenario models from HR | Totals per country / department; raise calculator |
| 12 | **One HR manager, 10,000 people: confidence is the product** | Inferred from #1, #2 and #9 | Numbers that reconcile with Excel (`percentile_cont` = `PERCENTILE.INC`), visible history, nothing silently overwritten |

---

## 4. CSV Import Research

### 4.1 The standard flow
**Upload → map columns → validate (preview) → confirm.** Errors are caught *before* anything is saved and shown per row and column with a fix suggestion. Imports should be **predictable, visible and reversible.**

### 4.2 HR-from-Excel pitfalls
| Pitfall | Example | Handling |
|---|---|---|
| Indian digit grouping / symbols | `₹12,00,000.00` | Strip symbols and grouping commas; parse as a string into minor units |
| Ambiguous dates | `01/04/2024` | Accept ISO `YYYY-MM-DD` only; clear error otherwise; the template shows the format |
| European decimal comma | `12.000,50` | Reject with a message (ambiguous) |
| Encoding | "José" becomes `JosÃ©` | Strip the UTF-8 BOM on read; **write a BOM on export** so Excel reads UTF-8 |
| Duplicates | Same code or email twice | Flag duplicates within the file and against the DB |
| Whitespace / casing | `" john SMITH "` | Trim; normalise email case |
| Currency mismatch | IN row with `usd` | Currency derived from country; mismatch is an error |
| Header variations | "Emp Name", "Employee Name" | Auto-mapping via a synonym dictionary; user can override |

### 4.3 Security: CSV / formula injection (OWASP, CWE-1236)
Cells starting with `=`, `+`, `-`, `@`, tab or CR can execute as formulas when opened in Excel. **On export, prefix such cells with `'`.** On import, the values are stored as plain text and never evaluated.

### 4.4 Platform limit
Vercel Functions accept a **4.5 MB maximum request body**. 10,000 rows of JSON is ~2–3 MB, so we cap imports at **10,000 rows** and show a clear message beyond that.

---

## 5. Decisions This Research Drives

1. Build the baseline well, then **five researched additions**: import, export, history, fairness, raise calculator. Depth over breadth.
2. Add **`employee_code`** as the stable identity used for import matching (emails change).
3. Removing an employee **deactivates** them (soft delete) so salary history survives (#2).
4. Medians via `percentile_cont`, matching Excel `PERCENTILE.INC` (#12).
5. Seed data **plants known patterns** (a few outliers, one gender gap, some compression) so the features have something real to find in the demo, and documents them.
6. Every feature in the requirements doc cites its problem number from §3.

---

## Sources

**Competitor repos**
- https://github.com/samrocks03/acme-salary-management
- https://github.com/Furqan-Bunny/salary-management
- https://github.com/dixitshishir/salary-management
- https://github.com/pruthvirajjadhav1/salary-management
- https://github.com/BijuDey/salary-management
- https://github.com/SwapnilRaj1708/Salary-Management
- https://github.com/VNT1998/acme-salary-management
- https://github.com/KaushikRishabh/incubyte-salary-management
- https://github.com/its-debojyoti-dey/incubyte-salary-management
- https://github.com/soumyapokale/incubyte-salary-management

**Hiring process**
- https://www.glassdoor.co.in/Interview/Incubyte-Software-Developer-Interview-Questions-EI_IE3844202.0,8_KO9,27.htm
- https://leetcode.com/discuss/interview-experience/7353955

**HR / compensation problems**
- https://www.decusoft.com/scared-sheetless/
- https://www.decusoft.com/?p=20732
- https://www.complogix.io/blog/the-most-common-mistakes-that-result-from-spreadsheet-errors/
- https://www.salary.com/blog/the-risks-associated-with-employing-spreadsheets-in-compensation-management
- https://www.compport.com/blog/compensation-management-software-vs-spreadsheets
- https://www.compport.com/blog/challenges-in-compensation-management-and-how-to-overcome-them
- https://4spotconsulting.com/?p=47909
- https://hrreview.co.uk/hr-news/50-of-companies-committed-payroll-errors-during-the-last-five-years
- https://laboriq.co/insights/pay-compression-employee-pay-visibility/
- https://www.jobspikr.com/blog/compensation-intelligence-report-pay-strategy-2026/
- https://www.payscale.com/content/report/2026-compensation-best-practice-report.pdf
- https://www.aihr.com/blog/compensation-analysis/
- https://www.crunchr.com/resources/blog/getting-started-with-compensation-analysis/
- https://www.bamboohr.com/resources/guides/compensation-analytics-strategy

**Pay transparency law**
- https://www.debevoise.com/insights/publications/2025/12/the-eu-pay-transparency-directive-what-it-means
- https://www.morganlewis.com/pubs/2026/06/eu-pay-transparency-directive-the-deadline-for-transposition-has-passed-what-now
- https://www.lewissilkin.com/en/insights/2026/07/01/eu-pay-transparency-directive-2026-employer-compliance
- https://assessio.com/articles/eu-pay-transparency-directive-guide/
- https://www-j.rippling.com/blog/pay-transparency-laws-state-by-state-guide
- https://www.cooley.com/news/insight/2026/2026-07-06-show-me-the-money-or-the-wage-range-new-state-pay-transparency-laws

**Data migration and CSV import**
- https://www.outsail.co/post/the-complete-guide-to-hris-data-migration
- https://www.personio.com/hr-lexicon/hr-data-migration/
- https://www.omnihr.co/faqs/how-do-i-move-from-excel-or-google-sheets-to-an-hr-system-without-messing-up-payroll-or-employee-data
- https://www.deel.com/blog/hris-data-migration/
- https://4spotconsulting.com/?p=47856
- https://dromo.io/blog/5-best-practices-to-streamline-your-csv-import-process
- https://dromo.io/blog/common-data-import-errors-and-how-to-fix-them
- https://blog.csvbox.io/spreadsheet-import-ux/
- https://blog.csvbox.io/row-level-errors-csv/
- https://blog.csvbox.io/csv-preview-before-save/
- https://www.saasui.design/blog/saas-data-import-mapping-ux-patterns
- https://mfyz.com/designing-scalable-csv-importers-what-a-good-importer-should-do/
- https://owasp.org/www-community/attacks/CSV_Injection
- https://donatstudios.com/CSV-An-Encoding-Nightmare
- https://vercel.com/docs/functions/limitations
