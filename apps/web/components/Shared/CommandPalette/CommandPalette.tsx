"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  BarChart3,
  Calculator,
  Download,
  FileUp,
  LayoutDashboard,
  Scale,
  Search,
  Users,
} from "@/components/Icons";
import type { EmployeeSummary, Page } from "@paywise/shared";
import { countryFlag } from "@/components/Shared/CountryLabel/CountryLabel";
import { EmployeeAvatar } from "@/components/Shared/EmployeeAvatar/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { api, toQueryString } from "@/utils/services";
import { selectedEmployeeIdAtom } from "@/utils/atoms/employees";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/insights", label: "Pay insights", icon: BarChart3 },
  { href: "/fairness", label: "Pay fairness", icon: Scale },
  { href: "/raises", label: "Raise planner", icon: Calculator },
  { href: "/import", label: "Import CSV", icon: FileUp },
];

/** ⌘K / Ctrl+K: jump to a page, run an action, or find anyone by name or code. */
export function CommandPalette({ className }: { className?: string }) {
  const router = useRouter();
  const selectEmployee = useSetAtom(selectedEmployeeIdAtom);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 200);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const people = useQuery({
    queryKey: ["employees", "palette", term],
    queryFn: () =>
      api<Page<EmployeeSummary>>(
        `/employees${toQueryString({ q: term, pageSize: 6, status: "all" })}`,
      ),
    enabled: open && term.length >= 2,
    staleTime: 30_000,
  });

  function go(action: () => void) {
    setOpen(false);
    setSearch("");
    action();
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "text-muted-foreground w-full justify-between rounded-md font-normal",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden /> Search…
        </span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Paywise"
        description="Jump to a page or find an employee"
      >
        <Command className="**:data-[slot=command-input-wrapper]:h-12">
          {/* Employee rows use forceMount: the server already matched them, so cmdk mustn't hide them. */}
          <CommandInput
            placeholder="Type a name, code or page…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {term.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search people.</CommandEmpty>
            ) : (
              !people.isFetching &&
              people.data?.data.length === 0 && (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No people match “{term}”.
                </p>
              )
            )}
            {term.length >= 2 && (
              <CommandGroup heading="Employees" forceMount>
                {people.isFetching && (
                  <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-sm">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Searching…
                  </div>
                )}
                {people.data?.data.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${e.fullName} ${e.employeeCode} ${e.email}`}
                    forceMount
                    onSelect={() =>
                      go(() => {
                        selectEmployee(e.id);
                        router.push("/employees");
                      })
                    }
                  >
                    <EmployeeAvatar name={e.fullName} className="size-6" />
                    <span className="truncate">{e.fullName}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">
                      {e.jobTitle} · {countryFlag(e.countryCode)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup heading="Go to">
              {PAGES.map(({ href, label, icon: Icon }) => (
                <CommandItem key={href} onSelect={() => go(() => router.push(href))}>
                  <Icon className="size-4" aria-hidden /> {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => go(() => window.location.assign("/api/export/employees.csv"))}
              >
                <Download className="size-4" aria-hidden /> Export all active employees (CSV)
              </CommandItem>
              <CommandItem
                onSelect={() => go(() => window.location.assign("/api/imports/template.csv"))}
              >
                <FileUp className="size-4" aria-hidden /> Download import template
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
