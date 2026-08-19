"use client";

import { useEffect, useRef } from "react";

/**
 * A wrapper that listens for any 'change' event bubbling up from its children
 * and automatically submits the closest parent form.
 */
export function AutoSubmit({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLElement;
      const form = target.closest("form");
      if (form) {
        // Use requestSubmit if available to trigger submit events natively
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
        } else {
            form.submit();
        }
      }
    };

    container.addEventListener("change", handleChange);
    return () => container.removeEventListener("change", handleChange);
  }, []);

  return <div ref={containerRef} className="contents">{children}</div>;
}
