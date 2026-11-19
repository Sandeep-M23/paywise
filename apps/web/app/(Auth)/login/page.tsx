import { LoginForm } from "@/components/block/auth/LoginForm";
import { Logo } from "@/components/shared/Logo/Logo";
import { POINTS } from "@/utils/constants/login";
import { Suspense } from "react";

const Page = () => {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col p-6 sm:p-12">
        <Logo />
        <div className="flex flex-1 items-center py-12 lg:pt-0 lg:pb-24 lg:pl-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
      <section className="dark bg-sidebar text-foreground relative hidden flex-col justify-center overflow-hidden p-20 lg:flex">
        <div
          className="bg-lime absolute -right-24 -bottom-48 size-[28rem] rounded-full"
          aria-hidden
        />
        <div className="relative max-w-lg">
          <h2 className="text-3xl font-semibold tracking-tight">Compensation, made transparent.</h2>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            One place to manage employee salaries, track changes, and make informed compensation
            decisions.
          </p>
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
          <p className="text-muted-foreground mt-10 text-sm">
            Built for HR teams · Secure by design
          </p>
        </div>
      </section>
    </main>
  );
};

export default Page;
