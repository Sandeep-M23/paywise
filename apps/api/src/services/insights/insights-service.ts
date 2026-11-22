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
import type { Db } from "../../config/db";
import * as repo from "./insights-repository";

const toInt = (value: unknown) => Math.round(Number(value));

const toStats = (r: repo.StatsRow) => ({
  headcount: Number(r.headcount),
  total: toInt(r.total),
  min: toInt(r.min),
  max: toInt(r.max),
  mean: toInt(r.mean),
  median: toInt(r.median),
});

export function createInsightsService({ db }: { db: Db }) {
  return {
    async filterOptions(): Promise<FilterOptions> {
      const [jobTitles, departments] = await Promise.all([
        repo.distinctJobTitles(db),
        repo.distinctDepartments(db),
      ]);
      return {
        countries: COUNTRIES.map(({ code, name, currency }) => ({ code, name, currency })),
        jobTitles,
        departments,
      };
    },

    async countrySummaries(): Promise<CountrySummary[]> {
      const rows = await repo.statsByCountry(db);
      return rows.map((r) => ({
        countryCode: r.country_code,
        currency: r.currency,
        ...toStats(r),
      }));
    },

    async jobTitles(country: CountryCode): Promise<JobTitleSummary[]> {
      const rows = await repo.statsByJobTitle(db, country);
      return rows.map((r) => {
        const { total: _total, ...stats } = toStats(r);
        return { jobTitle: r.job_title, ...stats };
      });
    },

    async departments(country: CountryCode): Promise<DepartmentSummary[]> {
      const rows = await repo.statsByDepartment(db, country);
      return rows.map((r) => {
        const { headcount, total, mean, median } = toStats(r);
        return { department: r.department, headcount, total, mean, median };
      });
    },

    async distribution(country: CountryCode, bucketCount: number): Promise<Distribution> {
      const currency = currencyForCountry(country);
      const range = await repo.salaryRange(db, country);
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

      const counts = await repo.bucketCounts(db, { country, low, width });
      for (const row of counts) buckets[Number(row.index)]!.count = Number(row.count);

      return { currency, buckets };
    },
  };
}

export type InsightsService = ReturnType<typeof createInsightsService>;
