"use client";

import { COUNTRIES } from "@paywise/shared";
import { useSetAtom } from "jotai";
import type { Facet, FairnessTab } from "@/@types";
import { EmployeeSheet } from "@/components/block/employees/EmployeeSheet";
import { AlertTriangle, BookOpen, Briefcase, Globe, Scale, TrendingUp } from "@/components/icons";
import { countryFlag } from "@/components/shared/CountryLabel/CountryLabel";
import { FilterBar } from "@/components/shared/FilterBar/FilterBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFairnessView } from "@/hooks/useFairnessView";
import { cn } from "@/lib/utils";
import { useCountrySummaries } from "@/utils/apis/insights";
import { useFilterOptions } from "@/utils/apis/meta";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { DIRECTION_FILTERS, GAP_FILTERS } from "@/utils/constants/fairness";
import { fill } from "@/utils/constants/table";
import { FairnessGuide } from "./FairnessGuide";
import { GenderGapsTab } from "./GenderGapsTab";
import { OutliersTab } from "./OutliersTab";

export function FairnessView() {
  const {
    view,
    setView,
    countries,
    setCountries,
    titles,
    setTitles,
    kinds,
    setKinds,
    directions,
    setDirections,
    explaining,
    setExplaining,
    gaps,
    outliers,
    groups,
    shownGroups,
    people,
    shownPeople,
    count,
    anyFilter,
  } = useFairnessView();
  const { data: options } = useFilterOptions();
  const { data: summaries } = useCountrySummaries();
  const select = useSetAtom(selectedEmployeeIdAtom);

  const facets: Facet[] = [
    {
      key: "country",
      label: "Country",
      icon: Globe,
      selected: countries,
      onChange: setCountries,
      options: COUNTRIES.map((c) => ({
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
      key: "jobTitle",
      label: "Job title",
      icon: Briefcase,
      selected: titles,
      onChange: setTitles,
      options: (options?.jobTitles ?? []).map((t) => ({ value: t, label: t })),
    },
    view === "gender"
      ? {
          key: "status",
          label: "Status",
          icon: AlertTriangle,
          selected: kinds,
          onChange: setKinds,
          options: GAP_FILTERS.map((f) => ({
            ...f,
            count: gaps.data ? count(f.value) : undefined,
          })),
        }
      : {
          key: "direction",
          label: "Direction",
          icon: TrendingUp,
          selected: directions,
          onChange: setDirections,
          options: DIRECTION_FILTERS.map((f) => ({
            ...f,
            count: outliers.data ? people.filter((o) => o.direction === f.value).length : undefined,
          })),
        },
  ];

  return (
    <>
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as FairnessTab)}
        className={cn("gap-4", fill)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="gender">
              <Scale className="size-4" aria-hidden /> Gender pay gap
            </TabsTrigger>
            <TabsTrigger value="outliers">
              <TrendingUp className="size-4" aria-hidden /> Outliers
              {outliers.data ? ` (${people.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <span className="bg-border mx-1 hidden h-6 w-px sm:block" aria-hidden />
          <FilterBar facets={facets} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="bg-card ml-auto h-9"
              onClick={() => setExplaining(true)}
            >
              <BookOpen className="size-4" aria-hidden /> How to read this
            </Button>
          </FilterBar>
        </div>
        <FairnessGuide view={view} explaining={explaining} setExplaining={setExplaining} />
        <GenderGapsTab
          gaps={gaps}
          groups={groups}
          shownGroups={shownGroups}
          count={count}
          anyFilter={anyFilter}
        />
        <OutliersTab
          outliers={outliers}
          people={people}
          shownPeople={shownPeople}
          anyFilter={anyFilter}
          select={select}
        />
      </Tabs>
      <EmployeeSheet />
    </>
  );
}
