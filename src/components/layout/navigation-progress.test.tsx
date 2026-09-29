import React from "react";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { NavigationProgress } from "./navigation-progress";

let pathname = "/dashboard/principal";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams()
}));
vi.stubGlobal("React", React);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  pathname = "/dashboard/principal";
});

describe("NavigationProgress", () => {
  it("does not flash for a fast internal route change", () => {
    const view = render(
      <>
        <NavigationProgress />
        <Link href="/students" onClick={(event) => event.preventDefault()}>Students</Link>
      </>
    );

    fireEvent.click(view.getByRole("link", { name: "Students" }));
    const bar = view.container.querySelector(".navigation-progress");
    expect(bar?.classList.contains("navigation-progress--loading")).toBe(false);

    pathname = "/students";
    view.rerender(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(200));

    expect(view.container.querySelector(".navigation-progress")?.classList.contains("navigation-progress--loading")).toBe(false);
    expect(view.container.querySelector(".navigation-progress")?.classList.contains("navigation-progress--finishing")).toBe(false);
  });

  it("still shows progress when navigation takes longer than the delay", () => {
    const view = render(
      <>
        <NavigationProgress />
        <Link href="/students" onClick={(event) => event.preventDefault()}>Students</Link>
      </>
    );

    fireEvent.click(view.getByRole("link", { name: "Students" }));
    act(() => vi.advanceTimersByTime(180));
    expect(view.container.querySelector(".navigation-progress")?.classList.contains("navigation-progress--loading")).toBe(true);

    pathname = "/students";
    view.rerender(<NavigationProgress />);
    expect(view.container.querySelector(".navigation-progress")?.classList.contains("navigation-progress--finishing")).toBe(true);
  });
});
