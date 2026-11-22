import {
  employeeCreateSchema,
  salaryRevisionFieldsSchema,
  withSalaryRevisionRules,
} from "@paywise/shared";
import { z } from "zod";

export const employeeFormSchema = employeeCreateSchema.omit({ salaryAmount: true }).extend({
  salary: z.string(),
});
export type EmployeeFormValues = z.input<typeof employeeFormSchema>;

export const salaryChangeFormSchema = withSalaryRevisionRules(
  salaryRevisionFieldsSchema.omit({ amount: true }).extend({ amount: z.string() }),
);
export type SalaryChangeFormValues = z.input<typeof salaryChangeFormSchema>;

export const correctionFormSchema = salaryRevisionFieldsSchema
  .pick({ note: true })
  .extend({ amount: z.string().trim().min(1, "Enter the correct salary") });
export type CorrectionFormValues = z.input<typeof correctionFormSchema>;
