"use client";

import Link from "next/link";
import { FileUp, Scale, TrendingUp, Users } from "@/components/icons";
import { StatTile } from "@/components/shared/StatCard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenderGaps, useOutliers } from "@/utils/apis/fairness";
import { useImportLog } from "@/utils/apis/imports";
import { useCountrySummaries } from "@/utils/apis/insights";
import { gapKind } from "@/utils/helpers/fairness";

export function OverviewKpis() {
  const countries = useCountrySummaries();
  const gaps = useGenderGaps({});
  const outliers = useOutliers({});
  const imports = useImportLog();
  const headcount = countries.data?.reduce((sum, c) => sum + c.headcount, 0);
  const review = gaps.data?.filter((g) => gapKind(g) === "review") ?? [];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Kpi
        icon={Users}
        label="Active employees"
        value={headcount?.toLocaleString()}
        hint={countries.data ? `in ${countries.data.length} countries` : undefined}
        href="/employees"
      />
      <Kpi
        icon={Scale}
        label="Pay gaps to review"
        value={gaps.data ? review.length : undefined}
        hint="≥ 5% and unlikely to be chance"
        href="/fairness"
        tone={review.length > 0 ? "warning" : undefined}
      />
      <Kpi
        icon={TrendingUp}
        label="Pay outliers"
        value={outliers.data?.length}
        hint="Far from peers in role and country"
        href="/fairness"
      />
      <Kpi
        icon={FileUp}
        label="Last import"
        value={
          imports.data
            ? imports.data[0]
              ? new Date(imports.data[0].createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              : "None yet"
            : undefined
        }
        hint={imports.data?.[0]?.filename}
        href="/import"
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  href,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number | undefined;
  hint?: string;
  href: string;
  tone?: "warning";
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring/50 rounded-xl transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3"
    >
      <StatTile
        icon={icon}
        label={label}
        tone={tone}
        hint={hint}
        value={value === undefined ? <Skeleton className="h-6 w-20" /> : value}
      />
    </Link>
  );
}
