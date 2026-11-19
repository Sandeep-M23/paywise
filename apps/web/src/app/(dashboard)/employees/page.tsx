import { Suspense } from "react";
import { EmployeesView } from "@/components/employees/EmployeesView";

export default function EmployeesPage() {
  // Suspense: the view reads filters from the URL (useSearchParams).
  return (
    <Suspense>
      <EmployeesView />
    </Suspense>
  );
}
