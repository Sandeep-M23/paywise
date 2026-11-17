"use client";

import { useSetAtom } from "jotai";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { toQueryString } from "@/lib/api";
import { selectedEmployeeIdAtom } from "@/lib/atoms";
import { useDirectoryQuery } from "@/lib/hooks/use-directory-query";
import { useEmployeeDirectory } from "@/lib/queries";
import { DirectoryFilters } from "./directory-filters";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeSheet } from "./employee-sheet";
import { EmployeeTable } from "./employee-table";

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
      <PageHeader
        title="Employees"
        description="Search, filter and maintain salary records. Select a row to see history and make changes."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={exportHref} download>
                <Download className="size-4" aria-hidden /> Export CSV
              </a>
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add employee
            </Button>
          </>
        }
      />
      <DirectoryFilters query={query} onChange={setQuery} />
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
