import { and, asc, count, desc, eq, ilike, max, min, ne, or, sql, type SQL } from "drizzle-orm";
import type { EmployeeListQuery } from "@paywise/shared";
import type { Db } from "../db/client";
import { employees, salaryRevisions, type NewEmployeeRow } from "../db/schema";

const SORT_COLUMNS = {
  fullName: employees.fullName,
  employeeCode: employees.employeeCode,
  jobTitle: employees.jobTitle,
  department: employees.department,
  countryCode: employees.countryCode,
  salaryAmount: employees.salaryAmount,
  hireDate: employees.hireDate,
} satisfies Record<EmployeeListQuery["sort"], unknown>;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export function employeeFilters(
  query: Pick<EmployeeListQuery, "status" | "country" | "jobTitle" | "department" | "q">,
): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    query.status === "all" ? undefined : eq(employees.status, query.status),
    query.country ? eq(employees.countryCode, query.country) : undefined,
    query.jobTitle ? eq(employees.jobTitle, query.jobTitle) : undefined,
    query.department ? eq(employees.department, query.department) : undefined,
  ];
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(
      or(
        ilike(employees.fullName, pattern),
        ilike(employees.email, pattern),
        ilike(employees.employeeCode, pattern),
      ),
    );
  }
  return and(...conditions);
}

export async function listEmployees(db: Db, query: EmployeeListQuery) {
  const where = employeeFilters(query);
  const direction = query.order === "asc" ? asc : desc;
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(where)
      // id as a tie-breaker keeps paging stable when sort values repeat.
      .orderBy(direction(SORT_COLUMNS[query.sort]), asc(employees.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(employees).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findEmployee(db: Db, id: string, { lock = false } = {}) {
  const query = db.select().from(employees).where(eq(employees.id, id));
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

export async function findEmployeeIdByCode(db: Db, code: string) {
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.employeeCode, code));
  return row?.id;
}

export async function findEmployeeIdByEmail(db: Db, email: string, excludeId?: string) {
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(sql`lower(${employees.email})`, email.toLowerCase()),
        excludeId ? ne(employees.id, excludeId) : undefined,
      ),
    );
  return row?.id;
}

export async function insertEmployee(db: Db, values: NewEmployeeRow) {
  const [row] = await db.insert(employees).values(values).returning();
  return row!;
}

export async function updateEmployee(db: Db, id: string, values: Partial<NewEmployeeRow>) {
  await db.update(employees).set(values).where(eq(employees.id, id));
}

export async function listRevisions(db: Db, employeeId: string) {
  return db
    .select()
    .from(salaryRevisions)
    .where(eq(salaryRevisions.employeeId, employeeId))
    .orderBy(desc(salaryRevisions.effectiveOn), desc(salaryRevisions.createdAt));
}

export async function insertRevision(db: Db, values: typeof salaryRevisions.$inferInsert) {
  await db.insert(salaryRevisions).values(values);
}

/** Latest effective date overall, and earliest one excluding the hire revision. */
export async function revisionDateBounds(db: Db, employeeId: string) {
  const [latest] = await db
    .select({ latest: max(salaryRevisions.effectiveOn) })
    .from(salaryRevisions)
    .where(eq(salaryRevisions.employeeId, employeeId));
  const [earliest] = await db
    .select({ earliestChange: min(salaryRevisions.effectiveOn) })
    .from(salaryRevisions)
    .where(and(eq(salaryRevisions.employeeId, employeeId), ne(salaryRevisions.reason, "hire")));
  return { latest: latest?.latest ?? null, earliestChange: earliest?.earliestChange ?? null };
}

export async function moveHireRevision(db: Db, employeeId: string, effectiveOn: string) {
  await db
    .update(salaryRevisions)
    .set({ effectiveOn })
    .where(and(eq(salaryRevisions.employeeId, employeeId), eq(salaryRevisions.reason, "hire")));
}
