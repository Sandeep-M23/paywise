import { Hono } from "hono";
import { employeeController } from "../../controllers/employees/employees";
import type { EmployeeService } from "../../services/employees/employees-service";

export function employeeRoutes(service: EmployeeService) {
  const controller = employeeController(service);
  return new Hono()
    .get("/", controller.list)
    .post("/", controller.create)
    .post("/raises", controller.applyRaises)
    .get("/:id", controller.get)
    .patch("/:id", controller.update)
    .post("/:id/deactivate", controller.deactivate)
    .post("/:id/salary-revisions", controller.changeSalary);
}
