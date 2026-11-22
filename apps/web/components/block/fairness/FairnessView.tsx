"use client";

import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CircleCheck,
  Globe,
  CircleHelp,
  EyeOff,
  Layers,
  Scale,
  TrendingUp,
  Users,
} from "@/components/icons";
import { COUNTRIES } from "@paywise/shared";
import { useSetAtom } from "jotai";
import { useState, type ReactNode } from "react";
import type { GenderGapGroup, PayOutlier } from "@paywise/shared";
import { EmployeeSheet } from "@/components/block/employees/EmployeeSheet";
import { FilterBar } from "@/components/shared/FilterBar/FilterBar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Stat } from "@/components/shared/StatCard/Stat";
import { Button } from "@/components/ui/button";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";
import { cn } from "@/lib/utils";
import { fill, fillScrollTable, stickyHeader } from "@/utils/constants/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountryLabel, countryFlag } from "@/components/shared/CountryLabel/CountryLabel";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { compactMoney, money, percent } from "@/utils/helpers/others/format";
import { useCountrySummaries } from "@/utils/apis/insights";
import { useFilterOptions } from "@/utils/apis/meta";
import { useGenderGaps, useOutliers } from "@/utils/apis/fairness";
import { GapStatus } from "@/components/block/fairness/GapStatus";
import type { AppIcon, DirectionFilter, Facet, FairnessTab, GapFilter } from "@/@types";

function gapKind(g: GenderGapGroup): Exclude<GapFilter, "all"> {
  if (g.suppressed) return "hidden";
  if (g.flagged) return g.significant ? "review" : "chance";
  return "within";
}

const GAP_FILTERS: { value: Exclude<GapFilter, "all">; label: string; icon: ReactNode }[] = [
  {
    value: "review",
    label: "Needs review",
    icon: <AlertTriangle className="text-destructive size-4" aria-hidden />,
  },
  {
    value: "chance",
    label: "May be chance",
    icon: <CircleHelp className="text-warning size-4" aria-hidden />,
  },
  {
    value: "within",
    label: "Within 5%",
    icon: <CircleCheck className="text-success size-4" aria-hidden />,
  },
  {
    value: "hidden",
    label: "Too few to report",
    icon: <EyeOff className="text-muted-foreground size-4" aria-hidden />,
  },
];

const DIRECTION_FILTERS: {
  value: Exclude<DirectionFilter, "all">;
  label: string;
  icon: ReactNode;
}[] = [
  { value: "above", label: "Above peers", icon: <span aria-hidden>▲</span> },
  { value: "below", label: "Below peers", icon: <span aria-hidden>▼</span> },
];

