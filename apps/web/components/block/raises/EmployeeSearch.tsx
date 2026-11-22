"use client";

import { useState } from "react";
import type { EmployeeSummary } from "@paywise/shared";
import { Plus, Search } from "@/components/icons";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useEmployeeSearch } from "@/utils/apis/employees";
import { money } from "@/utils/helpers/others/format";

export function EmployeeSearch({
  exclude,
  onPick,
}: {
  exclude: string[];
  onPick: (employee: EmployeeSummary) => void;
}) {
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 200);
  const { data, isFetching } = useEmployeeSearch(q, "active");
  const results = (data?.data ?? []).filter((e) => !exclude.includes(e.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Find an employee"
          placeholder="Find an employee by name, email or code"
          className="pl-9"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {q.length >= 2 && (
        <ul className="rounded-lg border">
          {results.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {isFetching ? "Searching…" : "No active employee matches."}
            </li>
          )}
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                onClick={() => {
                  onPick(e);
                  setTerm("");
                }}
              >
                <EmployeeAvatar name={e.fullName} className="size-7" />
                <span className="min-w-0 flex-1 truncate">
                  {e.fullName}{" "}
                  <span className="text-muted-foreground">
                    · {e.jobTitle}, {e.countryCode}
                  </span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {money(e.salary.amount, e.salary.currency, e.countryCode, "none")}
                </span>
                <Plus className="text-muted-foreground size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
