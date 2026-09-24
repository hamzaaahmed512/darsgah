import React, { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReportDownloadLink from "./ReportDownloadLink";

const state = vi.hoisted(() => ({ loading: true, error: null as Error | null, url: null as string | null }));
vi.mock("@react-pdf/renderer", () => ({
  PDFDownloadLink: ({ children, ...props }: { children: (value: typeof state) => ReactNode; "aria-disabled"?: boolean }) => <a aria-disabled={props["aria-disabled"]} href={state.url ?? undefined}>{children(state)}</a>,
  StyleSheet: { create: (value: unknown) => value }
}));
vi.mock("./report-logo", () => ({ loadReportLogo: async () => null }));

beforeEach(() => { vi.stubGlobal("React", React); state.loading = true; state.error = null; state.url = null; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const data = { fullName: "Ali", status: "active", staffId: "42", role: "Teacher" };
describe("PDF download states", () => {
  it("blocks download until ready and exposes a PDF link when generation completes", async () => {
    const props = { type: "staff" as const, data, generatedAt: "2026-09-24T07:00:00Z", onRetry: vi.fn() };
    const view = render(<ReportDownloadLink {...props} />);
    await screen.findByRole("status");
    expect(screen.getByRole("status").textContent).toContain("Preparing PDF");
    state.loading = false; state.url = "blob:report";
    view.rerender(<ReportDownloadLink {...props} />);
    await waitFor(() => expect(screen.getByRole("link").getAttribute("aria-disabled")).toBe("false"));
    expect(screen.getByRole("link").textContent).toContain("Download PDF");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
  it("shows a recoverable error with a retry action", async () => {
    state.loading = false; state.error = new Error("Render failed");
    const retry = vi.fn();
    render(<ReportDownloadLink type="staff" data={data} generatedAt="2026-09-24T07:00:00Z" onRetry={retry} />);
    await screen.findByRole("alert");
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
