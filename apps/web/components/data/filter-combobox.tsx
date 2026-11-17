"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string; icon?: React.ReactNode };

/**
 * A searchable single-select filter: type to narrow 20 job titles instead of
 * scrolling a long dropdown. Shows the active value, with a one-click clear.
 */
export function FilterCombobox({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  icon: LucideIcon;
  value: string | undefined;
  options: FilterOption[];
  onChange: (value: string | undefined) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className={cn(
              "w-full justify-between rounded-xl font-normal",
              selected && "border-primary/50 bg-primary/5 pr-9",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="text-muted-foreground size-4" aria-hidden />
              <span className="truncate">
                {selected ? (
                  <>
                    {selected.icon} {selected.label}
                  </>
                ) : (
                  <span className="text-muted-foreground">{label}</span>
                )}
              </span>
            </span>
            {!selected && <ChevronsUpDown className="text-muted-foreground size-3.5" aria-hidden />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No match.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value === value ? undefined : option.value);
                      setOpen(false);
                    }}
                  >
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => onChange(undefined)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
