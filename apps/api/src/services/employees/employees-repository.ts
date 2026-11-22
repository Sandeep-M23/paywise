import type { EmployeeListQuery } from "@paywise/shared";
import { select, type Db } from "../../config/db";
import { Employee, type EmployeeRow } from "../../models";

const SORT_COLUMNS = {
  fullName: "full_name",
  employeeCode: "employee_code",
  jobTitle: "job_title",
  department: "department",
  countryCode: "country_code",
  salaryAmount: "salary_amount",
  hireDate: "hire_date",
} satisfies Record<EmployeeListQuery["sort"], string>;

export const EMPLOYEE_COLUMNS = `id, employee_code AS "employeeCode", full_name AS "fullName", email,
  job_title AS "jobTitle", department, country_code AS "countryCode",
  salary_amount AS "salaryAmount", salary_currency AS "salaryCurrency",
  salary_effective_on AS "salaryEffectiveOn", current_revision_id AS "currentRevisionId", gender,
  employment_type AS "employmentType", hire_date AS "hireDate", status,
  deactivated_at AS "deactivatedAt", deactivation_reason AS "deactivationReason",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export type Where = { sql: string; replacements: Record<string, unknown> };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export function employeeFilters(
  query: Pick<EmployeeListQuery, "status" | "country" | "jobTitle" | "department" | "q">,
): Where {
  const conditions: string[] = [];
  const replacements: Record<string, unknown> = {};
  if (query.status !== "all") {
    conditions.push("status = :status");
    replacements.status = query.status;
  }
  if (query.country) {
    conditions.push("country_code IN (:country)");
    replacements.country = query.country;
  }
  if (query.jobTitle) {
    conditions.push("job_title IN (:jobTitle)");
    replacements.jobTitle = query.jobTitle;
  }
  if (query.department) {
    conditions.push("department IN (:department)");
    replacements.department = query.department;
  }
  if (query.q) {
    conditions.push("(full_name ILIKE :q OR email ILIKE :q OR employee_code ILIKE :q)");
    replacements.q = `%${escapeLike(query.q)}%`;
  }
  return { sql: conditions.length ? conditions.join(" AND ") : "TRUE", replacements };
}

/** Every employee matching the directory filters, unpaged (CSV export). */
export function allEmployees(
  db: Db,
  filters: Pick<EmployeeListQuery, "status" | "country" | "jobTitle" | "department" | "q">,
) {
  const where = employeeFilters(filters);
  return select<EmployeeRow>(
    db,
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE ${where.sql} ORDER BY employee_code`,
    where.replacements,
  );
}

export async function listEmployees(db: Db, query: EmployeeListQuery) {
  const where = employeeFilters(query);
  const order = `${SORT_COLUMNS[query.sort]} ${query.order === "asc" ? "ASC" : "DESC"}`;
  const [rows, [totals]] = await Promise.all([
    select<EmployeeRow>(
      db,
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE ${where.sql}
       ORDER BY ${order}, id ASC LIMIT :limit OFFSET :offset`,
      {
        ...where.replacements,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      },
    ),
    select<{ total: number }>(
      db,
      `SELECT count(*) AS total FROM employees WHERE ${where.sql}`,
      where.replacements,
    ),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findEmployee(
  db: Db,
  id: string,
  { lock = false } = {},
): Promise<EmployeeRow | undefined> {
  const row = await Employee.findByPk(id, {
    raw: true,
    transaction: db.transaction,
    lock: lock && db.transaction ? db.transaction.LOCK.UPDATE : undefined,
  });
  return (row as EmployeeRow | null) ?? undefined;
}

export async function findEmployeeIdByCode(db: Db, code: string) {
  const row = await Employee.findOne({
    where: { employeeCode: code },
    attributes: ["id"],
    raw: true,
    transaction: db.transaction,
  });
  return row?.id;
}

export async function findEmployeeIdByEmail(db: Db, email: string, excludeId?: string) {
  const [row] = await select<{ id: string }>(
    db,
    `SELECT id FROM employees WHERE lower(email) = :email
     ${excludeId ? "AND id <> :excludeId" : ""} LIMIT 1`,
    { email: email.toLowerCase(), excludeId },
  );
  return row?.id;
}

export type NewEmployee = Omit<
  EmployeeRow,
  "id" | "gender" | "status" | "deactivatedAt" | "deactivationReason" | "createdAt" | "updatedAt"
> &
  Partial<Pick<EmployeeRow, "id" | "gender" | "status" | "deactivatedAt" | "deactivationReason">>;

export async function insertEmployee(db: Db, values: NewEmployee): Promise<EmployeeRow> {
  const created = await Employee.create(
    { deactivatedAt: null, deactivationReason: null, ...values },
    { transaction: db.transaction },
  );
  return created.get({ plain: true });
}

export async function updateEmployee(db: Db, id: string, values: Partial<EmployeeRow>) {
  await Employee.update(values, { where: { id }, transaction: db.transaction });
}
