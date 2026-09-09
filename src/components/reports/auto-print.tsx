"use client";

import { useEffect } from "react";

export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const timeout = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timeout);
  }, [enabled]);

  return null;
}
