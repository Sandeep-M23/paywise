import { Suspense } from "react";
import { EmployeesView } from "@/components/Block/Employees/EmployeesView";

export default function EmployeesPage() {
  // Suspense: the view reads filters from the URL (useSearchParams).
  return (
    <Suspense>
      <EmployeesView />
    </Suspense>
  );
}
