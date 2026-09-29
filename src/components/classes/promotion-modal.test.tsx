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
    fireEvent.click(screen.getByRole("button", { name: "Promote Grade 12" }));
    await screen.findByRole("heading", { name: "Graduate Grade 12" });
    await screen.findByText("Bilal Ali");
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
    fireEvent.click(screen.getByRole("button", { name: "Promote Grade 5" }));
    await screen.findByText("Ayesha Khan");
    fireEvent.click(screen.getByRole("button", { name: "Review promotion" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete promotion" }));

    await waitFor(() => expect(pushToast).toHaveBeenCalledWith("The class roster changed.", "error"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it.each(["Grade 8", "Grade 10"])("asks for combinations when promoting students from %s", async (grade) => {
    getPromotionRosterAction.mockResolvedValue({
      isTerminalGrade: false,
      combinationRequired: true,
      students: [
        { id: "student-1", name: "Ayesha Khan", admissionNumber: "A-1", major: "biology", combinationOptions: [{ value: "biology", label: "Biology" }, { value: "computer", label: "Computer" }] },
        { id: "student-2", name: "Bilal Ali", admissionNumber: "A-2", major: null, combinationOptions: [{ value: "biology", label: "Biology" }, { value: "computer", label: "Computer" }] }
      ]
    });
    promoteStudentsAction.mockResolvedValue(undefined);

    render(<PromotionModal classIds={["class-1"]} label={grade} />);
    fireEvent.click(screen.getByRole("button", { name: `Promote ${grade}` }));
    await screen.findByText("Bilal Ali");
    fireEvent.click(screen.getByRole("button", { name: "Review promotion" }));
    expect(screen.getByRole("combobox", { name: "Subject combination for Ayesha Khan" })).toHaveProperty("value", "");
    expect(screen.getByRole("button", { name: "Complete promotion" })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("combobox", { name: "Subject combination for Ayesha Khan" }), { target: { value: "biology" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Subject combination for Bilal Ali" }), { target: { value: "computer" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete promotion" }));
    await waitFor(() => expect(promoteStudentsAction).toHaveBeenCalledWith(
      ["class-1"], ["student-1", "student-2"], [], [], { "student-1": "biology", "student-2": "computer" }
    ));
  });

  it.each(["Grade 9", "Grade 11"])("carries the existing combination forward from %s", async (grade) => {
    getPromotionRosterAction.mockResolvedValue({
      isTerminalGrade: false,
      combinationRequired: false,
      students: [{ id: "student-1", name: "Ayesha Khan", admissionNumber: "A-1", major: "biology", combinationOptions: [] }]
    });
    promoteStudentsAction.mockResolvedValue(undefined);
    render(<PromotionModal classIds={["class-1"]} label={grade} />);
    fireEvent.click(screen.getByRole("button", { name: `Promote ${grade}` }));
    await screen.findByText("Ayesha Khan");
    fireEvent.click(screen.getByRole("button", { name: "Review promotion" }));
    expect(screen.queryByText("Assign subject combinations for the next class")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Complete promotion" }));
    await waitFor(() => expect(promoteStudentsAction).toHaveBeenCalledWith(["class-1"], ["student-1"], [], []));
  });
});
