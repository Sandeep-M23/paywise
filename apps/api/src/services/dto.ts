import type {
  CountryCode,
  EmployeeDetail,
  EmployeeStatus,
  EmployeeSummary,
  EmploymentType,
  Gender,
  RevisionReason,
  SalaryRevision,
} from "@paywise/shared";
import type { EmployeeRow, SalaryRevisionRow } from "../db/schema";

// Gender is deliberately absent from the summary: it is only used in aggregates
// and shown on the individual record (see REQUIREMENTS.md).
export function toEmployeeSummary(row: EmployeeRow): EmployeeSummary {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    jobTitle: row.jobTitle,
    department: row.department,
    countryCode: row.countryCode as CountryCode,
    salary: { amount: row.salaryAmount, currency: row.salaryCurrency },
    employmentType: row.employmentType as EmploymentType,
    hireDate: row.hireDate,
    status: row.status as EmployeeStatus,
  };
}

export function toSalaryRevision(row: SalaryRevisionRow): SalaryRevision {
  return {
    id: row.id,
    amount: row.amount,
    previousAmount: row.previousAmount,
    currency: row.currency,
    effectiveOn: row.effectiveOn,
    reason: row.reason as RevisionReason,
    note: row.note,
    importId: row.importId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toEmployeeDetail(row: EmployeeRow, revisions: SalaryRevisionRow[]): EmployeeDetail {
  return {
    ...toEmployeeSummary(row),
    gender: row.gender as Gender,
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    deactivationReason: row.deactivationReason,
    revisions: revisions.map(toSalaryRevision),
  };
}
