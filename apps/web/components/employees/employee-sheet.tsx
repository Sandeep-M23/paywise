"use client";

import { useAtom } from "jotai";
import { useState } from "react";
import { Pencil, TrendingUp, UserX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { selectedEmployeeIdAtom } from "@/lib/atoms";
import { countryName, date, humanize, money } from "@/lib/format";
import { useEmployee } from "@/lib/queries";
import { ChangeSalaryDialog } from "./change-salary-dialog";
import { DeactivateDialog } from "./deactivate-dialog";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { SalaryHistory } from "./salary-history";

type Dialog = "edit" | "salary" | "deactivate" | null;

export function EmployeeSheet() {
  const [id, setId] = useAtom(selectedEmployeeIdAtom);
  const { data: employee, isLoading, error } = useEmployee(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && setId(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {isLoading && (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>Could not load this employee.</AlertDescription>
          </Alert>
        )}
        {employee && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {employee.fullName}
                {employee.status === "inactive" && <Badge variant="secondary">Inactive</Badge>}
              </SheetTitle>
              <SheetDescription>
                {employee.jobTitle} · {employee.department} · {countryName(employee.countryCode)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-5 px-4 pb-6">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Annual salary</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
                </p>
              </div>
              {employee.status === "active" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setDialog("salary")}>
                    <TrendingUp className="size-4" aria-hidden /> Change salary
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialog("edit")}>
                    <Pencil className="size-4" aria-hidden /> Edit details
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("deactivate")}>
                    <UserX className="size-4" aria-hidden /> Deactivate
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Deactivated{employee.deactivatedAt && ` on ${date(employee.deactivatedAt)}`}:{" "}
                    {employee.deactivationReason}
                  </AlertDescription>
                </Alert>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Employee code", employee.employeeCode],
                  ["Email", employee.email],
                  ["Hire date", date(employee.hireDate)],
                  ["Employment", humanize(employee.employmentType)],
                  ["Currency", employee.salary.currency.toUpperCase()],
                  ["Gender", humanize(employee.gender)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="break-all">{value}</dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <div>
                <h3 className="mb-3 font-medium">Salary history</h3>
                <SalaryHistory revisions={employee.revisions} countryCode={employee.countryCode} />
              </div>
            </div>
            <EmployeeFormDialog open={dialog === "edit"} onOpenChange={close} employee={employee} />
            <ChangeSalaryDialog
              open={dialog === "salary"}
              onOpenChange={close}
              employee={employee}
            />
            <DeactivateDialog
              open={dialog === "deactivate"}
              onOpenChange={close}
              employee={employee}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
