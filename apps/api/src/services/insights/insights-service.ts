import {
  COUNTRIES,
  currencyForCountry,
  type CountryCode,
  type CountrySummary,
  type DepartmentSummary,
  type Distribution,
  type DistributionBucket,
  type FilterOptions,
  type JobTitleSummary,
} from "@paywise/shared";
import { select, type Db } from "../../config/db";

const toInt = (value: unknown) => Math.round(Number(value));

const STATS = `count(*) AS headcount, sum(salary_amount) AS total,
  min(salary_amount) AS min, max(salary_amount) AS max, avg(salary_amount) AS mean,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_amount) AS median`;

type StatsRow = {
  headcount: number;
  total: string;
  min: number;
  max: number;
  mean: string;
  median: number;
};

const toStats = (r: StatsRow) => ({
  headcount: Number(r.headcount),
  total: toInt(r.total),
  min: toInt(r.min),
  max: toInt(r.max),
  mean: toInt(r.mean),
  median: toInt(r.median),
});

const ACTIVE_IN = "status = 'active' AND country_code = :country";

export function createInsightsService({ db }: { db: Db }) {
  return {
    async filterOptions(): Promise<FilterOptions> {
      const [titles, departments] = await Promise.all([
        select<{ value: string }>(
          db,
          "SELECT DISTINCT job_title AS value FROM employees ORDER BY job_title",
        ),
        select<{ value: string }>(
          db,
          "SELECT DISTINCT department AS value FROM employees ORDER BY department",
        ),
      ]);
      return {
        countries: COUNTRIES.map(({ code, name, currency }) => ({ code, name, currency })),
        jobTitles: titles.map((r) => r.value),
        departments: departments.map((r) => r.value),
      };
    },

    async countrySummaries(): Promise<CountrySummary[]> {
      const rows = await select<StatsRow & { country_code: string; currency: string }>(
        db,
        `SELECT country_code, salary_currency AS currency, ${STATS}
         FROM employees WHERE status = 'active'
         GROUP BY country_code, salary_currency
         ORDER BY country_code`,
      );
      return rows.map((r) => ({
        countryCode: r.country_code,
        currency: r.currency,
        ...toStats(r),
      }));
    },

    async jobTitles(country: CountryCode): Promise<JobTitleSummary[]> {
      const rows = await select<StatsRow & { job_title: string }>(
        db,
        `SELECT job_title, ${STATS} FROM employees WHERE ${ACTIVE_IN}
         GROUP BY job_title ORDER BY job_title`,
        { country },
      );
      return rows.map((r) => {
        const { total: _total, ...stats } = toStats(r);
        return { jobTitle: r.job_title, ...stats };
      });
    },

    async departments(country: CountryCode): Promise<DepartmentSummary[]> {
      const rows = await select<StatsRow & { department: string }>(
        db,
        `SELECT department, ${STATS} FROM employees WHERE ${ACTIVE_IN}
         GROUP BY department ORDER BY department`,
        { country },
      );
      return rows.map((r) => {
        const { headcount, total, mean, median } = toStats(r);
        return { department: r.department, headcount, total, mean, median };
      });
    },

    async distribution(country: CountryCode, bucketCount: number): Promise<Distribution> {
      const currency = currencyForCountry(country);
      const [range] = await select<{ low: number | null; high: number | null }>(
        db,
        `SELECT min(salary_amount) AS low, max(salary_amount) AS high FROM employees WHERE ${ACTIVE_IN}`,
        { country },
      );
      if (range?.low == null || range.high == null) return { currency, buckets: [] };

      const low = Number(range.low);
      const span = Number(range.high) - low + 1;
      const width = Math.ceil(span / bucketCount);
      const buckets: DistributionBucket[] = Array.from(
        { length: Math.ceil(span / width) },
        (_, i) => ({
          from: low + i * width,
          to: low + (i + 1) * width,
          count: 0,
        }),
      );

      const counts = await select<{ index: number; count: number }>(
        db,
        `SELECT floor((salary_amount - :low) / :width)::int AS index, count(*) AS count
         FROM employees WHERE ${ACTIVE_IN} GROUP BY 1`,
        { country, low, width },
      );
      for (const row of counts) buckets[Number(row.index)]!.count = Number(row.count);

      return { currency, buckets };
    },
  };
}

export type InsightsService = ReturnType<typeof createInsightsService>;
