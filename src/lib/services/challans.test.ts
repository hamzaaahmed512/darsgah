import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFeeChallans, recordPayment } from "./finance";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const user = { id: "actor", schoolId: "school", role: "principal", permissions: ["finance:manage"] } as AppUser;
describe("challan services", () => {
  beforeEach(() => vi.clearAllMocks());
  it("reads challan-linked payments and never falls back to account amounts", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [{ id: "a", amount: 0, student_fee_accounts: { total_payable: 900 }, fee_payments: [] }], error: null }) };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query) } as never);
    const rows = await getFeeChallans(user);
    expect(query.eq).toHaveBeenCalledWith("school_id", "school");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("fee_payments!fee_payments_challan_id_fkey"));
    expect(rows[0].amount).toBe(0);
    expect(rows[0].payment_status).toBe("paid");
  });
  it("rejects unauthorized payment attempts before accessing the database", async () => {
    await expect(recordPayment({ ...user, permissions: ["finance:view"] }, {})).rejects.toThrow("Unauthorized");
    expect(createClient).not.toHaveBeenCalled();
  });
  it("looks up payment targets inside the user's school", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: {} }) };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query) } as never);
    await expect(recordPayment(user, { challan_id: "00000000-0000-0000-0000-000000000001", amount: 1, payment_method: "cash" })).rejects.toThrow("Challan not found");
    expect(query.eq).toHaveBeenCalledWith("school_id", "school");
  });
});
