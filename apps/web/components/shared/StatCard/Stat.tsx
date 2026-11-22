import type { ReactNode } from "react";
import { StatTile } from "@/components/shared/StatCard/StatCard";
import type { AppIcon } from "@/@types";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: AppIcon;
  tone?: "primary" | "warning" | "success" | "muted";
  loading?: boolean;
}) {
  return (
    <StatTile
      icon={icon}
      label={label}
      value={value}
      hint={hint}
      tone={tone === "warning" ? "warning" : undefined}
      loading={loading}
    />
  );
}
