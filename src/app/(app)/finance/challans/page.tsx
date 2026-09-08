import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getFeeChallans, getUnassignedFeePayments } from "@/lib/services/finance";
import { getAcademicOptions } from "@/lib/services/academics";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/student-name";
import { PageHeader } from "@/components/layout/page-header";
import { ChallanGeneration } from "@/components/finance/challan-generation";
import { FeeManagementClient } from "@/components/finance/fee-management-client";

export default async function FinanceChallansPage() {
  const user = await requireUser("finance:view");
  const supabase = await createClient();
  const [challans, academics, students, unassignedPayments] = await Promise.all([
    getFeeChallans(user), getAcademicOptions(user),
    supabase.from("students").select("id, first_name, last_name, admission_number").eq("school_id", user.schoolId).order("first_name"),
    getUnassignedFeePayments(user)
  ]);
  if (students.error) throw new Error(students.error.message);
  return <>
    <PageHeader eyebrow="Finance" title="Fee Challans" description="Manage each issued challan, its charges, payments, and receipts."
      actions={<Link href="/finance/fees/structures" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">Fee Structures</Link>} />
    <FeeManagementClient user={user} challans={challans} classes={academics.classes} sessions={academics.years} unassignedPayments={unassignedPayments} />
    <details className="mt-6 print:hidden">
      <summary className="mb-4 cursor-pointer font-semibold text-primary">Generate Monthly Challans</summary>
      <ChallanGeneration user={user} month={new Date().toISOString().slice(0, 7)} classes={academics.classes}
        accounts={(students.data ?? []).map(s => ({ student_id: s.id, student_name: formatFullName(s.first_name, s.last_name), admission_number: s.admission_number }))} />
    </details>
  </>;
}
