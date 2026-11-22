import type { GenderGapGroup } from "@paywise/shared";
import type { GapFilter } from "@/@types";
import { AlertTriangle, CircleHelp, EyeOff, Layers } from "@/components/icons";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { Stat } from "@/components/shared/StatCard/Stat";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fill, fillScrollTable, stickyHeader } from "@/utils/constants/table";
import { compactMoney, percent } from "@/utils/helpers/others/format";
import { GapStatus } from "./GapStatus";
import { EmptyRow, SkeletonRows } from "./TableStates";

export function GenderGapsTab({
  gaps,
  groups,
  shownGroups,
  count,
  anyFilter,
}: {
  gaps: { data?: GenderGapGroup[]; isLoading: boolean };
  groups: GenderGapGroup[];
  shownGroups: GenderGapGroup[];
  count: (kind: Exclude<GapFilter, "all">) => number;
  anyFilter: boolean;
}) {
  return (
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
              <EmptyRow columns={8}>No groups match{anyFilter ? " these filters" : ""}.</EmptyRow>
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
                  {g.maleMean === null ? "–" : compactMoney(g.maleMean, g.currency, g.countryCode)}
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
  );
}
