import {
  Briefcase,
  ChartPie,
  Code2,
  Handshake,
  HeartHandshake,
  Landmark,
  Megaphone,
  Package,
  Palette,
  Settings2,
  UsersRound,
  type AppIcon,
} from "@/components/Icons";
import { cn } from "@/lib/utils";

const DEPARTMENT_ICONS: Record<string, AppIcon> = {
  Engineering: Code2,
  Product: Package,
  Design: Palette,
  Data: ChartPie,
  Sales: Handshake,
  Marketing: Megaphone,
  "Customer Success": HeartHandshake,
  Finance: Landmark,
  People: UsersRound,
  Operations: Settings2,
};

export function departmentIcon(department: string): AppIcon {
  return DEPARTMENT_ICONS[department] ?? Briefcase;
}

export function DepartmentLabel({ name, className }: { name: string; className?: string }) {
  const Icon = departmentIcon(name);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <Icon className="text-muted-foreground size-3.5" aria-hidden />
      {name}
    </span>
  );
}
