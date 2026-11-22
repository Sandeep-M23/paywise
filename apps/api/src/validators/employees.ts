import {
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  raiseApplySchema,
  salaryRevisionCreateSchema,
} from "@paywise/shared";
import { validateBody, validateQuery } from "./validate";

export const validateListEmployeesQuery = validateQuery(employeeListQuerySchema);
export const validateCreateEmployeeBody = validateBody(employeeCreateSchema);
export const validateUpdateEmployeeBody = validateBody(employeeUpdateSchema);
export const validateDeactivateEmployeeBody = validateBody(deactivateEmployeeSchema);
export const validateChangeSalaryBody = validateBody(salaryRevisionCreateSchema);
export const validateApplyRaisesBody = validateBody(raiseApplySchema);
