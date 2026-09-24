import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportActionButton } from "./report-action-button";
import { exportReportCsvAction } from "@/app/(app)/reports/actions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { DownloadActionProvider } from "./DownloadActionModal";

vi.mock("@/app/(app)/reports/actions", () => ({ exportReportCsvAction: vi.fn() }));


beforeEach(() => {
  vi.stubGlobal("React", React);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ReportActionButton", () => {
  it("opens a printable report with automatic print mode", () => {
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal("open", open);

    render(<ReportActionButton kind="print" href="/attendance?date=2026-09-09" month="2026-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Print/PDF" }));

    expect(push).toHaveBeenCalledWith("/attendance?date=2026-09-09&print=1");
  });

  it("downloads CSV data without navigating to the report section", async () => {
    vi.mocked(exportReportCsvAction).mockResolvedValue({
      rows: [{
        "Challan ID": "challan-1",
        Student: "Ali",
        "Admission No": "2026-1",
        Class: "Grade 9 - A",
        Month: "2026-09",
        Amount: "Rs 1,000",
        Paid: "Rs 0",
        Status: "pending",
        Generated: "09 Sep 2026"
      }],
      filename: "student-directory.csv"
    });
    const createObjectURL = vi.fn().mockReturnValue("blob:report");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<DownloadActionProvider><ReportActionButton kind="csv" href="/students" month="2026-09" exportKey="student_directory" /></DownloadActionProvider>);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));

    expect(exportReportCsvAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download File" }));
    await waitFor(() => expect(exportReportCsvAction).toHaveBeenCalledWith("student_directory", "2026-09"));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
