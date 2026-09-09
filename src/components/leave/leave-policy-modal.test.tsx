import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LeavePolicyModal } from "./leave-policy-modal";
import { updateLeavePolicyAction } from "@/app/(app)/leave/actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/leave/actions", () => ({ updateLeavePolicyAction: vi.fn() }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
function open() {
  render(<LeavePolicyModal annualLimit={36} monthlyLimit={2} weeklyLimit={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Leave policy" }));
}

it("saves entered limits, closes the dialog, and refreshes the policy", async () => {
  vi.mocked(updateLeavePolicyAction).mockResolvedValue({ success: true });
  open();
  fireEvent.change(screen.getByLabelText(/Monthly leave limit/), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Save policy" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const data = vi.mocked(updateLeavePolicyAction).mock.calls[0][0];
  expect(data.get("annual_limit")).toBe("36");
  expect(data.get("monthly_limit")).toBe("3");
  expect(data.get("weekly_limit")).toBe("");
  expect(screen.getByRole("status").textContent).toContain("saved");
  expect(refresh).toHaveBeenCalledOnce();
});

it("shows server errors without closing or clearing the form, and allows retry", async () => {
  vi.mocked(updateLeavePolicyAction).mockResolvedValueOnce({ error: "Unable to update settings" }).mockResolvedValueOnce({ success: true });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Save policy" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Unable to update settings");
  expect((screen.getByLabelText(/Annual leave limit/) as HTMLInputElement).value).toBe("36");
  const retry = await screen.findByRole("button", { name: "Save policy" });
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("handles a rejected request", async () => {
  vi.mocked(updateLeavePolicyAction).mockRejectedValue(new Error("Network error"));
  open();
  fireEvent.click(screen.getByRole("button", { name: "Save policy" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Please try again");
});
