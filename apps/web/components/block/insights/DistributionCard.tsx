"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { CountryInsights } from "@/hooks/useCountryInsights";
import { TitleIcon } from "./TitleIcon";

const countChart = { count: { label: "Employees", color: "var(--chart-1)" } } satisfies ChartConfig;

export function DistributionCard({
  distribution,
  short,
}: Pick<CountryInsights, "distribution" | "short">) {
  return (
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
  );
}
