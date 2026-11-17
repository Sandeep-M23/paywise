"use client";

import { useSetAtom } from "jotai";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { toQueryString } from "@/lib/api";
import { selectedEmployeeIdAtom } from "@/lib/atoms";
import { useDirectoryQuery } from "@/lib/hooks/use-directory-query";
import { useEmployees } from "@/lib/queries";
import { DirectoryFilters } from "./directory-filters";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeSheet } from "./employee-sheet";
import { EmployeeTable } from "./employee-table";

export function EmployeesView() {
  const [query, setQuery] = useDirectoryQuery();
  const { data, isLoading, isFetching } = useEmployees(query);
  const select = useSetAtom(selectedEmployeeIdAtom);
  const [adding, setAdding] = useState(false);

  const { page: _page, pageSize: _size, sort: _sort, order: _order, ...filters } = query;
  const exportHref = `/api/export/employees.csv${toQueryString(filters)}`;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Search, filter and maintain salary records."
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
        page={data}
        query={query}
        loading={isLoading}
        fetching={isFetching}
        onSort={(sort, order) => setQuery({ sort, order })}
        onPage={(page) => setQuery({ page })}
        onSelect={select}
      />
      <EmployeeSheet />
      <EmployeeFormDialog open={adding} onOpenChange={setAdding} onSaved={(e) => select(e.id)} />
    </>
  );
}
