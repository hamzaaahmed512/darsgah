import type { ReactNode } from "react";
import { GetDarsgahLogo } from "@/components/brand/getdarsgah-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4ff] px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(37,99,235,0.11)_1.5px,_transparent_1.5px)] bg-[size:40px_40px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-cyan-100/50 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-[520px] rounded-[28px] border border-white/80 bg-white px-6 py-8 shadow-[0_28px_80px_rgba(30,64,175,0.13)] sm:px-12 sm:py-11">
        <div className="mb-5 flex justify-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 shadow-sm">
            <GetDarsgahLogo className="h-12 w-12" priority />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
