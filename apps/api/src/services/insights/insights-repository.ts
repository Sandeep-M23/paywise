import type { CountryCode } from "@paywise/shared";
import { select, type Db } from "../../config/db";

const STATS = `count(*) AS headcount, sum(salary_amount) AS total,
  min(salary_amount) AS min, max(salary_amount) AS max, avg(salary_amount) AS mean,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_amount) AS median`;

const ACTIVE_IN = "status = 'active' AND country_code = :country";

export type StatsRow = {
  headcount: number;
  total: string;
  min: number;
  max: number;
  mean: string;
  median: number;
};

export async function distinctJobTitles(db: Db) {
  const rows = await select<{ value: string }>(
    db,
    "SELECT DISTINCT job_title AS value FROM employees ORDER BY job_title",
  );
  return rows.map((r) => r.value);
}

export async function distinctDepartments(db: Db) {
  const rows = await select<{ value: string }>(
    db,
    "SELECT DISTINCT department AS value FROM employees ORDER BY department",
  );
  return rows.map((r) => r.value);
}

export function statsByCountry(db: Db) {
  return select<StatsRow & { country_code: string; currency: string }>(
    db,
    `SELECT country_code, salary_currency AS currency, ${STATS}
     FROM employees WHERE status = 'active'
     GROUP BY country_code, salary_currency
     ORDER BY country_code`,
  );
}

export function statsByJobTitle(db: Db, country: CountryCode) {
  return select<StatsRow & { job_title: string }>(
    db,
    `SELECT job_title, ${STATS} FROM employees WHERE ${ACTIVE_IN}
     GROUP BY job_title ORDER BY job_title`,
    { country },
  );
}

export function statsByDepartment(db: Db, country: CountryCode) {
  return select<StatsRow & { department: string }>(
    db,
    `SELECT department, ${STATS} FROM employees WHERE ${ACTIVE_IN}
     GROUP BY department ORDER BY department`,
    { country },
  );
}

export async function salaryRange(db: Db, country: CountryCode) {
  const [range] = await select<{ low: number | null; high: number | null }>(
    db,
    `SELECT min(salary_amount) AS low, max(salary_amount) AS high FROM employees WHERE ${ACTIVE_IN}`,
    { country },
  );
  return range;
}

export function bucketCounts(
  db: Db,
  { country, low, width }: { country: CountryCode; low: number; width: number },
) {
  return select<{ index: number; count: number }>(
    db,
    `SELECT floor((salary_amount - :low) / :width)::int AS index, count(*) AS count
     FROM employees WHERE ${ACTIVE_IN} GROUP BY 1`,
    { country, low, width },
  );
}
