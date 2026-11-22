import { Router, type RequestHandler } from "express";
import { employeeController } from "../../controllers/employees/employees";
import type { EmployeeService } from "../../services/employees/employees-service";
import * as employeeValidator from "../../validators/employees";

export function employeeRoutes(service: EmployeeService, verifyAccessToken: RequestHandler) {
  const router = Router();
  const controller = employeeController(service);

  router.get("/", verifyAccessToken, employeeValidator.validateListEmployeesQuery, controller.list);

  router.post(
    "/",
    verifyAccessToken,
    employeeValidator.validateCreateEmployeeBody,
    controller.create,
  );

  router.post(
    "/raises",
    verifyAccessToken,
    employeeValidator.validateApplyRaisesBody,
    controller.applyRaises,
  );

  router.get("/:id", verifyAccessToken, controller.get);

  router.patch(
    "/:id",
    verifyAccessToken,
    employeeValidator.validateUpdateEmployeeBody,
    controller.update,
  );

  router.post(
    "/:id/deactivate",
    verifyAccessToken,
    employeeValidator.validateDeactivateEmployeeBody,
    controller.deactivate,
  );

  router.post(
    "/:id/salary-revisions",
    verifyAccessToken,
    employeeValidator.validateChangeSalaryBody,
    controller.changeSalary,
  );

  return router;
}
