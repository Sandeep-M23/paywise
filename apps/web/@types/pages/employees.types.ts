import type { EmployeeListQuery } from "@paywise/shared";

export type DirectoryFilters = Omit<EmployeeListQuery, "page" | "pageSize">;
