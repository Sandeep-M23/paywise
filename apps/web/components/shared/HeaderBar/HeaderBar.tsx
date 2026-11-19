"use client";

import { usePathname } from "next/navigation";
import { BookOpen, Lightbulb } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/shared/CommandPalette/CommandPalette";
import { isActive, LINKS } from "@/utils/constants/navigation";

/** "How it works": what the page is for and how to use it, as numbered steps. */
function PageGuide({ page }: { page: (typeof LINKS)[number] }) {
  const Icon = page.icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card gap-1.5">
          <BookOpen className="size-4" aria-hidden />
          <span className="hidden sm:inline">How it works</span>
          <span className="sr-only sm:hidden">How {page.label} works</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 overflow-hidden p-0">
        <div className="dark bg-sidebar text-foreground flex items-start gap-3 px-4 py-3.5">
          <span className="bg-lime text-lime-foreground grid size-9 shrink-0 place-items-center rounded-full">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">{page.label}</p>
            <p className="text-muted-foreground text-sm">{page.guide.summary}</p>
          </div>
        </div>
        <ol className="flex flex-col gap-3 px-4 py-4">
          {page.guide.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{step.title}</p>
                <p className="text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {page.guide.tip && (
          <p className="bg-lime/25 flex items-start gap-2 border-t px-4 py-3 text-xs leading-relaxed">
            <Lightbulb className="mt-px size-4 shrink-0" aria-hidden />
            {page.guide.tip}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The page title and what it is for on the left; the guide and search on the right. */
export function HeaderBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const page = LINKS.find((link) => isActive(pathname, link));
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-xl leading-tight font-semibold tracking-tight">
          {page?.label ?? "Paywise"}
        </h1>
        {page && (
          <p className="text-muted-foreground hidden truncate text-sm sm:block">
            {page.guide.summary}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {page && <PageGuide page={page} />}
        <CommandPalette className="bg-card ring-border hidden w-60 border-transparent shadow-none ring-1 lg:flex dark:border-transparent" />
      </div>
    </div>
  );
}
