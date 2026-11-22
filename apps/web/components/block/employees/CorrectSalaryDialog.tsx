"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  parseMoneyInput,
  toMajorString,
  type EmployeeDetail,
  type SalaryRevision,
} from "@paywise/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { useChangeSalary } from "@/utils/apis/employees";
import { correctionFormSchema, type CorrectionFormValues } from "@/utils/forms/schemas";
import { applyApiErrors } from "@/utils/helpers/others/form-errors";
import { date, humanize, money } from "@/utils/helpers/others/format";

export function CorrectSalaryDialog({
  employee,
  revision,
  onOpenChange,
}: {
  employee: EmployeeDetail;
  revision: SalaryRevision | null;
  onOpenChange: (open: boolean) => void;
}) {
  const changeSalary = useChangeSalary(employee.id);
  const { register, handleSubmit, setError, reset, formState } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionFormSchema),
    defaultValues: { amount: "", note: "" },
  });

  useEffect(() => {
    if (revision) {
      reset({ amount: toMajorString(revision.amount, revision.currency), note: "" });
    }
  }, [revision, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!revision) return;
    const amount = parseMoneyInput(values.amount, revision.currency);
    if (!amount.ok) return setError("amount", { message: amount.error });
    try {
      await changeSalary.mutateAsync({
        amount: amount.value,
        effectiveOn: revision.effectiveOn,
        reason: "correction",
        correctsRevisionId: revision.id,
        note: values.note || undefined,
      });
      toast.success(`Corrected the ${date(revision.effectiveOn)} salary`);
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, setError);
    }
  });

  return (
    <Dialog open={revision !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct a salary change</DialogTitle>
          {revision && (
            <DialogDescription>
              The {humanize(revision.reason).toLowerCase()} on {date(revision.effectiveOn)} recorded{" "}
              <strong>{money(revision.amount, revision.currency, employee.countryCode)}</strong>.
              The correction replaces it from the same date; the original stays in the history,
              struck through.
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="correctAmount"
            label={`Correct annual salary (${revision?.currency.toUpperCase() ?? ""})`}
            error={formState.errors.amount?.message}
          >
            <Input id="correctAmount" inputMode="decimal" autoFocus {...register("amount")} />
          </Field>
          <Field
            id="correctNote"
            label="What was wrong? (optional)"
            error={formState.errors.note?.message}
          >
            <Textarea
              id="correctNote"
              rows={2}
              placeholder="e.g. Typo: an extra zero"
              {...register("note")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
