import type { ReactNode } from "react";
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
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
      <AvatarFallback className="bg-lime text-lime-foreground text-xs font-bold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** A tinted circle holding an icon, for stat tiles and section headers. */
export function IconBadge({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: AppIcon;
  tone?: "primary" | "warning" | "success" | "muted";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full", tones[tone], className)}
    >
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}

/**
 * The one stat card used on every page: grey icon circle, label,
 * large value and a hint line. The hint line is always there (blank if unused) so
 * cards in a row are the same height.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading = false,
  className,
}: {
  icon: AppIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "warning";
  /** Shows shining placeholders for the value and hint. */
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-border flex h-full items-center gap-3.5 rounded-xl px-4 py-3.5 ring-1",
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground truncate text-sm">{label}</span>
        <span
          className={cn(
            "truncate text-xl leading-tight font-bold tracking-tight tabular-nums",
            tone === "warning" && "text-warning",
          )}
        >
          {loading ? <Skeleton className="my-0.5 h-6 w-24" /> : value}
        </span>
        {loading ? (
          <Skeleton className="h-3 w-32" />
        ) : (
          <span className="text-muted-foreground truncate text-xs">{hint ?? "\u00a0"}</span>
        )}
      </div>
    </div>
  );
}
