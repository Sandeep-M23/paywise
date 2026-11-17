"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { employeeListQuerySchema, type EmployeeListQuery } from "@paywise/shared";

const DEFAULTS = employeeListQuerySchema.parse({});

/** Directory filters, sort and page, stored in the URL as the single source of truth. */
export function useDirectoryQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo<EmployeeListQuery>(() => {
    const parsed = employeeListQuerySchema.safeParse(Object.fromEntries(searchParams));
    return parsed.success ? parsed.data : DEFAULTS;
  }, [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<EmployeeListQuery>) => {
      // Any change other than paging starts again from page 1.
      const next = { ...query, ...patch, page: patch.page ?? 1 };
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        const isDefault = DEFAULTS[key as keyof EmployeeListQuery] === value;
        if (value !== undefined && value !== "" && !isDefault) params.set(key, String(value));
      }
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [query, router, pathname],
  );

  return [query, setQuery] as const;
}
