import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EMPLOYEE_COLUMNS as COLUMNS } from "@/utils/constants/employees";

export function EmployeeSkeletonRows({
  count,
  keyPrefix,
  rowClassName,
}: {
  count: number;
  keyPrefix: string;
  rowClassName?: string;
}) {
  return Array.from({ length: count }, (_, i) => (
    <TableRow key={`${keyPrefix}-${i}`} className={rowClassName} aria-hidden>
      {COLUMNS.map((c) => (
        <TableCell key={c.field} className={cn("h-[53px]", c.className)}>
          {c.field === "fullName" ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <Skeleton className="h-4 w-full" />
          )}
        </TableCell>
      ))}
    </TableRow>
  ));
}
