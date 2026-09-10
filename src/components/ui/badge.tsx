import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  blue: "bg-primary-soft text-primary ring-primary/10",
  green: "bg-success-soft text-success ring-success/10",
  yellow: "bg-warning-soft text-warning ring-warning/10",
  red: "bg-danger-soft text-danger ring-danger/10",
  gray: "bg-surface-low text-muted ring-outline"
};

export function Badge({
  className,
  tone = "gray",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneClasses }) {
  return (
    <span
      className={cn("inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1", toneClasses[tone], className)}
      {...props}
    />
  );
}
