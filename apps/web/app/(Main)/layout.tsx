import type { ReactNode } from "react";
import { PageLayout } from "@/components/layout/layout";
import { Sidebar, StartupScreen } from "@/components/shared";
import { HEADER_TITLE } from "@/utils/constants/others/header";

export const metadata = {
  title: HEADER_TITLE.OVERVIEW,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-sidebar flex min-h-screen flex-col md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar />
      <PageLayout>{children}</PageLayout>
      <StartupScreen />
    </div>
  );
}
