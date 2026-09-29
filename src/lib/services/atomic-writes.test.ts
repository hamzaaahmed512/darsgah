import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/lib/permissions", () => ({ hasPermission: () => true }));

import { reviewRequest } from "@/lib/services/approvals";
import { submitAttendance } from "@/lib/services/attendance";
import { saveStaffPay } from "@/lib/services/payroll";

const user = { id: "11111111-1111-4111-8111-111111111111", schoolId: "22222222-2222-4222-8222-222222222222", role: "principal", permissions: [] } as any;

beforeEach(() => rpc.mockReset());

describe("atomic write service boundaries", () => {
  it("reviews a request through one tenant-scoped transaction and surfaces failure", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "Requested class is invalid; request remains pending" } });
    await expect(reviewRequest(user, "33333333-3333-4333-8333-333333333333", "approved"))
      .rejects.toThrow("request remains pending");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("review_approval_request_atomic", expect.objectContaining({ p_school_id: user.schoolId }));
  });

  it("submits the complete attendance roster in one call", async () => {
    rpc.mockResolvedValueOnce({ data: "44444444-4444-4444-8444-444444444444", error: null });
    const records = [{ student_id: "55555555-5555-4555-8555-555555555555", status: "present" as const }];
    await submitAttendance(user, { class_id: "66666666-6666-4666-8666-666666666666", attendance_date: "2026-09-29", records });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("submit_attendance_atomic", expect.objectContaining({ p_school_id: user.schoolId, p_records: records }));
  });

  it("saves salary and payroll in one call and checks its result", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "Payroll update failed" } });
    await expect(saveStaffPay(user, { staffId: "77777777-7777-4777-8777-777777777777", month: "2026-08", baseSalary: 25000, bonus: 0, deduction: 0 }))
      .rejects.toThrow("Payroll update failed");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("save_staff_pay_atomic", expect.objectContaining({ p_school_id: user.schoolId, p_month: "2026-08" }));
  });
});
