import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, FileUp, History, Scale } from "lucide-react";
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
      <section className="bg-primary text-primary-foreground hidden flex-col justify-between p-12 lg:flex">
        <p className="text-lg font-semibold tracking-tight">Paywise</p>
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
