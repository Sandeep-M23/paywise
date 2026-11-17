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
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { countryName } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Small visual vocabulary reused across tables and cards: country flags,
 * department icons and initials avatars. Icons always sit next to text, so
 * nothing is conveyed by the icon alone.
 */

const FLAGS: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  DE: "🇩🇪",
  GB: "🇬🇧",
  JP: "🇯🇵",
  CA: "🇨🇦",
  AU: "🇦🇺",
  SG: "🇸🇬",
};

export const countryFlag = (code: string) => FLAGS[code] ?? "🏳️";

export function CountryLabel({ code, short = false }: { code: string; short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="text-base leading-none">
        {FLAGS[code] ?? "🏳️"}
      </span>
      {short ? code : countryName(code)}
    </span>
  );
}

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
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

export function departmentIcon(department: string): LucideIcon {
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

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, "")
    .trim()
    .split(/[\s-]+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function EmployeeAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className="bg-primary/12 text-primary text-xs font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** A tinted rounded square holding an icon, for KPI tiles and section headers. */
export function IconBadge({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  tone?: "primary" | "warning" | "success" | "muted";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/12 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tones[tone], className)}
    >
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}
