"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { ArrowRight, ChevronRight } from "lucide-react";
import { AlertTriangle, Download, FileUp, Scale, TrendingUp, Users } from "@/components/icons";
import { EmployeeSheet } from "@/components/block/employees/EmployeeSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { StatTile } from "@/components/shared/StatCard/StatCard";
import { insightsCountryAtom } from "@/utils/atoms/insights";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { useClientNow } from "@/hooks/useClientNow";
import { countryName, money, percent } from "@/utils/helpers/others/format";
import { useCountrySummaries } from "@/utils/apis/insights";
import { useGenderGaps, useOutliers } from "@/utils/apis/fairness";
import { useImportLog } from "@/utils/apis/imports";
import { useDownload } from "@/hooks/useDownload";

function greeting(now: Date | null) {
  if (!now) return "Welcome";
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** The HR manager's starting point: where things stand and what needs a look. */
export function OverviewView() {
  const router = useRouter();
  const selectEmployee = useSetAtom(selectedEmployeeIdAtom);
  const setInsightsCountry = useSetAtom(insightsCountryAtom);
  const download = useDownload();
  const now = useClientNow();
  const countries = useCountrySummaries();
  const gaps = useGenderGaps({});
  const outliers = useOutliers({});
  const imports = useImportLog();

  const headcount = countries.data?.reduce((sum, c) => sum + c.headcount, 0);
  const largest = Math.max(1, ...(countries.data?.map((c) => c.headcount) ?? [1]));
  const review = gaps.data?.filter((g) => g.flagged && g.significant) ?? [];
  const sortedCountries = [...(countries.data ?? [])].sort((a, b) => b.headcount - a.headcount);

  return (
    <>
      <section>
        <div>
          <p className="text-muted-foreground h-5 text-sm">
            {now?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting(now)}, <span className="text-muted-foreground">HR team</span>
          </h2>
        </div>
      </section>

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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Countries</CardTitle>
            <CardDescription>
              Headcount and median annual salary, in local currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {countries.isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 px-2 py-3"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            {sortedCountries.map((c) => (
              <button
                key={c.countryCode}
                type="button"
                onClick={() => {
                  setInsightsCountry(c.countryCode);
                  router.push("/insights");
                }}
                className="hover:bg-muted group grid grid-cols-[9rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left text-sm"
              >
                <span className="truncate font-medium">
                  <CountryLabel code={c.countryCode} />
                </span>
                <span className="flex items-center gap-3">
                  <Progress
                    value={(c.headcount / largest) * 100}
                    className="h-2"
                    aria-label={`${countryName(c.countryCode)} headcount`}
                  />
                  <span className="text-muted-foreground w-12 shrink-0 text-right tabular-nums">
                    {c.headcount.toLocaleString()}
                  </span>
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  {money(c.median, c.currency, c.countryCode, "none")}
                  <ArrowRight
                    className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" aria-hidden /> Gender gaps to review
              </CardTitle>
              <CardDescription>
                Largest first. Women paid less shows as a positive gap.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {gaps.isLoading &&
                Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-12 rounded-md" />
                  </div>
                ))}
              {gaps.data && review.length === 0 && (
                <p className="text-muted-foreground text-sm">Nothing needs review. 🎉</p>
              )}
              {review.slice(0, 4).map((g) => (
                <Link
                  key={`${g.countryCode}-${g.jobTitle}`}
                  href="/fairness"
                  className="hover:bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {g.jobTitle}{" "}
                    <span className="text-muted-foreground">· {countryName(g.countryCode)}</span>
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    {g.meanGap! > 0 ? "+" : ""}
                    {percent(g.meanGap!)}
                  </Badge>
                </Link>
              ))}
              {review.length > 4 && (
                <Link
                  href="/fairness"
                  className="text-link flex items-center gap-1 px-2 text-sm font-semibold hover:underline"
                >
                  See all {review.length} <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
            </CardContent>
          </Card>

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
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        Need the data in Excel?
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => download("/export/employees.csv")}
        >
          <Download className="size-3.5" aria-hidden /> Export all active employees
        </Button>
      </div>

      <EmployeeSheet />
    </>
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
