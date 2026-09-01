"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Sector,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactPKR, formatDatePK, formatPKR } from "@/lib/utils";

const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function shortDateLabel(value: string) {
  const formatted = formatDatePK(value);
  return formatted.replace(/,?\s?\d{4}$/, "");
}

function shortMonthLabel(value: string) {
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-PK", { month: "short" });
}

function LiftedPieSector(props: any) {
  const RADIAN = Math.PI / 180;
  const midAngle = props.startAngle + (props.endAngle - props.startAngle) / 2;
  const offset = 8;
  const x = Math.cos(-midAngle * RADIAN) * offset;
  const y = Math.sin(-midAngle * RADIAN) * offset;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <Sector {...props} outerRadius={props.outerRadius + 3} />
    </g>
  );
}

export function OutstandingByClassChart({ data }: { data: Array<{ className: string; amount: number }> }) {
  if (!data.length || data.every(d => d.amount === 0)) {
    return (
      <EmptyState
        title="No outstanding fees"
        description="All classes have fully paid their tuition."
        className="min-h-[280px]"
      />
    );
  }

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -2, bottom: 18 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="className" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatCompactPKR(Number(val))} width={64} />
          <Tooltip formatter={(value) => [formatPKR(Number(value)), "Outstanding"]} />
          <Bar name="Outstanding Balance" dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TrendPoint = { label: string; amount: number };
type TrendSeries = {
  monthly: TrendPoint[];
  yearly: TrendPoint[];
  lifetime: TrendPoint[];
};

function formatTrendLabel(value: string, period: keyof TrendSeries) {
  if (period === "monthly") return shortDateLabel(value);
  if (period === "yearly") return shortMonthLabel(value);
  return value;
}

function formatTrendTooltipLabel(value: string, period: keyof TrendSeries) {
  if (period === "monthly") return formatDatePK(value);
  if (period === "yearly") {
    const [year, month] = value.split("-");
    if (!year || !month) return value;
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  }
  return value;
}

function TrendChart({
  emptyTitle,
  emptyDescription,
  tooltipLabel,
  datasets,
  stroke
}: {
  emptyTitle: string;
  emptyDescription: string;
  tooltipLabel: string;
  datasets: TrendSeries;
  stroke: string;
}) {
  const [period, setPeriod] = useState<keyof TrendSeries>("yearly");
  const data = datasets[period];
  const hasData = data.length > 0 && data.some((item) => item.amount > 0);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex justify-end">
        <div className="inline-flex max-w-full rounded-lg border border-outline/60 bg-white p-1">
          {(["monthly", "yearly", "lifetime"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:text-xs ${
                period === item ? "bg-primary text-white" : "text-muted hover:bg-surface-low hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[320px] w-full min-w-0 px-1 pb-1 sm:px-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 24 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickFormatter={(value) => formatTrendLabel(String(value), period)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatCompactPKR(Number(val))} width={64} />
              <Tooltip labelFormatter={(label) => formatTrendTooltipLabel(String(label), period)} formatter={(value) => [formatPKR(Number(value)), tooltipLabel]} />
              <Line type="monotone" dataKey="amount" stroke={stroke} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="min-h-[300px]"
          />
        )}
      </div>
    </div>
  );
}

export function IncomeTrendChart({ datasets }: { datasets: TrendSeries }) {
  return (
    <TrendChart
      emptyTitle="No income trend yet"
      emptyDescription="Income trend will show when income is recorded for the selected period."
      tooltipLabel="Income"
      datasets={datasets}
      stroke="#2563eb"
    />
  );
}

type DistributionPoint = { name: string; value: number };
type DistributionSeries = {
  monthly: DistributionPoint[];
  yearly: DistributionPoint[];
  lifetime: DistributionPoint[];
};

export function ExpenseDistributionChart({ datasets }: { datasets: DistributionSeries }) {
  const [period, setPeriod] = useState<keyof DistributionSeries>("yearly");
  const data = datasets[period];
  const [activeIndex, setActiveIndex] = useState<number | undefined>();
  const totalExpense = data.reduce((sum, item) => sum + Number(item.value), 0);
  const activeItem = activeIndex === undefined ? null : data[activeIndex];
  const activePercent = activeItem && totalExpense > 0 ? (activeItem.value / totalExpense) * 100 : null;
  const hasData = data.length > 0 && data.some((item) => item.value > 0);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex justify-end">
        <div className="inline-flex max-w-full rounded-lg border border-outline/60 bg-white p-1">
          {(["monthly", "yearly", "lifetime"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setPeriod(item);
                setActiveIndex(undefined);
              }}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition sm:px-3 sm:text-xs ${
                period === item ? "bg-primary text-white" : "text-muted hover:bg-surface-low hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[320px] w-full min-w-0 px-1 pb-1 sm:px-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-ink">
                <tspan x="50%" dy={activeItem ? "-1.05em" : "-0.65em"} className="text-xs font-bold">
                  {activeItem ? activeItem.name : "Total Expense"}
                </tspan>
                <tspan x="50%" dy="1.35em" className="text-base font-bold">
                  {formatCompactPKR(activeItem ? activeItem.value : totalExpense)}
                </tspan>
                {activePercent !== null ? (
                  <tspan x="50%" dy="1.35em" className="fill-muted text-xs font-semibold">
                    {activePercent.toFixed(1)}%
                  </tspan>
                ) : null}
              </text>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                activeIndex={activeIndex}
                activeShape={LiftedPieSector}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No expenses yet"
            description="Expense distribution will show when expenses are recorded for the selected period."
            className="min-h-[300px]"
          />
        )}
      </div>
    </div>
  );
}
