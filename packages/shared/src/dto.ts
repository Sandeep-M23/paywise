import type { Money } from "./money";
import type { CountryCode } from "./countries";
import type { EmployeeStatus, EmploymentType, Gender, RevisionReason } from "./schemas";

/** API response shapes, shared so the web app and API agree on them at compile time. */

export type EmployeeSummary = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: CountryCode;
  salary: Money;
  employmentType: EmploymentType;
  hireDate: string;
  status: EmployeeStatus;
};

export type SalaryRevision = {
  id: string;
  amount: number;
  previousAmount: number | null;
  currency: string;
  effectiveOn: string;
  reason: RevisionReason;
  note: string | null;
  importId: string | null;
  createdAt: string;
};

export type EmployeeDetail = EmployeeSummary & {
  gender: Gender;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  revisions: SalaryRevision[];
};

export type Page<T> = { data: T[]; page: number; pageSize: number; total: number };

export type ApiErrorBody = {
  error: { code: string; message: string; details?: { path: string; message: string }[] };
};
