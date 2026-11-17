"use client";

import { useSetAtom } from "jotai";
import { useState } from "react";
import type { CountryCode } from "@paywise/shared";
import { PageHeader } from "@/components/app/page-header";
import { EmployeeSheet } from "@/components/employees/employee-sheet";
import { CountryPicker } from "@/components/insights/country-picker";
import { Stat } from "@/components/insights/stat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scrollTable, stickyHeader } from "@/components/app/sticky";
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
import { selectedEmployeeIdAtom } from "@/lib/atoms";
import { compactMoney, countryName, money, percent } from "@/lib/format";
import { useGenderGaps, useOutliers } from "@/lib/queries";
import { GapStatus } from "./gap-status";

export function FairnessView() {
  const [country, setCountry] = useState<string | undefined>();
  const query = { country: country as CountryCode | undefined };
  const gaps = useGenderGaps(query);
  const outliers = useOutliers(query);
  const select = useSetAtom(selectedEmployeeIdAtom);

  const reported = gaps.data?.filter((g) => !g.suppressed) ?? [];
  const review = reported.filter((g) => g.flagged && g.significant).length;

  return (
    <>
      <PageHeader
        title="Pay fairness"
        description="Compares full-time employees with peers in the same job title and country."
        actions={<CountryPicker value={country} onChange={setCountry} allowAll />}
      />
      <Tabs defaultValue="gender">
        <TabsList>
          <TabsTrigger value="gender">Gender pay gap</TabsTrigger>
          <TabsTrigger value="outliers">
            Outliers{outliers.data ? ` (${outliers.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gender" className="flex flex-col gap-4">
          <details className="bg-card group rounded-lg border px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium select-none">How to read this</summary>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              The gap is how much less women are paid than men on average in the same role and
              country (negative: women are paid more). Under the EU Pay Transparency Directive, an
              unexplained gap of 5% or more requires a joint pay assessment. “Review” means the gap
              is also too large to be chance in a group this size. Only full-time employees are
              compared, and groups with fewer than 5 women or men are hidden to protect
              individuals&apos; privacy.
            </p>
          </details>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Groups compared" value={gaps.data ? reported.length : "–"} />
            <Stat
              label="Need review"
              value={gaps.data ? review : "–"}
              hint="Gap ≥ 5% and statistically significant"
            />
            <Stat
              label="Too small to report"
              value={gaps.data ? gaps.data.length - reported.length : "–"}
            />
          </div>
          <Card className="py-0">
            <CardContent className="px-0">
              <Table containerClassName={scrollTable("max-h-[calc(100dvh-22rem)] min-h-80")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Job title</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Women / men</TableHead>
                    <TableHead className="text-right">Avg. women</TableHead>
                    <TableHead className="text-right">Avg. men</TableHead>
                    <TableHead className="text-right">Mean gap</TableHead>
                    <TableHead className="text-right">Median gap</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.isLoading && <SkeletonRows columns={8} />}
                  {gaps.data?.map((g) => (
                    <TableRow key={`${g.countryCode}-${g.jobTitle}`}>
                      <TableCell className="font-medium">{g.jobTitle}</TableCell>
                      <TableCell>{countryName(g.countryCode)}</TableCell>
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
                      <TableCell className="text-right font-medium tabular-nums">
                        {g.meanGap === null ? "–" : percent(g.meanGap)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {g.medianGap === null ? "–" : percent(g.medianGap)}
                      </TableCell>
                      <TableCell>
                        <GapStatus group={g} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outliers" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Paid unusually far from peers</CardTitle>
              <CardDescription>
                Salaries outside 1.5× the interquartile range of their job title and country (groups
                of 5 or more). Worth a look, not necessarily wrong. Select a row to open the record.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table containerClassName={scrollTable("max-h-[calc(100dvh-22rem)] min-h-80")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Peer median</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outliers.isLoading && <SkeletonRows columns={6} />}
                  {outliers.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                        No outliers{country ? ` in ${countryName(country)}` : ""}.
                      </TableCell>
                    </TableRow>
                  )}
                  {outliers.data?.map((o) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => select(o.id)}
                      onKeyDown={(e) => e.key === "Enter" && select(o.id)}
                    >
                      <TableCell className="font-medium">
                        {o.fullName}
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {o.employeeCode}
                        </span>
                      </TableCell>
                      <TableCell>{o.jobTitle}</TableCell>
                      <TableCell>{countryName(o.countryCode)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(o.salary.amount, o.salary.currency, o.countryCode)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {money(o.peerMedian, o.salary.currency, o.countryCode)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {o.direction === "above" ? "▲ " : "▼ "}
                        {percent(o.deviation, 0)} {o.direction}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <EmployeeSheet />
    </>
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
