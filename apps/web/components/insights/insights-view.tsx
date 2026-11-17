"use client";

import { useAtom } from "jotai";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { currencyForCountry, type CountryCode } from "@paywise/shared";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { insightsCountryAtom } from "@/lib/atoms";
import { compactMoney, countryName, money } from "@/lib/format";
import {
  useCountrySummaries,
  useDepartmentSummaries,
  useDistribution,
  useJobTitleSummaries,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { CountryPicker } from "./country-picker";
import { Stat } from "./stat";

const medianChart = {
  median: { label: "Median salary", color: "var(--chart-1)" },
} satisfies ChartConfig;
const countChart = { count: { label: "Employees", color: "var(--chart-1)" } } satisfies ChartConfig;

export function InsightsView() {
  const [country, setCountry] = useAtom(insightsCountryAtom);
  const currency = currencyForCountry(country as CountryCode);
  const countries = useCountrySummaries();
  const titles = useJobTitleSummaries(country);
  const departments = useDepartmentSummaries(country);
  const distribution = useDistribution(country);
  const summary = countries.data?.find((c) => c.countryCode === country);
  const fmt = (amount: number) => money(amount, currency, country);
  const short = (amount: number) => compactMoney(amount, currency, country);

  return (
    <>
      <PageHeader
        title="Pay insights"
        description="How we pay people, per country in local currency. Active employees only; medians match Excel's PERCENTILE.INC."
      />

      <Card>
        <CardHeader>
          <CardTitle>By country</CardTitle>
          <CardDescription>Select a row to explore that country below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="text-right">Median</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-right">Lowest</TableHead>
                <TableHead className="text-right">Highest</TableHead>
                <TableHead className="text-right">Annual payroll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.isLoading && <LoadingRows columns={7} />}
              {countries.data?.map((c) => (
                <TableRow
                  key={c.countryCode}
                  className={cn("cursor-pointer", c.countryCode === country && "bg-muted")}
                  onClick={() => setCountry(c.countryCode)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setCountry(c.countryCode)}
                  aria-selected={c.countryCode === country}
                >
                  <TableCell className="font-medium">{countryName(c.countryCode)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.headcount.toLocaleString()}
                  </TableCell>
                  {[c.median, c.mean, c.min, c.max, c.total].map((amount, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {money(amount, c.currency, c.countryCode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{countryName(country)}</h2>
        <CountryPicker value={country} onChange={(code) => code && setCountry(code)} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Employees" value={summary ? summary.headcount.toLocaleString() : "–"} />
        <Stat label="Median salary" value={summary ? fmt(summary.median) : "–"} />
        <Stat
          label="Average salary"
          value={summary ? fmt(summary.mean) : "–"}
          hint={
            summary && summary.mean > summary.median
              ? "Above the median: a few high earners pull the average up."
              : undefined
          }
        />
        <Stat label="Annual payroll" value={summary ? fmt(summary.total) : "–"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Median salary by job title</CardTitle>
            <CardDescription>Hover a bar for the range and headcount.</CardDescription>
          </CardHeader>
          <CardContent>
            {titles.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <ChartContainer config={medianChart} className="h-[420px] w-full">
                <BarChart
                  data={[...(titles.data ?? [])].sort((a, b) => b.median - a.median)}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                  barCategoryGap={2}
                >
                  <CartesianGrid horizontal={false} strokeOpacity={0.4} />
                  <XAxis
                    type="number"
                    dataKey="median"
                    tickFormatter={short}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="jobTitle"
                    width={200}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    fontSize={12}
                  />
                  <ChartTooltip
                    cursor={{ fillOpacity: 0.08 }}
                    content={
                      <ChartTooltipContent
                        formatter={(_value, _name, item) => {
                          const row = item.payload as {
                            median: number;
                            min: number;
                            max: number;
                            headcount: number;
                          };
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span>Median {fmt(row.median)}</span>
                              <span className="text-muted-foreground">
                                Range {short(row.min)} – {short(row.max)} · {row.headcount} people
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="median"
                    fill="var(--color-median)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary distribution</CardTitle>
            <CardDescription>Number of employees in each salary band.</CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <ChartContainer config={countChart} className="h-[420px] w-full">
                <BarChart
                  data={(distribution.data?.buckets ?? []).map((b) => ({
                    ...b,
                    label: short(b.from),
                  }))}
                  margin={{ top: 8 }}
                  barCategoryGap={2}
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <ChartTooltip
                    cursor={{ fillOpacity: 0.08 }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(_value, _name, item) => {
                          const b = item.payload as { from: number; to: number; count: number };
                          return (
                            <span>
                              {b.count} employees earn {short(b.from)} – {short(b.to)}
                            </span>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job titles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job title</TableHead>
                  <TableHead className="text-right">People</TableHead>
                  <TableHead className="text-right">Lowest</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Highest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.isLoading && <LoadingRows columns={5} />}
                {titles.data?.map((t) => (
                  <TableRow key={t.jobTitle}>
                    <TableCell>{t.jobTitle}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.headcount}</TableCell>
                    <TableCell className="text-right tabular-nums">{short(t.min)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {short(t.median)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{short(t.max)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">People</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Payroll</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.isLoading && <LoadingRows columns={5} />}
                {departments.data?.map((d) => (
                  <TableRow key={d.department}>
                    <TableCell>{d.department}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.headcount}</TableCell>
                    <TableCell className="text-right tabular-nums">{short(d.median)}</TableCell>
                    <TableCell className="text-right tabular-nums">{short(d.mean)}</TableCell>
                    <TableCell className="text-right tabular-nums">{short(d.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      {Array.from({ length: columns }, (_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
