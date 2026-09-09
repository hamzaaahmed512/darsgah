import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeleteClassButton } from "./class-actions";
import { deleteClassAction } from "@/app/(app)/classes/actions";

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/app/(app)/classes/actions", () => ({
  deleteClassAction: vi.fn(),
  unassignTeacherClassAction: vi.fn()
}));
beforeEach(() => vi.stubGlobal("React", React));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("DeleteClassButton", () => {
  it("returns to the classes page after deleting the current class", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(deleteClassAction).mockResolvedValue(undefined);
    render(<DeleteClassButton classId="class-1" className="Grade 1 A" />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteClassAction).toHaveBeenCalledWith("class-1"));
    expect(replace).toHaveBeenCalledWith("/classes");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("stays on the class page when deletion fails", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
    vi.mocked(deleteClassAction).mockRejectedValue(new Error("Class is in use"));
    render(<DeleteClassButton classId="class-1" className="Grade 1 A" />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Class is in use"));
    expect(replace).not.toHaveBeenCalled();
  });
});
