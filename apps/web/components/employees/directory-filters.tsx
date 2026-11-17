"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Building2, Globe, Search, UserCheck, Users, UserX, X } from "lucide-react";
import { FilterCombobox } from "@/components/data/filter-combobox";
import { countryFlag, departmentIcon } from "@/components/data/visuals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useFilterOptions, type DirectoryFilters as Filters } from "@/lib/queries";

export function DirectoryFilters({
  query,
  onChange,
}: {
  query: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const { data: options } = useFilterOptions();
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

  const active = [query.q, query.country, query.jobTitle, query.department].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search by name, email or employee code"
            placeholder="Search name, email or code"
            className="bg-card pr-10 pl-9 shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-1">
          <FilterCombobox
            className="lg:w-48"
            label="Country"
            icon={Globe}
            value={query.country}
            options={(options?.countries ?? []).map((c) => ({
              value: c.code,
              label: c.name,
              icon: <span aria-hidden>{countryFlag(c.code)}</span>,
            }))}
            onChange={(country) => onChange({ country: country as Filters["country"] })}
          />
          <FilterCombobox
            className="lg:w-52"
            label="Department"
            icon={Building2}
            value={query.department}
            options={(options?.departments ?? []).map((d) => {
              const Icon = departmentIcon(d);
              return {
                value: d,
                label: d,
                icon: <Icon className="text-muted-foreground size-4" aria-hidden />,
              };
            })}
            onChange={(department) => onChange({ department })}
          />
          <FilterCombobox
            className="lg:w-56"
            label="Job title"
            icon={Briefcase}
            value={query.jobTitle}
            options={(options?.jobTitles ?? []).map((t) => ({ value: t, label: t }))}
            onChange={(jobTitle) => onChange({ jobTitle })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={query.status}
          onValueChange={(status) => status && onChange({ status: status as Filters["status"] })}
          aria-label="Employment status"
        >
          <ToggleGroupItem value="active" aria-label="Active employees">
            <UserCheck className="size-4" aria-hidden /> Active
          </ToggleGroupItem>
          <ToggleGroupItem value="inactive" aria-label="Inactive employees">
            <UserX className="size-4" aria-hidden /> Inactive
          </ToggleGroupItem>
          <ToggleGroupItem value="all" aria-label="All employees">
            <Users className="size-4" aria-hidden /> All
          </ToggleGroupItem>
        </ToggleGroup>
        {active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              onChange({
                q: undefined,
                country: undefined,
                jobTitle: undefined,
                department: undefined,
              });
            }}
          >
            <X className="size-4" aria-hidden /> Clear {active} filter{active > 1 ? "s" : ""}
          </Button>
        )}
      </div>
    </div>
  );
}
