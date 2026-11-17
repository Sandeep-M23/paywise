"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
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
import { useFilterOptions, type DirectoryFilters as Filters } from "@/lib/queries";

const ALL = "__all__";

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

  const filtered = Boolean(
    query.q || query.country || query.jobTitle || query.department || query.status !== "active",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" aria-hidden />
        <Input
          ref={searchRef}
          type="search"
          aria-label="Search by name, email or employee code"
          placeholder="Search name, email or code"
          className="bg-card pr-9 pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd className="text-muted-foreground bg-muted pointer-events-none absolute top-2 right-2 hidden rounded border px-1.5 font-mono text-[10px] leading-5 sm:block">
          /
        </kbd>
      </div>
      <FilterSelect
        label="Country"
        allLabel="All countries"
        value={query.country}
        options={(options?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
        onChange={(country) => onChange({ country: country as Filters["country"] })}
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
        onValueChange={(status) => onChange({ status: status as Filters["status"] })}
      >
        <SelectTrigger className="bg-card w-[calc(50%-0.25rem)] sm:w-32" aria-label="Status">
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
      <SelectTrigger className="bg-card w-[calc(50%-0.25rem)] sm:w-44" aria-label={label}>
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
