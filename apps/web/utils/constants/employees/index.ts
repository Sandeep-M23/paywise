import type { SortField } from "@/@types";

export const EMPLOYEE_COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "employeeCode", label: "Code", className: "w-28 pl-4" },
  { field: "fullName", label: "Name" },
  { field: "jobTitle", label: "Job title", className: "hidden w-52 md:table-cell" },
  { field: "department", label: "Department", className: "hidden w-44 lg:table-cell" },
  { field: "countryCode", label: "Country", className: "hidden w-40 sm:table-cell" },
  { field: "salaryAmount", label: "Annual salary", className: "w-36 text-right" },
  { field: "hireDate", label: "Hired", className: "hidden w-32 pr-4 lg:table-cell" },
];

export const ROW_HEIGHT = 53;
export const PREFETCH_ROWS = 20;
