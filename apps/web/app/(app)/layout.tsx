import type { ReactNode } from "react";
import { Nav } from "@/components/app/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
