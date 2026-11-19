import { and, eq, sql, type SQL } from "drizzle-orm";
import type {
  FairnessQuery,
  GenderGapGroup,
  PayOutlier,
  RaiseCost,
  RaiseCostRequest,
} from "@paywise/shared";
import type { Db } from "../../config/db";
import { employees } from "../../models";
import { raisePlanCost } from "../employees/employees-repository";

/*
 * Fairness checks compare like with like: full-time employees in the same job
 * title and country (same currency, same market, same hours). Part-time pay
 * isn't comparable without hours worked, which we don't record. Definitions
 * are in docs/DESIGN.md §5.
 */

const MIN_PEERS_FOR_OUTLIERS = 5;
// A gender group smaller than this is not reported: with so few people the
// averages would effectively disclose individual salaries.
const MIN_GROUP_SIZE = 5;
// EU Pay Transparency Directive: an unexplained gap of 5% or more triggers a
// joint pay assessment.
const GAP_THRESHOLD = 0.05;
// |t| of a Welch t-test at ~95% confidence: the gap is unlikely to be chance.
const SIGNIFICANT_T = 1.96;

const num = (value: unknown) => Number(value);

const comparableWhere = (filters: Filters): SQL =>
  and(activeWhere(filters), eq(employees.employmentType, "full_time"))!;

type Filters = { country?: string; jobTitle?: string; department?: string };

function activeWhere(filters: Filters): SQL {
  return and(
    eq(employees.status, "active"),
    filters.country ? eq(employees.countryCode, filters.country) : undefined,
    filters.jobTitle ? eq(employees.jobTitle, filters.jobTitle) : undefined,
    filters.department ? eq(employees.department, filters.department) : undefined,
  )!;
}

