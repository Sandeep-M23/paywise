"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { deactivateEmployeeSchema, type EmployeeDetail } from "@paywise/shared";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { applyApiErrors } from "@/utils/helpers/others/form-errors";
import { useDeactivateEmployee } from "@/utils/apis/employees";
import { Field } from "@/components/shared/FormField/FormField";

export function DeactivateDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: EmployeeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deactivate = useDeactivateEmployee(employee.id);
  const { register, handleSubmit, setError, reset, formState } = useForm<
    z.input<typeof deactivateEmployeeSchema>,
    unknown,
    z.output<typeof deactivateEmployeeSchema>
  >({
    resolver: zodResolver(deactivateEmployeeSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) reset({ reason: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(async ({ reason }) => {
    try {
      await deactivate.mutateAsync(reason);
      toast.success(`${employee.fullName} deactivated`);
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {employee.fullName}?</DialogTitle>
          <DialogDescription>
            They will no longer count in pay insights. Their record and salary history are kept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="reason"
            label="Reason"
            error={formState.errors.reason?.message}
            hint="For example: Resigned, Contract ended"
          >
            <Textarea id="reason" rows={2} autoFocus {...register("reason")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={formState.isSubmitting}>
              Deactivate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
