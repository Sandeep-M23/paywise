import type { Request, Response } from "express";
import type {
  EmployeeCreateInput,
  EmployeeListQuery,
  EmployeeUpdateInput,
  RaiseApplyRequest,
  SalaryRevisionCreateInput,
} from "@paywise/shared";
import type { EmployeeService } from "../../services/employees/employees-service";
import { asyncHandler } from "../../utils/helpers/http-response";

/** HTTP only: read the validated request, call the service, shape the response. */
export function employeeController(service: EmployeeService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.list(req.query as unknown as EmployeeListQuery));
    }, "listEmployees"),

    create: asyncHandler(async (req: Request, res: Response) => {
      const input: EmployeeCreateInput = req.body;
      res.status(201).json(await service.create(input, { by: req.user?.email }));
    }, "createEmployee"),

    /** A raise plan applied as salary revisions, all or nothing. */
    applyRaises: asyncHandler(async (req: Request, res: Response) => {
      const plan: RaiseApplyRequest = req.body;
      res.status(201).json(await service.applyRaises(plan, { by: req.user?.email }));
    }, "applyRaises"),

    get: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.get(req.params.id!));
    }, "getEmployee"),

    update: asyncHandler(async (req: Request, res: Response) => {
      const patch: EmployeeUpdateInput = req.body;
      res.json(await service.update(req.params.id!, patch));
    }, "updateEmployee"),

    deactivate: asyncHandler(async (req: Request, res: Response) => {
      const { reason }: { reason: string } = req.body;
      res.json(await service.deactivate(req.params.id!, { reason }));
    }, "deactivateEmployee"),

    changeSalary: asyncHandler(async (req: Request, res: Response) => {
      const input: SalaryRevisionCreateInput = req.body;
      res
        .status(201)
        .json(await service.changeSalary(req.params.id!, input, { by: req.user?.email }));
    }, "changeSalary"),
  };
}
