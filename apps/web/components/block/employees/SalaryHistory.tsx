import type { SalaryRevision } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { date, humanize, money, percent } from "@/utils/helpers/others/format";

const STATE_LABEL: Partial<Record<SalaryRevision["state"], string>> = {
  current: "Current",
  scheduled: "Scheduled",
  corrected: "Corrected",
  cancelled: "Cancelled",
};

export function SalaryHistory({
  revisions,
  countryCode,
}: {
  revisions: SalaryRevision[];
  countryCode: string;
}) {
  return (
    <ol className="relative flex flex-col gap-4 border-l pl-5">
      {revisions.map((revision) => {
        const change =
          revision.previousAmount !== null ? revision.amount / revision.previousAmount - 1 : null;
        const superseded = revision.state === "corrected" || revision.state === "cancelled";
        const label = STATE_LABEL[revision.state];
        return (
          <li key={revision.id} className={cn("relative", superseded && "opacity-60")}>
            <span
              className={cn(
                "absolute top-1.5 -left-[25px] size-2.5 rounded-full",
                revision.state === "scheduled"
                  ? "border-primary bg-background border-2"
                  : "bg-primary",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={cn("font-medium tabular-nums", superseded && "line-through")}>
                {money(revision.amount, revision.currency, countryCode)}
              </span>
              <span className="text-muted-foreground text-xs">{date(revision.effectiveOn)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={revision.reason === "hire" ? "secondary" : "outline"}>
                {revision.reason === "hire" ? "Hired" : humanize(revision.reason)}
              </Badge>
              {label && (
                <Badge variant={revision.state === "current" ? "default" : "secondary"}>
                  {label}
                  {revision.state === "scheduled" && ` · from ${date(revision.effectiveOn)}`}
                </Badge>
              )}
              {change !== null && (
                <span className={change >= 0 ? "text-success" : "text-destructive"}>
                  {change >= 0 ? "+" : ""}
                  {percent(change)} from{" "}
                  {money(revision.previousAmount!, revision.currency, countryCode)}
                </span>
              )}
              {revision.importId && <span className="text-muted-foreground">via CSV import</span>}
            </div>
            {revision.note && <p className="text-muted-foreground mt-1 text-sm">{revision.note}</p>}
            <p className="text-muted-foreground mt-1 text-xs">
              by {revision.createdBy} · recorded {date(revision.createdAt.slice(0, 10))}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
