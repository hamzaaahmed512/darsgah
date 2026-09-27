"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ProgressState = "loading" | "finishing" | null;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const clearTimers = useCallback(() => {
    if (finishRef.current) clearTimeout(finishRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    finishRef.current = null;
    safetyRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setState("loading");
    safetyRef.current = setTimeout(() => setState(null), 12_000);
  }, [clearTimers]);

  const finish = useCallback(() => {
    setState((current) => {
      if (current !== "loading") return null;
      finishRef.current = setTimeout(() => setState(null), 180);
      return "finishing";
    });
    if (safetyRef.current) clearTimeout(safetyRef.current);
    safetyRef.current = null;
  }, []);

  useEffect(() => {
    finish();
  }, [routeKey, finish]);

  useEffect(() => {
    function destinationFromEvent(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return null;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return null;
      if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return null;
      return destination;
    }

    function handleClick(event: MouseEvent) {
      // The capture listener runs before Next handles the link, so the bar is
      // visible while the destination route is being requested.
      if (destinationFromEvent(event)) start();
    }

    function handlePopState() {
      start();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", finish);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", finish);
      clearTimers();
    };
  }, [clearTimers, finish, start]);

  return (
    <div
      aria-hidden="true"
      className={`navigation-progress ${state ? `navigation-progress--${state}` : ""}`}
    />
  );
}
