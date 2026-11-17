import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, FileUp, History, Scale } from "lucide-react";
import { LogoMark } from "@/components/app/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { icon: History, text: "Every salary change kept, with the date and the reason" },
  { icon: FileUp, text: "Bring your spreadsheets in safely: every row checked before saving" },
  { icon: BarChart3, text: "Pay by country, role and department, in local currency" },
  { icon: Scale, text: "Spot gender pay gaps and outliers before they become problems" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(120%_80%_at_0%_0%,#8b5cf6_0%,#4c1d95_45%,#120a24_100%)] p-12 text-white lg:flex">
        <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <LogoMark className="size-9" /> Paywise
        </span>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">Salary data you can trust.</h1>
          <ul className="mt-8 flex flex-col gap-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm opacity-90">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-70">For the HR team · confidential</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
