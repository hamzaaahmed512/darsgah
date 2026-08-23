"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { initials } from "@/lib/utils";
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
  avatarUrl,
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
      className="mb-8 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#0f4c5c] via-[#0b5966] to-[#063b48] px-5 py-5 text-white shadow-soft sm:px-6"
      data-role={role}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {onMenuClick ? (
            <button type="button" onClick={onMenuClick} className="mt-1 rounded-xl p-2 hover:bg-white/10 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-bold ring-2 ring-white/25">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(userName)
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
              {roleLabel}
            </span>
            <h1 className="mt-2 truncate font-display text-xl font-bold sm:text-2xl">
              {now ? greetingFor(now.getHours()) : "Welcome"}, {userName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/80">
              {stats.map((stat) => (
                <span key={stat.label}>
                  {stat.label}: <strong className="text-white">{stat.value}</strong>
                </span>
              ))}
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-100">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> {statusText}
              </span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15 pt-4 text-left lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
          <p className="text-sm font-semibold">{date}</p>
          <time className="mt-1 block font-mono text-2xl font-bold tracking-wide">{time}</time>
        </div>
      </div>
    </section>
  );
}
