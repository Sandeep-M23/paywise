"use client";

import { useSetAtom } from "jotai";
import { useState } from "react";
import { Download, Plus } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { toQueryString } from "@/utils/services";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { useDirectoryQuery } from "@/hooks/useDirectoryQuery";
import { useEmployeeDirectory } from "@/utils/apis/employees";
import { DirectoryFilters } from "@/components/Block/Employees/DirectoryFilters";
import { EmployeeFormDialog } from "@/components/Block/Employees/EmployeeFormDialog";
import { EmployeeSheet } from "@/components/Block/Employees/EmployeeSheet";
import { EmployeeTable } from "@/components/Block/Employees/EmployeeTable";

export function EmployeesView() {
  const [query, setQuery] = useDirectoryQuery();
  const directory = useEmployeeDirectory(query);
  const rows = directory.data?.pages.flatMap((page) => page.data) ?? [];
  const total = directory.data?.pages[0]?.total;
  const select = useSetAtom(selectedEmployeeIdAtom);
  const [adding, setAdding] = useState(false);

  const { sort: _sort, order: _order, ...filters } = query;
  const exportHref = `/api/export/employees.csv${toQueryString(filters)}`;

  return (
    <>
      <DirectoryFilters
        query={query}
        onChange={setQuery}
        actions={
          <>
            <Button variant="outline" className="bg-card" asChild>
              <a href={exportHref} download title="Export these rows to CSV">
                <Download className="size-4" aria-hidden /> Export
              </a>
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add employee
            </Button>
          </>
        }
      />
      <EmployeeTable
        rows={rows}
        total={total}
        filters={query}
        loading={directory.isLoading}
        fetching={directory.isFetching}
        hasMore={directory.hasNextPage}
        loadingMore={directory.isFetchingNextPage}
        onLoadMore={directory.fetchNextPage}
        onSort={(sort, order) => setQuery({ sort, order })}
        onSelect={select}
        onClearFilters={() =>
          setQuery({
            q: undefined,
            country: undefined,
            jobTitle: undefined,
            department: undefined,
            status: "active",
          })
        }
      />
      <EmployeeSheet />
      <EmployeeFormDialog open={adding} onOpenChange={setAdding} onSaved={(e) => select(e.id)} />
    </>
  );
}
