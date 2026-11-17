"use client";

import { BarChart3, Sigma, Target, Users, Wallet } from "lucide-react";
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
import { scrollTable, stickyHeader } from "@/components/app/sticky";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroMoney } from "@/components/app/hero-money";
import { CountryLabel, DepartmentLabel } from "@/components/data/visuals";
import { insightsCountryAtom } from "@/lib/atoms";
import { compactMoney, money } from "@/lib/format";
import {
  useCountrySummaries,
  useDepartmentSummaries,
  useDistribution,
  useJobTitleSummaries,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
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
  const fmt = (amount: number) => money(amount, currency, country, "none");
  const short = (amount: number) => compactMoney(amount, currency, country);

  return (
    <>
      <PageHeader
        title="Pay insights"
        icon={BarChart3}
        description="How we pay people, in each country's own currency. Active employees only; medians match Excel's PERCENTILE.INC."
      />

      {/* Country chips: one tap to switch; scroll sideways on small screens. */}
      <div
        role="tablist"
        aria-label="Country"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {countries.isLoading &&
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 w-32 shrink-0" />)}
        {[...(countries.data ?? [])]
          .sort((a, b) => b.headcount - a.headcount)
          .map((c) => {
            const active = c.countryCode === country;
            return (
              <button
                key={c.countryCode}
                role="tab"
                aria-selected={active}
                onClick={() => setCountry(c.countryCode)}
                className={cn(
                  "bg-card hover:border-primary/40 flex shrink-0 snap-start flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
                  active && "border-primary ring-primary/20 ring-2",
                )}
              >
                <span className="text-sm font-medium">
                  <CountryLabel code={c.countryCode} />
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {c.headcount.toLocaleString()} ·{" "}
                  {compactMoney(c.median, c.currency, c.countryCode)} median
                </span>
              </button>
            );
          })}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Employees"
          value={summary ? summary.headcount.toLocaleString() : "–"}
        />
        <Stat
          icon={Target}
          label="Median salary"
          value={
            summary ? (
              <HeroMoney
                amount={summary.median}
                currency={currency}
                countryCode={country}
                fraction="none"
              />
            ) : (
              "–"
            )
          }
        />
        <Stat
          icon={Sigma}
          label="Average salary"
          value={
            summary ? (
              <HeroMoney
                amount={summary.mean}
                currency={currency}
                countryCode={country}
                fraction="none"
              />
            ) : (
              "–"
            )
          }
          hint={
            summary && summary.mean > summary.median
              ? "Above the median: a few high earners pull the average up."
              : undefined
          }
        />
        <Stat
          icon={Wallet}
          label="Annual payroll"
          value={
            summary ? (
              <HeroMoney
                amount={summary.total}
                currency={currency}
                countryCode={country}
                fraction="none"
              />
            ) : (
              "–"
            )
          }
        />
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

      <Card>
        <Tabs defaultValue="titles" className="gap-4">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Breakdown</CardTitle>
            <TabsList>
              <TabsTrigger value="titles">Job titles</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="countries">All countries</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="titles">
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
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
            </TabsContent>
            <TabsContent value="departments">
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
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
                      <TableCell>
                        <DepartmentLabel name={d.department} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.headcount}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.median)}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.mean)}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="countries">
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Lowest</TableHead>
                    <TableHead className="text-right">Highest</TableHead>
                    <TableHead className="text-right">Payroll</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.data?.map((c) => (
                    <TableRow
                      key={c.countryCode}
                      className={cn("cursor-pointer", c.countryCode === country && "bg-accent")}
                      onClick={() => setCountry(c.countryCode)}
                    >
                      <TableCell className="font-medium">
                        <CountryLabel code={c.countryCode} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.headcount.toLocaleString()}
                      </TableCell>
                      {[c.median, c.mean, c.min, c.max, c.total].map((amount, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {money(amount, c.currency, c.countryCode, "none")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
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
