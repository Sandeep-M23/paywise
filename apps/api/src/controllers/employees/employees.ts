import type { Context } from "hono";
import {
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  raiseApplySchema,
  salaryRevisionCreateSchema,
} from "@paywise/shared";
import { parseBody, parseQuery } from "../../validators/validate";
import type { EmployeeService } from "../../services/employees/employees-service";

/** HTTP only: validate the request, call the service, shape the response. */
export function employeeController(service: EmployeeService) {
  return {
    async list(c: Context) {
      return c.json(await service.list(parseQuery(c, employeeListQuerySchema)));
    },

    async create(c: Context) {
      return c.json(await service.create(await parseBody(c, employeeCreateSchema)), 201);
    },

    /** A raise plan applied as salary revisions, all or nothing. */
    async applyRaises(c: Context) {
      return c.json(await service.applyRaises(await parseBody(c, raiseApplySchema)), 201);
    },

    async get(c: Context) {
      return c.json(await service.get(c.req.param("id")!));
    },

    async update(c: Context) {
      return c.json(
        await service.update(c.req.param("id")!, await parseBody(c, employeeUpdateSchema)),
      );
    },

    async deactivate(c: Context) {
      return c.json(
        await service.deactivate(c.req.param("id")!, await parseBody(c, deactivateEmployeeSchema)),
      );
    },

    async changeSalary(c: Context) {
      const input = await parseBody(c, salaryRevisionCreateSchema);
      return c.json(await service.changeSalary(c.req.param("id")!, input), 201);
    },
  };
}
