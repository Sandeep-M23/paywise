import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeesView } from "@/components/employees/employees-view";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  // Suspense: the view reads filters from the URL (useSearchParams).
  return (
    <Suspense>
      <EmployeesView />
    </Suspense>
  );
}
