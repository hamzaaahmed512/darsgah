import Link from "next/link";
import { GetDarsgahLogo } from "@/components/brand/getdarsgah-logo";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="GetDarsgah home">
      <GetDarsgahLogo className="h-10 w-10" priority />
      <span className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
        get<span className="text-primary">darsgah</span>
      </span>
    </Link>
  );
}
