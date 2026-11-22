"use client";

import { ChevronsUp, Loader2 } from "lucide-react";
import type { EmployeeSummary } from "@paywise/shared";
import type { DirectoryFilters, SortField } from "@/@types";
import { SearchX } from "@/components/icons";
import { TableFooterBar } from "@/components/shared/TableFrame/TableFrame";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useVirtualRows } from "@/hooks/useVirtualRows";
import { cn } from "@/lib/utils";
import {
  EMPLOYEE_COLUMNS as COLUMNS,
  PREFETCH_ROWS,
  ROW_HEIGHT,
} from "@/utils/constants/employees";
import { fill, fillScrollTable } from "@/utils/constants/table";
import { EmployeeRow } from "./EmployeeRow";
import { EmployeeSkeletonRows } from "./EmployeeSkeletonRows";
import { EmployeeTableHeader } from "./EmployeeTableHeader";

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
  const { scroller, items, measureElement, paddingTop, paddingBottom, showTop, scrollToTop } =
    useVirtualRows({
      count: rows.length,
      rowHeight: ROW_HEIGHT,
      prefetch: PREFETCH_ROWS,
      hasMore,
      loadingMore,
      onLoadMore,
      resetKey: JSON.stringify(filters),
    });

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
        <EmployeeTableHeader filters={filters} onSort={onSort} />
        <TableBody>
          {loading && <EmployeeSkeletonRows count={14} keyPrefix="loading" />}
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
          {items.map((item) => (
            <EmployeeRow
              key={rows[item.index]!.id}
              employee={rows[item.index]!}
              index={item.index}
              measureElement={measureElement}
              onSelect={onSelect}
            />
          ))}
          {paddingBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={COLUMNS.length} style={{ height: paddingBottom }} />
            </tr>
          )}
          {loadingMore && (
            <EmployeeSkeletonRows count={3} keyPrefix="more" rowClassName="hover:bg-transparent" />
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
          onClick={scrollToTop}
        >
          <ChevronsUp className="size-4" aria-hidden /> Back to top
        </Button>
      )}
    </div>
  );
}
