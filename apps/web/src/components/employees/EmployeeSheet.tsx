"use client";

import { useAtom } from "jotai";
import { useState } from "react";
import { Pencil, TrendingUp, UserX } from "@/components/icons";
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
import { HeroMoney } from "@/components/HeroMoney";
import { CountryLabel } from "@/components/CountryLabel";
import { DepartmentLabel } from "@/components/DepartmentLabel";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { selectedEmployeeIdAtom } from "@/lib/atoms/employees";
import { date, humanize } from "@/lib/format";
import { useEmployee } from "@/hooks/useEmployees";
import { ChangeSalaryDialog } from "@/components/employees/ChangeSalaryDialog";
import { DeactivateDialog } from "@/components/employees/DeactivateDialog";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { PeerPosition } from "@/components/employees/PeerPosition";
import { SalaryHistory } from "@/components/employees/SalaryHistory";

type Dialog = "edit" | "salary" | "deactivate" | null;

export function EmployeeSheet() {
  const [id, setId] = useAtom(selectedEmployeeIdAtom);
  const { data: employee, isLoading, error } = useEmployee(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && setId(null)}>
      <SheetContent className="w-full gap-0 overflow-y-auto overscroll-contain sm:max-w-lg">
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
            {/* Name, salary and actions stay in view while the history scrolls. */}
            <div className="bg-popover sticky top-0 z-10 flex flex-col gap-4 border-b px-4 pt-4 pb-4">
              <SheetHeader className="flex-row items-center gap-3 p-0 pr-8">
                <EmployeeAvatar name={employee.fullName} className="size-11 text-sm" />
                <div className="min-w-0">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    {employee.fullName}
                    {employee.status === "inactive" && <Badge variant="secondary">Inactive</Badge>}
                  </SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-x-2">
                    {employee.jobTitle} · <DepartmentLabel name={employee.department} /> ·{" "}
                    <CountryLabel code={employee.countryCode} />
                  </SheetDescription>
                </div>
              </SheetHeader>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Annual salary</p>
                <HeroMoney
                  amount={employee.salary.amount}
                  currency={employee.salary.currency}
                  countryCode={employee.countryCode}
                  className="text-3xl"
                />
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
            </div>
            <div className="flex flex-col gap-6 px-4 py-5">
              <section aria-labelledby="peers-heading" className="flex flex-col gap-2">
                <h3 id="peers-heading" className="text-sm font-medium">
                  Compared with peers
                </h3>
                <PeerPosition employee={employee} />
              </section>
              <Separator />
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
                <h3 className="mb-3 text-sm font-medium">Salary history</h3>
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
