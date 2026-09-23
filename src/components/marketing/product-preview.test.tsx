import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductPreview } from "./product-preview";

vi.stubGlobal("React", React);
afterEach(cleanup);

it("lets visitors browse all five sample modules and reach the demo booking page", () => {
  render(<ProductPreview />);
  for (const label of ["Students", "Staff", "Results", "Fees", "Dashboard"]) {
    const button = screen.getByRole("button", { name: label });
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("region", { name: `${label} preview` })).toBeTruthy();
    expect(screen.getAllByRole("button").filter((item) => item.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    expect(screen.getByText("Sample data · Fictional school")).toBeTruthy();
  }
  expect(screen.getByRole("link", { name: "See it in a personal demo" }).getAttribute("href")).toBe("/contact");
});
