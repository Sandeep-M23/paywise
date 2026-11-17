import { Hono } from "hono";
import {
  deactivateEmployeeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
  salaryRevisionCreateSchema,
} from "@paywise/shared";
import type { EmployeeService } from "../services/employees";
import { parseBody, parseQuery } from "../lib/validate";

export function employeeRoutes(service: EmployeeService) {
  return new Hono()
    .get("/", async (c) => c.json(await service.list(parseQuery(c, employeeListQuerySchema))))
    .post("/", async (c) => {
      const created = await service.create(await parseBody(c, employeeCreateSchema));
      return c.json(created, 201);
    })
    .get("/:id", async (c) => c.json(await service.get(c.req.param("id"))))
    .patch("/:id", async (c) =>
      c.json(await service.update(c.req.param("id"), await parseBody(c, employeeUpdateSchema))),
    )
    .post("/:id/deactivate", async (c) =>
      c.json(
        await service.deactivate(c.req.param("id"), await parseBody(c, deactivateEmployeeSchema)),
      ),
    )
    .post("/:id/salary-revisions", async (c) => {
      const input = await parseBody(c, salaryRevisionCreateSchema);
      return c.json(await service.changeSalary(c.req.param("id"), input), 201);
    });
}
