import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { feeStructureSchema, discountSchema, paymentSchema, monthlyGenerationSchema, manualTransactionSchema } from "@/lib/validation/finance";
import { startOfMonth, subMonths, format } from "date-fns";
import { TRANSACTION_CATEGORY_LABELS, type TransactionCategory, type TransactionDirection } from "@/lib/finance-transactions";
import { formatDisplayName, formatFullName } from "@/lib/student-name";

export async function logFinanceAction(
  user: AppUser,
  action: string,
  studentId: string | null,
  previousValues: any,
  newValues: any
) {
  const supabase = await createClient();
  await supabase.from("finance_audit_logs").insert({
    school_id: user.schoolId,
    action,
    actor_id: user.id,
    student_id: studentId,
    previous_values: previousValues,
    new_values: newValues
  });
}

// -------------------------------------------------------------
// Feline structures
// -------------------------------------------------------------

export async function getFeeStructures(user: AppUser) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_structures")
    .select("*, academic_years(name), classes(name, grades(name))")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    ...row,
    classes: row.classes
      ? {
          ...row.classes,
          grade_name: row.classes.grades?.name ?? "Unassigned"
        }
      : null
  }));
}

export async function createFeeStructure(user: AppUser, values: any) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to manage fee structures");
  }
  const parsed = feeStructureSchema.parse(values);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fee_structures")
    .insert({
      school_id: user.schoolId,
      academic_year_id: parsed.academic_year_id,
      class_id: parsed.class_id,
      tuition_fee: parsed.tuition_fee,
      admission_fee: parsed.admission_fee,
      examination_fee: parsed.examination_fee,
      library_fee: parsed.library_fee,
      laboratory_fee: parsed.laboratory_fee,
      transport_fee: parsed.transport_fee,
      miscellaneous_charges: parsed.miscellaneous_charges
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "fee_structure_created", null, null, data);
  return data;
}

export async function upsertFeeStructuresForClasses(user: AppUser, values: any, classIds: string[]) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to manage fee structures");
  }

  if (!classIds.length) {
    throw new Error("Choose at least one class for this fee structure");
  }

  const parsed = feeStructureSchema.parse({
    ...values,
    class_id: classIds[0]
  });
  const supabase = await createClient();
  const rows = classIds.map((classId) => ({
    school_id: user.schoolId,
    academic_year_id: parsed.academic_year_id,
    class_id: classId,
    tuition_fee: parsed.tuition_fee,
    admission_fee: parsed.admission_fee,
    examination_fee: parsed.examination_fee,
    library_fee: parsed.library_fee,
    laboratory_fee: parsed.laboratory_fee,
    transport_fee: parsed.transport_fee,
    miscellaneous_charges: parsed.miscellaneous_charges
  }));

  const { data, error } = await supabase
    .from("fee_structures")
    .upsert(rows, { onConflict: "school_id,academic_year_id,class_id" })
    .select();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "fee_structures_bulk_upserted", null, null, {
    academic_year_id: parsed.academic_year_id,
    class_count: classIds.length,
    values: rows[0]
  });

  return data ?? [];
}

export async function updateFeeStructure(user: AppUser, id: string, values: any) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to manage fee structures");
  }
  const parsed = feeStructureSchema.parse(values);
  const supabase = await createClient();

  // Get previous values
  const { data: previous } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("fee_structures")
    .update({
      academic_year_id: parsed.academic_year_id,
      class_id: parsed.class_id,
      tuition_fee: parsed.tuition_fee,
      admission_fee: parsed.admission_fee,
      examination_fee: parsed.examination_fee,
      library_fee: parsed.library_fee,
      laboratory_fee: parsed.laboratory_fee,
      transport_fee: parsed.transport_fee,
      miscellaneous_charges: parsed.miscellaneous_charges
    })
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "fee_structure_updated", null, previous, data);
  return data;
}

export async function deleteFeeStructure(user: AppUser, id: string) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to delete fee structures");
  }
  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("fee_structures")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "fee_structure_deleted", null, previous, null);
}

// -------------------------------------------------------------
// Student Fee Accounts
// -------------------------------------------------------------

