"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserRole } from "@/types/database";

type DashboardHeaderProps = {
  userName: string;
  role: UserRole;
  roleLabel: string;
  avatarUrl: string | null;
  statusText: string;
  stats: Array<{ label: string; value: string | number }>;
  onMenuClick?: () => void;
};

function ordinal(day: number) {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return "th";
  return ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader({
  userName,
  role,
  roleLabel,
  statusText,
  stats,
  onMenuClick
}: DashboardHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const date = now
    ? `${now.toLocaleDateString("en-GB", { weekday: "long" })}, ${now.getDate()}${ordinal(now.getDate())} ${now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
    : "Loading date…";
  const time = now
    ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    : "--:--:--";

  return (
    <section
      className="mb-8 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-6 lg:p-8"
      data-role={role}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {onMenuClick ? (
            <button type="button" onClick={onMenuClick} className="mt-1 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              {roleLabel}
            </span>
            <h1 className="mt-2 break-words font-display text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
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
        <div className="border-t border-slate-200 pt-3 text-left sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
          <p className="text-sm font-semibold text-slate-600">{date}</p>
          <time className="mt-1 block font-mono text-xl font-bold tracking-wide text-slate-900 sm:text-2xl">{time}</time>
        </div>
      </div>
    </section>
  );
}
