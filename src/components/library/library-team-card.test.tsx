import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LibraryTeamCard } from "./library-team-card";
import type { LibraryTeamMember } from "@/lib/services/library";

const { load, change, refresh, toast } = vi.hoisted(() => ({ load: vi.fn(), change: vi.fn(), refresh: vi.fn(), toast: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/library/actions", () => ({ libraryAssignableStaffAction: load, libraryTeamRoleAction: change }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ pushToast: toast }) }));
vi.stubGlobal("React", React);
const staff: LibraryTeamMember = { member_id: "staff", user_id: "user", full_name: "Sara Khan", email: "sara@school.test", role: "teacher", status: "active", must_change_password: false };
const librarian: LibraryTeamMember = { ...staff, member_id: "librarian", full_name: "Ali Ahmed", email: "ali@school.test", role: "librarian" };
beforeEach(() => { load.mockResolvedValue({ staff: [staff] }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

describe("inline librarian team", () => {
  it("assigns a staff member, updates the roster, and refreshes without navigation", async () => {
    change.mockResolvedValue({ member: { ...staff, role: "librarian" } });
    render(<LibraryTeamCard team={[]} canAdmin />);
    expect(screen.getByText("No librarians currently assigned.")).toBeTruthy();
    await screen.findByRole("option", { name: /Sara Khan/ });
    fireEvent.change(screen.getByLabelText("Assign New Librarian"), { target: { value: "staff" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Role" }));
    await screen.findByRole("button", { name: "Unassign Sara Khan" });
    expect(change).toHaveBeenCalledWith({ memberId: "staff", action: "assign" });
    expect(screen.queryByRole("option", { name: /Sara Khan/ })).toBeNull();
    expect(toast).toHaveBeenCalledWith("Sara Khan was assigned as Librarian.", "success");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("confirms unassignment and makes active staff selectable again", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    change.mockResolvedValue({ member: { ...librarian, role: "staff" } });
    render(<LibraryTeamCard team={[librarian]} canAdmin />);
    await screen.findByRole("option", { name: /Sara Khan/ });
    fireEvent.click(screen.getByRole("button", { name: "Unassign Ali Ahmed" }));
    expect(change).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Unassign Ali Ahmed" }));
    await screen.findByText("No librarians currently assigned.");
    expect(screen.getByRole("option", { name: /Ali Ahmed/ })).toBeTruthy();
    expect(change).toHaveBeenCalledWith({ memberId: "librarian", action: "unassign" });
  });

  it("keeps failed assignments out of the roster and shows the error", async () => {
    change.mockResolvedValue({ error: "This staff account is inactive." });
    render(<LibraryTeamCard team={[]} canAdmin />);
    await screen.findByRole("option", { name: /Sara Khan/ });
    fireEvent.change(screen.getByLabelText("Assign New Librarian"), { target: { value: "staff" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Role" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "This staff account is inactive.");
    expect(screen.queryByRole("button", { name: "Unassign Sara Khan" })).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders read-only names, email, initials, and status for non-admins", () => {
    render(<LibraryTeamCard team={[librarian]} canAdmin={false} />);
    expect(screen.getByText("AA")).toBeTruthy();
    expect(screen.getByText("ali@school.test")).toBeTruthy();
    expect(screen.getByText("Active Librarian")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("excludes assigned and inactive staff and supports retrying staff loading", async () => {
    load.mockResolvedValueOnce({ error: "Could not load staff." }).mockResolvedValue({ staff: [librarian, { ...staff, status: "disabled" }] });
    render(<LibraryTeamCard team={[librarian]} canAdmin />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("No eligible active staff members available.")).toBeTruthy());
    expect(screen.queryByRole("option", { name: /Ali Ahmed|Sara Khan/ })).toBeNull();
  });
});
