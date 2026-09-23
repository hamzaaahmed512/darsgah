import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@/types/database";
import { getAssignableLibraryStaff, setLibraryTeamRole } from "./library-team";
const { admin } = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: admin }));
const user = { role: "administrator", schoolId: "school" } as AppUser;
const memberId = "00000000-0000-4000-8000-000000000001";
const member = { id: memberId, user_id: "user", role: "teacher", status: "active", profiles: { full_name: "Sara Khan", email: "sara@test.local", must_change_password: false } };
function query() {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: vi.fn(), update: vi.fn().mockReturnThis() };
}
beforeEach(() => vi.resetAllMocks());
describe("library team authorization", () => {
  it("rejects non-admins before accessing the database", async () => {
    const librarian = { ...user, role: "librarian" } as AppUser;
    await expect(getAssignableLibraryStaff(librarian)).rejects.toThrow("Only principals");
    await expect(setLibraryTeamRole(librarian, { memberId, action: "assign" })).rejects.toThrow("Only principals");
    expect(admin).not.toHaveBeenCalled();
  });
  it("limits candidates to active non-protected roles in the current school", async () => {
    const read = query(); admin.mockReturnValue({ from: vi.fn().mockReturnValue(read) });
    await getAssignableLibraryStaff(user);
    expect(read.eq).toHaveBeenCalledWith("school_id", "school");
    expect(read.eq).toHaveBeenCalledWith("status", "active");
    expect(read.in.mock.calls[0][1]).not.toContain("administrator");
    expect(read.in.mock.calls[0][1]).not.toContain("principal");
    expect(read.in.mock.calls[0][1]).not.toContain("librarian");
  });
  it.each([null, { ...member, status: "disabled" }, { ...member, role: "principal" }, { ...member, role: "administrator" }, { ...member, role: "librarian" }])("rejects missing, inactive, protected, or already assigned targets: %j", async target => {
    const read = query(); read.maybeSingle.mockResolvedValue({ data: target, error: null });
    const from = vi.fn().mockReturnValue(read); admin.mockReturnValue({ from });
    await expect(setLibraryTeamRole(user, { memberId, action: "assign" })).rejects.toThrow();
    expect(read.eq).toHaveBeenCalledWith("school_id", "school");
    expect(read.update).not.toHaveBeenCalled();
  });
  it.each(["assign", "unassign"] as const)("scopes %s updates and clears stale custom permissions", async action => {
    const read = query(); const write = query();
    read.maybeSingle.mockResolvedValue({ data: { ...member, role: action === "assign" ? "teacher" : "librarian" }, error: null });
    write.maybeSingle.mockResolvedValue({ data: { id: memberId }, error: null });
    admin.mockReturnValue({ from: vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(write) });
    const result = await setLibraryTeamRole(user, { memberId, action });
    expect(result.role).toBe(action === "assign" ? "librarian" : "staff");
    expect(write.update).toHaveBeenCalledWith({ role: result.role, custom_role_id: null });
    expect(write.eq).toHaveBeenCalledWith("school_id", "school");
    expect(write.eq).toHaveBeenCalledWith("id", memberId);
    expect(write.eq).toHaveBeenCalledWith("role", action === "assign" ? "teacher" : "librarian");
  });
  it("rejects stale updates rather than reporting success", async () => {
    const read = query(); const write = query();
    read.maybeSingle.mockResolvedValue({ data: member, error: null });
    write.maybeSingle.mockResolvedValue({ data: null, error: null });
    admin.mockReturnValue({ from: vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(write) });
    await expect(setLibraryTeamRole(user, { memberId, action: "assign" })).rejects.toThrow("Could not update");
  });
});
