import { and, asc, count, eq, max, min, sql, type SQL } from "drizzle-orm";
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
import type { Db } from "../db/client";
import { employees } from "../db/schema";

/*
 * All statistics run in SQL over active employees, in minor units of the
 * country's own currency. Means and medians are rounded to a whole minor unit.
 * percentile_cont uses linear interpolation, the same as Excel's PERCENTILE.INC,
 * so HR can reconcile these numbers with their spreadsheets.
 */

const toInt = (value: unknown) => Math.round(Number(value));

const stats = {
  headcount: count(),
  total: sql<number>`sum(${employees.salaryAmount})`.mapWith(toInt),
  min: sql<number>`min(${employees.salaryAmount})`.mapWith(toInt),
  max: sql<number>`max(${employees.salaryAmount})`.mapWith(toInt),
  mean: sql<number>`avg(${employees.salaryAmount})`.mapWith(toInt),
  median:
    sql<number>`percentile_cont(0.5) within group (order by ${employees.salaryAmount})`.mapWith(
      toInt,
    ),
};

const active = eq(employees.status, "active");
const activeIn = (country: CountryCode): SQL => and(active, eq(employees.countryCode, country))!;

export function createInsightsService({ db }: { db: Db }) {
  return {
    /** Distinct values for the directory filters. */
    async filterOptions(): Promise<FilterOptions> {
      const [titles, departments] = await Promise.all([
        db
          .selectDistinct({ value: employees.jobTitle })
          .from(employees)
          .orderBy(asc(employees.jobTitle)),
        db
          .selectDistinct({ value: employees.department })
          .from(employees)
          .orderBy(asc(employees.department)),
      ]);
      return {
        countries: COUNTRIES.map(({ code, name, currency }) => ({ code, name, currency })),
        jobTitles: titles.map((r) => r.value),
        departments: departments.map((r) => r.value),
      };
    },

    async countrySummaries(): Promise<CountrySummary[]> {
      const rows = await db
        .select({
          countryCode: employees.countryCode,
          currency: employees.salaryCurrency,
          ...stats,
        })
        .from(employees)
        .where(active)
        .groupBy(employees.countryCode, employees.salaryCurrency)
        .orderBy(asc(employees.countryCode));
      return rows;
    },

    async jobTitles(country: CountryCode): Promise<JobTitleSummary[]> {
      const { total: _total, ...titleStats } = stats;
      return db
        .select({ jobTitle: employees.jobTitle, ...titleStats })
        .from(employees)
        .where(activeIn(country))
        .groupBy(employees.jobTitle)
        .orderBy(asc(employees.jobTitle));
    },

    async departments(country: CountryCode): Promise<DepartmentSummary[]> {
      return db
        .select({
          department: employees.department,
          headcount: stats.headcount,
          total: stats.total,
          mean: stats.mean,
          median: stats.median,
        })
        .from(employees)
        .where(activeIn(country))
        .groupBy(employees.department)
        .orderBy(asc(employees.department));
    },

    /**
     * Histogram with equal integer-width buckets from the lowest to the highest
     * salary, so bucket edges are exact amounts rather than fractions of a cent.
     */
    async distribution(country: CountryCode, bucketCount: number): Promise<Distribution> {
      const currency = currencyForCountry(country);
      const [range] = await db
        .select({ low: min(employees.salaryAmount), high: max(employees.salaryAmount) })
        .from(employees)
        .where(activeIn(country));
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

      const index = sql<number>`floor((${employees.salaryAmount} - ${low}) / ${width})`.mapWith(
        Number,
      );
      const counts = await db
        .select({ index, count: count() })
        .from(employees)
        .where(activeIn(country))
        .groupBy(sql`1`);
      for (const row of counts) buckets[row.index]!.count = row.count;

      return { currency, buckets };
    },
  };
}

export type InsightsService = ReturnType<typeof createInsightsService>;
