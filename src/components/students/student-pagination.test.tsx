import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudentPagination } from "./student-pagination";

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/students",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams
}));

beforeEach(() => vi.stubGlobal("React", React));

afterEach(() => {
  cleanup();
  replace.mockReset();
  for (const key of [...searchParams.keys()]) searchParams.delete(key);
  vi.unstubAllGlobals();
});

describe("StudentPagination", () => {
  it("moves forward and keeps the page-size filter", () => {
    searchParams.set("status", "active");
    searchParams.set("pageSize", "25");
    render(<StudentPagination count={70} page={1} pageSize={25} />);

    expect(screen.getByRole("button", { name: "Previous page" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(replace).toHaveBeenCalledWith("/students?status=active&pageSize=25&page=2");
  });

  it("moves back to the first page and removes the page parameter", () => {
    searchParams.set("page", "2");
    render(<StudentPagination count={30} page={2} pageSize={10} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(replace).toHaveBeenCalledWith("/students");
  });

  it("resets to page one when the page size changes", () => {
    searchParams.set("page", "3");
    render(<StudentPagination count={80} page={3} pageSize={10} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Students per page" }), { target: { value: "50" } });

    expect(replace).toHaveBeenCalledWith("/students?pageSize=50");
  });
});
