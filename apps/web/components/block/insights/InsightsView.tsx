"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  ChartPie,
  Globe,
  Sigma,
  Target,
  Users,
  Wallet,
} from "@/components/icons";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";
import { useAtom } from "jotai";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { currencyForCountry, type CountryCode, type JobTitleSummary } from "@paywise/shared";
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
import { scrollTable, stickyHeader } from "@/utils/constants/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroMoney } from "@/components/shared/HeroMoney/HeroMoney";
import { CountryLabel, countryFlag } from "@/components/shared/CountryLabel/CountryLabel";
import { DepartmentLabel } from "@/components/shared/DepartmentLabel/DepartmentLabel";
import { insightsCountryAtom } from "@/utils/atoms/insights";
import { compactMoney, countryName, money } from "@/utils/helpers/others/format";
import {
  useCountrySummaries,
  useDepartmentSummaries,
  useDistribution,
  useJobTitleSummaries,
} from "@/utils/apis/insights";
import { cn } from "@/lib/utils";
import { Stat } from "@/components/shared/StatCard/Stat";
import type { AppIcon } from "@/@types";

// Eight tiles share one row, so the two long names get their everyday short form.
const SHORT_NAMES: Record<string, string> = { US: "USA", GB: "UK" };

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
      {/* Every country at once, as equal tiles: flag, name, people and median. No
          sideways scrolling, and the selected country reads at a glance. */}
      <div
        role="tablist"
        aria-label="Country"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
      >
        {countries.isLoading &&
          Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[3.75rem] rounded-xl" />
          ))}
        {[...(countries.data ?? [])]
          .sort((a, b) => b.headcount - a.headcount)
          .map((c) => {
            const active = c.countryCode === country;
            return (
              <button
                key={c.countryCode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCountry(c.countryCode)}
                className={cn(
                  "ring-border flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors",
                  active
                    ? "dark bg-sidebar text-foreground ring-sidebar"
                    : "bg-card hover:ring-foreground/30",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="text-lg leading-none">
                    {countryFlag(c.countryCode)}
                  </span>
                  <span
                    className="truncate text-sm font-semibold"
                    title={countryName(c.countryCode)}
                  >
                    {SHORT_NAMES[c.countryCode] ?? countryName(c.countryCode)}
                  </span>
                </span>
                <span
                  className={cn(
                    "truncate text-xs tabular-nums",
                    active ? "text-lime font-semibold" : "text-muted-foreground",
                  )}
                >
                  {c.headcount.toLocaleString()} people
                </span>
              </button>
            );
          })}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          loading={countries.isLoading}
          icon={Users}
          label="Employees"
          value={summary ? summary.headcount.toLocaleString() : "–"}
        />
        <Stat
          loading={countries.isLoading}
          icon={Target}
          label="Median salary"
          hint={summary ? `Range ${short(summary.min)} – ${short(summary.max)}` : undefined}
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
          loading={countries.isLoading}
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
          loading={countries.isLoading}
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
            <CardTitle className="flex items-center gap-2.5">
              <TitleIcon icon={Briefcase} /> Pay bands by job title
            </CardTitle>
            <CardDescription>
              Each bar runs from the lowest to the highest salary; the mark is the median.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {titles.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <PayBands rows={titles.data ?? []} format={fmt} short={short} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <TitleIcon icon={BarChart3} /> Salary distribution
            </CardTitle>
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
            <CardTitle className="flex items-center gap-2.5">
              <TitleIcon icon={ChartPie} /> Breakdown
            </CardTitle>
            <TabsList>
              <TabsTrigger value="titles">
                <Briefcase className="size-4" aria-hidden /> Job titles
              </TabsTrigger>
              <TabsTrigger value="departments">
                <Building2 className="size-4" aria-hidden /> Departments
              </TabsTrigger>
              <TabsTrigger value="countries">
                <Globe className="size-4" aria-hidden /> All countries
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="titles">
              <TableFrame
                footer={
                  titles.data ? `${titles.data.length} job titles in ${countryName(country)}` : " "
                }
              >
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
              </TableFrame>
            </TabsContent>
            <TabsContent value="departments">
              <TableFrame
                footer={
                  departments.data
                    ? `${departments.data.length} departments in ${countryName(country)}`
                    : " "
                }
              >
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
              </TableFrame>
            </TabsContent>
            <TabsContent value="countries">
              <TableFrame
                footer={
                  countries.data
                    ? `${countries.data.length} countries · select a row to switch`
                    : " "
                }
              >
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
              </TableFrame>
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

/**
 * Pay bands: per job title, a bar from min to max on one shared scale with a mark
 * at the median, so both the typical pay and the spread read at a glance.
 */
function PayBands({
  rows,
  format,
  short,
}: {
  rows: JobTitleSummary[];
  format: (amount: number) => string;
  short: (amount: number) => string;
}) {
  const sorted = [...rows].sort((a, b) => b.median - a.median);
  const top = Math.max(1, ...rows.map((r) => r.max));
  const at = (amount: number) => `${(amount / top) * 100}%`;
  return (
    <div className="flex max-h-[420px] flex-col overflow-y-auto pr-1">
      <div className="text-muted-foreground grid grid-cols-[minmax(0,11rem)_1fr_5.5rem] gap-3 pb-2 text-xs font-semibold tracking-wide uppercase">
        <span>Job title</span>
        <span className="flex justify-between">
          <span>{short(0)}</span>
          <span>{short(top)}</span>
        </span>
        <span className="text-right">Median</span>
      </div>
      {sorted.map((r) => (
        <div
          key={r.jobTitle}
          className="grid grid-cols-[minmax(0,11rem)_1fr_5.5rem] items-center gap-3 border-t py-1.5 text-sm"
          title={`${r.jobTitle}: ${format(r.min)} – ${format(r.max)}, median ${format(r.median)}, ${r.headcount} people`}
        >
          <span className="truncate">
            {r.jobTitle}{" "}
            <span className="text-muted-foreground text-xs tabular-nums">{r.headcount}</span>
          </span>
          <span className="bg-muted relative h-3 rounded-full">
            <span
              className="bg-lime absolute inset-y-0 rounded-full"
              style={{ left: at(r.min), width: `calc(${at(r.max)} - ${at(r.min)})` }}
            />
            <span
              className="bg-foreground absolute -inset-y-0.5 w-1 -translate-x-1/2 rounded-full"
              style={{ left: at(r.median) }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{short(r.median)}</span>
        </div>
      ))}
    </div>
  );
}

/** A small grey icon circle beside a card title, matching the stat cards. */
function TitleIcon({ icon: Icon }: { icon: AppIcon }) {
  return (
    <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
