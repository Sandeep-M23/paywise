"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { EmployeeDetail } from "@paywise/shared";
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
import { ApiError } from "@/lib/api";
import { useDeactivateEmployee } from "@/lib/queries";
import { Field } from "./field";

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
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  async function confirm() {
    if (!reason.trim()) return setError("Give a reason, e.g. Resigned");
    try {
      await deactivate.mutateAsync(reason.trim());
      toast.success(`${employee.fullName} deactivated`);
      onOpenChange(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not deactivate");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {employee.fullName}?</DialogTitle>
          <DialogDescription>
            They will no longer count in pay insights. Their record and salary history are kept.
          </DialogDescription>
        </DialogHeader>
        <Field id="reason" label="Reason" error={error}>
          <Textarea
            id="reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deactivate.isPending}>
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
