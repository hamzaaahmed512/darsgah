"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ProgressState = "loading" | "finishing" | null;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const clearTimers = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current);
    if (finishRef.current) clearTimeout(finishRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    delayRef.current = null;
    finishRef.current = null;
    safetyRef.current = null;
  }, []);

  const start = useCallback((immediate = false) => {
    clearTimers();
    setState(null);
    // Avoid flashing an indicator for routes that complete almost instantly.
    if (immediate) setState("loading");
    else delayRef.current = setTimeout(() => setState("loading"), 180);
    safetyRef.current = setTimeout(() => setState(null), 12_000);
  }, [clearTimers]);

  const finish = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current);
    delayRef.current = null;
    setState((current) => {
      if (current !== "loading") return null;
      finishRef.current = setTimeout(() => setState(null), 220);
      return "finishing";
    });
    if (safetyRef.current) clearTimeout(safetyRef.current);
    safetyRef.current = null;
  }, []);

  useEffect(() => {
    finish();
  }, [routeKey, finish]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return;

      start(anchor.dataset.navigationProgress === "immediate");
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
