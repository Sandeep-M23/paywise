import { Suspense } from "react";
import { EmployeesView } from "@/components/block/employees/EmployeesView";

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesView />
    </Suspense>
  );
}
