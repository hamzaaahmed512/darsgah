import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DownloadActionModal, DownloadActionProvider } from "./DownloadActionModal";

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:report") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("document actions", () => {
  it("defers generation, disables duplicate actions, and retries failures", async () => {
    const generate = vi.fn().mockRejectedValueOnce(new Error("Generation failed")).mockResolvedValue({ blob: new Blob(["pdf"]), filename: "report.pdf" });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DownloadActionModal title="Students Report" generate={generate} onClose={() => {}} />);
    expect(generate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(screen.getByRole("button", { name: "Preparing…" }).getAttribute("aria-busy")).toBe("true");
    expect((screen.getByRole("button", { name: "Share PDF" }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("traps focus and dismisses with Escape, backdrop, and close", () => {
    const close = vi.fn();
    render(<DownloadActionModal title="Report" onClose={close} />);
    const first = screen.getByRole("button", { name: "Close report" });
    const last = screen.getByRole("button", { name: "Share PDF" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    fireEvent.click(first);
    expect(close).toHaveBeenCalledTimes(3);
  });
  it("intercepts native links and restores focus", () => {
    render(<DownloadActionProvider><a href="/logo.png" download="logo.png">Download Logo</a></DownloadActionProvider>);
    const trigger = screen.getByRole("link"); trigger.focus(); fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("does not download or copy a local URL as a sharing fallback", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DownloadActionModal title="Report" generate={async () => ({ blob: new Blob(["pdf"]), filename: "report.pdf" })} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Share PDF" }));
    await screen.findByRole("link", { name: "Compose email" });
    expect(click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

it("reserves a preview window before asynchronous generation and displays the PDF", async () => {
  const viewer = { opener: {}, document: { title: "" }, location: { replace: vi.fn() }, close: vi.fn(), closed: true };
  vi.stubGlobal("open", vi.fn(() => viewer));
  const generate = vi.fn(async () => {
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    return { blob: new Blob(["pdf"], { type: "application/pdf" }), filename: "report.pdf" };
  });
  render(<DownloadActionModal title="Report" generate={generate} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Preview / Print PDF" }));
  await waitFor(() => expect(viewer.location.replace).toHaveBeenCalledWith("blob:report"));
  expect(viewer.opener).toBeNull();
});
it("uses native file sharing when supported", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  render(<DownloadActionModal title="Report" generate={async () => ({ blob: new Blob(["pdf"], { type: "application/pdf" }), filename: "report.pdf" })} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Share PDF" }));
  await waitFor(() => expect(share).toHaveBeenCalledOnce());
  expect(share.mock.calls[0][0].files[0].name).toBe("report.pdf");
});
