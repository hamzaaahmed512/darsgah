import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyOperationItem } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

const toneClasses: Record<DailyOperationItem["tone"], { icon: string; value: string; bg: string }> = {
  blue: { icon: "text-primary", value: "text-primary", bg: "bg-primary-soft" },
  green: { icon: "text-success", value: "text-success", bg: "bg-success-soft" },
  yellow: { icon: "text-warning", value: "text-warning", bg: "bg-warning-soft" },
  red: { icon: "text-danger", value: "text-danger", bg: "bg-danger-soft" },
  gray: { icon: "text-muted", value: "text-muted", bg: "bg-surface-low" }
};

export function DailyOperationsCenter({ items, compact = false }: { items: DailyOperationItem[]; compact?: boolean }) {
  const totalAttention = items.reduce((sum, item) => sum + item.value, 0);

  if (compact) {
    return (
      <Card className="mb-6 overflow-hidden border border-primary-ink !bg-gradient-to-br !from-primary !to-[#16478f] text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)]">
        <CardHeader className="border-b border-white/15">
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-wide text-blue-100">Today</p>
            <CardTitle className="text-white">Daily Operations</CardTitle>
          </div>
          <Link href="/operations" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/25">
            Open Center
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent className="bg-white/5 pt-4">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span key={item.id} className={cn("rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-sm", item.value ? "text-amber-700" : "text-emerald-700")}>
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden border border-primary-ink !bg-gradient-to-br !from-primary !to-[#16478f] text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)]">
      <CardHeader className="border-b border-white/15">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wide text-blue-100">Today</p>
          <CardTitle className="text-white">Daily Operations Center</CardTitle>
        </div>
        <div className={cn("rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm", totalAttention ? "text-warning" : "text-success")}>
          {totalAttention ? `${totalAttention} needs attention` : "All clear"}
        </div>
      </CardHeader>
      <CardContent className="bg-white/5 pt-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const tone = toneClasses[item.tone];
            const Icon = item.value ? AlertTriangle : CheckCircle2;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group grid min-h-[142px] gap-3 rounded-xl border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone.bg, tone.icon)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className={cn("font-display text-2xl font-bold leading-none", tone.value)}>{item.value}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{item.label}</p>
                  <p className="mt-1 min-h-10 text-xs font-medium leading-5 text-muted">{item.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                  {item.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
