"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { LogOut, Menu } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { isActive, LINKS } from "@/lib/constants/navigation";
import { useAccount, useAuth } from "@/context/AuthContext";

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
  const { logout } = useAuth();
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
              onClick={logout}
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
export function Sidebar() {
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
