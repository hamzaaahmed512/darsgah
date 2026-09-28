import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpreadsheetPreview } from "./spreadsheet-preview";

const opener = { postMessage: vi.fn() };

beforeEach(() => {
  vi.stubGlobal("React", React);
  window.history.replaceState(null, "", "/spreadsheet-preview?preview=preview-1");
  Object.defineProperty(window, "opener", { configurable: true, writable: true, value: opener });
});

afterEach(() => {
  cleanup();
  opener.postMessage.mockReset();
  vi.unstubAllGlobals();
});

describe("SpreadsheetPreview", () => {
  it("renders received CSV data as a searchable formatted table", async () => {
    render(<SpreadsheetPreview />);
    expect(opener.postMessage).toHaveBeenCalledWith(
      { type: "darsgah:spreadsheet-preview-ready", previewId: "preview-1" },
      window.location.origin
    );

    act(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: window.location.origin,
        source: opener as unknown as MessageEventSource,
        data: {
          type: "darsgah:spreadsheet-preview",
          previewId: "preview-1",
          payload: {
            previewId: "preview-1",
            title: "Students",
            filename: "students.csv",
            createdAt: Date.now(),
            sheets: [{ name: "Sheet1", rows: [["Name", "Amount"], ["Ali", "1200"], ["Sara", ""]] }]
          }
        }
      }));
    });

    expect(await screen.findByRole("heading", { name: "Students" })).toBeTruthy();
    expect(screen.getByText(/1,200/)).toBeTruthy();
    expect(screen.getByTitle("Empty cell")).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: "Search spreadsheet" }), { target: { value: "Sara" } });
    await waitFor(() => expect(screen.queryByText("Ali")).toBeNull());
    expect(screen.getByText("Sara")).toBeTruthy();
  });
});
