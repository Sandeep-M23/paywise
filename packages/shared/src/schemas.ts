import { z } from "zod";
import { COUNTRY_CODES } from "./countries";
import { CURRENCY_CODES } from "./currencies";

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
// Changing the pay currency is its own reason: amount and currency move together.
export const SALARY_CHANGE_REASONS = [...MANUAL_REVISION_REASONS, "currency_change"] as const;
export const REVISION_REASONS = ["hire", "import", ...SALARY_CHANGE_REASONS] as const;

/** A supported pay currency, accepted in any case and stored lowercase. */
export const currencySchema = z.string().trim().toLowerCase().pipe(z.enum(CURRENCY_CODES));

const text = (max: number) => z.string().trim().min(1, "Required").max(max);

/**
 * A filter that matches any of several values. Takes one value or a list (repeated
 * query keys arrive as a list; a comma is part of the value, as in "VP, Sales") and
 * gives back a de-duplicated list.
 */
const anyOf = <T extends z.ZodType>(item: T) =>
  z
    .union([item, z.array(item).min(1).max(50)])
    .transform((value) => [...new Set(Array.isArray(value) ? value : [value])] as z.output<T>[])
    .optional();

const filterText = z.string().trim().min(1).max(100);

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
  // Defaults from the country when omitted; HR may choose another supported currency.
  salaryCurrency: currencySchema.optional(),
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

/**
 * A salary change, effective on a past, current or future date. A correction
 * names the revision it corrects (same date); a currency change names the new
 * currency. `basedOnRevisionId` is the latest revision the user was looking at:
 * if someone else changed the salary since, the change is refused (409).
 */
export const salaryRevisionFieldsSchema = z.object({
  amount: minorAmountSchema,
  currency: currencySchema.optional(),
  effectiveOn: isoDateSchema,
  reason: z.enum(SALARY_CHANGE_REASONS),
  note: z.string().trim().max(500).optional(),
  correctsRevisionId: z.uuid().optional(),
  basedOnRevisionId: z.uuid().optional(),
});

type RevisionRuleFields = {
  reason: (typeof SALARY_CHANGE_REASONS)[number];
  currency?: string;
  correctsRevisionId?: string;
};

/**
 * The cross-field rules of a salary change. Kept apart from the fields because
 * Zod 4 can't .omit() or .extend() a refined schema, and the web form needs the
 * fields with the amount as text but exactly these rules.
 */
export const withSalaryRevisionRules = <T extends z.ZodType<RevisionRuleFields>>(schema: T) =>
  schema
    .refine((r) => (r.reason === "correction") === (r.correctsRevisionId !== undefined), {
      message: "A correction must name the revision it corrects, and only a correction can",
      path: ["correctsRevisionId"],
    })
    .refine((r) => r.reason !== "currency_change" || r.currency !== undefined, {
      message: "Choose the new currency",
      path: ["currency"],
    });

export const salaryRevisionCreateSchema = withSalaryRevisionRules(salaryRevisionFieldsSchema);

/** Sign-in: one HR account; the email is compared case-insensitively. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").toLowerCase(),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

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
  // Employee code by default: a stable order HR recognises, unlike names.
  sort: z.enum(EMPLOYEE_SORT_FIELDS).default("employeeCode"),
  order: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum([...EMPLOYEE_STATUSES, "all"]).default("active"),
  q: z.string().trim().min(1).max(100).optional(),
  country: anyOf(z.enum(COUNTRY_CODES)),
  jobTitle: anyOf(filterText),
  department: anyOf(filterText),
});

export type Gender = (typeof GENDERS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type RevisionReason = (typeof REVISION_REASONS)[number];
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type SalaryRevisionCreateInput = z.infer<typeof salaryRevisionCreateSchema>;
export type SalaryRevisionCreateRequest = z.input<typeof salaryRevisionCreateSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

export const fairnessQuerySchema = z.object({
  country: z.enum(COUNTRY_CODES).optional(),
  jobTitle: z.string().trim().min(1).max(100).optional(),
});

const raisePercentSchema = z
  .number()
  .max(100, "Raise can be at most 100%")
  .multipleOf(0.01, "Use at most two decimal places");

/** One person's raise in a plan: a percentage or a new annual salary, not both. */
export const raiseOverrideSchema = z
  .object({
    employeeId: z.uuid(),
    percent: raisePercentSchema.positive("Raise must be greater than 0%").optional(),
    newAmount: minorAmountSchema.optional(),
  })
  .refine((o) => (o.percent === undefined) !== (o.newAmount === undefined), {
    message: "Give either a raise % or a new salary",
    path: ["percent"],
  });

/**
 * A raise plan: a group raise for everyone active matching the filters, and/or
 * individual raises that replace the group raise for those people (they need not
 * match the filters). Used for the what-if cost and, with a date and reason, to apply it.
 */
export const raisePlanSchema = z
  .object({
    percent: raisePercentSchema.min(0, "Raise cannot be negative").default(0),
    country: anyOf(z.enum(COUNTRY_CODES)),
    jobTitle: anyOf(filterText),
    department: anyOf(filterText),
    overrides: z.array(raiseOverrideSchema).max(500, "At most 500 individual raises").default([]),
  })
  .refine((p) => p.percent > 0 || p.overrides.length > 0, {
    message: "Set a group raise above 0% or add an individual raise",
    path: ["percent"],
  })
  .refine((p) => new Set(p.overrides.map((o) => o.employeeId)).size === p.overrides.length, {
    message: "Each person can only have one individual raise",
    path: ["overrides"],
  });

/** Kept for the what-if endpoint: the cost of a plan. */
export const raiseCostRequestSchema = raisePlanSchema;

export const raiseApplySchema = raisePlanSchema.and(
  z.object({
    effectiveOn: isoDateSchema,
    reason: z.enum(MANUAL_REVISION_REASONS),
    note: z.string().trim().max(500).optional(),
  }),
);

export type FairnessQuery = z.infer<typeof fairnessQuerySchema>;
export type RaiseCostRequest = z.input<typeof raiseCostRequestSchema>;
export type RaisePlan = z.infer<typeof raisePlanSchema>;
export type RaiseOverride = z.infer<typeof raiseOverrideSchema>;
export type RaiseApplyInput = z.infer<typeof raiseApplySchema>;
export type RaiseApplyRequest = z.input<typeof raiseApplySchema>;
