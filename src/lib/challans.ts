export interface ChallanPayment {
  id: string;
  challan_id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  transaction_number: string | null;
  remarks: string | null;
  is_voided: boolean;
}

export type UnassignedPayment = Omit<ChallanPayment, "challan_id"> & { student_fee_account_id: string; challan_id: null };

export interface Challan {
  id: string;
  student_id: string;
  student_fee_account_id: string | null;
  student_name: string;
  admission_number: string;
  class_id: string | null;
  class_name: string;
  academic_year_id: string | null;
  issue_date: string;
  due_date: string;
  fee_month: string;
  amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: "paid" | "unpaid" | "partially_paid";
  line_items: { description: string; amount: number }[];
  discount_amount: number;
  discount_reason: string | null;
  updated_at: string;
  payments: ChallanPayment[];
}

export function challanBalance(id: string, amount: number, payments: ChallanPayment[]) {
  const amount_paid = Math.round(payments.filter(p => p.challan_id === id && !p.is_voided)
    .reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
  const balance_due = Math.max(0, Math.round((amount - amount_paid) * 100) / 100);
  const payment_status: Challan["payment_status"] = balance_due === 0 ? "paid" : amount_paid > 0 ? "partially_paid" : "unpaid";
  return { amount_paid, balance_due, payment_status };
}

export const challanStatusLabels = { paid: "Paid", unpaid: "Unpaid", partially_paid: "Partially Paid" };

export function filterChallans(rows: Challan[], filters: { q: string; classId: string; session: string; status: string; from: string; to: string }) {
  const q = filters.q.trim().toLowerCase();
  return rows.filter(row =>
    (!q || `${row.id} ${row.student_name} ${row.admission_number}`.toLowerCase().includes(q)) &&
    (!filters.classId || row.class_id === filters.classId) &&
    (!filters.session || row.academic_year_id === filters.session) &&
    (!filters.status || row.payment_status === filters.status) &&
    (!filters.from || row.issue_date >= filters.from) &&
    (!filters.to || row.issue_date <= filters.to));
}
