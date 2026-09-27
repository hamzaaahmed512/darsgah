import React from "react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { NavigationProgress } from "./navigation-progress";

let pathname = "/dashboard/principal";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams()
}));
vi.stubGlobal("React", React);

afterEach(() => {
  cleanup();
  pathname = "/dashboard/principal";
});

describe("NavigationProgress", () => {
  it("shows immediately for internal links and finishes when the route changes", () => {
    const view = render(
      <>
        <NavigationProgress />
        <Link href="/students" onClick={(event) => event.preventDefault()}>Students</Link>
      </>
    );

    fireEvent.click(view.getByRole("link", { name: "Students" }));
    const bar = view.container.querySelector(".navigation-progress");
    expect(bar?.classList.contains("navigation-progress--loading")).toBe(true);

    pathname = "/students";
    view.rerender(<NavigationProgress />);
    expect(view.container.querySelector(".navigation-progress")?.classList.contains("navigation-progress--finishing")).toBe(true);
  });
});
