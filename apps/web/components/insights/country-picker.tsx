"use client";

import { COUNTRIES } from "@paywise/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CountryPicker({
  value,
  onChange,
  allowAll = false,
}: {
  value: string | undefined;
  onChange: (code: string | undefined) => void;
  allowAll?: boolean;
}) {
  return (
    <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? undefined : v)}>
      <SelectTrigger className="w-52" aria-label="Country">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">All countries</SelectItem>}
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.name} ({c.currency.toUpperCase()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
