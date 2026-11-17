"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileUp,
  Plus,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeSheet } from "@/components/employees/employee-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CountryLabel, EmployeeAvatar, IconBadge } from "@/components/data/visuals";
import { insightsCountryAtom, selectedEmployeeIdAtom } from "@/lib/atoms";
import { useClientNow } from "@/lib/hooks/use-client-now";
import { countryName, money, percent } from "@/lib/format";
import { useCountrySummaries, useGenderGaps, useImportLog, useOutliers } from "@/lib/queries";

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
  const [adding, setAdding] = useState(false);
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
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground h-5 text-sm">
            {now?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting(now)}, <span className="text-muted-foreground">HR team</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {headcount === undefined
              ? "Loading…"
              : `${headcount.toLocaleString()} active employees across ${countries.data?.length} countries.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/import">
              <FileUp className="size-4" aria-hidden /> Import CSV
            </Link>
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add employee
          </Button>
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
              Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            {sortedCountries.map((c) => (
              <button
                key={c.countryCode}
                type="button"
                onClick={() => {
                  setInsightsCountry(c.countryCode);
                  router.push("/insights");
                }}
                className="hover:bg-muted group grid grid-cols-[9rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 text-left text-sm"
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
              {gaps.isLoading && <Skeleton className="h-24 w-full" />}
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
                <Link href="/fairness" className="text-primary px-2 text-sm hover:underline">
                  See all {review.length}
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
              {outliers.isLoading && <Skeleton className="h-24 w-full" />}
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
        <Button variant="link" className="h-auto p-0" asChild>
          <a href="/api/export/employees.csv" download>
            <Download className="size-3.5" aria-hidden /> Export all active employees
          </a>
        </Button>
      </div>

      <EmployeeSheet />
      <EmployeeFormDialog
        open={adding}
        onOpenChange={setAdding}
        onSaved={(e) => selectEmployee(e.id)}
      />
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
    <Link href={href} className="group">
      <Card className="group-hover:ring-primary/30 h-full gap-0 py-4 transition-shadow">
        <CardContent className="flex items-start justify-between gap-3 px-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">{label}</span>
            {value === undefined ? (
              <Skeleton className="mt-1 h-8 w-20" />
            ) : (
              <span
                className={`text-3xl font-semibold tracking-tight tabular-nums ${tone === "warning" ? "text-warning" : ""}`}
              >
                {value}
              </span>
            )}
            {hint && <span className="text-muted-foreground truncate text-xs">{hint}</span>}
          </div>
          <IconBadge icon={icon} tone={tone ?? "primary"} />
        </CardContent>
      </Card>
    </Link>
  );
}
