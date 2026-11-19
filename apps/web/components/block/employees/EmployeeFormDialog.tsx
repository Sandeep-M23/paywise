"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { employeeFormSchema } from "@/utils/forms/schemas";
import { EMPLOYEE_FORM_DEFAULTS } from "@/utils/forms/defaults";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  COUNTRIES,
  EMPLOYMENT_TYPES,
  GENDERS,
  currencyForCountry,
  parseMoneyInput,
  type EmployeeDetail,
} from "@paywise/shared";
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
import { humanize } from "@/utils/helpers/others/format";
import { applyApiErrors } from "@/utils/helpers/others/form-errors";
import { useCreateEmployee, useUpdateEmployee } from "@/utils/apis/employees";
import { Field } from "@/components/shared/FormField/FormField";
import type { EditableField } from "@/@types";

const EDITABLE: EditableField[] = [
  "fullName",
  "email",
  "jobTitle",
  "department",
  "gender",
  "employmentType",
  "hireDate",
];

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  employee?: EmployeeDetail;
  onSaved?: (employee: EmployeeDetail) => void;
}) {
  const editing = Boolean(employee);
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? "");
  const form = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: EMPLOYEE_FORM_DEFAULTS,
  });
  const { register, handleSubmit, control, setError, reset, watch, formState } = form;
  const errors = formState.errors;
  const country = watch("countryCode");

  useEffect(() => {
    if (!open) return;
    reset(
      employee
        ? {
            employeeCode: employee.employeeCode,
            fullName: employee.fullName,
            email: employee.email,
            jobTitle: employee.jobTitle,
            department: employee.department,
            countryCode: employee.countryCode,
            salary: "",
            gender: employee.gender,
            employmentType: employee.employmentType,
            hireDate: employee.hireDate,
          }
        : EMPLOYEE_FORM_DEFAULTS,
    );
  }, [open, employee, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (employee) {
        const patch = Object.fromEntries(
          EDITABLE.filter((field) => values[field] !== employee[field]).map((field) => [
            field,
            values[field],
          ]),
        );
        if (Object.keys(patch).length === 0) return onOpenChange(false);
        const saved = await update.mutateAsync(patch);
        toast.success("Employee updated");
        onSaved?.(saved);
      } else {
        const parsed = parseMoneyInput(values.salary, currencyForCountry(values.countryCode));
        if (!parsed.ok) return setError("salary", { message: parsed.error });
        const { salary: _salary, ...rest } = values;
        const saved = await create.mutateAsync({ ...rest, salaryAmount: parsed.value });
        toast.success(`${saved.fullName} added`);
        onSaved?.(saved);
      }
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, setError, { salaryAmount: "salary" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${employee!.fullName}` : "Add employee"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Salary changes are recorded separately with a reason. Use “Change salary”."
              : "Currency follows the country. The starting salary is recorded as the hire entry in salary history."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Field id="employeeCode" label="Employee code" error={errors.employeeCode?.message}>
            <Input
              id="employeeCode"
              placeholder="EMP-10001"
              disabled={editing}
              {...register("employeeCode")}
            />
          </Field>
          <Field id="fullName" label="Full name" error={errors.fullName?.message}>
            <Input id="fullName" {...register("fullName")} />
          </Field>
          <Field id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
          <Field id="jobTitle" label="Job title" error={errors.jobTitle?.message}>
            <Input id="jobTitle" {...register("jobTitle")} />
          </Field>
          <Field id="department" label="Department" error={errors.department?.message}>
            <Input id="department" {...register("department")} />
          </Field>
          <Field
            id="countryCode"
            label="Country"
            error={errors.countryCode?.message}
            hint={editing ? "Country can't be changed after creation." : undefined}
          >
            <Controller
              control={control}
              name="countryCode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={editing}>
                  <SelectTrigger id="countryCode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.currency.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {!editing && (
            <Field
              id="salary"
              label={`Annual salary (${currencyForCountry(country).toUpperCase()})`}
              error={errors.salary?.message}
              hint="e.g. 18,00,000 or 85000.00"
            >
              <Input id="salary" inputMode="decimal" {...register("salary")} />
            </Field>
          )}
          <Field id="hireDate" label="Hire date" error={errors.hireDate?.message}>
            <Input id="hireDate" type="date" {...register("hireDate")} />
          </Field>
          <Field id="employmentType" label="Employment type" error={errors.employmentType?.message}>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="employmentType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {humanize(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="gender"
            label="Gender"
            error={errors.gender?.message}
            hint="Used only for anonymised pay-gap reporting."
          >
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {humanize(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving…" : editing ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
