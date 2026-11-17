"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { EmployeeListQuery, EmployeeSummary, Page } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { countryName, date, money } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortField = EmployeeListQuery["sort"];

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "fullName", label: "Name" },
  { field: "employeeCode", label: "Code" },
  { field: "jobTitle", label: "Job title" },
  { field: "department", label: "Department" },
  { field: "countryCode", label: "Country" },
  { field: "salaryAmount", label: "Annual salary", className: "text-right" },
  { field: "hireDate", label: "Hired" },
];

export function EmployeeTable({
  page,
  query,
  loading,
  fetching,
  onSort,
  onPage,
  onSelect,
}: {
  page: Page<EmployeeSummary> | undefined;
  query: EmployeeListQuery;
  loading: boolean;
  fetching: boolean;
  onSort: (sort: SortField, order: "asc" | "desc") => void;
  onPage: (page: number) => void;
  onSelect: (id: string) => void;
}) {
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return (
    <div className="bg-background rounded-lg border">
      <Table className={cn(fetching && !loading && "opacity-70 transition-opacity")}>
        <TableHeader>
          <TableRow>
            {COLUMNS.map(({ field, label, className }) => {
              const active = query.sort === field;
              const Icon = !active ? ArrowUpDown : query.order === "asc" ? ArrowUp : ArrowDown;
              return (
                <TableHead
                  key={field}
                  className={className}
                  aria-sort={active ? (query.order === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => onSort(field, active && query.order === "asc" ? "desc" : "asc")}
                  >
                    {label}
                    <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 10 }, (_, i) => (
              <TableRow key={i}>
                {COLUMNS.map((c) => (
                  <TableCell key={c.field}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!loading && page?.data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="text-muted-foreground h-32 text-center"
              >
                No employees match these filters.
              </TableCell>
            </TableRow>
          )}
          {page?.data.map((employee) => (
            <TableRow
              key={employee.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => onSelect(employee.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(employee.id)}
            >
              <TableCell className="font-medium">
                {employee.fullName}
                {employee.status === "inactive" && (
                  <Badge variant="secondary" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {employee.employeeCode}
              </TableCell>
              <TableCell>{employee.jobTitle}</TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell>{countryName(employee.countryCode)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
              </TableCell>
              <TableCell className="text-muted-foreground">{date(employee.hireDate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {page ? `${page.total.toLocaleString()} employees` : " "}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {query.page} of {totalPages.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={query.page <= 1}
            onClick={() => onPage(query.page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={query.page >= totalPages}
            onClick={() => onPage(query.page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
