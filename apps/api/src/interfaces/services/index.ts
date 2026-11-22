import type { EmployeeService } from "../../services/employees/employees-service";
import type { ExportService } from "../../services/exports/exports-service";
import type { FairnessService } from "../../services/fairness/fairness-service";
import type { ImportService } from "../../services/imports/imports-service";
import type { InsightsService } from "../../services/insights/insights-service";

export type Services = {
  employees: EmployeeService;
  insights: InsightsService;
  fairness: FairnessService;
  imports: ImportService;
  exports: ExportService;
};
