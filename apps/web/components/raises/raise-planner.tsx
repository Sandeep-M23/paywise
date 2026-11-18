"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  applyRaise,
  MANUAL_REVISION_REASONS,
  parseMoneyInput,
  raisePlanSchema,
  toMajorString,
  type CountryCode,
  type EmployeeSummary,
  type Page,
  type RaiseOverride,
} from "@paywise/shared";
import { countryFlag, departmentIcon, EmployeeAvatar } from "@/components/data/visuals";
import { Field } from "@/components/employees/field";
import { Briefcase, Building2, Globe, Plus, Search, Users } from "@/components/icons";
import { FilterBar, type Facet } from "@/components/data/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiError, toQueryString } from "@/lib/api";
import { humanize, money } from "@/lib/format";
import { useClientNow } from "@/lib/hooks/use-client-now";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useApplyRaises, useCountrySummaries, useFilterOptions, useRaiseCost } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PRESETS = [0, 2, 3, 5, 8, 10];
type ManualReason = (typeof MANUAL_REVISION_REASONS)[number];

type Individual = { employee: EmployeeSummary; mode: "percent" | "amount"; text: string };

/** One person's typed raise as an override, or the reason it isn't valid yet. */
function toOverride({ employee, mode, text }: Individual): RaiseOverride | { error: string } {
  if (!text.trim()) return { error: "Enter a raise" };
  if (mode === "percent") {
    const value = Number(text);
    if (!Number.isFinite(value) || value <= 0 || value > 100) return { error: "0–100%" };
    if (Math.round(value * 100) !== value * 100) return { error: "Two decimals at most" };
    return { employeeId: employee.id, percent: value };
  }
  const parsed = parseMoneyInput(text, employee.salary.currency);
  if (!parsed.ok) return { error: parsed.error };
  if (parsed.value <= employee.salary.amount) return { error: "Must be above current" };
  return { employeeId: employee.id, newAmount: parsed.value };
}

