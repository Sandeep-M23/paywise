"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { employeeListQuerySchema } from "@paywise/shared";
import type { DirectoryFilters } from "../queries";

const { page: _page, pageSize: _pageSize, ...DEFAULTS } = employeeListQuerySchema.parse({});

/**
 * Directory filters and sort, stored in the URL as the single source of truth
 * (shareable, survive a reload). Scroll position isn't stored; the list is
 * infinite, so a shared link opens at the top.
 */
export function useDirectoryQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo<DirectoryFilters>(() => {
    const parsed = employeeListQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return DEFAULTS;
    const { page: _p, pageSize: _s, ...filters } = parsed.data;
    return filters;
  }, [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<DirectoryFilters>) => {
      const next = { ...query, ...patch };
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        const isDefault = DEFAULTS[key as keyof DirectoryFilters] === value;
        if (value !== undefined && value !== "" && !isDefault) params.set(key, String(value));
      }
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [query, router, pathname],
  );

  return [query, setQuery] as const;
}
