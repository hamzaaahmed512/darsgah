import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="GetDarsgah home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-button">
        <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
        get<span className="text-primary">darsgah</span>
      </span>
      {!compact ? (
        <span className="hidden rounded-full border border-outline bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted sm:inline-flex">
          School OS
        </span>
      ) : null}
    </Link>
  );
}
