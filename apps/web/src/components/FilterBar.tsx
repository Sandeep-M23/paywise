"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Filter, type AppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FacetOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Shown on the right, e.g. how many people have this value. */
  count?: number;
};

export type Facet = {
  key: string;
  label: string;
  icon: AppIcon;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Single choice (e.g. status) instead of any number of values. */
  single?: boolean;
  /** The selection that means "not filtered" (status: Active). Defaults to none. */
  defaultValue?: string[];
  searchable?: boolean;
};

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value) => b.includes(value));

const isActive = (facet: Facet) => !same(facet.selected, facet.defaultValue ?? []);

/**
 * All filters behind one "Filters" button. The panel lists each filter on the
 * left and its values on the right: tick as many as you like, search long lists,
 * see how many people each value covers. Active filters sit beside the button as
 * chips ("Country: India, Germany"); click one to edit it, or its × to remove it.
 */
export function FilterBar({
  facets,
  leading,
  children,
  className,
}: {
  facets: Facet[];
  /** Controls before the Filters button on the same row (e.g. search). */
  leading?: ReactNode;
  /** Extra controls on the same row, after the chips (e.g. search, actions). */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(facets[0]?.key);
  const active = facets.find((f) => f.key === activeKey) ?? facets[0];
  const applied = facets.filter(isActive);

  function openAt(key: string) {
    setActiveKey(key);
    setOpen(true);
  }

  function clearAll() {
    for (const facet of facets) facet.onChange(facet.defaultValue ?? []);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
          {leading}
          <Button
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => (open ? setOpen(false) : openAt(applied[0]?.key ?? facets[0]!.key))}
            className={cn(
              "bg-card h-9 gap-2 px-3 font-semibold shadow-none",
              applied.length > 0 && "border-foreground",
            )}
          >
            <Filter className="size-4" aria-hidden />
            Filters
            {applied.length > 0 && (
              <span className="bg-foreground text-background grid min-w-5 place-items-center rounded-md px-1 text-xs tabular-nums">
                {applied.length}
              </span>
            )}
          </Button>

          {applied.map((facet) => (
            <AppliedChip
              key={facet.key}
              facet={facet}
              onEdit={() => openAt(facet.key)}
              onClear={() => facet.onChange(facet.defaultValue ?? [])}
            />
          ))}
          {children}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-[min(38rem,calc(100vw-2rem))] overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-[11rem_1fr]">
          <nav aria-label="Filters" className="bg-muted flex flex-col gap-0.5 border-r p-2">
            {facets.map((facet) => {
              const Icon = facet.icon;
              const count = isActive(facet) ? facet.selected.length : 0;
              return (
                <button
                  key={facet.key}
                  type="button"
                  onClick={() => setActiveKey(facet.key)}
                  aria-current={facet.key === active?.key ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    facet.key === active?.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{facet.label}</span>
                  {count > 0 && (
                    <span className="bg-lime text-lime-foreground grid min-w-5 place-items-center rounded-md px-1 text-xs font-bold tabular-nums">
                      {facet.single ? "1" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          {active && <FacetOptions key={active.key} facet={active} />}
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <Button variant="ghost" size="sm" disabled={applied.length === 0} onClick={clearAll}>
            Clear all
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FacetOptions({ facet }: { facet: Facet }) {
  // The parent's selection can lag a click (the directory's lives in the URL), so
  // build each change on the latest local pick, or a quick second click would
  // overwrite the first. Re-sync whenever the parent's selection actually changes.
  const selectedKey = facet.selected.join("\u0000");
  const [picked, setPicked] = useState(facet.selected);
  const latest = useRef(facet.selected);
  useEffect(() => {
    latest.current = facet.selected;
    setPicked(facet.selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on content, not identity
  }, [selectedKey]);

  function toggle(value: string) {
    const current = latest.current;
    const next = facet.single
      ? [value]
      : current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    latest.current = next;
    setPicked(next);
    facet.onChange(next);
  }

  function clear() {
    latest.current = [];
    setPicked([]);
    facet.onChange([]);
  }
  const searchable = facet.searchable ?? facet.options.length > 8;

  return (
    <Command className="rounded-none">
      {searchable && <CommandInput placeholder={`Search ${facet.label.toLowerCase()}…`} />}
      <CommandList className="max-h-80">
        <CommandEmpty>No match.</CommandEmpty>
        <CommandGroup
          heading={
            facet.single
              ? `${facet.label}: pick one`
              : `${facet.label}: pick any${picked.length ? ` · ${picked.length} picked` : ""}`
          }
        >
          {facet.options.map((option) => {
            const checked = picked.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => toggle(option.value)}
                aria-checked={checked}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center border",
                    facet.single ? "rounded-full" : "rounded-[4px]",
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input [&_svg]:invisible",
                  )}
                >
                  <Check className="size-3" />
                </span>
                {option.icon}
                <span className="flex-1 truncate">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {option.count.toLocaleString()}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      {!facet.single && picked.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-foreground border-t px-3 py-2 text-left text-xs font-medium"
        >
          Clear {facet.label.toLowerCase()}
        </button>
      )}
    </Command>
  );
}

/** "Country: India, Germany +1" — click to edit, × to remove. */
function AppliedChip({
  facet,
  onEdit,
  onClear,
}: {
  facet: Facet;
  onEdit: () => void;
  onClear: () => void;
}) {
  const labels = facet.selected.map(
    (value) => facet.options.find((o) => o.value === value)?.label ?? value,
  );
  const shown = labels.slice(0, 2).join(", ");
  const more = labels.length - 2;
  return (
    <span className="bg-lime/30 dark:bg-lime/15 inline-flex h-9 max-w-80 items-center rounded-lg text-sm">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-3"
        title={`${facet.label}: ${labels.join(", ")}`}
      >
        <span className="text-muted-foreground shrink-0">{facet.label}:</span>
        <span className="truncate font-semibold">{shown}</span>
        {more > 0 && <span className="shrink-0 font-semibold">+{more}</span>}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${facet.label} filter`}
        className="hover:bg-foreground/10 mr-1 grid size-7 shrink-0 place-items-center rounded-md"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
