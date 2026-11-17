"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calculator,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/insights", label: "Pay insights", icon: BarChart3 },
  { href: "/fairness", label: "Pay fairness", icon: Scale },
  { href: "/raises", label: "Raise planner", icon: Calculator },
  { href: "/import", label: "Import", icon: FileUp },
];

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
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active &&
                "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-medium",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Account() {
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ email: string }>("/auth/me"),
    staleTime: Infinity,
  });

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Signed in as</p>
          <p className="truncate text-sm font-medium">{data?.email ?? " "}</p>
        </div>
        <ThemeToggle />
      </div>
      <Button variant="outline" size="sm" className="justify-start" onClick={signOut}>
        <LogOut className="size-4" aria-hidden />
        Sign out
      </Button>
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
      <aside className="bg-background sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <CommandPalette />
          <NavLinks />
        </div>
        <Account />
      </aside>

      <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetTitle className="flex h-14 items-center border-b px-4">
            <Brand />
          </SheetTitle>
          <div className="flex flex-1 flex-col gap-4 p-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <Account />
        </SheetContent>
      </Sheet>
    </>
  );
}
