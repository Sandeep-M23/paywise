"use client";

import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsUp, Loader2 } from "lucide-react";
import { SearchX } from "@/components/icons";
import type { EmployeeSummary } from "@paywise/shared";
import { fill, fillScrollTable, stickyHeader } from "@/utils/constants/table";
import { TableFooterBar } from "@/components/shared/TableFrame/TableFrame";
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
import { date, humanize, money } from "@/utils/helpers/others/format";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { DepartmentLabel } from "@/components/shared/DepartmentLabel/DepartmentLabel";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Mail, CalendarDays, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectoryFilters, SortField } from "@/@types";

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "employeeCode", label: "Code", className: "w-28 pl-4" },
  { field: "fullName", label: "Name" },
  { field: "jobTitle", label: "Job title", className: "hidden w-52 md:table-cell" },
  { field: "department", label: "Department", className: "hidden w-44 lg:table-cell" },
  { field: "countryCode", label: "Country", className: "hidden w-40 sm:table-cell" },
  { field: "salaryAmount", label: "Annual salary", className: "w-36 text-right" },
  { field: "hireDate", label: "Hired", className: "hidden w-32 pr-4 lg:table-cell" },
];

const ROW_HEIGHT = 53;
const PREFETCH_ROWS = 20;

export function EmployeeTable({
  rows,
  total,
  filters,
  loading,
  fetching,
  hasMore,
  loadingMore,
  onLoadMore,
  onSort,
  onSelect,
  onClearFilters,
}: {
  rows: EmployeeSummary[];
  total: number | undefined;
  filters: DirectoryFilters;
  loading: boolean;
  fetching: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSort: (sort: SortField, order: "asc" | "desc") => void;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? 0;

  useEffect(() => {
    if (hasMore && !loadingMore && lastIndex >= rows.length - PREFETCH_ROWS) onLoadMore();
  }, [lastIndex, rows.length, hasMore, loadingMore, onLoadMore]);

  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [filterKey]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 1200);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const paddingTop = items[0]?.start ?? 0;
  const paddingBottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);

  return (
    <div
      className={cn(
        "bg-card ring-border relative flex flex-col overflow-hidden rounded-xl ring-1",
        fill,
      )}
    >
      <Table
        containerRef={scroller}
        containerClassName={fillScrollTable}
        className={cn(
          "table-fixed",
          fetching && !loadingMore && !loading && "opacity-60 transition-opacity",
        )}
        aria-busy={fetching}
        aria-rowcount={total}
      >
        <TableHeader className={stickyHeader}>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map(({ field, label, className }) => {
              const active = filters.sort === field;
              const Icon = !active ? ArrowUpDown : filters.order === "asc" ? ArrowUp : ArrowDown;
              return (
                <TableHead
                  key={field}
                  className={cn("h-11", className)}
                  aria-sort={
                    active ? (filters.order === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1 uppercase",
                      field === "salaryAmount" && "flex-row-reverse",
                      active && "text-foreground",
                    )}
                    onClick={() =>
                      onSort(field, active && filters.order === "asc" ? "desc" : "asc")
                    }
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
            Array.from({ length: 14 }, (_, i) => (
              <TableRow key={i}>
                {COLUMNS.map((c) => (
                  <TableCell key={c.field} className={cn("h-[53px]", c.className)}>
                    {c.field === "fullName" ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    ) : (
                      <Skeleton className="h-4 w-full" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!loading && rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMNS.length} className="h-64">
                <div className="flex flex-col items-center gap-2 text-center">
                  <SearchX className="text-muted-foreground size-8" aria-hidden />
                  <p className="font-medium">No employees match</p>
                  <p className="text-muted-foreground text-sm">
                    Try a different search or remove a filter.
                  </p>
                  <Button variant="outline" size="sm" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {paddingTop > 0 && (
            <tr aria-hidden>
              <td colSpan={COLUMNS.length} style={{ height: paddingTop }} />
            </tr>
          )}
          {items.map((item) => {
            const employee = rows[item.index]!;
            return (
              <TableRow
                key={employee.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                aria-rowindex={item.index + 2}
                className="hover:bg-accent/60 focus-visible:bg-accent cursor-pointer outline-none"
                tabIndex={0}
                onClick={() => onSelect(employee.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(employee.id)}
              >
                <TableCell className="text-muted-foreground truncate pl-4 font-mono text-xs">
                  {employee.employeeCode}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <EmployeeAvatar name={employee.fullName} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <HoverCard openDelay={400}>
                        <HoverCardTrigger asChild>
                          <span className="flex min-w-0 items-center gap-2 font-medium">
                            <span className="truncate" title={employee.fullName}>
                              {employee.fullName}
                            </span>
                            {employee.status === "inactive" && (
                              <Badge variant="secondary" className="shrink-0">
                                Inactive
                              </Badge>
                            )}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="w-72">
                          <EmployeePreview employee={employee} />
                        </HoverCardContent>
                      </HoverCard>
                      <div className="text-muted-foreground truncate text-xs md:hidden">
                        {employee.jobTitle} · {employee.countryCode}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden truncate md:table-cell" title={employee.jobTitle}>
                  {employee.jobTitle}
                </TableCell>
                <TableCell className="hidden truncate lg:table-cell">
                  <DepartmentLabel name={employee.department} className="text-muted-foreground" />
                </TableCell>
                <TableCell className="hidden truncate sm:table-cell">
                  <CountryLabel code={employee.countryCode} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
                </TableCell>
                <TableCell className="text-muted-foreground hidden pr-4 lg:table-cell">
                  {date(employee.hireDate)}
                </TableCell>
              </TableRow>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={COLUMNS.length} style={{ height: paddingBottom }} />
            </tr>
          )}
          {loadingMore &&
            Array.from({ length: 3 }, (_, i) => (
              <TableRow key={`more-${i}`} className="hover:bg-transparent" aria-hidden>
                {COLUMNS.map((c) => (
                  <TableCell key={c.field} className={c.className}>
                    {c.field === "fullName" ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    ) : (
                      <Skeleton className="h-4 w-full" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!hasMore && rows.length > 0 && !loading && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={COLUMNS.length}
                className="text-muted-foreground py-4 text-center text-xs"
              >
                That&apos;s everyone: {rows.length.toLocaleString()}{" "}
                {rows.length === 1 ? "person" : "people"}.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TableFooterBar>
        <span className="text-muted-foreground tabular-nums" aria-live="polite">
          {total === undefined
            ? " "
            : `Showing ${rows.length.toLocaleString()} of ${total.toLocaleString()} · scroll to load more`}
        </span>
        {loadingMore && (
          <Loader2
            className="text-muted-foreground size-4 animate-spin"
            aria-label="Loading more"
          />
        )}
      </TableFooterBar>

      {showTop && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute right-4 bottom-14 shadow-md"
          onClick={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronsUp className="size-4" aria-hidden /> Back to top
        </Button>
      )}
    </div>
  );
}

function EmployeePreview({ employee }: { employee: EmployeeSummary }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={employee.fullName} className="size-10" />
        <div className="min-w-0">
          <p className="truncate font-medium">{employee.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{employee.jobTitle}</p>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-col gap-1.5 text-xs">
        <span className="flex items-center gap-2">
          <Mail className="size-3.5" aria-hidden /> {employee.email}
        </span>
        <span className="flex items-center gap-2">
          <Hash className="size-3.5" aria-hidden /> {employee.employeeCode} ·{" "}
          {humanize(employee.employmentType)}
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays className="size-3.5" aria-hidden /> Hired {date(employee.hireDate)}
        </span>
      </div>
      <p className="text-base font-semibold tabular-nums">
        {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
        <span className="text-muted-foreground text-xs font-normal"> / year</span>
      </p>
    </div>
  );
}