export function FairnessView() {
  const [view, setView] = useState<FairnessTab>("gender");
  const [countries, setCountries] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [explaining, setExplaining] = useState(false);
  const gaps = useGenderGaps({});
  const outliers = useOutliers({});
  const { data: options } = useFilterOptions();
  const { data: summaries } = useCountrySummaries();
  const select = useSetAtom(selectedEmployeeIdAtom);

  const inScope = <T extends { jobTitle: string; countryCode: string }>(rows: T[] | undefined) =>
    (rows ?? []).filter(
      (r) =>
        (countries.length === 0 || countries.includes(r.countryCode)) &&
        (titles.length === 0 || titles.includes(r.jobTitle)),
    );
  const groups = inScope(gaps.data);
  const shownGroups = groups.filter((g) => kinds.length === 0 || kinds.includes(gapKind(g)));
  const people = inScope(outliers.data);
  const shownPeople = people.filter(
    (o) => directions.length === 0 || directions.includes(o.direction),
  );
  const count = (kind: Exclude<GapFilter, "all">) =>
    groups.filter((g) => gapKind(g) === kind).length;
  const anyFilter =
    countries.length + titles.length + (view === "gender" ? kinds : directions).length > 0;

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

        <Sheet open={explaining} onOpenChange={setExplaining}>
          <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <BookOpen className="size-5" aria-hidden /> How to read this
              </SheetTitle>
              <SheetDescription>
                What the numbers on Pay fairness mean, and what to do about them.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              {view === "gender" ? (
                <>
                  <GapExplainer />
                  <OutlierExplainer />
                </>
              ) : (
                <>
                  <OutlierExplainer />
                  <GapExplainer />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <TabsContent value="gender" className={cn("flex flex-col gap-4", fill)}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              loading={gaps.isLoading}
              icon={Layers}
              label="Groups compared"
              value={gaps.data ? groups.length - count("hidden") : "–"}
              hint="Same job title and country"
            />
            <Stat
              loading={gaps.isLoading}
              icon={AlertTriangle}
              tone={count("review") > 0 ? "warning" : undefined}
              label="Need review"
              value={gaps.data ? count("review") : "–"}
              hint="≥ 5% and unlikely to be chance"
            />
            <Stat
              loading={gaps.isLoading}
              icon={CircleHelp}
              label="May be chance"
              value={gaps.data ? count("chance") : "–"}
              hint="≥ 5% but too few people to be sure"
            />
            <Stat
              loading={gaps.isLoading}
              icon={EyeOff}
              label="Too small to report"
              value={gaps.data ? count("hidden") : "–"}
              hint="Fewer than 5 women or men"
            />
          </div>
          <TableFrame
            className={fill}
            footer={
              gaps.data
                ? `Showing ${shownGroups.length.toLocaleString()} of ${groups.length.toLocaleString()} groups`
                : " "
            }
          >
            <Table containerClassName={fillScrollTable}>
              <TableHeader className={stickyHeader}>
                <TableRow>
                  <TableHead className="pl-4">Job title</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Women / men</TableHead>
                  <TableHead className="text-right">Avg. women</TableHead>
                  <TableHead className="text-right">Avg. men</TableHead>
                  <TableHead className="text-right">Mean gap</TableHead>
                  <TableHead className="text-right">Median gap</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.isLoading && <SkeletonRows columns={8} />}
                {gaps.data && shownGroups.length === 0 && (
                  <EmptyRow columns={8}>
                    No groups match{anyFilter ? " these filters" : ""}.
                  </EmptyRow>
                )}
                {shownGroups.map((g) => (
                  <TableRow key={`${g.countryCode}-${g.jobTitle}`}>
                    <TableCell className="pl-4 font-medium">{g.jobTitle}</TableCell>
                    <TableCell>
                      <CountryLabel code={g.countryCode} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.femaleCount} / {g.maleCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.femaleMean === null
                        ? "–"
                        : compactMoney(g.femaleMean, g.currency, g.countryCode)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.maleMean === null
                        ? "–"
                        : compactMoney(g.maleMean, g.currency, g.countryCode)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {g.meanGap === null ? "–" : percent(g.meanGap)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {g.medianGap === null ? "–" : percent(g.medianGap)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <GapStatus group={g} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        </TabsContent>

        <TabsContent value="outliers" className={cn("flex flex-col gap-4", fill)}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              loading={outliers.isLoading}
              icon={Users}
              label="Outliers"
              value={outliers.data ? people.length : "–"}
              hint="Far from peers in role and country"
            />
            <Stat
              loading={outliers.isLoading}
              icon={TrendingUp}
              label="Above peers"
              value={outliers.data ? people.filter((o) => o.direction === "above").length : "–"}
              hint="Paid unusually high"
            />
            <Stat
              loading={outliers.isLoading}
              icon={AlertTriangle}
              tone={people.some((o) => o.direction === "below") ? "warning" : undefined}
              label="Below peers"
              value={outliers.data ? people.filter((o) => o.direction === "below").length : "–"}
              hint="Paid unusually low"
            />
            <Stat
              loading={outliers.isLoading}
              icon={Scale}
              label="Furthest from median"
              value={
                outliers.data && people.length > 0
                  ? percent(Math.max(...people.map((o) => Math.abs(o.deviation))), 0)
                  : "–"
              }
              hint={furthest(people)}
            />
          </div>
          <TableFrame
            className={fill}
            footer={
              outliers.data
                ? `Showing ${shownPeople.length.toLocaleString()} of ${people.length.toLocaleString()} people · select a row to open the record`
                : " "
            }
          >
            <Table containerClassName={fillScrollTable}>
              <TableHeader className={stickyHeader}>
                <TableRow>
                  <TableHead className="pl-4">Employee</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Peer median</TableHead>
                  <TableHead className="pr-4 text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outliers.isLoading && <SkeletonRows columns={6} />}
                {outliers.data && shownPeople.length === 0 && (
                  <EmptyRow columns={6}>
                    No outliers{anyFilter ? " match these filters" : ""}.
                  </EmptyRow>
                )}
                {shownPeople.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => select(o.id)}
                    onKeyDown={(e) => e.key === "Enter" && select(o.id)}
                  >
                    <TableCell className="pl-4 font-medium">
                      <EmployeeAvatar
                        name={o.fullName}
                        className="mr-2.5 inline-flex size-7 align-middle"
                      />
                      {o.fullName}
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {o.employeeCode}
                      </span>
                    </TableCell>
                    <TableCell>{o.jobTitle}</TableCell>
                    <TableCell>
                      <CountryLabel code={o.countryCode} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(o.salary.amount, o.salary.currency, o.countryCode)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {money(o.peerMedian, o.salary.currency, o.countryCode)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "pr-4 text-right font-semibold tabular-nums",
                        o.direction === "below" && "text-warning",
                      )}
                    >
                      {o.direction === "above" ? "▲ " : "▼ "}
                      {percent(o.deviation, 0)} {o.direction}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        </TabsContent>
      </Tabs>
      <EmployeeSheet />
    </>
  );
}

function furthest(people: PayOutlier[]) {
  const top = [...people].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))[0];
  return top ? `${top.fullName}, ${top.jobTitle}` : undefined;
}

function GapExplainer() {
  const sample = (patch: Partial<GenderGapGroup>): GenderGapGroup => ({
    countryCode: "",
    jobTitle: "",
    currency: "",
    femaleCount: 0,
    maleCount: 0,
    femaleMean: null,
    maleMean: null,
    femaleMedian: null,
    maleMedian: null,
    meanGap: null,
    medianGap: null,
    flagged: false,
    significant: false,
    suppressed: false,
    ...patch,
  });
  return (
    <Explainer
      title="Gender pay gap"
      points={[
        {
          icon: Scale,
          title: "The gap",
          text: "How much less women earn than men, on average, in the same job and country. 10% means women earn 10% less; a negative gap means women earn more.",
        },
        {
          icon: AlertTriangle,
          title: "The 5% line",
          text: "Under the EU Pay Transparency Directive, an unexplained gap of 5% or more calls for a joint pay assessment.",
        },
        {
          icon: CircleHelp,
          title: "Chance or real?",
          text: "In small groups a big gap can be luck. “Review” means a statistical test says it is unlikely to be chance.",
        },
        {
          icon: EyeOff,
          title: "Privacy",
          text: "Only full-time employees are compared. Groups with fewer than 5 women or 5 men are hidden so no one can be identified.",
        },
      ]}
      legend={[
        {
          badge: <GapStatus group={sample({ flagged: true, significant: true })} />,
          text: "Look at this group first",
        },
        {
          badge: <GapStatus group={sample({ flagged: true })} />,
          text: "Keep an eye on it as the group grows",
        },
        { badge: <GapStatus group={sample({})} />, text: "No action needed" },
        { badge: <GapStatus group={sample({ suppressed: true })} />, text: "Hidden for privacy" },
      ]}
    />
  );
}

function OutlierExplainer() {
  return (
    <Explainer
      title="Outliers"
      points={[
        {
          icon: Users,
          title: "Peers",
          text: "Everyone with the same job title in the same country. Groups need at least 5 people.",
        },
        {
          icon: TrendingUp,
          title: "Outlier",
          text: "A salary outside 1.5× the interquartile range of the peer group: the usual Excel and statistics rule for unusual values.",
        },
        {
          icon: Scale,
          title: "Difference",
          text: "How far the salary is from the peer median. ▲ 40% above means 40% more than the typical peer.",
        },
        {
          icon: CircleHelp,
          title: "What to do",
          text: "Worth a look, not necessarily wrong: seniority or a typo can both explain it. Click a row to open the record.",
        },
      ]}
    />
  );
}

function Explainer({
  title,
  points,
  legend,
}: {
  title: string;
  points: { icon: AppIcon; title: string; text: string }[];
  legend?: { badge: ReactNode; text: string }[];
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {points.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      {legend && (
        <div className="bg-muted flex flex-col gap-2.5 rounded-lg p-3 text-xs">
          <p className="font-semibold">What the status means</p>
          {legend.map(({ badge, text }) => (
            <span key={text} className="flex items-center justify-between gap-3">
              {badge}
              <span className="text-muted-foreground text-right">{text}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="text-muted-foreground h-24 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return Array.from({ length: 6 }, (_, i) => (
    <TableRow key={i}>
      {Array.from({ length: columns }, (_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
