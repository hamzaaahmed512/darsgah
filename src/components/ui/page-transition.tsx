"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/** A quiet entrance motion that runs whenever the displayed route changes. */
export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  return <div key={routeKey} className={`page-enter ${className}`}>{children}</div>;
}
