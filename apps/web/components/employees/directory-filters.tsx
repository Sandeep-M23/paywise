"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Briefcase, Building2, Globe, Search, UserCheck, Users, UserX } from "@/components/icons";
import { FilterBar, type Facet } from "@/components/data/filter-bar";
import { countryFlag, departmentIcon } from "@/components/data/visuals";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import type { CountryCode } from "@paywise/shared";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  useCountrySummaries,
  useFilterOptions,
  type DirectoryFilters as Filters,
} from "@/lib/queries";

// Active is the default; clearing the filter goes back to it.
const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    icon: <UserCheck className="text-success size-4" aria-hidden />,
  },
  {
    value: "inactive",
    label: "Inactive",
    icon: <UserX className="text-muted-foreground size-4" aria-hidden />,
  },
  {
    value: "all",
    label: "All employees",
    icon: <Users className="text-muted-foreground size-4" aria-hidden />,
  },
];

export function DirectoryFilters({
  query,
  onChange,
  actions,
}: {
  query: Filters;
  onChange: (patch: Partial<Filters>) => void;
  /** Page actions (export, add) that sit at the end of the same row. */
  actions?: ReactNode;
}) {
  const { data: options } = useFilterOptions();
  const { data: summaries } = useCountrySummaries();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search from anywhere on the page (unless already typing).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.closest("input, textarea, [contenteditable]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the box in sync when filters are cleared elsewhere.
  useEffect(() => {
    if (!query.q) setSearch("");
  }, [query.q]);

  useEffect(() => {
    if ((debounced || undefined) !== query.q) onChange({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);

  // Headcounts are for active employees, the default view.
  const headcount = (code: string) => summaries?.find((c) => c.countryCode === code)?.headcount;
  const list = <T extends string>(values: string[]) =>
    values.length ? (values as T[]) : undefined;

  const facets: Facet[] = [
    {
      key: "country",
      label: "Country",
      icon: Globe,
      selected: query.country ?? [],
      options: (options?.countries ?? []).map((c) => ({
        value: c.code,
        label: c.name,
        icon: (
          <span aria-hidden className="text-base leading-none">
            {countryFlag(c.code)}
          </span>
        ),
        count: headcount(c.code),
      })),
      onChange: (values) => onChange({ country: list<CountryCode>(values) }),
    },
    {
      key: "department",
      label: "Department",
      icon: Building2,
      selected: query.department ?? [],
      options: (options?.departments ?? []).map((d) => {
        const Icon = departmentIcon(d);
        return {
          value: d,
          label: d,
          icon: <Icon className="text-muted-foreground size-4" aria-hidden />,
        };
      }),
      onChange: (values) => onChange({ department: list(values) }),
    },
    {
      key: "jobTitle",
      label: "Job title",
      icon: Briefcase,
      selected: query.jobTitle ?? [],
      options: (options?.jobTitles ?? []).map((t) => ({ value: t, label: t })),
      onChange: (values) => onChange({ jobTitle: list(values) }),
    },
    {
      key: "status",
      label: "Status",
      icon: UserCheck,
      single: true,
      defaultValue: ["active"],
      selected: [query.status],
      options: STATUS_OPTIONS,
      onChange: (values) => onChange({ status: (values[0] as Filters["status"]) ?? "active" }),
    },
  ];

  // One row: search, the Filters button with the active filters as chips, and the
  // page actions on the right.
  return (
    <FilterBar
      facets={facets}
      leading={
        <>
          <div className="relative w-full sm:w-56">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              aria-label="Search by name, email or employee code"
              placeholder="Search people"
              className="bg-card h-9 pr-10 pl-9 shadow-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:inline-flex">
              /
            </Kbd>
          </div>
        </>
      }
    >
      {actions && <div className="ml-auto flex shrink-0 gap-2">{actions}</div>}
    </FilterBar>
  );
}
