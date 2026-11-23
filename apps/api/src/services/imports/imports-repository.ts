import type { CreationAttributes } from "sequelize";
import { execute, select, type Db } from "../../config/db";
import { Employee, Import, SalaryRevision, type EmployeeRow, type ImportRow } from "../../models";
import { EMPLOYEE_COLUMNS } from "../employees/employees-repository";

export function employeesByCodes(db: Db, codes: string[], { lock }: { lock: boolean }) {
  if (!codes.length) return Promise.resolve([] as EmployeeRow[]);
  return select<EmployeeRow>(
    db,
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE employee_code IN (:codes)
     ${lock ? "ORDER BY id FOR UPDATE" : ""}`,
    { codes },
  );
}

export function emailOwners(db: Db, emails: string[]) {
  if (!emails.length) return Promise.resolve([] as { code: string; email: string }[]);
  return select<{ code: string; email: string }>(
    db,
    `SELECT employee_code AS code, lower(email) AS email FROM employees
     WHERE lower(email) IN (:emails)`,
    { emails },
  );
}

export function earliestChanges(db: Db, ids: string[]) {
  if (!ids.length) return Promise.resolve([] as { employeeId: string; date: string }[]);
  return select<{ employeeId: string; date: string }>(
    db,
    `SELECT employee_id AS "employeeId", min(effective_on) AS date FROM salary_revisions
     WHERE employee_id IN (:ids) AND reason <> 'hire' AND cancelled_at IS NULL
     GROUP BY employee_id`,
    { ids },
  );
}

export function employeesChangedOn(db: Db, ids: string[], date: string) {
  if (!ids.length) return Promise.resolve([] as { employeeId: string }[]);
  return select<{ employeeId: string }>(
    db,
    `SELECT DISTINCT employee_id AS "employeeId" FROM salary_revisions
     WHERE employee_id IN (:ids) AND effective_on = CAST(:date AS date) AND cancelled_at IS NULL`,
    { ids, date },
  );
}

export async function insertImport(db: Db, values: CreationAttributes<Import>) {
  const created = await Import.create(values, { transaction: db.transaction });
  return created.id;
}

export async function insertEmployees(db: Db, rows: CreationAttributes<Employee>[]) {
  await Employee.bulkCreate(rows, { transaction: db.transaction });
}

export async function insertRevisions(db: Db, rows: CreationAttributes<SalaryRevision>[]) {
  await SalaryRevision.bulkCreate(rows, { transaction: db.transaction });
}

export type ImportedFields = {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  employment_type: string;
  hire_date: string;
  gender: string;
};

export async function updateEmployeesFromImport(db: Db, values: ImportedFields[]) {
  await execute(
    db,
    `UPDATE employees AS e SET
         full_name = v.full_name, email = v.email, job_title = v.job_title,
         department = v.department, employment_type = v.employment_type,
         hire_date = v.hire_date, gender = v.gender, updated_at = now()
       FROM jsonb_to_recordset(CAST(:values AS jsonb)) AS v(id uuid, full_name text,
         email text, job_title text, department text, employment_type text,
         hire_date date, gender text)
       WHERE e.id = v.id`,
    { values: JSON.stringify(values) },
  );
}

export async function recentImports(db: Db, limit: number): Promise<Omit<ImportRow, "rows">[]> {
  const rows = await Import.findAll({
    attributes: { exclude: ["rows"] },
    order: [["createdAt", "DESC"]],
    limit,
    transaction: db.transaction,
  });
  return rows.map((row) => row.get({ plain: true }));
}

export async function findImport(db: Db, id: string): Promise<ImportRow | null> {
  const row = await Import.findByPk(id, { transaction: db.transaction });
  return row ? row.get({ plain: true }) : null;
}
