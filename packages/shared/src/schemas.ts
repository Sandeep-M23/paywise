import { z } from "zod";
import { COUNTRY_CODES } from "./countries";

export const GENDERS = ["female", "male", "non_binary", "undisclosed"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"] as const;
export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;
// "hire" and "import" are written by the system, never chosen by the user.
export const MANUAL_REVISION_REASONS = [
  "merit",
  "promotion",
  "market_adjustment",
  "correction",
] as const;
export const REVISION_REASONS = ["hire", "import", ...MANUAL_REVISION_REASONS] as const;

const text = (max: number) => z.string().trim().min(1, "Required").max(max);

export const employeeCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/, "Use letters, digits and dashes, e.g. EMP-00001");

export const isoDateSchema = z.iso.date("Use the format YYYY-MM-DD");

/** Positive integer in the currency's minor unit. See money.ts. */
export const minorAmountSchema = z
  .number()
  .int("Amount must be in minor units")
  .positive("Amount must be greater than zero")
  .max(Number.MAX_SAFE_INTEGER);

const employeeFields = {
  employeeCode: employeeCodeSchema,
  fullName: text(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  jobTitle: text(100),
  department: text(100),
  countryCode: z.enum(COUNTRY_CODES),
  salaryAmount: minorAmountSchema,
  gender: z.enum(GENDERS),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hireDate: isoDateSchema,
};

export const employeeCreateSchema = z.object({
  ...employeeFields,
  gender: employeeFields.gender.default("undisclosed"),
});

// Country, code and salary are deliberately absent: country is immutable and
// salary only changes through a salary revision.
export const employeeUpdateSchema = z
  .object({
    fullName: employeeFields.fullName,
    email: employeeFields.email,
    jobTitle: employeeFields.jobTitle,
    department: employeeFields.department,
    gender: employeeFields.gender,
    employmentType: employeeFields.employmentType,
    hireDate: employeeFields.hireDate,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

export const salaryRevisionCreateSchema = z.object({
  amount: minorAmountSchema,
  effectiveOn: isoDateSchema,
  reason: z.enum(MANUAL_REVISION_REASONS),
  note: z.string().trim().max(500).optional(),
});

export const deactivateEmployeeSchema = z.object({
  reason: text(500),
});

export const EMPLOYEE_SORT_FIELDS = [
  "fullName",
  "employeeCode",
  "jobTitle",
  "department",
  "countryCode",
  "salaryAmount",
  "hireDate",
] as const;

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(EMPLOYEE_SORT_FIELDS).default("fullName"),
  order: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum([...EMPLOYEE_STATUSES, "all"]).default("active"),
  q: z.string().trim().min(1).max(100).optional(),
  country: z.enum(COUNTRY_CODES).optional(),
  jobTitle: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().min(1).max(100).optional(),
});

export type Gender = (typeof GENDERS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type RevisionReason = (typeof REVISION_REASONS)[number];
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type SalaryRevisionCreateInput = z.infer<typeof salaryRevisionCreateSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

export const fairnessQuerySchema = z.object({
  country: z.enum(COUNTRY_CODES).optional(),
  jobTitle: z.string().trim().min(1).max(100).optional(),
});

export const raiseCostRequestSchema = z.object({
  percent: z
    .number()
    .positive("Raise must be greater than 0%")
    .max(100, "Raise can be at most 100%")
    .multipleOf(0.01, "Use at most two decimal places"),
  country: z.enum(COUNTRY_CODES).optional(),
  jobTitle: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().min(1).max(100).optional(),
});

export type FairnessQuery = z.infer<typeof fairnessQuerySchema>;
export type RaiseCostRequest = z.infer<typeof raiseCostRequestSchema>;
