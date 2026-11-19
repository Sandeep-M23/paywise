import {
  employeeCreateSchema,
  salaryRevisionFieldsSchema,
  withSalaryRevisionRules,
} from "@paywise/shared";
import { z } from "zod";

// Form schemas are the shared API schemas with money typed as text; sign-in and
// deactivate use theirs (loginSchema, deactivateEmployeeSchema) unchanged.

// The shared API schema, except salary is typed as text in major units
// (e.g. "18,00,000") and converted to minor units on submit. When editing,
// salary is not shown or sent (it changes through a salary revision).
export const employeeFormSchema = employeeCreateSchema.omit({ salaryAmount: true }).extend({
  salary: z.string(),
});
export type EmployeeFormValues = z.input<typeof employeeFormSchema>;

// Same fields and rules as the API, with the amount as typed text (converted on submit).
export const salaryChangeFormSchema = withSalaryRevisionRules(
  salaryRevisionFieldsSchema.omit({ amount: true }).extend({ amount: z.string() }),
);
export type SalaryChangeFormValues = z.input<typeof salaryChangeFormSchema>;