export function createFairnessService({ db }: { db: Db }) {
  return {
    /** People paid outside Tukey's fences (1.5 x IQR) of their peer group. */
    async outliers(filters: FairnessQuery): Promise<PayOutlier[]> {
      const { rows } = await db.execute(sql`
        WITH peers AS (
          SELECT country_code, job_title, count(*) AS n,
                 percentile_cont(0.25) WITHIN GROUP (ORDER BY salary_amount) AS q1,
                 percentile_cont(0.5)  WITHIN GROUP (ORDER BY salary_amount) AS median,
                 percentile_cont(0.75) WITHIN GROUP (ORDER BY salary_amount) AS q3
          FROM ${employees}
          WHERE ${comparableWhere(filters)}
          GROUP BY country_code, job_title
          HAVING count(*) >= ${MIN_PEERS_FOR_OUTLIERS}
        ), fenced AS (
          SELECT *, q1 - 1.5 * (q3 - q1) AS lower_fence, q3 + 1.5 * (q3 - q1) AS upper_fence
          FROM peers
        )
        SELECT e.id, e.employee_code, e.full_name, e.country_code, e.job_title, e.department,
               e.salary_amount, e.salary_currency, f.n, f.median, f.lower_fence, f.upper_fence
        FROM ${employees} e
        JOIN fenced f ON f.country_code = e.country_code AND f.job_title = e.job_title
        WHERE e.status = 'active' AND e.employment_type = 'full_time'
          AND (e.salary_amount < f.lower_fence OR e.salary_amount > f.upper_fence)
        ORDER BY abs(e.salary_amount - f.median) / f.median DESC, e.employee_code
        LIMIT 500
      `);

      return rows.map((r) => {
        const amount = num(r.salary_amount);
        const median = num(r.median);
        return {
          id: String(r.id),
          employeeCode: String(r.employee_code),
          fullName: String(r.full_name),
          countryCode: String(r.country_code),
          jobTitle: String(r.job_title),
          department: String(r.department),
          salary: { amount, currency: String(r.salary_currency) },
          peerCount: num(r.n),
          peerMedian: Math.round(median),
          lowerFence: Math.round(num(r.lower_fence)),
          upperFence: Math.round(num(r.upper_fence)),
          direction: amount > median ? "above" : "below",
          deviation: Math.abs(amount - median) / median,
        };
      });
    },

    /**
     * Mean and median pay of women vs. men per job title and country. The gap
     * is (male - female) / male, so a positive gap means women are paid less.
     * "flagged" is the legal 5% trigger; "significant" says whether the gap is
     * larger than chance would explain in a group this size, so HR can tell
     * systematic gaps from noise in small teams.
     */
    async genderGaps(filters: FairnessQuery): Promise<GenderGapGroup[]> {
      const { rows } = await db.execute(sql`
        SELECT country_code, job_title, salary_currency,
          count(*) FILTER (WHERE gender = 'female') AS female_count,
          count(*) FILTER (WHERE gender = 'male')   AS male_count,
          avg(salary_amount) FILTER (WHERE gender = 'female') AS female_mean,
          avg(salary_amount) FILTER (WHERE gender = 'male')   AS male_mean,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_amount)
            FILTER (WHERE gender = 'female') AS female_median,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_amount)
            FILTER (WHERE gender = 'male') AS male_median,
          stddev_samp(salary_amount) FILTER (WHERE gender = 'female') AS female_sd,
          stddev_samp(salary_amount) FILTER (WHERE gender = 'male') AS male_sd
        FROM ${employees}
        WHERE ${comparableWhere(filters)} AND gender IN ('female', 'male')
        GROUP BY country_code, job_title, salary_currency
      `);

      const groups = rows.map((r): GenderGapGroup => {
        const femaleCount = num(r.female_count);
        const maleCount = num(r.male_count);
        const base = {
          countryCode: String(r.country_code),
          jobTitle: String(r.job_title),
          currency: String(r.salary_currency),
          femaleCount,
          maleCount,
        };
        if (femaleCount < MIN_GROUP_SIZE || maleCount < MIN_GROUP_SIZE) {
          return {
            ...base,
            femaleMean: null,
            maleMean: null,
            femaleMedian: null,
            maleMedian: null,
            meanGap: null,
            medianGap: null,
            flagged: false,
            significant: false,
            suppressed: true,
          };
        }
        const femaleMean = num(r.female_mean);
        const maleMean = num(r.male_mean);
        const femaleMedian = num(r.female_median);
        const maleMedian = num(r.male_median);
        const meanGap = (maleMean - femaleMean) / maleMean;
        const medianGap = (maleMedian - femaleMedian) / maleMedian;
        const standardError = Math.sqrt(
          num(r.female_sd) ** 2 / femaleCount + num(r.male_sd) ** 2 / maleCount,
        );
        const significant =
          standardError === 0
            ? maleMean !== femaleMean
            : Math.abs(maleMean - femaleMean) / standardError >= SIGNIFICANT_T;
        return {
          ...base,
          femaleMean: Math.round(femaleMean),
          maleMean: Math.round(maleMean),
          femaleMedian: Math.round(femaleMedian),
          maleMedian: Math.round(maleMedian),
          meanGap,
          medianGap,
          // The Directive's trigger is the gap in average pay; the median is context.
          flagged: Math.abs(meanGap) >= GAP_THRESHOLD,
          significant,
          suppressed: false,
        };
      });

      // Flagged and statistically significant first: those most need attention.
      const rank = (g: GenderGapGroup) =>
        g.suppressed ? 3 : g.flagged && g.significant ? 0 : g.flagged ? 1 : 2;
      return groups.sort(
        (a, b) =>
          rank(a) - rank(b) ||
          Math.abs(b.meanGap ?? 0) - Math.abs(a.meanGap ?? 0) ||
          a.countryCode.localeCompare(b.countryCode) ||
          a.jobTitle.localeCompare(b.jobTitle),
      );
    },

    /**
     * What-if: the cost of a raise plan (a group raise and/or individual raises),
     * per currency. Read-only.
     */
    async raiseCost(plan: RaiseCostRequest): Promise<RaiseCost[]> {
      const rows = await raisePlanCost(db, plan);
      return rows.map((r) => ({
        currency: String(r.currency),
        headcount: num(r.headcount),
        currentTotal: num(r.current_total),
        increase: num(r.increase),
        newTotal: num(r.current_total) + num(r.increase),
      }));
    },
  };
}

export type FairnessService = ReturnType<typeof createFairnessService>;
