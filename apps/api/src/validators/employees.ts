import {
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  raiseApplySchema,
  salaryRevisionCreateSchema,
} from "@paywise/shared";
import { validateBody, validateQuery } from "./validate";

// The rules live in @paywise/shared so the web forms validate exactly the same way.
export const validateListEmployeesQuery = validateQuery(employeeListQuerySchema);
export const validateCreateEmployeeBody = validateBody(employeeCreateSchema);
export const validateUpdateEmployeeBody = validateBody(employeeUpdateSchema);
export const validateDeactivateEmployeeBody = validateBody(deactivateEmployeeSchema);
export const validateChangeSalaryBody = validateBody(salaryRevisionCreateSchema);
export const validateApplyRaisesBody = validateBody(raiseApplySchema);
