"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { ArrowRight } from "lucide-react";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountrySummaries } from "@/utils/apis/insights";
import { insightsCountryAtom } from "@/utils/atoms/insights";
import { countryName, money } from "@/utils/helpers/others/format";

export function CountriesCard() {
  const router = useRouter();
  const setInsightsCountry = useSetAtom(insightsCountryAtom);
  const countries = useCountrySummaries();
  const largest = Math.max(1, ...(countries.data?.map((c) => c.headcount) ?? [1]));
  const sortedCountries = [...(countries.data ?? [])].sort((a, b) => b.headcount - a.headcount);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Countries</CardTitle>
        <CardDescription>Headcount and median annual salary, in local currency.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {countries.isLoading &&
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 px-2 py-3">
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
  );
}
