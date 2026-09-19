import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudentMajorSelect } from "./student-major-select";
import { setStudentMajorAction } from "@/app/(app)/classes/actions";

const { refresh, pushToast } = vi.hoisted(() => ({ refresh: vi.fn(), pushToast: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ pushToast }) }));
vi.mock("@/app/(app)/classes/actions", () => ({ setStudentMajorAction: vi.fn() }));

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("student combinations outside Grades 9–12", () => {
  it("lets a student select a custom combination for Grade 1", async () => {
    vi.mocked(setStudentMajorAction).mockResolvedValue(undefined);
    render(<StudentMajorSelect studentId="student-1" classId="class-1" gradeName="Grade 1" currentMajor={null}
      options={[
        { value: "custom:art", label: "Art", kind: "custom" },
        { value: "custom:music", label: "Music", kind: "custom" }
      ]} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom:music" } });
    await waitFor(() => expect(setStudentMajorAction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(setStudentMajorAction).mock.calls[0][0].get("major")).toBe("custom:music");
  });
});