export function RaisePlanner() {
  const [percentText, setPercentText] = useState("5");
  const [countries, setCountries] = useState<string[]>(["IN"]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const now = useClientNow();
  const today = now?.toISOString().slice(0, 10) ?? "";
  // Empty until the user picks a date: then it means "today".
  const [pickedDate, setPickedDate] = useState("");
  const effectiveOn = pickedDate || today;
  const [reason, setReason] = useState<ManualReason>("merit");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { data: options } = useFilterOptions();
  const { data: summaries } = useCountrySummaries();
  const applyRaises = useApplyRaises();

  const overrides = individuals.map(toOverride);
  const validOverrides = overrides.filter((o): o is RaiseOverride => !("error" in o));
  const groupPercent = percentText.trim() === "" ? 0 : Number(percentText);
  const plan = {
    percent: groupPercent,
    country: countries.length ? (countries as CountryCode[]) : undefined,
    department: departments.length ? departments : undefined,
    jobTitle: titles.length ? titles : undefined,
    overrides: validOverrides,
  };
  const parsed = raisePlanSchema.safeParse(plan);
  const percentError = parsed.success
    ? undefined
    : parsed.error.issues.find((i) => i.path[0] === "percent")?.message;
  const debounced = useDebouncedValue(JSON.stringify(plan), 250);
  const requested = useMemo(() => {
    const result = raisePlanSchema.safeParse(JSON.parse(debounced));
    return result.success ? result.data : null;
  }, [debounced]);
  const { data: cost, isFetching } = useRaiseCost(requested);

  // Only the very first estimate shows placeholders; later ones dim the old figures.
  const costLoading = requested !== null && cost === undefined;
  const people = cost?.reduce((sum, row) => sum + row.headcount, 0) ?? 0;
  const canApply =
    parsed.success &&
    overrides.length === validOverrides.length &&
    people > 0 &&
    !isFetching &&
    effectiveOn !== "";

  function update(id: string, patch: Partial<Individual>) {
    setIndividuals((list) => list.map((i) => (i.employee.id === id ? { ...i, ...patch } : i)));
  }

  async function apply() {
    if (!parsed.success) return;
    try {
      const result = await applyRaises.mutateAsync({
        ...parsed.data,
        effectiveOn,
        reason,
        note: note.trim() || undefined,
      });
      setConfirming(false);
      setIndividuals([]);
      setNote("");
      toast.success(
        `Raised ${result.applied.toLocaleString()} salaries` +
          (result.skipped ? ` (${result.skipped} too small to change)` : ""),
      );
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not apply the raises. Nothing changed.",
      );
    }
  }

  const individualCount = validOverrides.length;

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
  // Plain words for who the group raise reaches, e.g. "Active employees in India or
  // Germany, in Engineering". Filters combine with "and"; values within one with "or".
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
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <StepHeader
              step={1}
              title="Group raise"
              description="Everyone active who matches gets this raise. Set 0% to only give individual raises."
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
                <div
                  className="flex flex-wrap gap-1.5 pb-1"
                  role="group"
                  aria-label="Common raises"
                >
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

          <Card>
            <StepHeader
              step={2}
              title="Individual raises"
              description="A custom % or a new salary for specific people. It replaces the group raise for them."
              aside={
                individuals.length > 0 ? (
                  <span className="bg-lime text-lime-foreground rounded-md px-2 py-0.5 text-xs font-bold tabular-nums">
                    {individuals.length}
                  </span>
                ) : undefined
              }
            />
            <CardContent className="flex flex-col gap-3">
              <EmployeeSearch
                exclude={individuals.map((i) => i.employee.id)}
                onPick={(employee) =>
                  setIndividuals((list) => [...list, { employee, mode: "percent", text: "" }])
                }
              />
              {individuals.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-1 rounded-lg border border-dashed py-6 text-center text-sm">
                  <Users className="size-6 opacity-60" aria-hidden />
                  Nobody yet. Search above to add a person.
                </div>
              ) : (
                <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto">
                  {individuals.map((individual, index) => (
                    <IndividualRow
                      key={individual.employee.id}
                      individual={individual}
                      result={overrides[index]!}
                      onChange={(patch) => update(individual.employee.id, patch)}
                      onRemove={() =>
                        setIndividuals((list) =>
                          list.filter((i) => i.employee.id !== individual.employee.id),
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* The summary stays in view while the plan is edited. */}
        <aside
          aria-label="Cost and apply"
          className={cn(
            "dark bg-sidebar text-foreground flex flex-col gap-5 rounded-xl p-5 lg:sticky lg:top-0",
            isFetching && "transition-opacity [&_[data-cost]]:opacity-60",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="bg-lime text-lime-foreground grid size-7 place-items-center rounded-full text-sm font-bold">
              3
            </span>
            <h2 className="font-semibold">Review and apply</h2>
          </div>

          <div data-cost className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">People getting a raise</span>
            {costLoading ? (
              <Skeleton className="my-1 h-8 w-28" />
            ) : (
              <span className="text-4xl font-bold tracking-tight tabular-nums">
                {people.toLocaleString()}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {individualCount > 0
                ? `incl. ${individualCount} individual ${individualCount === 1 ? "raise" : "raises"}`
                : "\u00a0"}
            </span>
          </div>

          <div data-cost className="flex flex-col gap-2">
            <span className="text-muted-foreground text-sm">Added cost per year</span>
            {(!requested || cost?.length === 0) && (
              <p className="text-muted-foreground rounded-lg bg-white/5 px-3 py-3 text-sm">
                {requested ? "Nobody matches this plan." : "Set a group raise or add a person."}
              </p>
            )}
            {costLoading && <Skeleton className="h-16 w-full rounded-lg" />}
            {requested &&
              cost?.map((row) => (
                <div key={row.currency} className="rounded-lg bg-white/5 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {row.currency.toUpperCase()}
                      <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                        {row.headcount.toLocaleString()} people
                      </span>
                    </span>
                    <span className="text-lime text-lg font-bold tabular-nums">
                      +{money(row.increase, row.currency, undefined, "none")}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    Payroll {money(row.currentTotal, row.currency, undefined, "none")} →{" "}
                    {money(row.newTotal, row.currency, undefined, "none")}
                  </div>
                </div>
              ))}
            <p className="text-muted-foreground text-xs leading-relaxed">
              Currencies are never added together. Each raise is rounded to the smallest unit, as it
              would be paid.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="effectiveOn" label="Effective from">
                <Input
                  id="effectiveOn"
                  type="date"
                  max={today || undefined}
                  value={effectiveOn}
                  onChange={(e) => setPickedDate(e.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as ManualReason)}>
                  <SelectTrigger id="reason" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_REVISION_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {humanize(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                maxLength={500}
                placeholder="e.g. 2026 annual review"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button size="lg" disabled={!canApply} onClick={() => setConfirming(true)}>
              Apply raises{people > 0 ? ` to ${people.toLocaleString()}` : ""}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              You confirm before anything is saved.
            </p>
          </div>
        </aside>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply raises to {people.toLocaleString()} people?</DialogTitle>
            <DialogDescription>
              This saves a salary change for each person, effective {effectiveOn}, reason “
              {humanize(reason)}”. It is all or nothing: if any person can’t be changed, nobody is.
              Mistakes are fixed later with a correction.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 text-sm">
            {cost?.map((row) => (
              <li key={row.currency} className="flex justify-between tabular-nums">
                <span>
                  {row.currency.toUpperCase()} · {row.headcount.toLocaleString()} people
                </span>
                <span className="font-semibold">
                  +{money(row.increase, row.currency, undefined, "none")} / year
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={applyRaises.isPending}>
              {applyRaises.isPending ? "Applying…" : "Apply raises"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A numbered step heading: the planner reads top to bottom, then the summary. */
function StepHeader({
  step,
  title,
  description,
  aside,
}: {
  step: number;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start gap-3">
      <span className="bg-foreground text-background grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <CardTitle className="flex items-center gap-2">
          {title}
          {aside}
        </CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </div>
    </CardHeader>
  );
}

function IndividualRow({
  individual: { employee, mode, text },
  result,
  onChange,
  onRemove,
}: {
  individual: Individual;
  result: RaiseOverride | { error: string };
  onChange: (patch: Partial<Individual>) => void;
  onRemove: () => void;
}) {
  const { amount, currency } = employee.salary;
  const next =
    "error" in result
      ? undefined
      : result.newAmount !== undefined
        ? result.newAmount
        : applyRaise(amount, result.percent!);
  return (
    <li className="bg-muted flex flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={employee.fullName} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{employee.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {employee.jobTitle} · {employee.countryCode}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${employee.fullName}`}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-11">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) => v && onChange({ mode: v as Individual["mode"], text: "" })}
          aria-label={`Raise type for ${employee.fullName}`}
        >
          <ToggleGroupItem value="percent">%</ToggleGroupItem>
          <ToggleGroupItem value="amount">New salary</ToggleGroupItem>
        </ToggleGroup>
        <Input
          inputMode="decimal"
          aria-label={mode === "percent" ? "Raise %" : "New annual salary"}
          aria-invalid={"error" in result && text !== "" ? true : undefined}
          placeholder={mode === "percent" ? "e.g. 8" : toMajorString(amount, currency)}
          value={text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="bg-card h-8 w-32"
        />
        <span className="text-sm tabular-nums">
          <span className="text-muted-foreground">
            {money(amount, currency, employee.countryCode, "none")}
          </span>
          {next !== undefined && (
            <span className="font-semibold">
              {" → "}
              {money(next, currency, employee.countryCode, "none")}
            </span>
          )}
        </span>
        {"error" in result && text !== "" && (
          <span className="text-destructive text-xs">{result.error}</span>
        )}
      </div>
    </li>
  );
}

function EmployeeSearch({
  exclude,
  onPick,
}: {
  exclude: string[];
  onPick: (employee: EmployeeSummary) => void;
}) {
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 200);
  const { data, isFetching } = useQuery({
    queryKey: ["employees", "raise-search", q],
    queryFn: () =>
      api<Page<EmployeeSummary>>(
        `/employees${toQueryString({ q, pageSize: 6, status: "active" })}`,
      ),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
  const results = (data?.data ?? []).filter((e) => !exclude.includes(e.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Find an employee"
          placeholder="Find an employee by name, email or code"
          className="pl-9"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {q.length >= 2 && (
        <ul className="rounded-lg border">
          {results.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {isFetching ? "Searching…" : "No active employee matches."}
            </li>
          )}
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                onClick={() => {
                  onPick(e);
                  setTerm("");
                }}
              >
                <EmployeeAvatar name={e.fullName} className="size-7" />
                <span className="min-w-0 flex-1 truncate">
                  {e.fullName}{" "}
                  <span className="text-muted-foreground">
                    · {e.jobTitle}, {e.countryCode}
                  </span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {money(e.salary.amount, e.salary.currency, e.countryCode, "none")}
                </span>
                <Plus className="text-muted-foreground size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
