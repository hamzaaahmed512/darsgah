"use client";

import type { ReactNode } from "react";

export function FormSectionCard({
  icon,
  title,
  description,
  children,
  badge
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <section className="rounded-[28px] border border-outline/70 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[1.2rem] font-bold text-ink">{title}</h3>
            {badge ? (
              <span className="inline-flex items-center rounded-full border border-outline/60 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-muted">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
