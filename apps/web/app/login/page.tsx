import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, FileUp, History, Scale } from "@/components/icons";
import { Logo } from "@/components/app/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { icon: History, text: "Every salary change kept, with the date and the reason" },
  { icon: FileUp, text: "Bring your spreadsheets in safely: every row checked before saving" },
  { icon: BarChart3, text: "Pay by country, role and department, in local currency" },
  { icon: Scale, text: "Spot gender pay gaps and outliers before they become problems" },
];

// Split sign-in: the form on the left, a black brand panel on the right.
export default function LoginPage() {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col p-6 sm:p-12">
        <Logo />
        <div className="flex flex-1 items-center py-12 lg:pl-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
      <section className="dark bg-sidebar text-foreground relative hidden flex-col justify-center overflow-hidden p-16 lg:flex">
        <div
          className="bg-lime absolute -right-24 -bottom-32 size-[28rem] rounded-full"
          aria-hidden
        />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Salary data you can trust.</h2>
          <ul className="mt-8 flex flex-col gap-5">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-sm">
                <span className="text-lime grid size-10 bg-white/10 shrink-0 place-items-center rounded-full">
                  <Icon className="size-5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-10 text-sm">For the HR team · confidential</p>
        </div>
      </section>
    </main>
  );
}
