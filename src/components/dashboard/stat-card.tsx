import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="group h-full p-5 sm:p-6">
      <div className="flex h-full min-h-[112px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
          <p className="mt-4 break-words font-display text-3xl font-bold leading-none tracking-tight text-ink sm:text-4xl">
            {value}
          </p>
          {hint ? <p className="mt-3 text-sm font-medium leading-5 text-muted">{hint}</p> : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-2xl bg-primary-soft text-primary transition-all duration-300 ease-out group-hover:bg-primary group-hover:text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}
