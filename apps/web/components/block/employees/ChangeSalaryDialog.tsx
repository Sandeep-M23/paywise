"use client";

import { Field } from "@/components/shared/FormField/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useChangeSalary } from "@/utils/apis/employees";
import { applyApiErrors } from "@/utils/helpers/others/form-errors";
import { date, humanize, money, percent } from "@/utils/helpers/others/format";
import { zodResolver } from "@hookform/resolvers/zod";
import { salaryChangeFormSchema, type SalaryChangeFormValues } from "@/utils/forms/schemas";
import {
  MANUAL_REVISION_REASONS,
  parseMoneyInput,
  toMajorString,
  type EmployeeDetail,
} from "@paywise/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export function ChangeSalaryDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: EmployeeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changeSalary = useChangeSalary(employee.id);
  const { currency } = employee.salary;
  const form = useForm<SalaryChangeFormValues>({
    resolver: zodResolver(salaryChangeFormSchema),
    defaultValues: { amount: "", effectiveOn: today(), reason: "merit", note: "" },
  });
  const { register, handleSubmit, control, setError, reset, watch, formState } = form;

  useEffect(() => {
    if (open) {
      reset({
        amount: toMajorString(employee.salary.amount, currency),
        effectiveOn: today(),
        reason: "merit",
        note: "",
      });
    }
  }, [open, employee, currency, reset]);

  const parsed = parseMoneyInput(watch("amount") ?? "", currency);
  const change = parsed.ok ? parsed.value / employee.salary.amount - 1 : null;
  const effectiveOn = watch("effectiveOn") ?? "";
  const scheduled = effectiveOn > today();

  const onSubmit = handleSubmit(async (values) => {
    const amount = parseMoneyInput(values.amount, currency);
    if (!amount.ok) return setError("amount", { message: amount.error });
    try {
      await changeSalary.mutateAsync({
        ...values,
        amount: amount.value,
        note: values.note || undefined,
      });
      toast.success(
        scheduled
          ? `Salary change scheduled for ${date(values.effectiveOn)}`
          : "Salary updated and recorded in history",
      );
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change salary</DialogTitle>
          <DialogDescription>
            {employee.fullName} currently earns{" "}
            <strong>{money(employee.salary.amount, currency, employee.countryCode)}</strong> a year.
            The change is added to their salary history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="amount"
            label={`New annual salary (${currency.toUpperCase()})`}
            error={formState.errors.amount?.message}
            hint={
              change !== null && change !== 0
                ? `${change > 0 ? "+" : ""}${percent(change)} vs. current`
                : undefined
            }
          >
            <Input id="amount" inputMode="decimal" autoFocus {...register("amount")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="effectiveOn"
              label="Effective from"
              error={formState.errors.effectiveOn?.message}
              hint={scheduled ? "Scheduled: the current salary stays until then" : undefined}
            >
              <Input id="effectiveOn" type="date" {...register("effectiveOn")} />
            </Field>
            <Field id="reason" label="Reason" error={formState.errors.reason?.message}>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
            </Field>
          </div>
          <Field id="note" label="Note (optional)" error={formState.errors.note?.message}>
            <Textarea
              id="note"
              rows={2}
              placeholder="e.g. Promoted to Senior Engineer"
              {...register("note")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving…" : "Save change"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
