"use client";

import { useSetAtom } from "jotai";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutliers } from "@/utils/apis/fairness";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { percent } from "@/utils/helpers/others/format";

export function FurthestFromPeersCard() {
  const selectEmployee = useSetAtom(selectedEmployeeIdAtom);
  const outliers = useOutliers({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Furthest from peers</CardTitle>
        <CardDescription>Open a record to check it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {outliers.isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        {outliers.data?.slice(0, 4).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => selectEmployee(o.id)}
            className="hover:bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <EmployeeAvatar name={o.fullName} className="size-7" />
              <span className="min-w-0 truncate">
                {o.fullName}{" "}
                <span className="text-muted-foreground">
                  · {o.jobTitle}, {o.countryCode}
                </span>
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              {o.direction === "above" ? "▲" : "▼"} {percent(o.deviation, 0)}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
