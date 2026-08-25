import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClasses = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  purple: "bg-purple-50 text-purple-600 ring-purple-100",
  slate: "bg-slate-50 text-slate-600 ring-slate-100"
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  trend,
  trendTone = "neutral"
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
}) {
  const trendClass = trendTone === "positive" ? "text-emerald-600" : trendTone === "negative" ? "text-red-600" : "text-slate-500";

  return (
    <Card className="h-full p-4 shadow-sm sm:p-5">
      <div className="flex h-full items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 sm:h-14 sm:w-14", toneClasses[tone])}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 whitespace-nowrap font-display text-[clamp(1.35rem,1.9vw,1.875rem)] font-bold leading-none tracking-tight text-ink">
            {value}
          </p>
          {trend ? <p className={cn("mt-2 text-sm font-bold leading-5", trendClass)}>{trend}</p> : null}
        </div>
      </div>
    </Card>
  );
}
