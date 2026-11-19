"use client";

import type { EmployeeDetail } from "@paywise/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { countryName, money, percent } from "@/utils/helpers/format";
import { useJobTitleSummaries } from "@/utils/apis/insights";

/**
 * Where this salary sits among active peers (same job title and country):
 * a min-to-max track with the median marked, in words as well as visually.
 */
export function PeerPosition({ employee }: { employee: EmployeeDetail }) {
  const { data, isLoading } = useJobTitleSummaries(employee.countryCode);
  if (isLoading) return <Skeleton className="h-16 w-full" />;

  const peers = data?.find((t) => t.jobTitle === employee.jobTitle);
  if (!peers || peers.headcount < 3) {
    return (
      <p className="text-muted-foreground text-sm">
        Not enough peers in this role and country to compare.
      </p>
    );
  }

  const { currency } = employee.salary;
  const span = Math.max(1, peers.max - peers.min);
  const at = (amount: number) =>
    `${Math.min(100, Math.max(0, ((amount - peers.min) / span) * 100))}%`;
  const vsMedian = employee.salary.amount / peers.median - 1;
  const fmt = (amount: number) => money(amount, currency, employee.countryCode, "none");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        <span className="font-medium">
          {Math.abs(vsMedian) < 0.005
            ? "At"
            : `${percent(Math.abs(vsMedian), 0)} ${vsMedian > 0 ? "above" : "below"}`}
        </span>{" "}
        the median of {peers.headcount} {employee.jobTitle}s in {countryName(employee.countryCode)}.
      </p>
      <div
        className="relative mt-2 mb-1 h-2 rounded-full bg-muted"
        role="img"
        aria-label={`Salary position between ${fmt(peers.min)} and ${fmt(peers.max)}`}
      >
        <span
          className="bg-muted-foreground/60 absolute -top-1 h-4 w-0.5 rounded"
          style={{ left: at(peers.median) }}
          aria-hidden
        />
        <span
          className="bg-primary ring-card absolute -top-1 size-4 -translate-x-1/2 rounded-full ring-2"
          style={{ left: at(employee.salary.amount) }}
          aria-hidden
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span>Lowest {fmt(peers.min)}</span>
        <span>Median {fmt(peers.median)}</span>
        <span>Highest {fmt(peers.max)}</span>
      </div>
    </div>
  );
}
