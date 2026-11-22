"use client";

import type { Facet } from "@/@types";
import { Briefcase, Building2, Globe } from "@/components/icons";
import { countryFlag } from "@/components/shared/CountryLabel/CountryLabel";
import { departmentIcon } from "@/components/shared/DepartmentLabel/DepartmentLabel";
import { FilterBar } from "@/components/shared/FilterBar/FilterBar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RaisePlan } from "@/hooks/useRaisePlan";
import { cn } from "@/lib/utils";
import { useCountrySummaries } from "@/utils/apis/insights";
import { useFilterOptions } from "@/utils/apis/meta";
import { StepHeader } from "./StepHeader";

const PRESETS = [2, 3, 5, 8, 10];

export function GroupRaiseCard({
  group: {
    percentText,
    setPercentText,
    percentError,
    countries,
    setCountries,
    departments,
    setDepartments,
    titles,
    setTitles,
  },
}: {
  group: RaisePlan["group"];
}) {
  const { data: options } = useFilterOptions();
  const { data: summaries } = useCountrySummaries();

  const facets: Facet[] = [
    {
      key: "country",
      label: "Country",
      icon: Globe,
      selected: countries,
      onChange: setCountries,
      options: (options?.countries ?? []).map((c) => ({
        value: c.code,
        label: c.name,
        icon: (
          <span aria-hidden className="text-base leading-none">
            {countryFlag(c.code)}
          </span>
        ),
        count: summaries?.find((x) => x.countryCode === c.code)?.headcount,
      })),
    },
    {
      key: "department",
      label: "Department",
      icon: Building2,
      selected: departments,
      onChange: setDepartments,
      options: (options?.departments ?? []).map((d) => {
        const Icon = departmentIcon(d);
        return {
          value: d,
          label: d,
          icon: <Icon className="text-muted-foreground size-4" aria-hidden />,
        };
      }),
    },
    {
      key: "jobTitle",
      label: "Job title",
      icon: Briefcase,
      selected: titles,
      onChange: setTitles,
      options: (options?.jobTitles ?? []).map((t) => ({ value: t, label: t })),
    },
  ];
  const names = (values: string[], lookup?: (v: string) => string) =>
    values.map((v) => (lookup ? lookup(v) : v)).join(" or ");
  const scope = [
    countries.length &&
      `in ${names(countries, (c) => options?.countries.find((x) => x.code === c)?.name ?? c)}`,
    departments.length && `in ${names(departments)}`,
    titles.length && `working as ${names(titles)}`,
  ].filter(Boolean);
  const scopeText = scope.length
    ? `Active employees ${scope.join(", ")}.`
    : "No filter: every active employee in every country.";

  return (
    <Card>
      <StepHeader
        step={1}
        title="Group raise"
        description="Everyone active who matches gets this raise. Type 0% to only give individual raises."
      />
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="percent">Raise</Label>
            <div className="relative">
              <Input
                id="percent"
                inputMode="decimal"
                value={percentText}
                aria-invalid={percentError ? true : undefined}
                onChange={(e) => setPercentText(e.target.value)}
                className="h-12 w-32 pr-9 text-2xl font-bold tabular-nums md:text-2xl"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-lg font-semibold">
                %
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pb-1" role="group" aria-label="Common raises">
            {PRESETS.map((p) => {
              const active = percentText.trim() !== "" && Number(percentText) === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPercentText(String(p))}
                  className={cn(
                    "h-9 min-w-12 rounded-md px-3 text-sm font-semibold tabular-nums transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted hover:bg-accent text-foreground",
                  )}
                >
                  {p}%
                </button>
              );
            })}
          </div>
        </div>
        {percentError && <p className="text-destructive -mt-3 text-sm">{percentError}</p>}
        <div className="flex flex-col gap-2">
          <Label>Who it applies to</Label>
          <FilterBar facets={facets} />
          <p className="text-muted-foreground text-xs">{scopeText}</p>
        </div>
      </CardContent>
    </Card>
  );
}
