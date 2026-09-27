"use client";

import { useEffect } from "react";
import { markInternalQueriesViewedAction } from "@/app/(app)/help/actions";

export function MarkQueriesViewed() {
  useEffect(() => {
    void markInternalQueriesViewedAction().then(() => window.dispatchEvent(new CustomEvent("queries-viewed"))).catch(() => undefined);
  }, []);
  return null;
}
