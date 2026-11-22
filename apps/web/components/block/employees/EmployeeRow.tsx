import { CalendarDays, Hash, Mail } from "lucide-react";
import type { EmployeeSummary } from "@paywise/shared";
import { CountryLabel } from "@/components/shared/CountryLabel/CountryLabel";
import { DepartmentLabel } from "@/components/shared/DepartmentLabel/DepartmentLabel";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TableCell, TableRow } from "@/components/ui/table";
import { date, humanize, money } from "@/utils/helpers/others/format";

export function EmployeeRow({
  employee,
  index,
  measureElement,
  onSelect,
}: {
  employee: EmployeeSummary;
  index: number;
  measureElement: (node: Element | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <TableRow
      key={employee.id}
      data-index={index}
      ref={measureElement}
      aria-rowindex={index + 2}
      className="hover:bg-accent/60 focus-visible:bg-accent cursor-pointer outline-none"
      tabIndex={0}
      onClick={() => onSelect(employee.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(employee.id)}
    >
      <TableCell className="text-muted-foreground truncate pl-4 font-mono text-xs">
        {employee.employeeCode}
      </TableCell>
      <TableCell className="py-2">
        <div className="flex min-w-0 items-center gap-3">
          <EmployeeAvatar name={employee.fullName} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <HoverCard openDelay={400}>
              <HoverCardTrigger asChild>
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate" title={employee.fullName}>
                    {employee.fullName}
                  </span>
                  {employee.status === "inactive" && (
                    <Badge variant="secondary" className="shrink-0">
                      Inactive
                    </Badge>
                  )}
                </span>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="w-72">
                <EmployeePreview employee={employee} />
              </HoverCardContent>
            </HoverCard>
            <div className="text-muted-foreground truncate text-xs md:hidden">
              {employee.jobTitle} · {employee.countryCode}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden truncate md:table-cell" title={employee.jobTitle}>
        {employee.jobTitle}
      </TableCell>
      <TableCell className="hidden truncate lg:table-cell">
        <DepartmentLabel name={employee.department} className="text-muted-foreground" />
      </TableCell>
      <TableCell className="hidden truncate sm:table-cell">
        <CountryLabel code={employee.countryCode} />
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
      </TableCell>
      <TableCell className="text-muted-foreground hidden pr-4 lg:table-cell">
        {date(employee.hireDate)}
      </TableCell>
    </TableRow>
  );
}

function EmployeePreview({ employee }: { employee: EmployeeSummary }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={employee.fullName} className="size-10" />
        <div className="min-w-0">
          <p className="truncate font-medium">{employee.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{employee.jobTitle}</p>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-col gap-1.5 text-xs">
        <span className="flex items-center gap-2">
          <Mail className="size-3.5" aria-hidden /> {employee.email}
        </span>
        <span className="flex items-center gap-2">
          <Hash className="size-3.5" aria-hidden /> {employee.employeeCode} ·{" "}
          {humanize(employee.employmentType)}
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays className="size-3.5" aria-hidden /> Hired {date(employee.hireDate)}
        </span>
      </div>
      <p className="text-base font-semibold tabular-nums">
        {money(employee.salary.amount, employee.salary.currency, employee.countryCode)}
        <span className="text-muted-foreground text-xs font-normal"> / year</span>
      </p>
    </div>
  );
}
