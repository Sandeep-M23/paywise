import { Suspense, type ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Sidebar } from "@/components/Sidebar";
import { HeaderBar } from "@/components/HeaderBar";
import { FetchingBar, StartupScreen } from "@/components/LoadingScreen";

// From md up the shell is exactly the window: the black sidebar, then the page as a
// rounded grey panel inset on the same black, so navigation and content never blur
// together. Pages with a table let it take the remaining height and scroll inside it;
// other pages scroll in the panel, with the scrollbar on the panel's right edge (the
// side padding, not a max-width wrapper, keeps wide screens readable).
const GUTTER = "px-4 sm:px-5 lg:px-[max(1.5rem,calc((100%_-_1600px)/2))]";

export default function AppLayout({ children }: { children: ReactNode }) {
  // AuthGate reads the URL (for the `next` link), so it needs a Suspense boundary.
  return (
    <Suspense>
      <AuthGate>
        <div className="bg-sidebar flex min-h-screen flex-col md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
          <Sidebar />
          <main className="bg-canvas relative flex min-w-0 flex-1 flex-col md:my-2 md:mr-2 md:min-h-0 md:overflow-hidden md:rounded-2xl">
            <FetchingBar />
            <HeaderBar className={`${GUTTER} border-b py-3.5`} />
            <div
              className={`${GUTTER} flex flex-col gap-4 py-4 *:shrink-0 md:min-h-0 md:flex-1 md:overflow-y-auto lg:py-5`}
            >
              {children}
            </div>
          </main>
          <StartupScreen />
        </div>
      </AuthGate>
    </Suspense>
  );
}
