import { afterEach, describe, expect, it, vi } from "vitest";
import { loadReportLogo } from "./report-logo";

afterEach(() => vi.unstubAllGlobals());

describe("report logo fallback", () => {
  it("does not fetch missing or unsupported URLs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadReportLogo(null, new AbortController().signal)).toBeNull();
    expect(await loadReportLogo("file:///logo.png", new AbortController().signal)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("falls back after network/CORS failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    expect(await loadReportLogo("https://example.com/logo.png", new AbortController().signal)).toBeNull();
  });
  it("falls back for non-image responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["html"], { type: "text/html" }) }));
    expect(await loadReportLogo("/logo.png", new AbortController().signal)).toBeNull();
  });
  it("validates image decoding before passing data to the renderer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["invalid"], { type: "image/png" }) }));
    vi.stubGlobal("Image", class { decode() { return Promise.reject(new Error("Invalid PNG")); } });
    expect(await loadReportLogo("/logo.png", new AbortController().signal)).toBeNull();
  });
});
