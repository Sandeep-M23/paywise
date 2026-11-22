"use client";

import { useQueryClient } from "@tanstack/react-query";

export const STABLE = 5 * 60_000;

export const keys = {
  employees: ["employees"] as const,
  employee: (id: string) => ["employees", "detail", id] as const,
  filters: ["meta", "filters"] as const,
  insights: ["insights"] as const,
  fairness: ["fairness"] as const,
  imports: ["imports"] as const,
};

export function useInvalidateEmployeeData() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: keys.employees }),
      client.invalidateQueries({ queryKey: keys.insights }),
      client.invalidateQueries({ queryKey: keys.fairness }),
      client.invalidateQueries({ queryKey: keys.filters }),
      client.invalidateQueries({ queryKey: keys.imports }),
    ]);
}
