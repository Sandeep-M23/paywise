import type { ReactNode } from "react";
import { PageLayout } from "@/components/layout/layout";
import { Sidebar, StartupScreen } from "@/components/shared";
import { HEADER_TITLE } from "@/utils/constants/others/header";

// The overview ("/") is this group's own page, so its title lives here; every other
// route sets its own in its layout.tsx.
export const metadata = {
  title: HEADER_TITLE.OVERVIEW,
};

// Signed-out visitors never get here: proxy.ts redirects them to /login first.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-sidebar flex min-h-screen flex-col md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar />
      <PageLayout>{children}</PageLayout>
      <StartupScreen />
    </div>
  );
}
