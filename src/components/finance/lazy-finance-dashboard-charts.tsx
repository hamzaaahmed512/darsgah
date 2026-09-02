"use client";

import dynamic from "next/dynamic";

const ChartLoading = () => (
  <div className="h-[300px] w-full animate-pulse rounded-[18px] bg-surface-low ring-1 ring-outline/40" aria-hidden="true" />
);

const OutstandingByClassChartImpl = dynamic(
  () => import("@/components/finance/finance-dashboard-charts").then((mod) => mod.OutstandingByClassChart),
  { ssr: false, loading: ChartLoading }
);

const IncomeTrendChartImpl = dynamic(
  () => import("@/components/finance/finance-dashboard-charts").then((mod) => mod.IncomeTrendChart),
  { ssr: false, loading: ChartLoading }
);

const ExpenseDistributionChartImpl = dynamic(
  () => import("@/components/finance/finance-dashboard-charts").then((mod) => mod.ExpenseDistributionChart),
  { ssr: false, loading: ChartLoading }
);

export function LazyOutstandingByClassChart({ data }: { data: Array<{ className: string; amount: number }> }) {
  return <OutstandingByClassChartImpl data={data} />;
}

export function LazyIncomeTrendChart({
  datasets,
  initialPeriod
}: {
  datasets: { monthly: Array<{ label: string; amount: number }>; yearly: Array<{ label: string; amount: number }>; lifetime: Array<{ label: string; amount: number }> };
  initialPeriod?: "monthly" | "yearly" | "lifetime";
}) {
  return <IncomeTrendChartImpl datasets={datasets} initialPeriod={initialPeriod} />;
}

export function LazyExpenseDistributionChart({
  datasets,
  initialPeriod
}: {
  datasets: { monthly: Array<{ name: string; value: number }>; yearly: Array<{ name: string; value: number }>; lifetime: Array<{ name: string; value: number }> };
  initialPeriod?: "monthly" | "yearly" | "lifetime";
}) {
  return <ExpenseDistributionChartImpl datasets={datasets} initialPeriod={initialPeriod} />;
}
