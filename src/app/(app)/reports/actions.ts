"use server";

import { requireUser } from "@/lib/auth/session";
import { getFeeChallans } from "@/lib/services/finance";
import { exportStudents } from "@/lib/services/students";
import { formatDatePK, formatPKR } from "@/lib/utils";

export type ReportCsvKey = "student_directory" | "archived_students" | "fee_ledger";

export async function exportReportCsvAction(report: ReportCsvKey, month: string) {
  try {
    if (report === "student_directory" || report === "archived_students") {
      const user = await requireUser("students:view");
      const rows = await exportStudents(user, { status: report === "archived_students" ? "archived" : "active" });
      return {
        rows,
        filename: report === "archived_students" ? "archived-students.csv" : "student-directory.csv"
      };
    }

    const user = await requireUser("finance:view");
    const challans = await getFeeChallans(user, month);
    return {
      rows: challans.map((challan: any) => ({
        "Challan ID": challan.id,
        Student: challan.student_name,
        "Admission No": challan.admission_number,
        Class: challan.class_name,
        Month: month,
        Amount: formatPKR(challan.amount),
        Paid: formatPKR(challan.amount_paid_for_month),
        Status: challan.payment_status,
        Generated: formatDatePK(challan.created_at)
      })),
      filename: `fee-challans-${month}.csv`
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate this report." };
  }
}
