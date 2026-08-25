"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserRole } from "@/types/database";

type DashboardHeaderProps = {
  userName: string;
  role: UserRole;
  roleLabel?: string;
  eyebrow?: string;
  avatarUrl: string | null;
  statusText: string;
  stats: Array<{ label: string; value: string | number }>;
  onMenuClick?: () => void;
  decorative?: boolean;
};

function greetingFor(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader({
  userName,
  role,
  roleLabel,
  eyebrow,
  statusText,
  stats,
  onMenuClick,
  decorative = false
}: DashboardHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  return (
    <section
      className="relative mb-8 overflow-hidden px-0 py-3 text-slate-900"
      data-role={role}
    >
      {decorative ? (
        <div
          className="pointer-events-none absolute right-2 top-6 hidden h-40 w-80 opacity-75 lg:block"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(37, 99, 235, 0.72) 1.7px, transparent 1.8px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(90deg, transparent, black 18%, black 82%, transparent)"
          }}
        />
      ) : null}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {onMenuClick ? (
            <button type="button" onClick={onMenuClick} className="mt-1 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
            ) : null}
            {roleLabel ? (
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
                {roleLabel}
              </span>
            ) : null}
            <h1 className={roleLabel ? "mt-2 break-words font-display text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl" : "break-words font-display text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl"}>
              {now ? greetingFor(now.getHours()) : "Welcome"}, {userName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
              {stats.map((stat) => (
                <span key={stat.label} className="rounded-full bg-slate-50 px-2 py-1">
                  {stat.label}: <strong className="text-slate-900">{stat.value}</strong>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> {statusText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
