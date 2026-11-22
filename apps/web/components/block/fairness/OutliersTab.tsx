import type { PayOutlier } from "@paywise/shared";
import { AlertTriangle, Scale, TrendingUp, Users } from "@/components/icons";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
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
import { furthestOutlier } from "@/utils/helpers/fairness";
import { money, percent } from "@/utils/helpers/others/format";
import { EmptyRow, SkeletonRows } from "./TableStates";

export function OutliersTab({
  outliers,
  people,
  shownPeople,
  anyFilter,
  select,
}: {
  outliers: { data?: PayOutlier[]; isLoading: boolean };
  people: PayOutlier[];
  shownPeople: PayOutlier[];
  anyFilter: boolean;
  select: (id: string) => void;
}) {
  return (
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
          hint={furthestOutlier(people)}
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
              <EmptyRow columns={6}>No outliers{anyFilter ? " match these filters" : ""}.</EmptyRow>
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
  );
}
