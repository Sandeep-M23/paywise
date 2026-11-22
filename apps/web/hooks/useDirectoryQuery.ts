"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { employeeListQuerySchema } from "@paywise/shared";
import type { DirectoryFilters } from "@/@types";

const { page: _page, pageSize: _pageSize, ...DEFAULTS } = employeeListQuerySchema.parse({});

export function useDirectoryQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo<DirectoryFilters>(() => {
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(searchParams.keys())) {
      const values = searchParams.getAll(key);
      raw[key] = values.length === 1 ? values[0]! : values;
    }
    const parsed = employeeListQuerySchema.safeParse(raw);
    if (!parsed.success) return DEFAULTS;
    const { page: _p, pageSize: _s, ...filters } = parsed.data;
    return filters;
  }, [searchParams]);

  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  const setQuery = useCallback(
    (patch: Partial<DirectoryFilters>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (Array.isArray(value)) {
          for (const item of value) params.append(key, item);
          continue;
        }
        const isDefault = DEFAULTS[key as keyof DirectoryFilters] === value;
        if (value !== undefined && value !== "" && !isDefault) params.set(key, String(value));
      }
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return [query, setQuery] as const;
}