export async function getStudentFees(user: AppUser, filters: {
  q?: string;
  classId?: string;
  status?: string;
  session?: string;
  discounted?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("student_fee_directory")
    .select("*")
    .eq("school_id", user.schoolId);

  if (filters.classId && filters.classId !== "all") {
    query = query.eq("class_id", filters.classId);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("payment_status", filters.status);
  }
  if (filters.session && filters.session !== "all") {
    query = query.eq("academic_year_id", filters.session);
  }
  if (filters.discounted) {
    query = query.neq("discount_type", "none");
  }
  if (filters.q) {
    query = query.or(`student_name.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%`);
  }

  const { data, error } = await query.order("student_name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getFeeChallans(user: AppUser, month: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_challans")
    .select("*, students(first_name, last_name, admission_number), classes(name), student_fee_accounts(total_payable, amount_paid)")
    .eq("school_id", user.schoolId)
    .eq("fee_month", `${month}-01`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    ...row,
    student_name: formatFullName(row.students?.first_name, row.students?.last_name),
    admission_number: row.students?.admission_number ?? "—",
    class_name: row.classes?.name ?? "—",
    payment_status: Number(row.student_fee_accounts?.amount_paid ?? 0) >= Number(row.student_fee_accounts?.total_payable ?? 1) ? "paid" : "unpaid"
  }));
}

export async function generateFeeChallans(user: AppUser, values: { month: string; student_id?: string; class_id?: string }) {
  if (!hasPermission(user.role, "finance:manage", user.permissions)) throw new Error("Unauthorized to generate fee challans");
  const parsed = monthlyGenerationSchema.parse(values);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_fee_challans", {
    p_school_id: user.schoolId, p_month: parsed.month, p_actor_id: user.id,
    p_student_id: parsed.student_id ?? null, p_class_id: parsed.class_id ?? null
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function getStudentFeeAccount(user: AppUser, id: string) {
  const supabase = await createClient();
  
  // Single account details
  const { data: account, error } = await supabase
    .from("student_fee_directory")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  // Get payments
  const { data: payments } = await supabase
    .from("payment_history_view")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("student_fee_account_id", id)
    .order("created_at", { ascending: false });

  // Get structure detail
  let structure = null;
  if (account.fee_structure_id) {
    const { data } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("school_id", user.schoolId)
      .eq("id", account.fee_structure_id)
      .single();
    structure = data;
  }

  return { account, payments: payments || [], structure };
}

export async function applyDiscount(user: AppUser, accountId: string, values: any) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to apply discounts");
  }
  const parsed = discountSchema.parse(values);
  const supabase = await createClient();

  // Get current account and structure
  const { data: account } = await supabase
    .from("student_fee_accounts")
    .select("*, fee_structures(*)")
    .eq("school_id", user.schoolId)
    .eq("id", accountId)
    .single<any>();

  if (!account) throw new Error("Fee account not found");
  if (!account.fee_structure_id) throw new Error("No fee structure is mapped to this account yet");

  const fs = account.fee_structures;
  const baseTotal = Number(fs.tuition_fee) + Number(fs.admission_fee) + Number(fs.examination_fee) +
                    Number(fs.library_fee) + Number(fs.laboratory_fee) + Number(fs.transport_fee) +
                    Number(fs.miscellaneous_charges);

  let newPayable = baseTotal;
  if (parsed.discount_type === "percentage") {
    newPayable = baseTotal * (1 - parsed.discount_value / 100);
  } else if (parsed.discount_type === "fixed") {
    newPayable = Math.max(0, baseTotal - parsed.discount_value);
  }

  const { data: updated, error } = await supabase
    .from("student_fee_accounts")
    .update({
      discount_type: parsed.discount_type,
      discount_value: parsed.discount_value,
      discount_reason: parsed.discount_type === "none" ? null : (parsed.discount_reason as string),
      discount_remarks: parsed.discount_remarks || null,
      discount_approved_by: parsed.discount_approved_by,
      discount_applied_date: new Date().toISOString().slice(0, 10),
      total_payable: newPayable
    })
    .eq("school_id", user.schoolId)
    .eq("id", accountId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "discount_applied", account.student_id, account, updated);
  return updated;
}

// -------------------------------------------------------------
// Payments
// -------------------------------------------------------------

