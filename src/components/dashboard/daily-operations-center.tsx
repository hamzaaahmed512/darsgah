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
      <Card className="mb-6">
        <CardHeader>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-wide text-primary">Today</p>
            <CardTitle>Daily Operations</CardTitle>
          </div>
          <Link href="/operations" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">
            Open Center
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span key={item.id} className={cn("rounded-lg px-3 py-2 text-xs font-bold", item.value ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wide text-primary">Today</p>
          <CardTitle>Daily Operations Center</CardTitle>
        </div>
        <div className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", totalAttention ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
          {totalAttention ? `${totalAttention} needs attention` : "All clear"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const tone = toneClasses[item.tone];
            const Icon = item.value ? AlertTriangle : CheckCircle2;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group grid min-h-[142px] gap-3 rounded-xl border border-outline/50 bg-white p-4 transition hover:border-primary/40 hover:bg-surface-low/60"
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
