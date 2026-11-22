import { Briefcase, Building2, ChartPie, Globe } from "@/components/icons";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { DepartmentLabel } from "@/components/shared/DepartmentLabel/DepartmentLabel";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CountryInsights } from "@/hooks/useCountryInsights";
import { cn } from "@/lib/utils";
import { scrollTable, stickyHeader } from "@/utils/constants/table";
import { countryName, money } from "@/utils/helpers/others/format";
import { TitleIcon } from "./TitleIcon";

export function BreakdownCard({
  countries,
  titles,
  departments,
  country,
  setCountry,
  short,
}: Pick<
  CountryInsights,
  "countries" | "titles" | "departments" | "country" | "setCountry" | "short"
>) {
  return (
    <Card>
      <Tabs defaultValue="titles" className="gap-4">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2.5">
            <TitleIcon icon={ChartPie} /> Breakdown
          </CardTitle>
          <TabsList>
            <TabsTrigger value="titles">
              <Briefcase className="size-4" aria-hidden /> Job titles
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="size-4" aria-hidden /> Departments
            </TabsTrigger>
            <TabsTrigger value="countries">
              <Globe className="size-4" aria-hidden /> All countries
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="titles">
            <TableFrame
              footer={
                titles.data ? `${titles.data.length} job titles in ${countryName(country)}` : " "
              }
            >
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Job title</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Lowest</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Highest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titles.isLoading && <LoadingRows columns={5} />}
                  {titles.data?.map((t) => (
                    <TableRow key={t.jobTitle}>
                      <TableCell>{t.jobTitle}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.headcount}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(t.min)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {short(t.median)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{short(t.max)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          </TabsContent>
          <TabsContent value="departments">
            <TableFrame
              footer={
                departments.data
                  ? `${departments.data.length} departments in ${countryName(country)}`
                  : " "
              }
            >
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Payroll</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.isLoading && <LoadingRows columns={5} />}
                  {departments.data?.map((d) => (
                    <TableRow key={d.department}>
                      <TableCell>
                        <DepartmentLabel name={d.department} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.headcount}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.median)}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.mean)}</TableCell>
                      <TableCell className="text-right tabular-nums">{short(d.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          </TabsContent>
          <TabsContent value="countries">
            <TableFrame
              footer={
                countries.data ? `${countries.data.length} countries · select a row to switch` : " "
              }
            >
              <Table containerClassName={scrollTable("max-h-[28rem]")}>
                <TableHeader className={stickyHeader}>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Lowest</TableHead>
                    <TableHead className="text-right">Highest</TableHead>
                    <TableHead className="text-right">Payroll</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.data?.map((c) => (
                    <TableRow
                      key={c.countryCode}
                      className={cn("cursor-pointer", c.countryCode === country && "bg-accent")}
                      onClick={() => setCountry(c.countryCode)}
                    >
                      <TableCell className="font-medium">
                        <CountryLabel code={c.countryCode} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.headcount.toLocaleString()}
                      </TableCell>
                      {[c.median, c.mean, c.min, c.max, c.total].map((amount, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {money(amount, c.currency, c.countryCode, "none")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      {Array.from({ length: columns }, (_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
