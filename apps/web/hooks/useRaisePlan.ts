"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  raisePlanSchema,
  type CountryCode,
  type EmployeeSummary,
  type RaiseOverride,
} from "@paywise/shared";
import type { Individual, ManualReason } from "@/@types";
import { useClientNow } from "@/hooks/useClientNow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApplyRaises, useRaiseCost } from "@/utils/apis/raises";
import { date } from "@/utils/helpers/others/format";
import { parseIndividualRaise } from "@/utils/helpers/raises";
import { ApiError } from "@/utils/services";

export function useRaisePlan() {
  const [percentText, setPercentText] = useState("5");
  const [countries, setCountries] = useState<string[]>(["IN"]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const now = useClientNow();
  const today = now?.toISOString().slice(0, 10) ?? "";
  const [pickedDate, setPickedDate] = useState("");
  const effectiveOn = pickedDate || today;
  const [reason, setReason] = useState<ManualReason>("merit");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const applyRaises = useApplyRaises();

  const overrides = individuals.map(parseIndividualRaise);
  const validOverrides = overrides.filter((o): o is RaiseOverride => !("error" in o));
  const plan = {
    percent: percentText.trim() === "" ? 0 : Number(percentText),
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

  const costLoading = requested !== null && cost === undefined;
  const people = cost?.reduce((sum, row) => sum + row.headcount, 0) ?? 0;
  const canApply =
    parsed.success &&
    overrides.length === validOverrides.length &&
    people > 0 &&
    !isFetching &&
    effectiveOn !== "";

  const addIndividual = (employee: EmployeeSummary) =>
    setIndividuals((list) => [...list, { employee, mode: "percent", text: "" }]);
  const updateIndividual = (id: string, patch: Partial<Individual>) =>
    setIndividuals((list) => list.map((i) => (i.employee.id === id ? { ...i, ...patch } : i)));
  const removeIndividual = (id: string) =>
    setIndividuals((list) => list.filter((i) => i.employee.id !== id));

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
        (result.scheduled
          ? `Scheduled ${result.applied.toLocaleString()} raises from ${date(effectiveOn)}`
          : `Raised ${result.applied.toLocaleString()} salaries`) +
          (result.skipped ? ` (${result.skipped} too small to change)` : ""),
      );
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not apply the raises. Nothing changed.",
      );
    }
  }

  return {
    group: {
      percentText,
      setPercentText,
      percentError,
      countries,
      setCountries,
      departments,
      setDepartments,
      titles,
      setTitles,
    },
    individuals: {
      list: individuals,
      overrides,
      add: addIndividual,
      update: updateIndividual,
      remove: removeIndividual,
    },
    estimate: {
      requested,
      cost,
      costLoading,
      isFetching,
      people,
      individualCount: validOverrides.length,
    },
    apply: {
      today,
      effectiveOn,
      setEffectiveOn: setPickedDate,
      reason,
      setReason,
      note,
      setNote,
      canApply,
      confirming,
      setConfirming,
      applying: applyRaises.isPending,
      run: apply,
    },
  };
}

export type RaisePlan = ReturnType<typeof useRaisePlan>;
