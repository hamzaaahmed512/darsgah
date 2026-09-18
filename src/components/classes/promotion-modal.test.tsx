import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromotionModal } from "@/components/classes/promotion-modal";

// This repository's Vitest JSX transform uses the classic React runtime.
globalThis.React = React;

const getPromotionRosterAction = vi.fn();
const promoteStudentsAction = vi.fn();
const pushToast = vi.fn();

vi.mock("@/app/(app)/classes/actions", () => ({
  getPromotionRosterAction: (...args: unknown[]) => getPromotionRosterAction(...args),
  promoteStudentsAction: (...args: unknown[]) => promoteStudentsAction(...args)
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ pushToast }) }));

describe("PromotionModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends selected final-grade students as graduates and unchecked students as retained", async () => {
    getPromotionRosterAction.mockResolvedValue({
      isTerminalGrade: true,
      students: [
        { id: "student-1", name: "Ayesha Khan", admissionNumber: "A-1" },
        { id: "student-2", name: "Bilal Ali", admissionNumber: "A-2" }
      ]
    });
    promoteStudentsAction.mockResolvedValue(undefined);

    render(<PromotionModal classIds={["class-1"]} label="Grade 12" />);
    fireEvent.click(screen.getByRole("button", { name: "Promote" }));
    await screen.findByRole("heading", { name: "Graduate Grade 12" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Bilal Ali/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review graduation" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete graduation" }));

    await waitFor(() => expect(promoteStudentsAction).toHaveBeenCalledWith(
      ["class-1"], [], ["student-2"], ["student-1"]
    ));
    expect(pushToast).toHaveBeenCalledWith("Students graduated successfully.");
  });

  it("keeps the dialog open and reports a promotion failure", async () => {
    getPromotionRosterAction.mockResolvedValue({
      isTerminalGrade: false,
      students: [{ id: "student-1", name: "Ayesha Khan", admissionNumber: null }]
    });
    promoteStudentsAction.mockRejectedValue(new Error("The class roster changed."));

    render(<PromotionModal classIds={["class-1"]} label="Grade 5" />);
    fireEvent.click(screen.getByRole("button", { name: "Promote" }));
    await screen.findByText("Ayesha Khan");
    fireEvent.click(screen.getByRole("button", { name: "Review promotion" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete promotion" }));

    await waitFor(() => expect(pushToast).toHaveBeenCalledWith("The class roster changed.", "error"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
