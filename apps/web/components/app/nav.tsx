"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  BarChart3,
  Calculator,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Users,
  type AppIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { EmployeeAvatar } from "@/components/data/visuals";
import { useQuery } from "@tanstack/react-query";

export type PageGuide = {
  /** One line under the page title. */
  summary: string;
  /** What you can do here, in the order you would usually do it. */
  steps: { title: string; text: string }[];
  tip?: string;
};

export const LINKS: {
  href: string;
  label: string;
  icon: AppIcon;
  exact?: boolean;
  guide: PageGuide;
}[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    guide: {
      summary: "Where pay stands today, and what needs a look.",
      steps: [
        {
          title: "Check the numbers",
          text: "Headcount, pay gaps to review, outliers and the last import, at a glance.",
        },
        {
          title: "Spot what needs attention",
          text: "Gender gaps of 5% or more and the people paid furthest from their peers.",
        },
        {
          title: "Dig in",
          text: "Click a tile, a country or a person to open the detail behind it.",
        },
      ],
      tip: "Every tile is a link to the page that explains it.",
    },
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
    guide: {
      summary: "Every employee record: find people, change salaries, export.",
      steps: [
        {
          title: "Find people",
          text: "Search by name, email or code, then narrow by country, department, job title or status.",
        },
        {
          title: "Open a record",
          text: "Click a row to see salary history, change a salary, edit details or deactivate.",
        },
        {
          title: "Take it to Excel",
          text: "Export CSV downloads exactly the rows your filters show.",
        },
      ],
      tip: "Press / to jump to search. Click a column header to sort.",
    },
  },
  {
    href: "/insights",
    label: "Pay insights",
    icon: BarChart3,
    guide: {
      summary: "How we pay people in one country, in its own currency.",
      steps: [
        {
          title: "Pick a country",
          text: "Every figure on the page is for that country only, in its currency.",
        },
        {
          title: "Read typical pay",
          text: "Median, average and payroll, then pay bands per job title: lowest to highest, with the median marked.",
        },
        {
          title: "Compare",
          text: "The breakdown tables split pay by job title, department and country.",
        },
      ],
      tip: "Active employees only. Medians match Excel's PERCENTILE.INC.",
    },
  },
  {
    href: "/fairness",
    label: "Pay fairness",
    icon: Scale,
    guide: {
      summary: "Gender pay gaps and people paid far from their peers.",
      steps: [
        {
          title: "Check gender gaps",
          text: "Women and men in the same job and country are compared; gaps of 5% or more are flagged.",
        },
        {
          title: "Focus",
          text: "Filter by country, job title or status to see only what needs review.",
        },
        {
          title: "Review outliers",
          text: "People paid unusually far from peers. Open a row to check the record.",
        },
      ],
      tip: "Full-time employees only; groups with fewer than 5 women or men are hidden for privacy.",
    },
  },
  {
    href: "/raises",
    label: "Raise planner",
    icon: Calculator,
    guide: {
      summary: "Plan raises, see what they cost, then apply them in one go.",
      steps: [
        {
          title: "Set a group raise",
          text: "A % for everyone active who matches a country, department and job title. Use 0% to skip.",
        },
        {
          title: "Add individual raises",
          text: "Find a person and give a custom % or a new salary; it replaces the group raise for them.",
        },
        {
          title: "Apply",
          text: "Check the cost per currency, pick the date and reason, and apply. All or nothing.",
        },
      ],
      tip: "Nothing changes until you confirm. Mistakes are fixed later with a correction.",
    },
  },
  {
    href: "/import",
    label: "Import",
    icon: FileUp,
    guide: {
      summary: "Bring employees in from a CSV, checked before anything is saved.",
      steps: [
        {
          title: "Upload",
          text: "Drop a CSV (e.g. saved from Excel). Download the sample to see the columns.",
        },
        {
          title: "Review",
          text: "Every row is checked: see what will be created, updated or has errors, and fix errors in place.",
        },
        {
          title: "Import",
          text: "Valid rows are saved together. Past imports are listed with what each changed.",
        },
      ],
      tip: "Rows with errors are skipped, never half-saved.",
    },
  },
];

export function isActive(pathname: string, { href, exact }: { href: string; exact?: boolean }) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export async function signOut() {
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.assign("/login");
}

// Sidebar item: 8px pill, grey label; the active page is a lime pill on black.
// Sign out is the only red item, and the only place to sign out.
const ITEM = "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors";

function Brand() {
  return (
    <Link href="/" aria-label="Paywise home">
      <Logo />
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {LINKS.map((link) => {
        const active = isActive(pathname, link);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              ITEM,
              active
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function useAccount() {
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ email: string }>("/auth/me"),
    staleTime: Infinity,
  });
  const email = data?.email ?? "";
  const local = email.split("@")[0] || "hr";
  // Short handles are usually initials or a team ("hr"): show them in capitals.
  const name = local.length <= 3 ? local.toUpperCase() : local;
  return { email, name };
}

function AccountIdentity({ name, email }: { name: string; email: string }) {
  return (
    <>
      <EmployeeAvatar name={name} className="size-8 shrink-0" />
      <span className="grid min-w-0 flex-1 text-left leading-tight">
        <span className="truncate text-sm font-semibold first-letter:uppercase">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{email || "\u00a0"}</span>
      </span>
    </>
  );
}

/**
 * The foot of the sidebar, after shadcn's sidebar "NavUser": the signed-in account
 * as one button; it opens a popover with the account, the theme and sign out.
 */
function SidebarFooter() {
  const { name, email } = useAccount();
  return (
    <div className="border-sidebar-border border-t pt-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent focus-visible:ring-sidebar-ring flex w-full items-center gap-2.5 rounded-md p-2 outline-none focus-visible:ring-2"
            aria-label="Account and settings"
          >
            <AccountIdentity name={name} email={email} />
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="end" sideOffset={12} className="w-64 gap-0 p-0">
          <div className="flex items-center gap-2.5 p-3">
            <AccountIdentity name={name} email={email} />
          </div>
          <div className="border-t p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">Theme</p>
            <ThemeToggle />
          </div>
          <div className="border-t p-1.5">
            <button
              type="button"
              onClick={signOut}
              className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Fixed sidebar on desktop; a top bar with a slide-out menu on small screens. */
export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside className="dark bg-sidebar text-foreground sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 px-3 pt-5 pb-4 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto">
          <NavLinks />
          <SidebarFooter />
        </div>
      </aside>

      <header className="dark bg-sidebar text-foreground sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="dark bg-sidebar text-foreground w-72 gap-0 p-0">
          <SheetTitle className="flex h-14 items-center px-6">
            <Brand />
          </SheetTitle>
          <div className="flex flex-1 flex-col justify-between gap-4 px-4 pt-4 pb-6">
            <NavLinks onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
