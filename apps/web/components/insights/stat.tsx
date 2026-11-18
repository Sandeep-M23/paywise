import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons";
import { StatTile } from "@/components/data/visuals";

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
  /** Only "warning" changes the tile: it colours the value. */
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
