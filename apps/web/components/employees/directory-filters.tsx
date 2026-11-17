"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { EmployeeListQuery } from "@paywise/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useFilterOptions } from "@/lib/queries";

const ALL = "__all__";

export function DirectoryFilters({
  query,
  onChange,
}: {
  query: EmployeeListQuery;
  onChange: (patch: Partial<EmployeeListQuery>) => void;
}) {
  const { data: options } = useFilterOptions();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search);

  useEffect(() => {
    if ((debounced || undefined) !== query.q) onChange({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);

  const filtered = Boolean(
    query.q || query.country || query.jobTitle || query.department || query.status !== "active",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" aria-hidden />
        <Input
          aria-label="Search by name, email or employee code"
          placeholder="Search name, email or code"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <FilterSelect
        label="Country"
        allLabel="All countries"
        value={query.country}
        options={(options?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
        onChange={(country) => onChange({ country: country as EmployeeListQuery["country"] })}
      />
      <FilterSelect
        label="Department"
        allLabel="All departments"
        value={query.department}
        options={(options?.departments ?? []).map((d) => ({ value: d, label: d }))}
        onChange={(department) => onChange({ department })}
      />
      <FilterSelect
        label="Job title"
        allLabel="All job titles"
        value={query.jobTitle}
        options={(options?.jobTitles ?? []).map((t) => ({ value: t, label: t }))}
        onChange={(jobTitle) => onChange({ jobTitle })}
      />
      <Select
        value={query.status}
        onValueChange={(status) => onChange({ status: status as EmployeeListQuery["status"] })}
      >
        <SelectTrigger className="w-32" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      {filtered && (
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
              status: "active",
            });
          }}
        >
          <X className="size-4" aria-hidden /> Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className="w-44" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
