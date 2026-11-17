"use client";

import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsUp, Loader2, SearchX } from "lucide-react";
import type { EmployeeSummary } from "@paywise/shared";
import { scrollTable, stickyHeader } from "@/components/app/sticky";
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
import { date, humanize, money } from "@/lib/format";
import { CountryLabel, DepartmentLabel, EmployeeAvatar } from "@/components/data/visuals";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Mail, CalendarDays, Hash } from "lucide-react";
import type { DirectoryFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

type SortField = DirectoryFilters["sort"];

// Less important columns give way on smaller screens; name and salary always stay.
const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "fullName", label: "Name" },
  { field: "employeeCode", label: "Code", className: "hidden xl:table-cell" },
  { field: "jobTitle", label: "Job title", className: "hidden md:table-cell" },
  { field: "department", label: "Department", className: "hidden lg:table-cell" },
  { field: "countryCode", label: "Country", className: "hidden sm:table-cell" },
  { field: "salaryAmount", label: "Annual salary", className: "text-right" },
  { field: "hireDate", label: "Hired", className: "hidden lg:table-cell" },
];

const ROW_HEIGHT = 53;
// Start loading the next batch this many rows before the end, so scrolling doesn't stall.
const PREFETCH_ROWS = 20;

/**
 * Infinite, virtualised directory: batches of 50 load as the user nears the
 * end, and only the rows in view (plus a small overscan) are in the DOM, so
 * scrolling through all 10,000 people stays smooth.
 */
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

  // A new filter or sort is a new list: start reading from the top.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [filterKey]);

  // Offer "back to top" once the user is a few screens down.
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
    <div className="bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-xs">
      <Table
        containerRef={scroller}
        containerClassName={scrollTable("h-[calc(100dvh-16rem)] min-h-80")}
        className={cn(fetching && !loadingMore && !loading && "opacity-60 transition-opacity")}
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
                  className={cn("text-muted-foreground h-11 text-xs font-medium", className)}
                  aria-sort={
                    active ? (filters.order === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1",
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
                  <TableCell key={c.field} className={c.className}>
                    <Skeleton className="h-4 w-full" />
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
                <TableCell className="py-2">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={employee.fullName} />
                    <div className="min-w-0">
                      <HoverCard openDelay={400}>
                        <HoverCardTrigger asChild>
                          <span className="flex items-center gap-2 font-medium">
                            {employee.fullName}
                            {employee.status === "inactive" && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="w-72">
                          <EmployeePreview employee={employee} />
                        </HoverCardContent>
                      </HoverCard>
                      {/* On small screens the hidden columns' key facts move under the name. */}
                      <div className="text-muted-foreground truncate text-xs md:hidden">
                        {employee.jobTitle} · {employee.countryCode}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden font-mono text-xs xl:table-cell">
                  {employee.employeeCode}
                </TableCell>
                <TableCell className="hidden md:table-cell">{employee.jobTitle}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <DepartmentLabel name={employee.department} className="text-muted-foreground" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <CountryLabel code={employee.countryCode} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
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
          {loadingMore && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={COLUMNS.length}
                className="text-muted-foreground py-4 text-center text-sm"
              >
                <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden /> Loading more…
              </TableCell>
            </TableRow>
          )}
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

      <div className="bg-card flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">
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
      </div>

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
