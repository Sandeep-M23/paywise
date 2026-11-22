import type { Response } from "express";
import type {
  EmployeeCreateInput,
  EmployeeListQuery,
  EmployeeUpdateInput,
  RaiseApplyRequest,
  SalaryRevisionCreateInput,
} from "@paywise/shared";
import type { ValidatedRequest } from "../../interfaces/helpers/http-response";
import type { EmployeeService } from "../../services/employees/employees-service";
import { asyncHandler } from "../../utils/helpers/http-response";

type ById = { id: string };

export function employeeController(service: EmployeeService) {
  return {
    list: asyncHandler(async (req: ValidatedRequest<unknown, EmployeeListQuery>, res: Response) => {
      res.json(await service.list(req.query));
    }, "listEmployees"),

    create: asyncHandler(async (req: ValidatedRequest<EmployeeCreateInput>, res: Response) => {
      res.status(201).json(await service.create(req.body, { by: req.user?.email }));
    }, "createEmployee"),

    applyRaises: asyncHandler(async (req: ValidatedRequest<RaiseApplyRequest>, res: Response) => {
      res.status(201).json(await service.applyRaises(req.body, { by: req.user?.email }));
    }, "applyRaises"),

    get: asyncHandler(async (req: ValidatedRequest<unknown, unknown, ById>, res: Response) => {
      res.json(await service.get(req.params.id));
    }, "getEmployee"),

    update: asyncHandler(
      async (req: ValidatedRequest<EmployeeUpdateInput, unknown, ById>, res: Response) => {
        res.json(await service.update(req.params.id, req.body));
      },
      "updateEmployee",
    ),

    deactivate: asyncHandler(
      async (req: ValidatedRequest<{ reason: string }, unknown, ById>, res: Response) => {
        res.json(await service.deactivate(req.params.id, req.body));
      },
      "deactivateEmployee",
    ),

    changeSalary: asyncHandler(
      async (req: ValidatedRequest<SalaryRevisionCreateInput, unknown, ById>, res: Response) => {
        res
          .status(201)
          .json(await service.changeSalary(req.params.id, req.body, { by: req.user?.email }));
      },
      "changeSalary",
    ),
  };
}
