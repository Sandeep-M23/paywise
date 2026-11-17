"use client";

import { Calculator } from "lucide-react";
import { useState } from "react";
import { raiseCostRequestSchema, type CountryCode } from "@paywise/shared";
import { PageHeader } from "@/components/app/page-header";
import { Field } from "@/components/employees/field";
import { CountryPicker } from "@/components/insights/country-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useFilterOptions, useRaiseCost } from "@/lib/queries";

const ALL = "__all__";

export function RaisePlanner() {
  const [percentText, setPercentText] = useState("5");
  const [country, setCountry] = useState<string | undefined>("IN");
  const [department, setDepartment] = useState<string | undefined>();
  const [jobTitle, setJobTitle] = useState<string | undefined>();
  const { data: options } = useFilterOptions();

  const filters = { country: country as CountryCode | undefined, department, jobTitle };
  // Validate what's typed now (for the error message); query with the debounced text.
  const parsed = raiseCostRequestSchema.safeParse({ percent: Number(percentText), ...filters });
  const debouncedPercent = useDebouncedValue(percentText, 250);
  const requested = raiseCostRequestSchema.safeParse({
    percent: Number(debouncedPercent),
    ...filters,
  });
  const { data, isFetching } = useRaiseCost(requested.success ? requested.data : null);

  return (
    <>
      <PageHeader
        title="Raise planner"
        icon={Calculator}
        description="What would a raise cost? A what-if only; nothing is saved."
      />
      <Card>
        <CardHeader>
          <CardTitle>Scenario</CardTitle>
          <CardDescription>
            Active employees matching these filters, all employment types.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            id="percent"
            label="Raise (%)"
            error={parsed.success ? undefined : parsed.error.issues[0]?.message}
          >
            <Input
              id="percent"
              inputMode="decimal"
              value={percentText}
              onChange={(e) => setPercentText(e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label>Country</Label>
            <CountryPicker value={country} onChange={setCountry} allowAll />
          </div>
          <OptionSelect
            label="Department"
            value={department}
            options={options?.departments ?? []}
            onChange={setDepartment}
          />
          <OptionSelect
            label="Job title"
            value={jobTitle}
            options={options?.jobTitles ?? []}
            onChange={setJobTitle}
          />
        </CardContent>
      </Card>

      <Card className={isFetching ? "opacity-70 transition-opacity" : undefined}>
        <CardHeader>
          <CardTitle>
            Cost of a {requested.success ? `${requested.data.percent}%` : "…"} raise
          </CardTitle>
          <CardDescription>
            Per currency: amounts in different currencies are never added together. Each
            person&apos;s raise is rounded to the smallest currency unit, as it would be paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Current annual payroll</TableHead>
                <TableHead className="text-right">Added cost per year</TableHead>
                <TableHead className="text-right">New annual payroll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                    Nobody matches these filters.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((row) => (
                <TableRow key={row.currency}>
                  <TableCell className="font-medium">{row.currency.toUpperCase()}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.headcount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(row.currentTotal, row.currency, undefined, "none")}
                  </TableCell>
                  <TableCell className="text-success text-right font-semibold tabular-nums">
                    +{money(row.increase, row.currency, undefined, "none")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(row.newTotal, row.currency, undefined, "none")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function OptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
