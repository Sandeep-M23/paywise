import { employeeListQuerySchema } from "@paywise/shared";

// The directory's filters, without paging or sort: an export is every matching row.
export const exportFilters = employeeListQuerySchema.pick({
  status: true,
  country: true,
  jobTitle: true,
  department: true,
  q: true,
});
