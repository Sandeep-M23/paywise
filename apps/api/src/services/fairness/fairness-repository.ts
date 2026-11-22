import { select, type Db } from "../../config/db";

export type FairnessFilters = { country?: string; jobTitle?: string; department?: string };

function comparableWhere(filters: FairnessFilters) {
  const conditions = ["status = 'active'", "employment_type = 'full_time'"];
  if (filters.country) conditions.push("country_code = :country");
  if (filters.jobTitle) conditions.push("job_title = :jobTitle");
  if (filters.department) conditions.push("department = :department");
  return { sql: conditions.join(" AND "), replacements: filters };
}

export function outlierRows(db: Db, filters: FairnessFilters, minPeers: number) {
  const where = comparableWhere(filters);
  return select<Record<string, unknown>>(
    db,
    `
    WITH peers AS (
      SELECT country_code, job_title, count(*) AS n,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY salary_amount) AS q1,
             percentile_cont(0.5)  WITHIN GROUP (ORDER BY salary_amount) AS median,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY salary_amount) AS q3
      FROM employees
      WHERE ${where.sql}
      GROUP BY country_code, job_title
      HAVING count(*) >= :minPeers
    ), fenced AS (
      SELECT *, q1 - 1.5 * (q3 - q1) AS lower_fence, q3 + 1.5 * (q3 - q1) AS upper_fence
      FROM peers
    )
    SELECT e.id, e.employee_code, e.full_name, e.country_code, e.job_title, e.department,
           e.salary_amount, e.salary_currency, f.n, f.median, f.lower_fence, f.upper_fence
    FROM employees e
    JOIN fenced f ON f.country_code = e.country_code AND f.job_title = e.job_title
    WHERE e.status = 'active' AND e.employment_type = 'full_time'
      AND (e.salary_amount < f.lower_fence OR e.salary_amount > f.upper_fence)
    ORDER BY abs(e.salary_amount - f.median) / f.median DESC, e.employee_code
    LIMIT 500
  `,
    { ...where.replacements, minPeers },
  );
}

export function genderGapRows(db: Db, filters: FairnessFilters) {
  const where = comparableWhere(filters);
  return select<Record<string, unknown>>(
    db,
    `
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
    FROM employees
    WHERE ${where.sql} AND gender IN ('female', 'male')
    GROUP BY country_code, job_title, salary_currency
  `,
    where.replacements,
  );
}