export async function recordPayment(user: AppUser, values: any) {
  const parsed = paymentSchema.parse(values);
  const supabase = await createClient();

  // Get account info
  const { data: account } = await supabase
    .from("student_fee_accounts")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", parsed.student_fee_account_id)
    .single();

  if (!account) throw new Error("Student fee account not found");

  const remaining = Number(account.total_payable) - Number(account.amount_paid);
  if (parsed.amount > remaining) {
    throw new Error(`Payment amount (${parsed.amount}) exceeds the remaining balance (${remaining})`);
  }

  const { data, error } = await supabase
    .from("fee_payments")
    .insert({
      school_id: user.schoolId,
      student_fee_account_id: parsed.student_fee_account_id,
      amount: parsed.amount,
      payment_method: parsed.payment_method,
      transaction_number: parsed.transaction_number || null,
      reference_number: parsed.reference_number || null,
      remarks: parsed.remarks || null,
      received_by: user.id,
      payment_date: new Date().toISOString().slice(0, 10)
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "payment_recorded", account.student_id, null, data);
  return data;
}

export async function getPaymentHistory(user: AppUser, filters: {
  q?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("payment_history_view")
    .select("*")
    .eq("school_id", user.schoolId);

  if (filters.method && filters.method !== "all") {
    query = query.eq("payment_method", filters.method);
  }
  if (filters.dateFrom) {
    query = query.gte("payment_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("payment_date", filters.dateTo);
  }
  if (filters.q) {
    query = query.or(`student_name.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%,receipt_number.ilike.%${filters.q}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function voidPayment(user: AppUser, id: string, reason: string) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to void payments");
  }
  const supabase = await createClient();

  // Get previous payment details
  const { data: payment } = await supabase
    .from("fee_payments")
    .select("*, student_fee_accounts(student_id)")
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .single<any>();

  if (!payment) throw new Error("Payment record not found");
  if (payment.is_voided) throw new Error("Payment is already voided");

  const { data, error } = await supabase
    .from("fee_payments")
    .update({
      is_voided: true,
      voided_by: user.id,
      voided_at: new Date().toISOString(),
      void_reason: reason
    })
    .eq("school_id", user.schoolId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logFinanceAction(user, "payment_voided", payment.student_fee_accounts.student_id, payment, data);
  return data;
}

// -------------------------------------------------------------
// Unified income and expense ledger
// -------------------------------------------------------------

export async function createManualTransaction(user: AppUser, values: unknown) {
  if (!hasPermission(user.role, "finance:manage", user.permissions)) throw new Error("Unauthorized to record transactions");
  const parsed = manualTransactionSchema.parse(values);
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_transactions").insert({
    school_id: user.schoolId,
    direction: parsed.direction,
    category: parsed.category,
    amount: parsed.amount,
    transaction_date: parsed.transaction_date,
    receipt_number: null,
    party_name: parsed.party_name || null,
    student_id: parsed.student_id || null,
    payment_method: parsed.payment_method || null,
    reference_number: parsed.reference_number || null,
    description: parsed.description || null,
    source: "manual",
    recorded_by: user.id
  }).select("id,receipt_number").single();
  if (error) throw new Error(error.message);
  await logFinanceAction(user, `${parsed.direction}_recorded`, parsed.student_id || null, null, { ...parsed, transaction_id: data.id });
  return data;
}

export async function getFinanceTransactions(user: AppUser, filters: {
  period?: "month" | "year" | "lifetime" | "custom";
  dateFrom?: string;
  dateTo?: string;
  direction?: TransactionDirection | "all";
  q?: string;
  page?: number;
  includeTotals?: boolean;
} = {}) {
  const supabase = await createClient();
  const now = new Date();
  const period = filters.period ?? "month";
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = 50;
  let dateFrom = filters.dateFrom;
  let dateTo = filters.dateTo;
  if (period === "month") {
    dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  } else if (period === "year") {
    dateFrom = `${now.getFullYear()}-01-01`;
    dateTo = `${now.getFullYear()}-12-31`;
  } else if (period === "lifetime") {
    dateFrom = undefined;
    dateTo = undefined;
  }

  let query = supabase.from("finance_transactions")
    .select("*,students(first_name,last_name,admission_number),profiles!finance_transactions_recorded_by_fkey(full_name)", { count: "exact" })
    .eq("school_id", user.schoolId)
    .eq("is_voided", false);
  let totalsQuery = filters.includeTotals === false
    ? null
    : supabase.from("finance_transactions").select("direction,amount")
      .eq("school_id", user.schoolId)
      .eq("is_voided", false);
  if (dateFrom) query = query.gte("transaction_date", dateFrom);
  if (dateFrom && totalsQuery) totalsQuery = totalsQuery.gte("transaction_date", dateFrom);
  if (dateTo) query = query.lte("transaction_date", dateTo);
  if (dateTo && totalsQuery) totalsQuery = totalsQuery.lte("transaction_date", dateTo);
  if (filters.direction && filters.direction !== "all") query = query.eq("direction", filters.direction);
  if (filters.direction && filters.direction !== "all" && totalsQuery) totalsQuery = totalsQuery.eq("direction", filters.direction);
  if (filters.q) query = query.or(`receipt_number.ilike.%${filters.q}%,party_name.ilike.%${filters.q}%,reference_number.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  if (filters.q && totalsQuery) totalsQuery = totalsQuery.or(`receipt_number.ilike.%${filters.q}%,party_name.ilike.%${filters.q}%,reference_number.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  const [{ data, count, error }, totalsResult] = await Promise.all([
    query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1),
    totalsQuery ?? Promise.resolve({ data: [], error: null })
  ]);
  const { data: totalRows, error: totalsError } = totalsResult;
  if (error) throw new Error(error.message);
  if (totalsError) throw new Error(totalsError.message);
  const rows = (data ?? []).map((row: any) => ({
    ...row,
    student_name: row.students ? formatFullName(row.students.first_name, row.students.last_name) : null,
    admission_number: row.students?.admission_number ?? null,
    recorded_by_name: formatDisplayName(row.profiles?.full_name) || null
  }));
  return {
    rows,
    count: count ?? 0,
    page,
    pageSize,
    totals: (totalRows ?? []).reduce((sum, row) => ({
      income: sum.income + (row.direction === "income" ? Number(row.amount) : 0),
      expenses: sum.expenses + (row.direction === "expense" ? Number(row.amount) : 0)
    }), { income: 0, expenses: 0 }),
    dateFrom,
    dateTo,
    period
  };
}

async function getLedgerDashboard(user: AppUser) {
  const supabase = await createClient();
  const currentMonthStart = startOfMonth(new Date());
  const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
  const monthStart = format(currentMonthStart, "yyyy-MM-dd");
  const previousMonthStartStr = format(previousMonthStart, "yyyy-MM-dd");
  const [{ data: monthRows, error: monthError }, { data: recent, error: recentError }] = await Promise.all([
    supabase.from("finance_transactions").select("direction,amount,transaction_date,category").eq("school_id", user.schoolId).eq("is_voided", false).gte("transaction_date", previousMonthStartStr),
    supabase.from("finance_transactions").select("*,students(first_name,last_name,admission_number),profiles!finance_transactions_recorded_by_fkey(full_name)").eq("school_id", user.schoolId).eq("is_voided", false).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(8)
  ]);
  if (monthError || recentError) return { monthlyIncome: 0, monthlyExpenses: 0, netCashFlow: 0, previousMonthlyIncome: 0, previousMonthlyExpenses: 0, previousNetCashFlow: 0, recentTransactions: [], incomeTrend: [], expenseDistribution: [] };
  const rows = monthRows ?? [];
  const currentRows = rows.filter((row) => (row.transaction_date ?? monthStart) >= monthStart);
  const previousRows = rows.filter((row) => {
    const transactionDate = row.transaction_date ?? previousMonthStartStr;
    return transactionDate >= previousMonthStartStr && transactionDate < monthStart;
  });
  const monthlyIncome = currentRows.filter((row) => row.direction === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const monthlyExpenses = currentRows.filter((row) => row.direction === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const previousMonthlyIncome = previousRows.filter((row) => row.direction === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const previousMonthlyExpenses = previousRows.filter((row) => row.direction === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const incomeByDate = new Map<string, number>();
  const expensesByCategory = new Map<string, number>();

  currentRows.forEach((row) => {
    const amount = Number(row.amount ?? 0);
    if (row.direction === "income") {
      const date = row.transaction_date ?? monthStart;
      incomeByDate.set(date, (incomeByDate.get(date) ?? 0) + amount);
    }
    if (row.direction === "expense") {
      const category = row.category as TransactionCategory | null;
      const label = category && category in TRANSACTION_CATEGORY_LABELS ? TRANSACTION_CATEGORY_LABELS[category] : "Other Expense";
      expensesByCategory.set(label, (expensesByCategory.get(label) ?? 0) + amount);
    }
  });

  return {
    monthlyIncome,
    monthlyExpenses,
    netCashFlow: monthlyIncome - monthlyExpenses,
    previousMonthlyIncome,
    previousMonthlyExpenses,
    previousNetCashFlow: previousMonthlyIncome - previousMonthlyExpenses,
    incomeTrend: Array.from(incomeByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount })),
    expenseDistribution: Array.from(expensesByCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    recentTransactions: (recent ?? []).map((row: any) => ({ ...row, student_name: row.students ? formatFullName(row.students.first_name, row.students.last_name) : null, recorded_by_name: formatDisplayName(row.profiles?.full_name) || null }))
  };
}

// -------------------------------------------------------------
// Financial Dashboard
// -------------------------------------------------------------

export async function getFinanceDashboard(user: AppUser) {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfThisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const ledger = await getLedgerDashboard(user);

  const optimized = await supabase.rpc("get_finance_dashboard", {
    p_school_id: user.schoolId,
    p_month_start: startOfThisMonth,
    p_today: todayStr
  });

  if (!optimized.error && optimized.data && typeof optimized.data === "object") {
    const data = optimized.data as any;
    return {
      totalExpected: Number(data.totalExpected ?? 0),
      totalCollected: Number(data.totalCollected ?? 0),
      totalOutstanding: Number(data.totalOutstanding ?? 0),
      todayCollection: Number(data.todayCollection ?? 0),
      monthlyCollection: Number(data.monthlyCollection ?? 0),
      totalDiscounts: Number(data.totalDiscounts ?? 0),
      pendingPayments: Number(data.pendingPayments ?? 0),
      overduePayments: Number(data.overduePayments ?? 0),
      recentPayments: data.recentPayments ?? [],
      outstandingByClass: data.outstandingByClass ?? [],
      collectionMethodData: data.collectionMethodData ?? [],
      ...ledger
    };
  }

  // Rolling-deploy fallback for environments where the aggregation migration
  // has not reached PostgREST yet.
  const [accountsRes, todayPaymentsRes, monthPaymentsRes] = await Promise.all([
    supabase
      .from("student_fee_directory")
      .select("total_payable, amount_paid, remaining_balance, payment_status, discount_type, discount_value, fee_structure_id, class_name, grade_name")
      .eq("school_id", user.schoolId),
    supabase
      .from("fee_payments")
      .select("amount")
      .eq("school_id", user.schoolId)
      .eq("payment_date", todayStr)
      .eq("is_voided", false),
    supabase
      .from("fee_payments")
      .select("amount, payment_date, payment_method")
      .eq("school_id", user.schoolId)
      .gte("payment_date", startOfThisMonth)
      .eq("is_voided", false)
  ]);

  const accounts = accountsRes.data || [];
  const todayPayments = todayPaymentsRes.data || [];
  const monthPayments = monthPaymentsRes.data || [];

  // Totals
  let totalExpected = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalDiscounts = 0;
  let pendingPaymentsCount = 0;
  let overduePaymentsCount = 0;

  accounts.forEach((acc) => {
    const payable = Number(acc.total_payable || 0);
    const paid = Number(acc.amount_paid || 0);
    const remaining = Number(acc.remaining_balance || 0);

    totalExpected += payable;
    totalCollected += paid;
    totalOutstanding += remaining;

    if (acc.payment_status === "unpaid" || acc.payment_status === "partially_paid") {
      pendingPaymentsCount++;
    } else if (acc.payment_status === "overdue") {
      overduePaymentsCount++;
    }

    // Estimate discount amount
    if (acc.discount_type !== "none" && acc.discount_value > 0) {
      if (acc.discount_type === "fixed") {
        totalDiscounts += Number(acc.discount_value);
      } else if (acc.discount_type === "percentage") {
        // base = payable / (1 - val/100) -> discount = base * val/100
        const val = Number(acc.discount_value);
        const discountAmt = (payable / (1 - val / 100)) * (val / 100);
        totalDiscounts += discountAmt;
      }
    }
  });

  const todayCollection = todayPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const monthlyCollection = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  // Collections by method
  const collectionByMethod = new Map<string, number>();
  monthPayments.forEach(p => {
    const key = p.payment_method;
    collectionByMethod.set(key, (collectionByMethod.get(key) || 0) + Number(p.amount));
  });

  // Outstanding by Class
  const outstandingByClassMap = new Map<string, number>();
  accounts.forEach((acc) => {
    const key = acc.class_name || "Unassigned";
    outstandingByClassMap.set(key, (outstandingByClassMap.get(key) || 0) + Number(acc.remaining_balance || 0));
  });

  const outstandingByClass = Array.from(outstandingByClassMap.entries())
    .map(([className, amount]) => ({ className, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Recent payments
  const { data: recentPayments } = await supabase
    .from("payment_history_view")
    .select("*")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalExpected,
    totalCollected,
    totalOutstanding,
    todayCollection,
    monthlyCollection,
    totalDiscounts,
    pendingPayments: pendingPaymentsCount,
    overduePayments: overduePaymentsCount,
    recentPayments: recentPayments || [],
    outstandingByClass,
    collectionMethodData: Array.from(collectionByMethod.entries()).map(([method, amount]) => ({ name: method.replace("_", " "), value: amount })),
    ...ledger
  };
}

// -------------------------------------------------------------
// Audit Log
// -------------------------------------------------------------

export async function getFinanceAuditLogs(user: AppUser) {
  if (!hasPermission(user.role, "finance:manage")) {
    throw new Error("Unauthorized to view finance audit logs");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_audit_logs")
    .select("*, profiles(full_name), students(first_name, last_name, admission_number)")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}
