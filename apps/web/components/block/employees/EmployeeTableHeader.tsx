import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { DirectoryFilters, SortField } from "@/@types";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EMPLOYEE_COLUMNS as COLUMNS } from "@/utils/constants/employees";
import { stickyHeader } from "@/utils/constants/table";

export function EmployeeTableHeader({
  filters,
  onSort,
}: {
  filters: DirectoryFilters;
  onSort: (sort: SortField, order: "asc" | "desc") => void;
}) {
  return (
    <TableHeader className={stickyHeader}>
      <TableRow className="hover:bg-transparent">
        {COLUMNS.map(({ field, label, className }) => {
          const active = filters.sort === field;
          const Icon = !active ? ArrowUpDown : filters.order === "asc" ? ArrowUp : ArrowDown;
          return (
            <TableHead
              key={field}
              className={cn("h-11", className)}
              aria-sort={active ? (filters.order === "asc" ? "ascending" : "descending") : "none"}
            >
              <button
                type="button"
                className={cn(
                  "hover:text-foreground inline-flex items-center gap-1 uppercase",
                  field === "salaryAmount" && "flex-row-reverse",
                  active && "text-foreground",
                )}
                onClick={() => onSort(field, active && filters.order === "asc" ? "desc" : "asc")}
              >
                {label}
                <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
              </button>
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
}
