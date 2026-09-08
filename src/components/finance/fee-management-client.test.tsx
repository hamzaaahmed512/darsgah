import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { FeeManagementClient } from "./fee-management-client";
import { recordPaymentAction } from "@/app/(app)/finance/actions";
import type { AppUser } from "@/types/database";
import type { Challan } from "@/lib/challans";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/finance/actions", () => ({ recordPaymentAction: vi.fn(), applyDiscountAction: vi.fn(), editFeeChallanAction: vi.fn(), assignLegacyPaymentAction: vi.fn() }));
vi.stubGlobal("React", React);
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const user = { role: "principal", permissions: ["finance:view", "finance:manage"] } as unknown as AppUser;
const base = {
  student_id: "student", student_fee_account_id: "account", student_name: "Ali Khan", admission_number: "ADM-1",
  class_id: "class", class_name: "Grade 1", academic_year_id: "session", issue_date: "2026-09-01", due_date: "2026-09-30",
  fee_month: "2026-09-01", amount: 1000, amount_paid: 0, balance_due: 1000, payment_status: "unpaid",
  line_items: [{ description: "Tuition", amount: 1000 }], discount_amount: 0, discount_reason: null,
  updated_at: "2026-09-08T12:00:00+00:00", payments: []
} as Omit<Challan, "id">;
const rows: Challan[] = [{ ...base, id: "challan-a" }, { ...base, id: "challan-b", amount_paid: 400, balance_due: 600, payment_status: "partially_paid" }];
function setup(role = user) { render(<FeeManagementClient user={role} challans={rows} classes={[]} sessions={[]} />); }

describe("challan workspace", () => {
  it("renders separate rows for one student and filters unpaid independently", () => {
    setup();
    expect(screen.getAllByText("Ali Khan")).toHaveLength(2);
    expect(screen.queryByText("Outstanding")).toBeNull();
    fireEvent.change(screen.getByLabelText("Challan Status"), { target: { value: "unpaid" } });
    expect(screen.getByText("challan-a")).toBeTruthy();
    expect(screen.queryByText("challan-b")).toBeNull();
  });
  it("submits the selected challan ID, never the shared account ID", async () => {
    setup();
    const tableRow = screen.getByText("challan-b").closest("tr")!;
    fireEvent.click(within(tableRow).getByText("Collect Payment"));
    fireEvent.change(screen.getByLabelText(/Payment Amount/), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(recordPaymentAction).toHaveBeenCalledOnce());
    const data = vi.mocked(recordPaymentAction).mock.calls[0][0];
    expect(data.get("challan_id")).toBe("challan-b");
    expect(data.has("student_fee_account_id")).toBe(false);
  });
  it("keeps management controls hidden for viewers", () => {
    setup({ role: "student_staff", permissions: ["finance:view"] } as AppUser);
    expect(screen.queryByText("Collect Payment")).toBeNull();
    expect(screen.getAllByText("View / Receipts")).toHaveLength(2);
  });
});
