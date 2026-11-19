import type { DirectoryFilters } from "../../pages/employees.types";

export type SortField = DirectoryFilters["sort"];

/** Which dialog the employee sheet has open. */
export type EmployeeDialog = "edit" | "salary" | "deactivate" | null;

export type EditableField =
  "fullName" | "email" | "jobTitle" | "department" | "gender" | "employmentType" | "hireDate";
