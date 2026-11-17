"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calculator, FileUp, LogOut, Scale, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/insights", label: "Pay insights", icon: BarChart3 },
  { href: "/fairness", label: "Pay fairness", icon: Scale },
  { href: "/raises", label: "Raise planner", icon: Calculator },
  { href: "/import", label: "Import", icon: FileUp },
];

export function Nav() {
  const pathname = usePathname();

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <aside className="bg-background flex w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <Wallet className="text-primary size-5" aria-hidden />
        Paywise
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Main">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active && "bg-muted text-foreground font-medium",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
