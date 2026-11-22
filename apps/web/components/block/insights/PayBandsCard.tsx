import type { JobTitleSummary } from "@paywise/shared";
import { Briefcase } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CountryInsights } from "@/hooks/useCountryInsights";
import { TitleIcon } from "./TitleIcon";

export function PayBandsCard({
  titles,
  fmt,
  short,
}: Pick<CountryInsights, "titles" | "fmt" | "short">) {
  return (
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
  );
}

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
