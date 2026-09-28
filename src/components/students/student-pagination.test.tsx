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

    expect(screen.getByLabelText("Previous page").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href"))
      .toBe("/students?status=active&pageSize=25&page=2");
  });

  it("moves back to the first page and removes the page parameter", () => {
    searchParams.set("page", "2");
    render(<StudentPagination count={30} page={2} pageSize={10} />);

    expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toBe("/students");
  });

  it("resets to page one when the page size changes", () => {
    searchParams.set("page", "3");
    render(<StudentPagination count={80} page={3} pageSize={10} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Students per page" }), { target: { value: "50" } });

    expect(replace).toHaveBeenCalledWith("/students?pageSize=50");
  });

  it("supports immediate client-side pagination for filtered tables", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<StudentPagination count={30} page={1} pageSize={10} itemLabel="accounts" onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Next accounts page" }));
    fireEvent.change(screen.getByRole("combobox", { name: "accounts per page" }), { target: { value: "25" } });

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});
